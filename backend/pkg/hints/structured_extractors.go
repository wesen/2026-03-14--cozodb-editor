package hints

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/geppetto/pkg/events/structuredsink"
	"github.com/go-go-golems/geppetto/pkg/events/structuredsink/parsehelpers"
)

type payloadExtractor[T any] struct {
	family    string
	normalize func(*T)
	validate  func(*T) bool
}

func newPayloadExtractor[T any](family string, normalize func(*T), validate func(*T) bool) *payloadExtractor[T] {
	return &payloadExtractor[T]{
		family:    family,
		normalize: normalize,
		validate:  validate,
	}
}

func (e *payloadExtractor[T]) TagPackage() string { return TagPackageCozo }
func (e *payloadExtractor[T]) TagType() string    { return e.family }
func (e *payloadExtractor[T]) TagVersion() string { return TagVersionV1 }

func (e *payloadExtractor[T]) NewSession(
	ctx context.Context,
	meta gepevents.EventMetadata,
	itemID string,
) structuredsink.ExtractorSession {
	return &payloadExtractorSession[T]{
		extractor: e,
		meta:      meta,
		itemID:    itemID,
		ordinal:   ParseStructuredOrdinal(itemID),
		defaults:  ProjectionDefaultsFromContext(ctx),
	}
}

type payloadExtractorSession[T any] struct {
	extractor        *payloadExtractor[T]
	meta             gepevents.EventMetadata
	itemID           string
	ordinal          int
	defaults         ProjectionDefaults
	ctrl             *parsehelpers.YAMLController[T]
	lastPreviewSHA16 string
}

func (s *payloadExtractorSession[T]) OnStart(context.Context) []gepevents.Event {
	s.ctrl = parsehelpers.NewDebouncedYAML[T](parsehelpers.DebounceConfig{
		SnapshotEveryBytes: 256,
		SnapshotOnNewline:  true,
		MaxBytes:           64 << 10,
	})
	s.lastPreviewSHA16 = ""
	return nil
}

func (s *payloadExtractorSession[T]) OnRaw(_ context.Context, chunk []byte) []gepevents.Event {
	if s.ctrl == nil {
		s.ctrl = parsehelpers.NewDebouncedYAML[T](parsehelpers.DebounceConfig{MaxBytes: 64 << 10})
	}

	snapshot, err := s.ctrl.FeedBytes(chunk)
	if err != nil || snapshot == nil {
		return nil
	}

	s.extractor.normalize(snapshot)
	if !s.extractor.validate(snapshot) {
		return nil
	}

	blob, err := json.Marshal(snapshot)
	if err != nil || len(blob) == 0 {
		return nil
	}

	sum := sha256.Sum256(blob)
	sha16 := hex.EncodeToString(sum[:8])
	if sha16 == "" || sha16 == s.lastPreviewSHA16 {
		return nil
	}
	s.lastPreviewSHA16 = sha16

	itemID, projectionMeta := s.projectSnapshot(snapshot)
	return []gepevents.Event{NewCozoPayloadPreview(s.meta, itemID, s.extractor.family, *snapshot, projectionMeta)}
}

func (s *payloadExtractorSession[T]) OnCompleted(context.Context, []byte, bool, error) []gepevents.Event {
	// Preview extraction stays transient. Authoritative extraction runs once the final assistant text is known.
	return nil
}

func NewCozoExtractors() []structuredsink.Extractor {
	return []structuredsink.Extractor{
		newPayloadExtractor(TagTypeHint, func(p *HintPayload) { p.Normalize() }, func(p *HintPayload) bool { return p.IsValid() }),
		newPayloadExtractor(TagTypeQuerySuggestion, func(p *QuerySuggestionPayload) { p.Normalize() }, func(p *QuerySuggestionPayload) bool { return p.IsValid() }),
		newPayloadExtractor(TagTypeDocRef, func(p *DocRefPayload) { p.Normalize() }, func(p *DocRefPayload) bool { return p.IsValid() }),
	}
}

func (s *payloadExtractorSession[T]) projectSnapshot(snapshot *T) (string, CozoProjectionMeta) {
	if snapshot == nil {
		return CanonicalChildEntityID(s.defaults, s.extractor.family, s.ordinal, s.itemID), ProjectionMetaFromDefaults(s.defaults, nil, s.ordinal)
	}

	var anchor *AnchorPayload
	switch payload := any(snapshot).(type) {
	case *HintPayload:
		anchor = ApplyProjectionDefaultsToHintPayload(payload, s.defaults)
	case *QuerySuggestionPayload:
		anchor = ApplyProjectionDefaultsToQuerySuggestionPayload(payload, s.defaults)
	case *DocRefPayload:
		anchor = ApplyProjectionDefaultsToDocRefPayload(payload, s.defaults)
	}

	return CanonicalChildEntityID(s.defaults, s.extractor.family, s.ordinal, s.itemID), ProjectionMetaFromDefaults(s.defaults, anchor, s.ordinal)
}
