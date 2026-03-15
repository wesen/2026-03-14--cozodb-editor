package api

// QueryRequest is the request body for POST /api/query.
type QueryRequest struct {
	Script string         `json:"script"`
	Params map[string]any `json:"params,omitempty"`
}

// QueryResponse is the response for POST /api/query.
type QueryResponse struct {
	OK      bool     `json:"ok"`
	Headers []string `json:"headers,omitempty"`
	Rows    [][]any  `json:"rows,omitempty"`
	Took    float64  `json:"took,omitempty"`
	Code    string   `json:"code,omitempty"`
	Message string   `json:"message,omitempty"`
	Display string   `json:"display,omitempty"`
}

// SchemaResponse is the response for GET /api/schema.
type SchemaResponse struct {
	Relations []string `json:"relations"`
}

// RelationResponse is the response for GET /api/schema/{name}.
type RelationResponse struct {
	Name   string      `json:"name"`
	Keys   []ColumnDef `json:"keys"`
	Values []ColumnDef `json:"values"`
}

// ColumnDef describes a column.
type ColumnDef struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	HasDefault bool   `json:"has_default"`
}

// WSMessage is the envelope for WebSocket messages.
type WSMessage struct {
	SEM   bool    `json:"sem"`
	Event WSEvent `json:"event"`
}

// WSEvent is a WebSocket event.
type WSEvent struct {
	Type     string `json:"type"`
	ID       string `json:"id,omitempty"`
	StreamID string `json:"stream_id,omitempty"`
	Data     any    `json:"data,omitempty"`
}

// HintRequest is a request for AI hints over WebSocket.
type HintRequest struct {
	Question    string   `json:"question"`
	History     []string `json:"history,omitempty"`
	AnchorLine  *int     `json:"anchorLine,omitempty"`
	NotebookID  string   `json:"notebookId,omitempty"`
	OwnerCellID string   `json:"ownerCellId,omitempty"`
	RunID       string   `json:"runId,omitempty"`
}

// DiagnosisRequest is a request for AI error diagnosis over WebSocket.
type DiagnosisRequest struct {
	Error       string `json:"error"`
	Script      string `json:"script"`
	NotebookID  string `json:"notebookId,omitempty"`
	OwnerCellID string `json:"ownerCellId,omitempty"`
	RunID       string `json:"runId,omitempty"`
}

type CreateNotebookRequest struct {
	Title string `json:"title"`
}

type UpdateNotebookRequest struct {
	Title string `json:"title"`
}

type InsertCellRequest struct {
	AfterCellID string `json:"after_cell_id,omitempty"`
	Kind        string `json:"kind,omitempty"`
	Source      string `json:"source,omitempty"`
}

type UpdateCellRequest struct {
	Kind   string `json:"kind,omitempty"`
	Source string `json:"source,omitempty"`
}

type MoveCellRequest struct {
	TargetIndex int `json:"target_index"`
}
