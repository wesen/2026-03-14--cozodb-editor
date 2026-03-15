package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/gorilla/websocket"
	"github.com/wesen/cozodb-editor/backend/pkg/cozo"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// WSHandler handles WebSocket connections for streaming hints.
type WSHandler struct {
	DB     *cozo.DB
	Engine *hints.Engine
}

// HandleWS handles the /ws/hints WebSocket endpoint.
func (h *WSHandler) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] upgrade error: %v", err)
		return
	}
	defer conn.Close()

	wsCtx, cancel := context.WithCancel(r.Context())
	defer cancel()

	log.Printf("[WS] client connected: %s", r.RemoteAddr)

	var writeMu sync.Mutex
	writeJSON := func(msg WSMessage) {
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

		var msg WSMessage
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

func (h *WSHandler) handleHintRequest(ctx context.Context, writeJSON func(WSMessage), event WSEvent, requestID *atomic.Int64) {
	reqCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	id := requestID.Add(1)
	idStr := fmt.Sprintf("hint-%d", id)

	data, _ := json.Marshal(event.Data)
	var req HintRequest
	if err := json.Unmarshal(data, &req); err != nil {
		log.Printf("[WS] invalid hint request: %v", err)
		return
	}

	// Get current schema
	schema, _ := h.DB.GetSchema()

	hintReq := hints.HintRequest{
		Question: req.Question,
		Schema:   schema,
		History:  req.History,
	}

	if h.Engine == nil {
		// No AI engine — send a fallback response
		writeJSON(WSMessage{SEM: true, Event: WSEvent{
			Type: "hint.result",
			ID:   idStr,
			Data: hints.HintResponse{
				Text:  "AI hints are not available (ANTHROPIC_API_KEY not set). Try writing CozoScript directly!",
				Chips: []string{"show CozoScript syntax", "create a relation"},
				Docs: []hints.DocRef{{
					Title:   "CozoScript basics",
					Section: "§1.0",
					Body:    "CozoScript uses Datalog syntax: ?[vars] := *relation{cols} for queries, :create/:put/:rm for mutations.",
				}},
			},
		}})
		return
	}

	// Send start event
	writeJSON(WSMessage{SEM: true, Event: WSEvent{Type: "llm.start", ID: idStr}})

	semSink := NewWebSocketSEMSink(writeJSON)

	// Stream deltas
	hint, err := h.Engine.GenerateHintWithSinks(reqCtx, hintReq, func(delta string) {
		writeJSON(WSMessage{SEM: true, Event: WSEvent{
			Type: "llm.delta",
			ID:   idStr,
			Data: delta,
		}})
	}, semSink)

	if err != nil {
		log.Printf("[WS] hint error: %v", err)
		writeJSON(WSMessage{SEM: true, Event: WSEvent{
			Type: "llm.error",
			ID:   idStr,
			Data: err.Error(),
		}})
		return
	}

	// Send final result
	writeJSON(WSMessage{SEM: true, Event: WSEvent{
		Type: "hint.result",
		ID:   idStr,
		Data: hint,
	}})
}

func (h *WSHandler) handleDiagnosisRequest(ctx context.Context, writeJSON func(WSMessage), event WSEvent, requestID *atomic.Int64) {
	reqCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	id := requestID.Add(1)
	idStr := fmt.Sprintf("diag-%d", id)

	data, _ := json.Marshal(event.Data)
	var req DiagnosisRequest
	if err := json.Unmarshal(data, &req); err != nil {
		log.Printf("[WS] invalid diagnosis request: %v", err)
		return
	}

	schema, _ := h.DB.GetSchema()

	diagReq := hints.DiagnosisRequest{
		Error:  req.Error,
		Script: req.Script,
		Schema: schema,
	}

	if h.Engine == nil {
		writeJSON(WSMessage{SEM: true, Event: WSEvent{
			Type: "hint.result",
			ID:   idStr,
			Data: hints.HintResponse{
				Text:  "AI diagnosis is not available (ANTHROPIC_API_KEY not set). Check the error message and CozoScript docs.",
				Chips: []string{"CozoScript syntax help"},
			},
		}})
		return
	}

	writeJSON(WSMessage{SEM: true, Event: WSEvent{Type: "llm.start", ID: idStr}})

	semSink := NewWebSocketSEMSink(writeJSON)

	hint, err := h.Engine.DiagnoseErrorWithSinks(reqCtx, diagReq, func(delta string) {
		writeJSON(WSMessage{SEM: true, Event: WSEvent{
			Type: "llm.delta",
			ID:   idStr,
			Data: delta,
		}})
	}, semSink)

	if err != nil {
		log.Printf("[WS] diagnosis error: %v", err)
		writeJSON(WSMessage{SEM: true, Event: WSEvent{
			Type: "llm.error",
			ID:   idStr,
			Data: err.Error(),
		}})
		return
	}

	writeJSON(WSMessage{SEM: true, Event: WSEvent{
		Type: "hint.result",
		ID:   idStr,
		Data: hint,
	}})
}
