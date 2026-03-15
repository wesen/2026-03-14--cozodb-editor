package hints

import gepevents "github.com/go-go-golems/geppetto/pkg/events"

const (
	EventTypeCozoPayloadPreview   gepevents.EventType = "cozo-payload-preview"
	EventTypeCozoPayloadExtracted gepevents.EventType = "cozo-payload-extracted"
	EventTypeCozoPayloadFailed    gepevents.EventType = "cozo-payload-failed"
)

type EventCozoPayloadPreview struct {
	gepevents.EventImpl
	ItemID string `json:"item_id"`
	Family string `json:"family"`
	Data   any    `json:"data"`
}

func NewCozoPayloadPreview(meta gepevents.EventMetadata, itemID string, family string, payload any) *EventCozoPayloadPreview {
	return &EventCozoPayloadPreview{
		EventImpl: gepevents.EventImpl{
			Type_:     EventTypeCozoPayloadPreview,
			Metadata_: meta,
		},
		ItemID: itemID,
		Family: family,
		Data:   payload,
	}
}

type EventCozoPayloadExtracted struct {
	gepevents.EventImpl
	ItemID string `json:"item_id"`
	Family string `json:"family"`
	Data   any    `json:"data"`
}

func NewCozoPayloadExtracted(meta gepevents.EventMetadata, itemID string, family string, payload any) *EventCozoPayloadExtracted {
	return &EventCozoPayloadExtracted{
		EventImpl: gepevents.EventImpl{
			Type_:     EventTypeCozoPayloadExtracted,
			Metadata_: meta,
		},
		ItemID: itemID,
		Family: family,
		Data:   payload,
	}
}

type EventCozoPayloadFailed struct {
	gepevents.EventImpl
	ItemID string `json:"item_id"`
	Family string `json:"family"`
	Error  string `json:"error"`
	Raw    string `json:"raw,omitempty"`
}

func NewCozoPayloadFailed(meta gepevents.EventMetadata, itemID string, family string, err string, raw string) *EventCozoPayloadFailed {
	return &EventCozoPayloadFailed{
		EventImpl: gepevents.EventImpl{
			Type_:     EventTypeCozoPayloadFailed,
			Metadata_: meta,
		},
		ItemID: itemID,
		Family: family,
		Error:  err,
		Raw:    raw,
	}
}
