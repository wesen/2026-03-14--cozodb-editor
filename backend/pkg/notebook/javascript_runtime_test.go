package notebook

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestJavaScriptRuntimeShapesArrayOfObjectsAsTable(t *testing.T) {
	runtime, err := OpenJavaScriptRuntime(JavaScriptRuntimeConfig{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = runtime.Close() })

	result, err := runtime.Query(`
globalThis.users = [
  { name: "Ada", age: 31 },
  { name: "Grace", age: 42 },
]
globalThis.users
`, nil)
	require.NoError(t, err)
	require.True(t, result.OK)
	require.Equal(t, []string{"age", "name"}, result.Headers)
	require.Equal(t, [][]any{{int64(31), "Ada"}, {int64(42), "Grace"}}, result.Rows)

	names, err := runtime.ListRelations()
	require.NoError(t, err)
	require.Contains(t, names, "notebook")
	require.Contains(t, names, "users")
}

func TestJavaScriptRuntimeDescribeRelationAndReset(t *testing.T) {
	runtime, err := OpenJavaScriptRuntime(JavaScriptRuntimeConfig{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = runtime.Close() })

	_, err = runtime.Query(`
globalThis.settings = { mode: "demo", retries: 3 }
globalThis.settings
`, nil)
	require.NoError(t, err)

	info, err := runtime.DescribeRelation("settings")
	require.NoError(t, err)
	require.Equal(t, "settings", info.Name)
	require.Equal(t, []RuntimeColumnInfo{
		{Name: "mode", Type: "string"},
		{Name: "retries", Type: "number"},
	}, info.Values)

	schema, err := runtime.GetSchema()
	require.NoError(t, err)
	require.Contains(t, schema, "notebook:")
	require.Contains(t, schema, "settings:")

	generation, err := runtime.Reset()
	require.NoError(t, err)
	require.Equal(t, int64(2), generation)

	names, err := runtime.ListRelations()
	require.NoError(t, err)
	require.Contains(t, names, "notebook")
	require.NotContains(t, names, "settings")
}
