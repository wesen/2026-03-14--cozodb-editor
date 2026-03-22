package notebook

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func newNotebookHTTPTestMux(t *testing.T) (*http.ServeMux, *Service) {
	t.Helper()

	svc, _ := openTestService(t)
	_, err := svc.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	mux := http.NewServeMux()
	MountHTTPRoutes(mux, svc)
	return mux, svc
}

func newTestModule(t *testing.T, basePaths BasePaths) *Module {
	t.Helper()

	runtime, err := openTestRuntime()
	require.NoError(t, err)
	t.Cleanup(func() { runtime.Close() })

	store, err := OpenStore(t.TempDir() + "/app.sqlite")
	require.NoError(t, err)

	timeline, err := OpenSQLiteTimelineStore(store.DBPath())
	require.NoError(t, err)

	module, err := NewModule(ModuleConfig{
		ServiceConfig: ServiceConfig{
			Runtime:  runtime,
			Store:    store,
			Timeline: timeline,
		},
		BasePaths: basePaths,
	})
	require.NoError(t, err)

	t.Cleanup(func() { _ = module.Close() })
	return module
}

func mustJSONRequest(t *testing.T, method string, path string, body any) *http.Request {
	t.Helper()

	if body == nil {
		return httptest.NewRequest(method, path, nil)
	}
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(method, path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func TestMountHTTPRoutesBootstrapNotebook(t *testing.T) {
	mux, _ := newNotebookHTTPTestMux(t)

	recorder := httptest.NewRecorder()
	mux.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/notebooks/bootstrap", nil))

	require.Equal(t, http.StatusOK, recorder.Code)

	var doc NotebookDocument
	err := json.NewDecoder(recorder.Body).Decode(&doc)
	require.NoError(t, err)
	require.Equal(t, defaultNotebookID, doc.Notebook.ID)
	require.Len(t, doc.Cells, 2)
}

func TestMountHTTPRoutesNotebookMutationFlow(t *testing.T) {
	mux, _ := newNotebookHTTPTestMux(t)

	renameRecorder := httptest.NewRecorder()
	mux.ServeHTTP(renameRecorder, mustJSONRequest(t, http.MethodPatch, "/api/notebooks/"+defaultNotebookID, map[string]any{
		"title": "Renamed notebook",
	}))
	require.Equal(t, http.StatusOK, renameRecorder.Code)

	var renamed NotebookDocument
	err := json.NewDecoder(renameRecorder.Body).Decode(&renamed)
	require.NoError(t, err)
	require.Equal(t, "Renamed notebook", renamed.Notebook.Title)

	insertRecorder := httptest.NewRecorder()
	mux.ServeHTTP(insertRecorder, mustJSONRequest(t, http.MethodPost, "/api/notebooks/"+defaultNotebookID+"/cells", map[string]any{
		"after_cell_id": "cell_query",
		"kind":          "code",
		"source":        "?[x] <- [[42]]",
	}))
	require.Equal(t, http.StatusCreated, insertRecorder.Code)

	var mutation MutationResult
	err = json.NewDecoder(insertRecorder.Body).Decode(&mutation)
	require.NoError(t, err)
	require.Len(t, mutation.Document.Cells, 3)

	runRecorder := httptest.NewRecorder()
	mux.ServeHTTP(runRecorder, httptest.NewRequest(http.MethodPost, "/api/notebook-cells/cell_query/run", nil))
	require.Equal(t, http.StatusOK, runRecorder.Code)

	var runtime CellRuntimeState
	err = json.NewDecoder(runRecorder.Body).Decode(&runtime)
	require.NoError(t, err)
	require.Equal(t, "complete", runtime.Run.Status)

	resetRecorder := httptest.NewRecorder()
	mux.ServeHTTP(resetRecorder, httptest.NewRequest(http.MethodPost, "/api/runtime/reset-kernel", nil))
	require.Equal(t, http.StatusOK, resetRecorder.Code)

	var reset struct {
		KernelGeneration int64 `json:"kernel_generation"`
		OK               bool  `json:"ok"`
	}
	err = json.NewDecoder(resetRecorder.Body).Decode(&reset)
	require.NoError(t, err)
	require.True(t, reset.OK)
	require.Equal(t, int64(2), reset.KernelGeneration)
}

func TestModuleMountHTTPUsesCustomBasePaths(t *testing.T) {
	module := newTestModule(t, BasePaths{
		Notebooks:     "/x/notebooks",
		NotebookCells: "/x/notebook-cells",
		ResetKernel:   "/x/runtime/reset-kernel",
		HintsWS:       "/x/ws/hints",
	})

	mux := http.NewServeMux()
	module.MountHTTP(mux)

	recorder := httptest.NewRecorder()
	mux.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/x/notebooks/bootstrap", nil))

	require.Equal(t, http.StatusOK, recorder.Code)

	var doc NotebookDocument
	err := json.NewDecoder(recorder.Body).Decode(&doc)
	require.NoError(t, err)
	require.Equal(t, defaultNotebookID, doc.Notebook.ID)
}
