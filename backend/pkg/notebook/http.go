package notebook

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
)

type createNotebookRequest struct {
	Title string `json:"title"`
}

type updateNotebookRequest struct {
	Title string `json:"title"`
}

type insertCellRequest struct {
	AfterCellID string `json:"after_cell_id,omitempty"`
	Kind        string `json:"kind,omitempty"`
	Source      string `json:"source,omitempty"`
}

type updateCellRequest struct {
	Kind   string `json:"kind,omitempty"`
	Source string `json:"source,omitempty"`
}

type moveCellRequest struct {
	TargetIndex int `json:"target_index"`
}

type resetKernelResponse struct {
	KernelGeneration int64 `json:"kernel_generation"`
	OK               bool  `json:"ok"`
}

type httpHandler struct {
	service   *Service
	basePaths BasePaths
}

func MountHTTPRoutes(mux *http.ServeMux, service *Service) {
	MountHTTPRoutesWithBasePaths(mux, service, DefaultBasePaths())
}

func MountHTTPRoutesWithBasePaths(mux *http.ServeMux, service *Service, basePaths BasePaths) {
	basePaths = basePaths.withDefaults()
	handler := &httpHandler{
		service:   service,
		basePaths: basePaths,
	}
	mux.HandleFunc(basePaths.Notebooks, handler.handleCreateNotebook)
	mux.HandleFunc(basePaths.Notebooks+"/bootstrap", handler.handleBootstrapNotebook)
	mux.HandleFunc(basePaths.Notebooks+"/", handler.handleNotebook)
	mux.HandleFunc(basePaths.NotebookCells+"/", handler.handleNotebookCell)
	mux.HandleFunc(basePaths.ResetKernel, handler.handleResetKernel)
}

func (h *httpHandler) handleBootstrapNotebook(w http.ResponseWriter, r *http.Request) {
	if !h.ensureService(w) {
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	doc, err := h.service.EnsureDefaultNotebook(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (h *httpHandler) handleCreateNotebook(w http.ResponseWriter, r *http.Request) {
	if !h.ensureService(w) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req createNotebookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	nb, err := h.service.CreateNotebook(r.Context(), req.Title)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, nb)
}

func (h *httpHandler) handleNotebook(w http.ResponseWriter, r *http.Request) {
	if !h.ensureService(w) {
		return
	}
	path := strings.TrimPrefix(r.URL.Path, h.basePaths.Notebooks+"/")
	path = strings.Trim(path, "/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	if strings.HasSuffix(path, "/cells") {
		notebookID := strings.TrimSuffix(path, "/cells")
		h.handleInsertCell(w, r, strings.Trim(notebookID, "/"))
		return
	}
	if strings.HasSuffix(path, "/clear") {
		notebookID := strings.TrimSuffix(path, "/clear")
		h.handleClearNotebook(w, r, strings.Trim(notebookID, "/"))
		return
	}

	notebookID := path
	switch r.Method {
	case http.MethodGet:
		doc, err := h.service.GetNotebook(r.Context(), notebookID)
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
		var req updateNotebookRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if err := h.service.UpdateNotebookTitle(r.Context(), notebookID, req.Title); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		doc, err := h.service.GetNotebook(r.Context(), notebookID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, doc)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *httpHandler) handleClearNotebook(w http.ResponseWriter, r *http.Request, notebookID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	doc, err := h.service.ClearNotebook(r.Context(), notebookID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.NotFound(w, r)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (h *httpHandler) handleInsertCell(w http.ResponseWriter, r *http.Request, notebookID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req insertCellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	result, err := h.service.InsertCell(r.Context(), notebookID, req.AfterCellID, req.Kind, req.Source)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

func (h *httpHandler) handleNotebookCell(w http.ResponseWriter, r *http.Request) {
	if !h.ensureService(w) {
		return
	}
	path := strings.TrimPrefix(r.URL.Path, h.basePaths.NotebookCells+"/")
	path = strings.Trim(path, "/")
	if path == "" {
		http.NotFound(w, r)
		return
	}

	switch {
	case strings.HasSuffix(path, "/move"):
		cellID := strings.TrimSuffix(path, "/move")
		h.handleMoveCell(w, r, strings.Trim(cellID, "/"))
	case strings.HasSuffix(path, "/run"):
		cellID := strings.TrimSuffix(path, "/run")
		h.handleRunCell(w, r, strings.Trim(cellID, "/"))
	default:
		h.handleCellResource(w, r, path)
	}
}

func (h *httpHandler) handleCellResource(w http.ResponseWriter, r *http.Request, cellID string) {
	switch r.Method {
	case http.MethodPatch:
		var req updateCellRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		cell, err := h.service.UpdateCell(r.Context(), cellID, req.Kind, req.Source)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, cell)
	case http.MethodDelete:
		result, err := h.service.DeleteCell(r.Context(), cellID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, result)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *httpHandler) handleMoveCell(w http.ResponseWriter, r *http.Request, cellID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req moveCellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	result, err := h.service.MoveCell(r.Context(), cellID, req.TargetIndex)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *httpHandler) handleRunCell(w http.ResponseWriter, r *http.Request, cellID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	runtime, err := h.service.RunCell(r.Context(), cellID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, runtime)
}

func (h *httpHandler) handleResetKernel(w http.ResponseWriter, r *http.Request) {
	if !h.ensureService(w) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	result, err := h.service.ResetKernel(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, resetKernelResponse{
		KernelGeneration: result.KernelGeneration,
		OK:               result.OK,
	})
}

func (h *httpHandler) ensureService(w http.ResponseWriter) bool {
	if h.service != nil {
		return true
	}
	http.Error(w, "notebook service unavailable", http.StatusServiceUnavailable)
	return false
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
