package hints

import gepevents "github.com/go-go-golems/geppetto/pkg/events"

const (
	EventTypeCozoPayloadPreview   gepevents.EventType = "cozo-payload-preview"
	EventTypeCozoPayloadExtracted gepevents.EventType = "cozo-payload-extracted"
	EventTypeCozoPayloadFailed    gepevents.EventType = "cozo-payload-failed"
)

type CozoProjectionMeta struct {
	BundleID string         `json:"bundle_id,omitempty"`
	ParentID string         `json:"parent_id,omitempty"`
	Ordinal  int            `json:"ordinal,omitempty"`
	Anchor   *AnchorPayload `json:"anchor,omitempty"`
	Mode     string         `json:"mode,omitempty"`
}

type EventCozoPayloadPreview struct {
	gepevents.EventImpl
	ItemID string `json:"item_id"`
	Family string `json:"family"`
	Data   any    `json:"data"`
	CozoProjectionMeta
}

func NewCozoPayloadPreview(meta gepevents.EventMetadata, itemID string, family string, payload any, projectionMeta CozoProjectionMeta) *EventCozoPayloadPreview {
	return &EventCozoPayloadPreview{
		EventImpl: gepevents.EventImpl{
			Type_:     EventTypeCozoPayloadPreview,
			Metadata_: meta,
		},
		ItemID:             itemID,
		Family:             family,
		Data:               payload,
		CozoProjectionMeta: projectionMeta,
	}
}

type EventCozoPayloadExtracted struct {
	gepevents.EventImpl
	ItemID string `json:"item_id"`
	Family string `json:"family"`
	Data   any    `json:"data"`
	CozoProjectionMeta
}

func NewCozoPayloadExtracted(meta gepevents.EventMetadata, itemID string, family string, payload any, projectionMeta CozoProjectionMeta) *EventCozoPayloadExtracted {
	return &EventCozoPayloadExtracted{
		EventImpl: gepevents.EventImpl{
			Type_:     EventTypeCozoPayloadExtracted,
			Metadata_: meta,
		},
		ItemID:             itemID,
		Family:             family,
		Data:               payload,
		CozoProjectionMeta: projectionMeta,
	}
}

type EventCozoPayloadFailed struct {
	gepevents.EventImpl
	ItemID string `json:"item_id"`
	Family string `json:"family"`
	Error  string `json:"error"`
	Raw    string `json:"raw,omitempty"`
	CozoProjectionMeta
}

func NewCozoPayloadFailed(meta gepevents.EventMetadata, itemID string, family string, err string, raw string, projectionMeta CozoProjectionMeta) *EventCozoPayloadFailed {
	return &EventCozoPayloadFailed{
		EventImpl: gepevents.EventImpl{
			Type_:     EventTypeCozoPayloadFailed,
			Metadata_: meta,
		},
		ItemID:             itemID,
		Family:             family,
		Error:              err,
		Raw:                raw,
		CozoProjectionMeta: projectionMeta,
	}
}
