package hints

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	semregistry "github.com/go-go-golems/pinocchio/pkg/sem/registry"
	"github.com/google/uuid"
)

var registerCozoSemOnce sync.Once

func RegisterCozoSemHandlers() {
	registerCozoSemOnce.Do(func() {
		semregistry.RegisterByType[*EventCozoPayloadPreview](func(ev *EventCozoPayloadPreview) ([][]byte, error) {
			return wrapCozoSEMEvent("preview", ev.Family, ev.ItemID, ev.Data, true)
		})
		semregistry.RegisterByType[*EventCozoPayloadExtracted](func(ev *EventCozoPayloadExtracted) ([][]byte, error) {
			return wrapCozoSEMEvent("extracted", ev.Family, ev.ItemID, ev.Data, false)
		})
		semregistry.RegisterByType[*EventCozoPayloadFailed](func(ev *EventCozoPayloadFailed) ([][]byte, error) {
			payload := map[string]any{
				"family": ev.Family,
				"itemId": strings.TrimSpace(ev.ItemID),
				"error":  strings.TrimSpace(ev.Error),
				"raw":    ev.Raw,
				"status": "extraction_failed",
			}
			return wrapCozoSEMFrame("failed", ev.Family, ev.ItemID, payload)
		})
	})
}

func wrapCozoSEMEvent(stage string, family string, itemID string, data any, transient bool) ([][]byte, error) {
	payload := map[string]any{
		"family":    family,
		"itemId":    strings.TrimSpace(itemID),
		"data":      data,
		"transient": transient,
	}
	return wrapCozoSEMFrame(stage, family, itemID, payload)
}

func wrapCozoSEMFrame(stage string, family string, itemID string, payload map[string]any) ([][]byte, error) {
	family = strings.TrimSpace(family)
	if !isSupportedFamily(family) {
		return nil, fmt.Errorf("unsupported family %q", family)
	}
	eventType := "cozo." + family + "." + stage
	id := strings.TrimSpace(itemID)
	if id == "" {
		id = "cozo-" + uuid.NewString()
	}
	frame, err := json.Marshal(map[string]any{
		"sem": true,
		"event": map[string]any{
			"type": eventType,
			"id":   id,
			"data": payload,
		},
	})
	if err != nil {
		return nil, err
	}
	return [][]byte{frame}, nil
}
