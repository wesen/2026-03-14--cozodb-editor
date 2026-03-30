package notebook

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
	ggjengine "github.com/go-go-golems/go-go-goja/engine"
)

const javascriptNotebookModuleName = "notebook"

type JavaScriptRuntimeConfig struct {
	IncludeDefaultModules bool
}

type JavaScriptRuntime struct {
	factory         *ggjengine.Factory
	baselineGlobals map[string]struct{}
	generation      int64
	moduleCatalog   map[string]RuntimeRelationInfo
	mu              sync.RWMutex
	runtime         *ggjengine.Runtime
}

func OpenJavaScriptRuntime(config JavaScriptRuntimeConfig) (*JavaScriptRuntime, error) {
	builder := ggjengine.NewBuilder().WithModules(ggjengine.NativeModuleSpec{
		ModuleID:   "native:notebook",
		ModuleName: javascriptNotebookModuleName,
		Loader:     loadJavaScriptNotebookModule,
	})
	if config.IncludeDefaultModules {
		builder = builder.WithModules(ggjengine.DefaultRegistryModules())
	}

	factory, err := builder.Build()
	if err != nil {
		return nil, fmt.Errorf("build javascript runtime factory: %w", err)
	}

	runtime, baselineGlobals, err := openJavaScriptOwnedRuntime(factory)
	if err != nil {
		return nil, err
	}

	return &JavaScriptRuntime{
		baselineGlobals: baselineGlobals,
		factory:         factory,
		generation:      1,
		moduleCatalog: map[string]RuntimeRelationInfo{
			javascriptNotebookModuleName: {
				Name: javascriptNotebookModuleName,
				Values: []RuntimeColumnInfo{
					{Name: "version", Type: "function"},
					{Name: "table", Type: "function"},
					{Name: "inspect", Type: "function"},
				},
			},
		},
		runtime: runtime,
	}, nil
}

func (r *JavaScriptRuntime) Query(script string, params map[string]any) (*RuntimeQueryResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.runtime == nil {
		return nil, fmt.Errorf("javascript runtime is closed")
	}

	started := time.Now()
	raw, err := r.runtime.Owner.Call(context.Background(), "notebook.javascript.query", func(_ context.Context, vm *goja.Runtime) (any, error) {
		if err := vm.Set("__notebookParams", paramsOrEmpty(params)); err != nil {
			return nil, err
		}
		value, err := vm.RunString(script)
		if err != nil {
			return nil, err
		}
		return exportGojaValue(value), nil
	})
	if err != nil {
		return nil, err
	}

	headers, rows := shapeJavaScriptValueForNotebook(raw)
	return &RuntimeQueryResult{
		OK:      true,
		Headers: headers,
		Rows:    rows,
		Took:    time.Since(started).Seconds(),
	}, nil
}

func (r *JavaScriptRuntime) ListRelations() ([]string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.runtime == nil {
		return nil, fmt.Errorf("javascript runtime is closed")
	}

	names := make([]string, 0, len(r.moduleCatalog))
	for name := range r.moduleCatalog {
		names = append(names, name)
	}

	globals, err := r.currentUserGlobalsLocked()
	if err != nil {
		return nil, err
	}
	names = append(names, globals...)
	sort.Strings(names)
	return names, nil
}

func (r *JavaScriptRuntime) DescribeRelation(name string) (*RuntimeRelationInfo, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.runtime == nil {
		return nil, fmt.Errorf("javascript runtime is closed")
	}

	if info, ok := r.moduleCatalog[name]; ok {
		copyInfo := info
		copyInfo.Keys = append([]RuntimeColumnInfo(nil), info.Keys...)
		copyInfo.Values = append([]RuntimeColumnInfo(nil), info.Values...)
		return &copyInfo, nil
	}

	raw, err := r.runtime.Owner.Call(context.Background(), "notebook.javascript.describe", func(_ context.Context, vm *goja.Runtime) (any, error) {
		value := vm.Get(name)
		if goja.IsUndefined(value) {
			return nil, nil
		}
		return describeGojaValue(name, value), nil
	})
	if err != nil {
		return nil, err
	}
	if raw == nil {
		return nil, fmt.Errorf("runtime object %q not found", name)
	}

	info, ok := raw.(*RuntimeRelationInfo)
	if !ok {
		return nil, fmt.Errorf("unexpected runtime description for %q", name)
	}
	return info, nil
}

