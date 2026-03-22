package notebook

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
)

func TestMountWebSocketRoutesHintFallback(t *testing.T) {
	svc, runtime := openTestService(t)
	_, err := svc.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	mux := http.NewServeMux()
	MountWebSocketRoutes(mux, runtime, nil)
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)

	wsURL := websocketURL(t, server.URL, "/ws/hints")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	err = conn.WriteJSON(wsMessage{
		SEM: true,
		Event: wsEvent{
			Type: "hint.request",
			Data: map[string]any{
				"question":    "How do I query users?",
				"notebookId":  defaultNotebookID,
				"ownerCellId": "cell_query",
				"runId":       "run_test",
			},
		},
	})
	require.NoError(t, err)

	var response wsMessage
	err = conn.ReadJSON(&response)
	require.NoError(t, err)
	require.True(t, response.SEM)
	require.Equal(t, "hint.result", response.Event.Type)

	data, ok := response.Event.Data.(map[string]any)
	require.True(t, ok)
	require.Equal(t, defaultNotebookID, data["notebookId"])
	require.Equal(t, "cell_query", data["ownerCellId"])
	require.Equal(t, "run_test", data["runId"])
	require.Contains(t, data["text"], "AI hints are not available")
}

func TestMountWebSocketRoutesUsesCustomFallbackCopy(t *testing.T) {
	svc, runtime := openTestService(t)
	_, err := svc.EnsureDefaultNotebook(context.Background())
	require.NoError(t, err)

	mux := http.NewServeMux()
	MountWebSocketRoutesWithConfig(mux, runtime, nil, DefaultBasePaths(), WebSocketConfig{
		HintUnavailable: WebSocketFallbackResponse{
			Text:  "Custom hint fallback",
			Chips: []string{"try again"},
		},
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)

	wsURL := websocketURL(t, server.URL, "/ws/hints")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	err = conn.WriteJSON(wsMessage{
		SEM: true,
		Event: wsEvent{
			Type: "hint.request",
			Data: map[string]any{
				"question": "What should I try next?",
			},
		},
	})
	require.NoError(t, err)

	var response wsMessage
	err = conn.ReadJSON(&response)
	require.NoError(t, err)

	data, ok := response.Event.Data.(map[string]any)
	require.True(t, ok)
	require.Equal(t, "Custom hint fallback", data["text"])
	require.Equal(t, []any{"try again"}, data["chips"])
}

func TestModuleMountWebSocketUsesCustomBasePaths(t *testing.T) {
	module := newTestModule(t, BasePaths{
		Notebooks:     "/x/notebooks",
		NotebookCells: "/x/notebook-cells",
		ResetKernel:   "/x/runtime/reset-kernel",
		HintsWS:       "/x/ws/hints",
	})

	mux := http.NewServeMux()
	module.MountWebSocket(mux)
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)

	wsURL := websocketURL(t, server.URL, "/x/ws/hints")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	err = conn.WriteJSON(wsMessage{
		SEM: true,
		Event: wsEvent{
			Type: "hint.request",
			Data: map[string]any{
				"question": "How do I query users?",
			},
		},
	})
	require.NoError(t, err)

	var response wsMessage
	err = conn.ReadJSON(&response)
	require.NoError(t, err)
	require.Equal(t, "hint.result", response.Event.Type)
}

func websocketURL(t *testing.T, serverURL string, path string) string {
	t.Helper()

	parsed, err := url.Parse(serverURL)
	require.NoError(t, err)
	if parsed.Scheme == "https" {
		parsed.Scheme = "wss"
	} else {
		parsed.Scheme = "ws"
	}
	parsed.Path = path
	return parsed.String()
}
