package notebook

import (
	"encoding/json"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/pinocchio/pkg/webchat"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

func currentCozoWebSocketConfig() WebSocketConfig {
	return WebSocketConfig{
		HintUnavailable: WebSocketFallbackResponse{
			Text:  "AI hints are not available right now. Try writing CozoScript directly!",
			Chips: []string{"show CozoScript syntax", "create a relation"},
			Docs: []hints.DocRef{{
				Title:   "CozoScript basics",
				Section: "§1.0",
				Body:    "CozoScript uses Datalog syntax: ?[vars] := *relation{cols} for queries, :create/:put/:rm for mutations.",
			}},
		},
		DiagnosisUnavailable: WebSocketFallbackResponse{
			Text:  "AI diagnosis is not available right now. Check the error message and CozoScript docs.",
			Chips: []string{"CozoScript syntax help"},
		},
		SEMSinkFactory: func(writeJSON func(wsMessage)) gepevents.EventSink {
			hints.RegisterCozoSemHandlers()
			return &cozoWebSocketSEMSink{
				translator: webchat.NewEventTranslator(),
				writeJSON:  writeJSON,
			}
		},
	}
}

type cozoWebSocketSEMSink struct {
	translator *webchat.EventTranslator
	writeJSON  func(wsMessage)
}

func (s *cozoWebSocketSEMSink) PublishEvent(event gepevents.Event) error {
	if s == nil || event == nil {
		return nil
	}

	switch event.(type) {
	case *hints.EventCozoPayloadPreview, *hints.EventCozoPayloadExtracted, *hints.EventCozoPayloadFailed:
	default:
		return nil
	}

	frames := s.translator.Translate(event)
	for _, frame := range frames {
		var message wsMessage
		if err := json.Unmarshal(frame, &message); err != nil {
			return err
		}
		s.writeJSON(message)
	}
	return nil
}
