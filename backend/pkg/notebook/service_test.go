package notebook

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/wesen/cozodb-editor/backend/pkg/cozo"
)

func TestEnsureDefaultNotebookCreatesExpectedCells(t *testing.T) {
	store, err := OpenStore(filepath.Join(t.TempDir(), "notebook.sqlite"))
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	doc, err := store.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)
	require.Equal(t, defaultNotebookID, doc.Notebook.ID)
	require.Len(t, doc.Cells, 2)
	require.Equal(t, "markdown", doc.Cells[0].Kind)
	require.Equal(t, "code", doc.Cells[1].Kind)
}

func TestServiceRunCellHydratesLatestRuntime(t *testing.T) {
	cozoDB, err := cozo.NewDB("mem", "")
	require.NoError(t, err)
	t.Cleanup(func() { cozoDB.Close() })

	svc, err := OpenService(filepath.Join(t.TempDir(), "app.sqlite"), cozoDB)
	require.NoError(t, err)
	t.Cleanup(func() { _ = svc.Close() })

	doc, err := svc.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)
	require.Len(t, doc.Cells, 2)

	runtime, err := svc.RunCell(context.Background(), "cell_query")
	require.NoError(t, err)
	require.NotNil(t, runtime.Run)
	require.Equal(t, "complete", runtime.Run.Status)
	require.NotNil(t, runtime.Output)
	require.Equal(t, "query_result", runtime.Output.Kind)
	require.Len(t, runtime.Output.Rows, 3)

	reloaded, err := svc.GetNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Contains(t, reloaded.Runtime, "cell_query")
	require.NotNil(t, reloaded.Runtime["cell_query"].Output)
	require.Equal(t, "query_result", reloaded.Runtime["cell_query"].Output.Kind)
	require.Len(t, reloaded.Runtime["cell_query"].Output.Rows, 3)
}
