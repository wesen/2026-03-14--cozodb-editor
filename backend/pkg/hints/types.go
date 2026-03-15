package hints

// HintResponse is the structured response from the AI hint engine.
type HintResponse struct {
	Text    string   `json:"text"`
	Code    *string  `json:"code"`
	Chips   []string `json:"chips"`
	Docs    []DocRef `json:"docs"`
	Warning *string  `json:"warning"`
}

// DocRef is a reference to documentation.
type DocRef struct {
	Title   string `json:"title"`
	Section string `json:"section"`
	Body    string `json:"body"`
}

// HintRequest is a request for AI assistance.
type HintRequest struct {
	Question string   `json:"question"`
	Schema   string   `json:"schema"`
	History  []string `json:"history,omitempty"`
}

// DiagnosisRequest is a request for AI error diagnosis.
type DiagnosisRequest struct {
	Error  string `json:"error"`
	Script string `json:"script"`
	Schema string `json:"schema"`
}
