package api

import (
	"encoding/json"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/pinocchio/pkg/webchat"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

type WebSocketSEMSink struct {
	translator *webchat.EventTranslator
	writeJSON  func(WSMessage)
}

func NewWebSocketSEMSink(writeJSON func(WSMessage)) *WebSocketSEMSink {
	hints.RegisterCozoSemHandlers()
	return &WebSocketSEMSink{
		translator: webchat.NewEventTranslator(),
		writeJSON:  writeJSON,
	}
}

func (s *WebSocketSEMSink) PublishEvent(event gepevents.Event) error {
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
		var message WSMessage
		if err := json.Unmarshal(frame, &message); err != nil {
			return err
		}
		s.writeJSON(message)
	}
	return nil
}
