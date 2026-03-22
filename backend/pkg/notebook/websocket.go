package notebook

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"sync/atomic"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

var websocketUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type wsMessage struct {
	SEM   bool    `json:"sem"`
	Event wsEvent `json:"event"`
}

type wsEvent struct {
	Type     string `json:"type"`
	ID       string `json:"id,omitempty"`
	StreamID string `json:"stream_id,omitempty"`
	Data     any    `json:"data,omitempty"`
}

type wsHintRequest struct {
	Question    string   `json:"question"`
	History     []string `json:"history,omitempty"`
	AnchorLine  *int     `json:"anchorLine,omitempty"`
	NotebookID  string   `json:"notebookId,omitempty"`
	OwnerCellID string   `json:"ownerCellId,omitempty"`
	RunID       string   `json:"runId,omitempty"`
}

type wsDiagnosisRequest struct {
	Error       string `json:"error"`
	Script      string `json:"script"`
	NotebookID  string `json:"notebookId,omitempty"`
	OwnerCellID string `json:"ownerCellId,omitempty"`
	RunID       string `json:"runId,omitempty"`
}

type AIEngine interface {
	GenerateHintWithSinks(context.Context, hints.HintRequest, hints.DeltaCallback, ...gepevents.EventSink) (*hints.HintResponse, error)
	DiagnoseErrorWithSinks(context.Context, hints.DiagnosisRequest, hints.DeltaCallback, ...gepevents.EventSink) (*hints.HintResponse, error)
}

type wsHandler struct {
	engine    AIEngine
	runtime   Runtime
	basePaths BasePaths
}

func MountWebSocketRoutes(mux *http.ServeMux, runtime Runtime, engine AIEngine) {
	MountWebSocketRoutesWithBasePaths(mux, runtime, engine, DefaultBasePaths())
}

func MountWebSocketRoutesWithBasePaths(mux *http.ServeMux, runtime Runtime, engine AIEngine, basePaths BasePaths) {
	basePaths = basePaths.withDefaults()
	handler := &wsHandler{
		engine:    engine,
		runtime:   runtime,
		basePaths: basePaths,
	}
	mux.HandleFunc(basePaths.HintsWS, handler.handleWS)
}

func (h *wsHandler) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] upgrade error: %v", err)
		return
	}
	defer conn.Close()

	wsCtx, cancel := context.WithCancel(r.Context())
	defer cancel()

	log.Printf("[WS] client connected: %s", r.RemoteAddr)

	var writeMu sync.Mutex
	writeJSON := func(msg wsMessage) {
		writeMu.Lock()
		defer writeMu.Unlock()
		if err := conn.WriteJSON(msg); err != nil {
			log.Printf("[WS] write error: %v", err)
		}
	}

	var requestID atomic.Int64

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("[WS] client disconnected: %s", r.RemoteAddr)
			} else {
				log.Printf("[WS] read error: %v", err)
			}
			return
		}

		var msg wsMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			log.Printf("[WS] invalid message: %v", err)
			continue
		}

		switch msg.Event.Type {
		case "hint.request":
			go h.handleHintRequest(wsCtx, writeJSON, msg.Event, &requestID)
		case "diagnosis.request":
			go h.handleDiagnosisRequest(wsCtx, writeJSON, msg.Event, &requestID)
		default:
			log.Printf("[WS] unknown event type: %s", msg.Event.Type)
		}
	}
}

func (h *wsHandler) handleHintRequest(ctx context.Context, writeJSON func(wsMessage), event wsEvent, requestID *atomic.Int64) {
	reqCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	id := requestID.Add(1)
	idStr := fmt.Sprintf("hint-%d", id)

	data, _ := json.Marshal(event.Data)
	var req wsHintRequest
	if err := json.Unmarshal(data, &req); err != nil {
		log.Printf("[WS] invalid hint request: %v", err)
		return
	}

	schema, _ := h.currentSchema()
	bundleID := uuid.NewString()
	reqCtx = hints.WithProjectionDefaults(reqCtx, hints.ProjectionDefaults{
		BundleID:    bundleID,
		AnchorLine:  req.AnchorLine,
		Source:      "hint.request",
		Mode:        "hint",
		NotebookID:  req.NotebookID,
		OwnerCellID: req.OwnerCellID,
		RunID:       req.RunID,
	})

	hintReq := hints.HintRequest{
		Question:   req.Question,
		Schema:     schema,
		History:    req.History,
		AnchorLine: req.AnchorLine,
	}

	if h.engine == nil {
		writeJSON(wsMessage{SEM: true, Event: wsEvent{
			Type:     "hint.result",
			ID:       idStr,
			StreamID: bundleID,
			Data: map[string]any{
				"text":  "AI hints are not available (ANTHROPIC_API_KEY not set). Try writing CozoScript directly!",
				"chips": []string{"show CozoScript syntax", "create a relation"},
				"docs": []hints.DocRef{{
					Title:   "CozoScript basics",
					Section: "§1.0",
					Body:    "CozoScript uses Datalog syntax: ?[vars] := *relation{cols} for queries, :create/:put/:rm for mutations.",
				}},
				"notebookId":  req.NotebookID,
				"ownerCellId": req.OwnerCellID,
				"runId":       req.RunID,
			},
		}})
		return
	}

	writeJSON(wsMessage{SEM: true, Event: wsEvent{
		Type:     "llm.start",
		ID:       idStr,
		StreamID: bundleID,
		Data: map[string]any{
			"notebookId":  req.NotebookID,
			"ownerCellId": req.OwnerCellID,
			"runId":       req.RunID,
		},
	}})

	semSink := newWebSocketSEMSink(writeJSON)

	hint, err := h.engine.GenerateHintWithSinks(reqCtx, hintReq, func(delta string) {
		writeJSON(wsMessage{SEM: true, Event: wsEvent{
			Type:     "llm.delta",
			ID:       idStr,
			StreamID: bundleID,
			Data: map[string]any{
				"delta":       delta,
				"notebookId":  req.NotebookID,
				"ownerCellId": req.OwnerCellID,
				"runId":       req.RunID,
			},
		}})
	}, semSink)
	if err != nil {
		log.Printf("[WS] hint error: %v", err)
		writeJSON(wsMessage{SEM: true, Event: wsEvent{
			Type:     "llm.error",
			ID:       idStr,
			StreamID: bundleID,
			Data: map[string]any{
				"error":       err.Error(),
				"notebookId":  req.NotebookID,
				"ownerCellId": req.OwnerCellID,
				"runId":       req.RunID,
			},
		}})
		return
	}

	writeJSON(wsMessage{SEM: true, Event: wsEvent{
		Type:     "hint.result",
		ID:       idStr,
		StreamID: bundleID,
		Data: map[string]any{
			"text":        hint.Text,
			"code":        hint.Code,
			"chips":       hint.Chips,
			"docs":        hint.Docs,
			"warning":     hint.Warning,
			"notebookId":  req.NotebookID,
			"ownerCellId": req.OwnerCellID,
			"runId":       req.RunID,
		},
	}})
}

