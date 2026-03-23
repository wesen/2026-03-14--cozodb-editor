package notebook

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOpenStoreWithConfigUsesNotebookProfileForDefaultNotebook(t *testing.T) {
	store, err := OpenStoreWithConfig(StoreConfig{
		DBPath: filepath.Join(t.TempDir(), "app.sqlite"),
		Profile: NotebookProfile{
			DefaultNotebookID:    "nbk_default_javascript_test",
			DefaultLanguage:      "javascript",
			DefaultNotebookTitle: "JavaScript Notebook",
			StarterCells: []StarterCellTemplate{
				{
					Kind:   "markdown",
					Source: "## JavaScript Notebook",
				},
				{
					Kind:   "code",
					Source: "console.log('hello')",
				},
			},
		},
	})
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	document, err := store.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)
	require.Equal(t, "nbk_default_javascript_test", document.Notebook.ID)
	require.Equal(t, "JavaScript Notebook", document.Notebook.Title)
	require.Equal(t, "javascript", document.Notebook.Language)
	require.Len(t, document.Cells, 2)
	require.Equal(t, "## JavaScript Notebook", document.Cells[0].Source)
	require.Equal(t, "console.log('hello')", document.Cells[1].Source)
}

func TestOpenStoreWithConfigKeepsDefaultNotebooksDistinctAcrossProfiles(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "app.sqlite")

	cozoStore, err := OpenStoreWithConfig(StoreConfig{
		DBPath:  dbPath,
		Profile: currentCozoNotebookProfile(),
	})
	require.NoError(t, err)
	t.Cleanup(func() { _ = cozoStore.Close() })

	sqliteStore, err := OpenStoreWithConfig(StoreConfig{
		DBPath:  dbPath,
		Profile: currentSQLiteNotebookProfile(),
	})
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqliteStore.Close() })

	cozoDoc, err := cozoStore.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)
	sqliteDoc, err := sqliteStore.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	require.Equal(t, currentCozoNotebookProfile().DefaultNotebookID, cozoDoc.Notebook.ID)
	require.Equal(t, "cozoscript", cozoDoc.Notebook.Language)
	require.Equal(t, currentSQLiteNotebookProfile().DefaultNotebookID, sqliteDoc.Notebook.ID)
	require.Equal(t, "sql", sqliteDoc.Notebook.Language)
	require.NotEqual(t, cozoDoc.Notebook.ID, sqliteDoc.Notebook.ID)
	require.NotEqual(t, cozoDoc.Cells[1].Source, sqliteDoc.Cells[1].Source)
}
