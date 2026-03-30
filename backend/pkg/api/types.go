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
