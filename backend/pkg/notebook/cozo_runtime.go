package notebook

import "github.com/wesen/cozodb-editor/backend/pkg/cozo"

type cozoRuntimeAdapter struct {
	manager *cozo.Manager
}

func newCozoRuntime(manager *cozo.Manager) Runtime {
	return &cozoRuntimeAdapter{manager: manager}
}

func (r *cozoRuntimeAdapter) Query(script string, params map[string]any) (*RuntimeQueryResult, error) {
	result, err := r.manager.Query(script, params)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}
	return &RuntimeQueryResult{
		OK:      result.OK,
		Headers: append([]string(nil), result.Headers...),
		Rows:    append([][]any(nil), result.Rows...),
		Took:    result.Took,
		Code:    result.Code,
		Message: result.Message,
		Display: result.Display,
	}, nil
}

func (r *cozoRuntimeAdapter) ListRelations() ([]string, error) {
	return r.manager.ListRelations()
}

func (r *cozoRuntimeAdapter) DescribeRelation(name string) (*RuntimeRelationInfo, error) {
	info, err := r.manager.DescribeRelation(name)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, nil
	}

	return &RuntimeRelationInfo{
		Name:   info.Name,
		Keys:   mapCozoColumns(info.Keys),
		Values: mapCozoColumns(info.Values),
	}, nil
}

func (r *cozoRuntimeAdapter) GetSchema() (string, error) {
	return r.manager.GetSchema()
}

func (r *cozoRuntimeAdapter) Reset() (int64, error) {
	return r.manager.Reset()
}

func mapCozoColumns(columns []cozo.ColumnInfo) []RuntimeColumnInfo {
	if len(columns) == 0 {
		return nil
	}

	ret := make([]RuntimeColumnInfo, 0, len(columns))
	for _, column := range columns {
		ret = append(ret, RuntimeColumnInfo{
			Name:       column.Name,
			Type:       column.Type,
			HasDefault: column.HasDefault,
		})
	}
	return ret
}
