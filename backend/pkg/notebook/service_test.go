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
	runtime, err := cozo.NewManager("mem", "")
	require.NoError(t, err)
	t.Cleanup(func() { runtime.Close() })

	svc, err := OpenService(filepath.Join(t.TempDir(), "app.sqlite"), runtime)
	require.NoError(t, err)
	t.Cleanup(func() { _ = svc.Close() })

	doc, err := svc.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)
	require.Len(t, doc.Cells, 2)

	cellRuntime, err := svc.RunCell(context.Background(), "cell_query")
	require.NoError(t, err)
	require.NotNil(t, cellRuntime.Run)
	require.Equal(t, "complete", cellRuntime.Run.Status)
	require.NotNil(t, cellRuntime.Output)
	require.Equal(t, "query_result", cellRuntime.Output.Kind)
	require.Len(t, cellRuntime.Output.Rows, 3)

	reloaded, err := svc.GetNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Contains(t, reloaded.Runtime, "cell_query")
	require.NotNil(t, reloaded.Runtime["cell_query"].Output)
	require.Equal(t, "query_result", reloaded.Runtime["cell_query"].Output.Kind)
	require.Len(t, reloaded.Runtime["cell_query"].Output.Rows, 3)
}

func TestServiceClearNotebookRestoresStarterCellsAndClearsRuntime(t *testing.T) {
	runtime, err := cozo.NewManager("mem", "")
	require.NoError(t, err)
	t.Cleanup(func() { runtime.Close() })

	svc, err := OpenService(filepath.Join(t.TempDir(), "app.sqlite"), runtime)
	require.NoError(t, err)
	t.Cleanup(func() { _ = svc.Close() })

	doc, err := svc.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)
	require.Len(t, doc.Cells, 2)

	inserted, err := svc.InsertCell(context.Background(), defaultNotebookID, doc.Cells[1].ID, "code", "?[x] <- [[42]]")
	require.NoError(t, err)
	require.Len(t, inserted.Document.Cells, 3)

	_, err = svc.RunCell(context.Background(), "cell_query")
	require.NoError(t, err)

	cleared, err := svc.ClearNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Len(t, cleared.Cells, 2)
	require.Equal(t, "markdown", cleared.Cells[0].Kind)
	require.Equal(t, "code", cleared.Cells[1].Kind)
	require.Empty(t, cleared.Runtime)

	var runCount int
	err = svc.store.db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM nb_runs WHERE notebook_id = ?`, defaultNotebookID).Scan(&runCount)
	require.NoError(t, err)
	require.Zero(t, runCount)

	var snapshotCount int
	err = svc.store.db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM nb_link_timeline_snapshots WHERE notebook_id = ?`, defaultNotebookID).Scan(&snapshotCount)
	require.NoError(t, err)
	require.Zero(t, snapshotCount)
}

func TestServiceResetKernelSwapsRuntimeAndClearsPersistedOutputs(t *testing.T) {
	runtime, err := cozo.NewManager("mem", "")
	require.NoError(t, err)
	t.Cleanup(func() { runtime.Close() })

	svc, err := OpenService(filepath.Join(t.TempDir(), "app.sqlite"), runtime)
	require.NoError(t, err)
	t.Cleanup(func() { _ = svc.Close() })

	_, err = svc.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	_, err = runtime.Query(":create users {name: String => age: Int}", nil)
	require.NoError(t, err)
	beforeResetRelations, err := runtime.ListRelations()
	require.NoError(t, err)
	require.Contains(t, beforeResetRelations, "users")

	_, err = svc.RunCell(context.Background(), "cell_query")
	require.NoError(t, err)

	result, err := svc.ResetKernel(context.Background())
	require.NoError(t, err)
	require.True(t, result.OK)
	require.Equal(t, int64(2), result.KernelGeneration)

	afterResetRelations, err := runtime.ListRelations()
	require.NoError(t, err)
	require.NotContains(t, afterResetRelations, "users")

	reloaded, err := svc.GetNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Empty(t, reloaded.Runtime)

	var runCount int
	err = svc.store.db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM nb_runs`).Scan(&runCount)
	require.NoError(t, err)
	require.Zero(t, runCount)
}
