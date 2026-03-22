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
	require.Equal(t, "JavaScript Notebook", document.Notebook.Title)
	require.Equal(t, "javascript", document.Notebook.Language)
	require.Len(t, document.Cells, 2)
	require.Equal(t, "## JavaScript Notebook", document.Cells[0].Source)
	require.Equal(t, "console.log('hello')", document.Cells[1].Source)
}
