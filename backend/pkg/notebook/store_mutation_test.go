package notebook

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func openTestStore(t *testing.T) *Store {
	t.Helper()

	store, err := OpenStore(filepath.Join(t.TempDir(), "notebook.sqlite"))
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })
	return store
}

func densePositions(cells []NotebookCell) []int {
	out := make([]int, 0, len(cells))
	for _, cell := range cells {
		out = append(out, cell.Position)
	}
	return out
}

func assertDenseNotebookPositions(t *testing.T, doc *NotebookDocument) {
	t.Helper()

	require.NotNil(t, doc)
	for index, cell := range doc.Cells {
		require.Equal(t, index, cell.Position, "cell %s should have dense position %d", cell.ID, index)
	}
}

func TestStoreInsertCellMaintainsDensePositions(t *testing.T) {
	store := openTestStore(t)

	doc, err := store.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)
	require.Len(t, doc.Cells, 2)

	inserted, err := store.InsertCell(context.Background(), defaultNotebookID, "cell_intro", "code", "?[x] := [[42]]")
	require.NoError(t, err)
	require.NotNil(t, inserted)

	reloaded, err := store.GetNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Len(t, reloaded.Cells, 3)
	assertDenseNotebookPositions(t, reloaded)
	require.Equal(t, []int{0, 1, 2}, densePositions(reloaded.Cells))
	require.Equal(t, "cell_intro", reloaded.Cells[0].ID)
	require.Equal(t, inserted.ID, reloaded.Cells[1].ID)
	require.Equal(t, "cell_query", reloaded.Cells[2].ID)
}

func TestStoreRepeatedInsertAfterSameCellMaintainsDensePositions(t *testing.T) {
	store := openTestStore(t)

	_, err := store.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	firstInsert, err := store.InsertCell(context.Background(), defaultNotebookID, "cell_intro", "code", "?[x] := [[1]]")
	require.NoError(t, err)
	secondInsert, err := store.InsertCell(context.Background(), defaultNotebookID, "cell_intro", "code", "?[x] := [[2]]")
	require.NoError(t, err)

	reloaded, err := store.GetNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Len(t, reloaded.Cells, 4)
	assertDenseNotebookPositions(t, reloaded)
	require.Equal(t, "cell_intro", reloaded.Cells[0].ID)
	require.Equal(t, secondInsert.ID, reloaded.Cells[1].ID)
	require.Equal(t, firstInsert.ID, reloaded.Cells[2].ID)
	require.Equal(t, "cell_query", reloaded.Cells[3].ID)
}

func TestStoreMoveCellMaintainsDensePositions(t *testing.T) {
	store := openTestStore(t)

	_, err := store.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	inserted, err := store.InsertCell(context.Background(), defaultNotebookID, "cell_query", "markdown", "middle")
	require.NoError(t, err)

	err = store.MoveCell(context.Background(), inserted.ID, 1)
	require.NoError(t, err)

	reloaded, err := store.GetNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Len(t, reloaded.Cells, 3)
	assertDenseNotebookPositions(t, reloaded)
	require.Equal(t, "cell_intro", reloaded.Cells[0].ID)
	require.Equal(t, inserted.ID, reloaded.Cells[1].ID)
	require.Equal(t, "cell_query", reloaded.Cells[2].ID)
}

func TestStoreDeleteCellMaintainsDensePositions(t *testing.T) {
	store := openTestStore(t)

	_, err := store.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	inserted, err := store.InsertCell(context.Background(), defaultNotebookID, "cell_intro", "code", "?[x] := [[42]]")
	require.NoError(t, err)

	err = store.DeleteCell(context.Background(), inserted.ID)
	require.NoError(t, err)

	reloaded, err := store.GetNotebook(context.Background(), defaultNotebookID)
	require.NoError(t, err)
	require.Len(t, reloaded.Cells, 2)
	assertDenseNotebookPositions(t, reloaded)
	require.Equal(t, "cell_intro", reloaded.Cells[0].ID)
	require.Equal(t, "cell_query", reloaded.Cells[1].ID)
}
