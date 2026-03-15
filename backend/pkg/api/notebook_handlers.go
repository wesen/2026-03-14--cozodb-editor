package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/wesen/cozodb-editor/backend/pkg/notebook"
)

func (s *Server) HandleBootstrapNotebook(w http.ResponseWriter, r *http.Request) {
	if s.Notebook == nil {
		http.Error(w, "notebook service unavailable", http.StatusServiceUnavailable)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	doc, err := s.Notebook.EnsureDefaultNotebook(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (s *Server) HandleCreateNotebook(w http.ResponseWriter, r *http.Request) {
	if s.Notebook == nil {
		http.Error(w, "notebook service unavailable", http.StatusServiceUnavailable)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req CreateNotebookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	nb, err := s.Notebook.CreateNotebook(r.Context(), req.Title)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, nb)
}

func (s *Server) HandleNotebook(w http.ResponseWriter, r *http.Request) {
	if s.Notebook == nil {
		http.Error(w, "notebook service unavailable", http.StatusServiceUnavailable)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/notebooks/")
	path = strings.Trim(path, "/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	if strings.HasSuffix(path, "/cells") {
		notebookID := strings.TrimSuffix(path, "/cells")
		s.handleInsertCell(w, r, strings.Trim(notebookID, "/"))
		return
	}

	notebookID := path
	switch r.Method {
	case http.MethodGet:
		doc, err := s.Notebook.GetNotebook(r.Context(), notebookID)
		if err != nil {
			if err == sql.ErrNoRows {
				http.NotFound(w, r)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, doc)
	case http.MethodPatch:
		var req UpdateNotebookRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if err := s.Notebook.UpdateNotebookTitle(r.Context(), notebookID, req.Title); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		doc, err := s.Notebook.GetNotebook(r.Context(), notebookID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, doc)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleInsertCell(w http.ResponseWriter, r *http.Request, notebookID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req InsertCellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	cell, err := s.Notebook.InsertCell(r.Context(), notebookID, req.AfterCellID, req.Kind, req.Source)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, cell)
}

func (s *Server) HandleNotebookCell(w http.ResponseWriter, r *http.Request) {
	if s.Notebook == nil {
		http.Error(w, "notebook service unavailable", http.StatusServiceUnavailable)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/notebook-cells/")
	path = strings.Trim(path, "/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	switch {
	case strings.HasSuffix(path, "/move"):
		cellID := strings.TrimSuffix(path, "/move")
		s.handleMoveCell(w, r, strings.Trim(cellID, "/"))
	case strings.HasSuffix(path, "/run"):
		cellID := strings.TrimSuffix(path, "/run")
		s.handleRunCell(w, r, strings.Trim(cellID, "/"))
	default:
		s.handleCellResource(w, r, path)
	}
}

func (s *Server) handleCellResource(w http.ResponseWriter, r *http.Request, cellID string) {
	switch r.Method {
	case http.MethodPatch:
		var req UpdateCellRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		cell, err := s.Notebook.UpdateCell(r.Context(), cellID, req.Kind, req.Source)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, cell)
	case http.MethodDelete:
		if err := s.Notebook.DeleteCell(r.Context(), cellID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleMoveCell(w http.ResponseWriter, r *http.Request, cellID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req MoveCellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := s.Notebook.MoveCell(r.Context(), cellID, req.TargetIndex); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleRunCell(w http.ResponseWriter, r *http.Request, cellID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	runtime, err := s.Notebook.RunCell(r.Context(), cellID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, runtime)
}

func notebookDocOr404(svc *notebook.Service, w http.ResponseWriter, r *http.Request, notebookID string) *notebook.NotebookDocument {
	doc, err := svc.GetNotebook(r.Context(), notebookID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.NotFound(w, r)
			return nil
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return nil
	}
	return doc
}
