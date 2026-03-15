package hints

import (
	"encoding/json"
	"testing"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/pinocchio/pkg/webchat"
	"github.com/google/uuid"
)

func TestCozoSemHandlersTranslatePreview(t *testing.T) {
	RegisterCozoSemHandlers()

	translator := webchat.NewEventTranslator()
	meta := gepevents.EventMetadata{ID: uuid.MustParse("33333333-3333-3333-3333-333333333333")}
	event := NewCozoPayloadPreview(meta, "33333333-3333-3333-3333-333333333333:1", TagTypeHint, HintPayload{
		HintID: "primary",
		Text:   "Use an inline rule.",
	})

	frames := translator.Translate(event)
	if len(frames) != 1 {
		t.Fatalf("expected 1 frame, got %d", len(frames))
	}

	var envelope struct {
		SEM   bool `json:"sem"`
		Event struct {
			Type string         `json:"type"`
			ID   string         `json:"id"`
			Data map[string]any `json:"data"`
		} `json:"event"`
	}
	if err := json.Unmarshal(frames[0], &envelope); err != nil {
		t.Fatalf("unmarshal frame: %v", err)
	}

	if !envelope.SEM {
		t.Fatalf("expected sem envelope")
	}
	if envelope.Event.Type != "cozo.hint.preview" {
		t.Fatalf("unexpected event type: %s", envelope.Event.Type)
	}
	if envelope.Event.Data["itemId"] != "33333333-3333-3333-3333-333333333333:1" {
		t.Fatalf("unexpected itemId: %#v", envelope.Event.Data["itemId"])
	}
}
