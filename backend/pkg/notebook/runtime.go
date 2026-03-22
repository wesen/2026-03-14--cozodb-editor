package notebook

import "github.com/wesen/cozodb-editor/backend/pkg/cozo"

type Runtime interface {
	DescribeRelation(name string) (*cozo.RelationInfo, error)
	GetSchema() (string, error)
	ListRelations() ([]string, error)
	Query(script string, params map[string]any) (*cozo.QueryResult, error)
	Reset() (int64, error)
}
