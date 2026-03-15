package hints

import (
	"context"
	"testing"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/geppetto/pkg/events/structuredsink"
	"github.com/google/uuid"
)

type captureSink struct {
	events []gepevents.Event
}

func (s *captureSink) PublishEvent(event gepevents.Event) error {
	s.events = append(s.events, event)
	return nil
}

func TestParseStructuredResponseBuildsCompatibilityResponse(t *testing.T) {
	meta := gepevents.EventMetadata{ID: uuid.MustParse("11111111-1111-1111-1111-111111111111")}
	fullText := `Use an inline rule and return the variables you want.

<cozo:hint:v1>
hint_id: primary
text: Use an inline rule and return the variables you want.
code: |
  ?[name, age] := *users{name, age}
chips:
  - add a filter
  - sort the results
warning: Check the relation name and selected columns.
</cozo:hint:v1>

<cozo:query_suggestion:v1>
suggestion_id: filter-age
label: Filter to age > 30
code: |
  ?[name, age] := *users{name, age}, age > 30
reason: Add a comparison directly in the rule body.
</cozo:query_suggestion:v1>

<cozo:doc_ref:v1>
doc_ref_id: inline-rules
title: Inline rules
section: §2.1
body: The ?[vars] := body pattern defines an inline rule.
</cozo:doc_ref:v1>`

	result := ParseStructuredResponse(meta, fullText)
	if result.VisibleText != "Use an inline rule and return the variables you want." {
		t.Fatalf("unexpected visible text: %q", result.VisibleText)
	}
	if len(result.Hints) != 1 {
		t.Fatalf("expected 1 hint payload, got %d", len(result.Hints))
	}
	if len(result.QuerySuggestions) != 1 {
		t.Fatalf("expected 1 query suggestion payload, got %d", len(result.QuerySuggestions))
	}
	if len(result.DocRefs) != 1 {
		t.Fatalf("expected 1 doc ref payload, got %d", len(result.DocRefs))
	}
	if len(result.AuthoritativeEvents) != 3 {
		t.Fatalf("expected 3 authoritative events, got %d", len(result.AuthoritativeEvents))
	}

	response := result.ToHintResponse()
	if response.Text != "Use an inline rule and return the variables you want." {
		t.Fatalf("unexpected response text: %q", response.Text)
	}
	if response.Code == nil || *response.Code == "" {
		t.Fatalf("expected compatibility response code to be populated")
	}
	if len(response.Chips) != 2 {
		t.Fatalf("expected 2 chips, got %d", len(response.Chips))
	}
	if len(response.Docs) != 1 {
		t.Fatalf("expected 1 doc, got %d", len(response.Docs))
	}
}

func TestFilteringSinkEmitsCozoPreviewEvents(t *testing.T) {
	meta := gepevents.EventMetadata{ID: uuid.MustParse("22222222-2222-2222-2222-222222222222")}
	capture := &captureSink{}
	sink := structuredsink.NewFilteringSinkWithContext(
		context.Background(),
		capture,
		structuredsink.Options{Malformed: structuredsink.MalformedErrorEvents},
		NewCozoExtractors()...,
	)

	full := "Visible text <cozo:hint:v1>\ntext: Streaming preview\n</cozo:hint:v1>"
	if err := sink.PublishEvent(gepevents.NewPartialCompletionEvent(meta, full, full)); err != nil {
		t.Fatalf("publish partial: %v", err)
	}
	if err := sink.PublishEvent(gepevents.NewFinalEvent(meta, full)); err != nil {
		t.Fatalf("publish final: %v", err)
	}

	foundPreview := false
	foundFilteredPartial := false
	for _, event := range capture.events {
		switch ev := event.(type) {
		case *EventCozoPayloadPreview:
			foundPreview = true
			if ev.Family != TagTypeHint {
				t.Fatalf("unexpected preview family: %s", ev.Family)
			}
		case *gepevents.EventPartialCompletion:
			foundFilteredPartial = true
			if ev.Delta != "Visible text " {
				t.Fatalf("expected filtered delta, got %q", ev.Delta)
			}
		}
	}

	if !foundPreview {
		t.Fatalf("expected preview event to be emitted")
	}
	if !foundFilteredPartial {
		t.Fatalf("expected filtered partial completion to be forwarded")
	}
}
