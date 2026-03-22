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
