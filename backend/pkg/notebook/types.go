package notebook

type Notebook struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Language    string `json:"language"`
	CreatedAtMs int64  `json:"created_at_ms"`
	UpdatedAtMs int64  `json:"updated_at_ms"`
}

type NotebookCell struct {
	ID          string `json:"id"`
	NotebookID  string `json:"notebook_id"`
	Position    int    `json:"position"`
	Kind        string `json:"kind"`
	Source      string `json:"source"`
	CreatedAtMs int64  `json:"created_at_ms"`
	UpdatedAtMs int64  `json:"updated_at_ms"`
}

type CellRun struct {
	ID             string `json:"id"`
	NotebookID     string `json:"notebook_id"`
	CellID         string `json:"cell_id"`
	ConvID         string `json:"conv_id"`
	ExecutionCount int    `json:"execution_count"`
	Status         string `json:"status"`
	SourceHash     string `json:"source_hash"`
	StartedAtMs    int64  `json:"started_at_ms"`
	FinishedAtMs   *int64 `json:"finished_at_ms,omitempty"`
}

type CellOutput struct {
	Kind    string         `json:"kind"`
	Headers []string       `json:"headers,omitempty"`
	Rows    [][]any        `json:"rows,omitempty"`
	Took    float64        `json:"took,omitempty"`
	Message string         `json:"message,omitempty"`
	Display string         `json:"display,omitempty"`
	Code    string         `json:"code,omitempty"`
	Data    map[string]any `json:"data,omitempty"`
}

type CellRuntimeState struct {
	Run    *CellRun    `json:"run,omitempty"`
	Output *CellOutput `json:"output,omitempty"`
}

type NotebookDocument struct {
	Notebook Notebook                     `json:"notebook"`
	Cells    []NotebookCell               `json:"cells"`
	Runtime  map[string]*CellRuntimeState `json:"runtime,omitempty"`
}

type MutationResult struct {
	Document *NotebookDocument `json:"document,omitempty"`
	Cell     *NotebookCell     `json:"cell,omitempty"`
}

type TimelineSnapshotLink struct {
	NotebookID      string `json:"notebook_id"`
	CellID          string `json:"cell_id,omitempty"`
	RunID           string `json:"run_id,omitempty"`
	ConvID          string `json:"conv_id"`
	SnapshotVersion uint64 `json:"snapshot_version"`
	CreatedAtMs     int64  `json:"created_at_ms"`
}
