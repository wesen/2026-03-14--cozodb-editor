package notebook

import (
	"encoding/json"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/pinocchio/pkg/webchat"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

type webSocketSEMSink struct {
	translator *webchat.EventTranslator
	writeJSON  func(wsMessage)
}

func newWebSocketSEMSink(writeJSON func(wsMessage)) *webSocketSEMSink {
	hints.RegisterCozoSemHandlers()
	return &webSocketSEMSink{
		translator: webchat.NewEventTranslator(),
		writeJSON:  writeJSON,
	}
}

func (s *webSocketSEMSink) PublishEvent(event gepevents.Event) error {
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
