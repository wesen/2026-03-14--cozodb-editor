package notebook

type RuntimeColumnInfo struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	HasDefault bool   `json:"has_default"`
}

type RuntimeRelationInfo struct {
	Name   string              `json:"name"`
	Keys   []RuntimeColumnInfo `json:"keys"`
	Values []RuntimeColumnInfo `json:"values"`
}

type RuntimeQueryResult struct {
	OK      bool     `json:"ok"`
	Headers []string `json:"headers,omitempty"`
	Rows    [][]any  `json:"rows,omitempty"`
	Took    float64  `json:"took,omitempty"`
	Code    string   `json:"code,omitempty"`
	Message string   `json:"message,omitempty"`
	Display string   `json:"display,omitempty"`
}

type Runtime interface {
	DescribeRelation(name string) (*RuntimeRelationInfo, error)
	GetSchema() (string, error)
	ListRelations() ([]string, error)
	Query(script string, params map[string]any) (*RuntimeQueryResult, error)
	Reset() (int64, error)
}
