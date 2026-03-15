package hints

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

type ProjectionDefaults struct {
	BundleID    string
	AnchorLine  *int
	Source      string
	Mode        string
	NotebookID  string
	OwnerCellID string
	RunID       string
}

type projectionDefaultsKey struct{}

func WithProjectionDefaults(ctx context.Context, d ProjectionDefaults) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, projectionDefaultsKey{}, normalizeProjectionDefaults(d))
}

func ProjectionDefaultsFromContext(ctx context.Context) ProjectionDefaults {
	if ctx == nil {
		return ProjectionDefaults{}
	}
	if defaults, ok := ctx.Value(projectionDefaultsKey{}).(ProjectionDefaults); ok {
		return normalizeProjectionDefaults(defaults)
	}
	return ProjectionDefaults{}
}

func BundleEntityID(bundleID string) string {
	bundleID = strings.TrimSpace(bundleID)
	if bundleID == "" {
		return ""
	}
	return fmt.Sprintf("cozo-bundle:%s", bundleID)
}

func ChildEntityID(bundleID, family string, ordinal int) string {
	bundleID = strings.TrimSpace(bundleID)
	family = strings.TrimSpace(family)
	if bundleID == "" || family == "" || ordinal <= 0 {
		return ""
	}
	return fmt.Sprintf("cozo-item:%s:%s:%d", bundleID, family, ordinal)
}

func CanonicalChildEntityID(defaults ProjectionDefaults, family string, ordinal int, fallback string) string {
	if id := ChildEntityID(defaults.BundleID, family, ordinal); id != "" {
		return id
	}
	fallback = strings.TrimSpace(fallback)
	if fallback != "" {
		return fallback
	}
	if ordinal > 0 {
		return fmt.Sprintf("cozo-item:%s:%d", strings.TrimSpace(family), ordinal)
	}
	return "cozo-item"
}

func ProjectionMetaFromDefaults(defaults ProjectionDefaults, anchor *AnchorPayload, ordinal int) CozoProjectionMeta {
	defaults = normalizeProjectionDefaults(defaults)
	return CozoProjectionMeta{
		BundleID:    defaults.BundleID,
		ParentID:    BundleEntityID(defaults.BundleID),
		Ordinal:     ordinal,
		Anchor:      anchor,
		Mode:        defaults.Mode,
		NotebookID:  defaults.NotebookID,
		OwnerCellID: defaults.OwnerCellID,
		RunID:       defaults.RunID,
	}
}

func ParseStructuredOrdinal(itemID string) int {
	itemID = strings.TrimSpace(itemID)
	if itemID == "" {
		return 0
	}
	idx := strings.LastIndex(itemID, ":")
	if idx < 0 || idx == len(itemID)-1 {
		return 0
	}
	ordinal, err := strconv.Atoi(itemID[idx+1:])
	if err != nil || ordinal <= 0 {
		return 0
	}
	return ordinal
}

func MergeAnchorWithDefaults(anchor *AnchorPayload, defaults ProjectionDefaults) *AnchorPayload {
	defaults = normalizeProjectionDefaults(defaults)

	var merged AnchorPayload
	if anchor != nil {
		merged = *anchor
	}

	if merged.Line == nil && defaults.AnchorLine != nil {
		line := *defaults.AnchorLine
		merged.Line = &line
	}
	if strings.TrimSpace(merged.Source) == "" {
		merged.Source = defaults.Source
	}
	merged.Normalize()

	if merged.Line == nil && merged.Source == "" {
		return nil
	}
	return &merged
}

func ApplyProjectionDefaultsToHintPayload(payload *HintPayload, defaults ProjectionDefaults) *AnchorPayload {
	if payload == nil {
		return nil
	}
	payload.Anchor = MergeAnchorWithDefaults(payload.Anchor, defaults)
	return payload.Anchor
}

func ApplyProjectionDefaultsToQuerySuggestionPayload(payload *QuerySuggestionPayload, defaults ProjectionDefaults) *AnchorPayload {
	if payload == nil {
		return nil
	}
	payload.Anchor = MergeAnchorWithDefaults(payload.Anchor, defaults)
	return payload.Anchor
}

func ApplyProjectionDefaultsToDocRefPayload(payload *DocRefPayload, defaults ProjectionDefaults) *AnchorPayload {
	if payload == nil {
		return nil
	}
	payload.Anchor = MergeAnchorWithDefaults(payload.Anchor, defaults)
	return payload.Anchor
}

func normalizeProjectionDefaults(d ProjectionDefaults) ProjectionDefaults {
	d.BundleID = strings.TrimSpace(d.BundleID)
	d.Source = strings.TrimSpace(d.Source)
	d.Mode = strings.TrimSpace(d.Mode)
	d.NotebookID = strings.TrimSpace(d.NotebookID)
	d.OwnerCellID = strings.TrimSpace(d.OwnerCellID)
	d.RunID = strings.TrimSpace(d.RunID)
	if d.AnchorLine != nil && *d.AnchorLine < 0 {
		d.AnchorLine = nil
	}
	return d
}