func (r *JavaScriptRuntime) GetSchema() (string, error) {
	names, err := r.ListRelations()
	if err != nil {
		return "", err
	}
	if len(names) == 0 {
		return "(no runtime objects)", nil
	}

	lines := make([]string, 0, len(names))
	for _, name := range names {
		info, err := r.DescribeRelation(name)
		if err != nil {
			lines = append(lines, fmt.Sprintf("%s: (error: %v)", name, err))
			continue
		}
		lines = append(lines, formatRuntimeRelation(info))
	}
	return strings.Join(lines, "\n"), nil
}

func (r *JavaScriptRuntime) Reset() (int64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.runtime == nil {
		return r.generation, fmt.Errorf("javascript runtime is closed")
	}

	nextRuntime, baselineGlobals, err := openJavaScriptOwnedRuntime(r.factory)
	if err != nil {
		return r.generation, err
	}

	previous := r.runtime
	r.runtime = nextRuntime
	r.baselineGlobals = baselineGlobals
	r.generation++
	generation := r.generation

	if err := previous.Close(context.Background()); err != nil {
		return generation, err
	}

	return generation, nil
}

func (r *JavaScriptRuntime) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.runtime == nil {
		return nil
	}

	err := r.runtime.Close(context.Background())
	r.runtime = nil
	return err
}

func (r *JavaScriptRuntime) currentUserGlobalsLocked() ([]string, error) {
	raw, err := r.runtime.Owner.Call(context.Background(), "notebook.javascript.globals", func(_ context.Context, vm *goja.Runtime) (any, error) {
		return append([]string(nil), vm.GlobalObject().Keys()...), nil
	})
	if err != nil {
		return nil, err
	}

	keys, ok := raw.([]string)
	if !ok {
		return nil, fmt.Errorf("unexpected global key result")
	}

	ret := make([]string, 0, len(keys))
	for _, key := range keys {
		if _, isBaseline := r.baselineGlobals[key]; isBaseline {
			continue
		}
		if strings.HasPrefix(key, "__") {
			continue
		}
		ret = append(ret, key)
	}
	sort.Strings(ret)
	return ret, nil
}

func openJavaScriptOwnedRuntime(factory *ggjengine.Factory) (*ggjengine.Runtime, map[string]struct{}, error) {
	runtime, err := factory.NewRuntime(context.Background())
	if err != nil {
		return nil, nil, fmt.Errorf("open javascript runtime: %w", err)
	}

	raw, err := runtime.Owner.Call(context.Background(), "notebook.javascript.baseline-globals", func(_ context.Context, vm *goja.Runtime) (any, error) {
		return append([]string(nil), vm.GlobalObject().Keys()...), nil
	})
	if err != nil {
		_ = runtime.Close(context.Background())
		return nil, nil, err
	}

	keys, ok := raw.([]string)
	if !ok {
		_ = runtime.Close(context.Background())
		return nil, nil, fmt.Errorf("unexpected baseline globals result")
	}

	baseline := make(map[string]struct{}, len(keys))
	for _, key := range keys {
		baseline[key] = struct{}{}
	}

	return runtime, baseline, nil
}

func loadJavaScriptNotebookModule(vm *goja.Runtime, moduleObj *goja.Object) {
	exports := moduleObj.Get("exports").(*goja.Object)
	_ = exports.Set("version", func() string {
		return "cozodb-editor-javascript-notebook"
	})
	_ = exports.Set("table", func(value any) any {
		return value
	})
	_ = exports.Set("inspect", func(value any) string {
		payload, err := json.MarshalIndent(value, "", "  ")
		if err != nil {
			return fmt.Sprintf("%v", value)
		}
		return string(payload)
	})
}

func paramsOrEmpty(params map[string]any) map[string]any {
	if params == nil {
		return map[string]any{}
	}
	return params
}

func exportGojaValue(value goja.Value) any {
	if value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		return nil
	}
	return value.Export()
}

func shapeJavaScriptValueForNotebook(value any) ([]string, [][]any) {
	switch v := value.(type) {
	case nil:
		return []string{"value"}, [][]any{{"undefined"}}
	case []any:
		return shapeJavaScriptSlice(v)
	case map[string]any:
		return shapeJavaScriptObject(v)
	default:
		return []string{"value"}, [][]any{{normalizeNotebookCellValue(v)}}
	}
}

func shapeJavaScriptSlice(values []any) ([]string, [][]any) {
	if len(values) == 0 {
		return []string{"value"}, [][]any{}
	}

	if headers, rows, ok := shapeArrayOfObjects(values); ok {
		return headers, rows
	}
	if headers, rows, ok := shapeArrayOfArrays(values); ok {
		return headers, rows
	}

	rows := make([][]any, 0, len(values))
	for _, value := range values {
		rows = append(rows, []any{normalizeNotebookCellValue(value)})
	}
	return []string{"value"}, rows
}

