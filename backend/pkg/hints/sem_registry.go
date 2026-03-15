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
			return wrapCozoSEMEvent("preview", ev.Family, ev.ItemID, ev.Data, true, ev.CozoProjectionMeta)
		})
		semregistry.RegisterByType[*EventCozoPayloadExtracted](func(ev *EventCozoPayloadExtracted) ([][]byte, error) {
			return wrapCozoSEMEvent("extracted", ev.Family, ev.ItemID, ev.Data, false, ev.CozoProjectionMeta)
		})
		semregistry.RegisterByType[*EventCozoPayloadFailed](func(ev *EventCozoPayloadFailed) ([][]byte, error) {
			payload := map[string]any{
				"family":      ev.Family,
				"itemId":      strings.TrimSpace(ev.ItemID),
				"bundleId":    strings.TrimSpace(ev.BundleID),
				"parentId":    strings.TrimSpace(ev.ParentID),
				"ordinal":     ev.Ordinal,
				"mode":        strings.TrimSpace(ev.Mode),
				"anchor":      ev.Anchor,
				"error":       strings.TrimSpace(ev.Error),
				"raw":         ev.Raw,
				"status":      "extraction_failed",
				"notebookId":  strings.TrimSpace(ev.NotebookID),
				"ownerCellId": strings.TrimSpace(ev.OwnerCellID),
				"runId":       strings.TrimSpace(ev.RunID),
			}
			return wrapCozoSEMFrame("failed", ev.Family, ev.ItemID, payload, ev.CozoProjectionMeta)
		})
	})
}

func wrapCozoSEMEvent(stage string, family string, itemID string, data any, transient bool, projectionMeta CozoProjectionMeta) ([][]byte, error) {
	payload := map[string]any{
		"family":      family,
		"itemId":      strings.TrimSpace(itemID),
		"bundleId":    strings.TrimSpace(projectionMeta.BundleID),
		"parentId":    strings.TrimSpace(projectionMeta.ParentID),
		"ordinal":     projectionMeta.Ordinal,
		"mode":        strings.TrimSpace(projectionMeta.Mode),
		"anchor":      projectionMeta.Anchor,
		"data":        data,
		"transient":   transient,
		"notebookId":  strings.TrimSpace(projectionMeta.NotebookID),
		"ownerCellId": strings.TrimSpace(projectionMeta.OwnerCellID),
		"runId":       strings.TrimSpace(projectionMeta.RunID),
	}
	return wrapCozoSEMFrame(stage, family, itemID, payload, projectionMeta)
}

func wrapCozoSEMFrame(stage string, family string, itemID string, payload map[string]any, projectionMeta CozoProjectionMeta) ([][]byte, error) {
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
			"type":      eventType,
			"id":        id,
			"stream_id": strings.TrimSpace(projectionMeta.BundleID),
			"data":      payload,
		},
	})
	if err != nil {
		return nil, err
	}
	return [][]byte{frame}, nil
}
