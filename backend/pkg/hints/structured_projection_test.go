package hints

import (
	"context"
	"testing"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/geppetto/pkg/events/structuredsink"
	"github.com/google/uuid"
)

func TestParseStructuredResponseUsesDeterministicBundleMetadata(t *testing.T) {
	meta := gepevents.EventMetadata{ID: uuid.MustParse("44444444-4444-4444-4444-444444444444")}
	line := 7
	defaults := ProjectionDefaults{
		BundleID:   "bundle-deterministic",
		AnchorLine: &line,
		Source:     "hint.request",
		Mode:       "hint",
	}
	fullText := `Visible explanation.

<cozo:hint:v1>
text: Use an inline rule.
</cozo:hint:v1>

<cozo:doc_ref:v1>
title: Inline rules
body: The ?[vars] := body pattern defines an inline rule.
</cozo:doc_ref:v1>`

	result := ParseStructuredResponse(meta, fullText, defaults)
	if len(result.AuthoritativeEvents) != 2 {
		t.Fatalf("expected 2 authoritative events, got %d", len(result.AuthoritativeEvents))
	}

	hintEvent, ok := result.AuthoritativeEvents[0].(*EventCozoPayloadExtracted)
	if !ok {
		t.Fatalf("expected extracted hint event, got %T", result.AuthoritativeEvents[0])
	}
	if hintEvent.ItemID != "cozo-item:bundle-deterministic:hint:1" {
		t.Fatalf("unexpected hint item id: %s", hintEvent.ItemID)
	}
	if hintEvent.BundleID != "bundle-deterministic" || hintEvent.ParentID != "cozo-bundle:bundle-deterministic" {
		t.Fatalf("unexpected hint projection meta: %#v", hintEvent.CozoProjectionMeta)
	}
	if hintEvent.Anchor == nil || hintEvent.Anchor.Line == nil || *hintEvent.Anchor.Line != 7 {
		t.Fatalf("expected injected hint anchor, got %#v", hintEvent.Anchor)
	}

	docEvent, ok := result.AuthoritativeEvents[1].(*EventCozoPayloadExtracted)
	if !ok {
		t.Fatalf("expected extracted doc event, got %T", result.AuthoritativeEvents[1])
	}
	if docEvent.ItemID != "cozo-item:bundle-deterministic:doc_ref:2" {
		t.Fatalf("unexpected doc item id: %s", docEvent.ItemID)
	}
	if docEvent.Anchor == nil || docEvent.Anchor.Line == nil || *docEvent.Anchor.Line != 7 {
		t.Fatalf("expected injected doc anchor, got %#v", docEvent.Anchor)
	}
}

func TestPreviewAndFinalUseSameDeterministicIDs(t *testing.T) {
	meta := gepevents.EventMetadata{ID: uuid.MustParse("55555555-5555-5555-5555-555555555555")}
	line := 3
	defaults := ProjectionDefaults{
		BundleID:   "bundle-stable",
		AnchorLine: &line,
		Source:     "hint.request",
		Mode:       "hint",
	}

	capture := &captureSink{}
	sink := structuredsink.NewFilteringSinkWithContext(
		WithProjectionDefaults(context.Background(), defaults),
		capture,
		structuredsink.Options{Malformed: structuredsink.MalformedErrorEvents},
		NewCozoExtractors()...,
	)

	full := "Visible text <cozo:query_suggestion:v1>\nlabel: Add a filter\ncode: |\n  ?[name] := *users{name}, age > 30\n</cozo:query_suggestion:v1>"
	if err := sink.PublishEvent(gepevents.NewPartialCompletionEvent(meta, full, full)); err != nil {
		t.Fatalf("publish partial: %v", err)
	}
	if err := sink.PublishEvent(gepevents.NewFinalEvent(meta, full)); err != nil {
		t.Fatalf("publish final: %v", err)
	}

	var preview *EventCozoPayloadPreview
	for _, event := range capture.events {
		if ev, ok := event.(*EventCozoPayloadPreview); ok {
			preview = ev
		}
	}
	if preview == nil {
		t.Fatalf("expected preview event")
	}

	parsed := ParseStructuredResponse(meta, full, defaults)
	if len(parsed.AuthoritativeEvents) != 1 {
		t.Fatalf("expected 1 authoritative event, got %d", len(parsed.AuthoritativeEvents))
	}
	extracted, ok := parsed.AuthoritativeEvents[0].(*EventCozoPayloadExtracted)
	if !ok {
		t.Fatalf("expected extracted query suggestion, got %T", parsed.AuthoritativeEvents[0])
	}

	if preview.ItemID != extracted.ItemID {
		t.Fatalf("expected stable item id, preview=%s extracted=%s", preview.ItemID, extracted.ItemID)
	}
	if preview.ItemID != "cozo-item:bundle-stable:query_suggestion:1" {
		t.Fatalf("unexpected canonical item id: %s", preview.ItemID)
	}
}

func TestSameAnchorDifferentBundlesDoNotCollide(t *testing.T) {
	line := 2
	defaultsA := ProjectionDefaults{BundleID: "bundle-a", AnchorLine: &line, Source: "hint.request", Mode: "hint"}
	defaultsB := ProjectionDefaults{BundleID: "bundle-b", AnchorLine: &line, Source: "hint.request", Mode: "hint"}

	idA := CanonicalChildEntityID(defaultsA, TagTypeHint, 1, "")
	idB := CanonicalChildEntityID(defaultsB, TagTypeHint, 1, "")
	if idA == idB {
		t.Fatalf("expected different bundle-scoped ids, got %s", idA)
	}
}
