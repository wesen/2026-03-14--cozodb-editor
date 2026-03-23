package notebook

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDefaultPresetRegistryNames(t *testing.T) {
	registry := DefaultPresetRegistry()
	require.Equal(t, []string{"cozo", "javascript", "sqlite"}, registry.Names())
}

func TestPresetRegistryOpenUnknownPreset(t *testing.T) {
	registry := DefaultPresetRegistry()

	module, err := registry.Open("does-not-exist", PresetOptions{})
	require.Nil(t, module)
	require.EqualError(t, err, `unknown preset "does-not-exist" (available: cozo, javascript, sqlite)`)
}

func TestDefaultPresetRegistryOpensRegisteredPresets(t *testing.T) {
	t.Parallel()

	registry := DefaultPresetRegistry()
	basePaths := BasePaths{
		Notebooks:     "/preset/notebooks",
		NotebookCells: "/preset/notebook-cells",
		ResetKernel:   "/preset/runtime/reset-kernel",
		HintsWS:       "/preset/ws/hints",
	}

	tests := []struct {
		name    string
		options PresetOptions
	}{
		{
			name: "cozo",
			options: PresetOptions{
				AppDBPath:  filepath.Join(t.TempDir(), "cozo-app.sqlite"),
				BasePaths:  basePaths,
				CozoEngine: "mem",
			},
		},
		{
			name: "javascript",
			options: PresetOptions{
				AppDBPath: filepath.Join(t.TempDir(), "javascript-app.sqlite"),
				BasePaths: basePaths,
			},
		},
		{
			name: "sqlite",
			options: PresetOptions{
				AppDBPath:         filepath.Join(t.TempDir(), "sqlite-app.sqlite"),
				BasePaths:         basePaths,
				SQLiteRuntimePath: filepath.Join(t.TempDir(), "runtime.sqlite"),
			},
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			module, err := registry.Open(tt.name, tt.options)
			require.NoError(t, err)
			t.Cleanup(func() { _ = module.Close() })

			mux := http.NewServeMux()
			module.MountHTTP(mux)

			recorder := httptest.NewRecorder()
			mux.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/preset/notebooks/bootstrap", nil))
			require.Equal(t, http.StatusOK, recorder.Code)
		})
	}
}
