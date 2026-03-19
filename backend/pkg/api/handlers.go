package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/wesen/cozodb-editor/backend/pkg/cozo"
	"github.com/wesen/cozodb-editor/backend/pkg/notebook"
)

// Server holds the HTTP API handlers.
type Server struct {
	Runtime  *cozo.Manager
	Notebook *notebook.Service
}

// HandleQuery handles POST /api/query — execute CozoScript.
func (s *Server) HandleQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, QueryResponse{
			OK:      false,
			Message: "invalid request body: " + err.Error(),
		})
		return
	}

	if strings.TrimSpace(req.Script) == "" {
		writeJSON(w, http.StatusBadRequest, QueryResponse{
			OK:      false,
			Message: "script is required",
		})
		return
	}

	log.Printf("[API] query: %s", truncate(req.Script, 120))

	if s.Runtime == nil {
		http.Error(w, "runtime unavailable", http.StatusServiceUnavailable)
		return
	}

	result, err := s.Runtime.Query(req.Script, req.Params)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, QueryResponse{
			OK:      false,
			Message: err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, QueryResponse{
		OK:      result.OK,
		Headers: result.Headers,
		Rows:    result.Rows,
		Took:    result.Took,
		Code:    result.Code,
		Message: result.Message,
		Display: result.Display,
	})
}

// HandleSchema handles GET /api/schema — list all relations.
func (s *Server) HandleSchema(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if s.Runtime == nil {
		http.Error(w, "runtime unavailable", http.StatusServiceUnavailable)
		return
	}

	names, err := s.Runtime.ListRelations()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, SchemaResponse{Relations: names})
}

// HandleSchemaDetail handles GET /api/schema/{name} — describe a relation.
func (s *Server) HandleSchemaDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract relation name from path: /api/schema/{name}
	name := strings.TrimPrefix(r.URL.Path, "/api/schema/")
	if name == "" {
		http.Error(w, "relation name required", http.StatusBadRequest)
		return
	}

	if s.Runtime == nil {
		http.Error(w, "runtime unavailable", http.StatusServiceUnavailable)
		return
	}

	info, err := s.Runtime.DescribeRelation(name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	resp := RelationResponse{
		Name: info.Name,
	}
	for _, k := range info.Keys {
		resp.Keys = append(resp.Keys, ColumnDef{Name: k.Name, Type: k.Type, HasDefault: k.HasDefault})
	}
	for _, v := range info.Values {
		resp.Values = append(resp.Values, ColumnDef{Name: v.Name, Type: v.Type, HasDefault: v.HasDefault})
	}

	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func truncate(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}
