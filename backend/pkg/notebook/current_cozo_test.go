package notebook

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOpenCurrentCozoModuleMountsCustomPaths(t *testing.T) {
	module, err := OpenCurrentCozoModule(CurrentCozoModuleConfig{
		Engine:    "mem",
		AppDBPath: filepath.Join(t.TempDir(), "app.sqlite"),
		BasePaths: BasePaths{
			Notebooks:     "/preset/notebooks",
			NotebookCells: "/preset/notebook-cells",
			ResetKernel:   "/preset/runtime/reset-kernel",
			HintsWS:       "/preset/ws/hints",
		},
	})
	require.NoError(t, err)
	t.Cleanup(func() { _ = module.Close() })

	mux := http.NewServeMux()
	module.MountHTTP(mux)

	recorder := httptest.NewRecorder()
	mux.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/preset/notebooks/bootstrap", nil))
	require.Equal(t, http.StatusOK, recorder.Code)
}