func (h *wsHandler) handleDiagnosisRequest(ctx context.Context, writeJSON func(wsMessage), event wsEvent, requestID *atomic.Int64) {
	reqCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	id := requestID.Add(1)
	idStr := fmt.Sprintf("diag-%d", id)

	data, _ := json.Marshal(event.Data)
	var req wsDiagnosisRequest
	if err := json.Unmarshal(data, &req); err != nil {
		log.Printf("[WS] invalid diagnosis request: %v", err)
		return
	}

	schema, _ := h.currentSchema()
	bundleID := uuid.NewString()
	reqCtx = hints.WithProjectionDefaults(reqCtx, hints.ProjectionDefaults{
		BundleID:    bundleID,
		Source:      "diagnosis.request",
		Mode:        "diagnosis",
		NotebookID:  req.NotebookID,
		OwnerCellID: req.OwnerCellID,
		RunID:       req.RunID,
	})

	diagReq := hints.DiagnosisRequest{
		Error:  req.Error,
		Script: req.Script,
		Schema: schema,
	}

	if h.engine == nil {
		writeJSON(wsMessage{SEM: true, Event: wsEvent{
			Type:     "hint.result",
			ID:       idStr,
			StreamID: bundleID,
			Data: map[string]any{
				"text":        "AI diagnosis is not available (ANTHROPIC_API_KEY not set). Check the error message and CozoScript docs.",
				"chips":       []string{"CozoScript syntax help"},
				"notebookId":  req.NotebookID,
				"ownerCellId": req.OwnerCellID,
				"runId":       req.RunID,
			},
		}})
		return
	}

	writeJSON(wsMessage{SEM: true, Event: wsEvent{
		Type:     "llm.start",
		ID:       idStr,
		StreamID: bundleID,
		Data: map[string]any{
			"notebookId":  req.NotebookID,
			"ownerCellId": req.OwnerCellID,
			"runId":       req.RunID,
		},
	}})

	semSink := newWebSocketSEMSink(writeJSON)

	hint, err := h.engine.DiagnoseErrorWithSinks(reqCtx, diagReq, func(delta string) {
		writeJSON(wsMessage{SEM: true, Event: wsEvent{
			Type:     "llm.delta",
			ID:       idStr,
			StreamID: bundleID,
			Data: map[string]any{
				"delta":       delta,
				"notebookId":  req.NotebookID,
				"ownerCellId": req.OwnerCellID,
				"runId":       req.RunID,
			},
		}})
	}, semSink)
	if err != nil {
		log.Printf("[WS] diagnosis error: %v", err)
		writeJSON(wsMessage{SEM: true, Event: wsEvent{
			Type:     "llm.error",
			ID:       idStr,
			StreamID: bundleID,
			Data: map[string]any{
				"error":       err.Error(),
				"notebookId":  req.NotebookID,
				"ownerCellId": req.OwnerCellID,
				"runId":       req.RunID,
			},
		}})
		return
	}

	writeJSON(wsMessage{SEM: true, Event: wsEvent{
		Type:     "hint.result",
		ID:       idStr,
		StreamID: bundleID,
		Data: map[string]any{
			"text":        hint.Text,
			"code":        hint.Code,
			"chips":       hint.Chips,
			"docs":        hint.Docs,
			"warning":     hint.Warning,
			"notebookId":  req.NotebookID,
			"ownerCellId": req.OwnerCellID,
			"runId":       req.RunID,
		},
	}})
}

func (h *wsHandler) currentSchema() (string, error) {
	if h == nil || h.runtime == nil {
		return "", nil
	}
	return h.runtime.GetSchema()
}