func shapeArrayOfObjects(values []any) ([]string, [][]any, bool) {
	headers := []string{}
	seen := map[string]struct{}{}
	objects := make([]map[string]any, 0, len(values))

	for _, value := range values {
		object, ok := value.(map[string]any)
		if !ok {
			return nil, nil, false
		}
		objects = append(objects, object)
		for _, key := range sortedMapKeys(object) {
			if _, alreadySeen := seen[key]; alreadySeen {
				continue
			}
			seen[key] = struct{}{}
			headers = append(headers, key)
		}
	}

	rows := make([][]any, 0, len(objects))
	for _, object := range objects {
		row := make([]any, 0, len(headers))
		for _, header := range headers {
			row = append(row, normalizeNotebookCellValue(object[header]))
		}
		rows = append(rows, row)
	}
	return headers, rows, true
}

func shapeArrayOfArrays(values []any) ([]string, [][]any, bool) {
	rows := make([][]any, 0, len(values))
	width := -1

	for _, value := range values {
		rowValues, ok := value.([]any)
		if !ok {
			return nil, nil, false
		}
		if width == -1 {
			width = len(rowValues)
		}
		if len(rowValues) != width {
			return nil, nil, false
		}
		row := make([]any, 0, len(rowValues))
		for _, cell := range rowValues {
			row = append(row, normalizeNotebookCellValue(cell))
		}
		rows = append(rows, row)
	}

	headers := make([]string, 0, width)
	for index := 0; index < width; index++ {
		headers = append(headers, fmt.Sprintf("col_%d", index+1))
	}
	return headers, rows, true
}

func shapeJavaScriptObject(object map[string]any) ([]string, [][]any) {
	keys := sortedMapKeys(object)
	rows := make([][]any, 0, len(keys))
	for _, key := range keys {
		rows = append(rows, []any{key, normalizeNotebookCellValue(object[key])})
	}
	return []string{"key", "value"}, rows
}

func normalizeNotebookCellValue(value any) any {
	switch v := value.(type) {
	case nil:
		return "null"
	case map[string]any, []any:
		payload, err := json.Marshal(v)
		if err != nil {
			return fmt.Sprintf("%v", v)
		}
		return string(payload)
	default:
		return v
	}
}

func describeGojaValue(name string, value goja.Value) *RuntimeRelationInfo {
	if value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		return &RuntimeRelationInfo{
			Name: name,
			Values: []RuntimeColumnInfo{
				{Name: "value", Type: "undefined"},
			},
		}
	}

	if _, ok := goja.AssertFunction(value); ok {
		return &RuntimeRelationInfo{
			Name: name,
			Values: []RuntimeColumnInfo{
				{Name: name, Type: "function"},
			},
		}
	}

	exported := value.Export()
	if object, ok := exported.(map[string]any); ok {
		fields := make([]RuntimeColumnInfo, 0, len(object))
		for _, key := range sortedMapKeys(object) {
			fields = append(fields, RuntimeColumnInfo{
				Name: key,
				Type: describeExportedType(object[key]),
			})
		}
		return &RuntimeRelationInfo{Name: name, Values: fields}
	}

	return &RuntimeRelationInfo{
		Name: name,
		Values: []RuntimeColumnInfo{
			{Name: "value", Type: describeExportedType(exported)},
		},
	}
}

func describeExportedType(value any) string {
	switch value.(type) {
	case nil:
		return "null"
	case bool:
		return "boolean"
	case string:
		return "string"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return "number"
	case []any:
		return "array"
	case map[string]any:
		return "object"
	default:
		if value == nil {
			return "unknown"
		}
		return reflect.TypeOf(value).String()
	}
}

func formatRuntimeRelation(info *RuntimeRelationInfo) string {
	if info == nil {
		return "(nil relation)"
	}

	parts := make([]string, 0, len(info.Keys)+len(info.Values))
	for _, key := range info.Keys {
		parts = append(parts, fmt.Sprintf("key %s:%s", key.Name, key.Type))
	}
	for _, value := range info.Values {
		parts = append(parts, fmt.Sprintf("%s:%s", value.Name, value.Type))
	}
	if len(parts) == 0 {
		return fmt.Sprintf("%s: (no fields)", info.Name)
	}
	return fmt.Sprintf("%s: %s", info.Name, strings.Join(parts, ", "))
}

func sortedMapKeys(object map[string]any) []string {
	keys := make([]string, 0, len(object))
	for key := range object {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
