package hints

import (
	"fmt"
	"strings"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

type StructuredParseResult struct {
	VisibleText         string
	Hints               []HintPayload
	QuerySuggestions    []QuerySuggestionPayload
	DocRefs             []DocRefPayload
	AuthoritativeEvents []gepevents.Event
}

func (r StructuredParseResult) ToHintResponse() *HintResponse {
	response := &HintResponse{
		Text:  strings.TrimSpace(r.VisibleText),
		Chips: []string{},
		Docs:  []DocRef{},
	}

	if len(r.Hints) > 0 {
		primary := r.Hints[0]
		if primary.Text != "" {
			response.Text = primary.Text
		}
		if primary.Code != "" {
			code := primary.Code
			response.Code = &code
		}
		if len(primary.Chips) > 0 {
			response.Chips = append(response.Chips, primary.Chips...)
		}
		if primary.Warning != "" {
			warning := primary.Warning
			response.Warning = &warning
		}
	}

	for _, doc := range r.DocRefs {
		response.Docs = append(response.Docs, DocRef{
			Title:   doc.Title,
			Section: doc.Section,
			Body:    doc.Body,
		})
	}

	if response.Text == "" {
		response.Text = "I found structured guidance, but the visible explanation was empty."
	}

	return response
}

type structuredBlock struct {
	Family  string
	Raw     string
	Ordinal int
}

func ParseStructuredResponse(meta gepevents.EventMetadata, fullText string, defaults ProjectionDefaults) StructuredParseResult {
	visible, blocks, malformed := scanStructuredBlocks(meta, fullText, defaults)
	result := StructuredParseResult{
		VisibleText: strings.TrimSpace(visible),
	}

	for _, block := range blocks {
		fallbackID := structuredItemID(meta, block.Ordinal)
		itemID := CanonicalChildEntityID(defaults, block.Family, block.Ordinal, fallbackID)
		switch block.Family {
		case TagTypeHint:
			var payload HintPayload
			if err := yaml.Unmarshal([]byte(block.Raw), &payload); err != nil {
				result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadFailed(meta, itemID, block.Family, err.Error(), block.Raw, ProjectionMetaFromDefaults(defaults, nil, block.Ordinal)))
				continue
			}
			payload.Normalize()
			anchor := ApplyProjectionDefaultsToHintPayload(&payload, defaults)
			if !payload.IsValid() {
				result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadFailed(meta, itemID, block.Family, "invalid hint payload", block.Raw, ProjectionMetaFromDefaults(defaults, anchor, block.Ordinal)))
				continue
			}
			result.Hints = append(result.Hints, payload)
			result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadExtracted(meta, itemID, block.Family, payload, ProjectionMetaFromDefaults(defaults, anchor, block.Ordinal)))
		case TagTypeQuerySuggestion:
			var payload QuerySuggestionPayload
			if err := yaml.Unmarshal([]byte(block.Raw), &payload); err != nil {
				result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadFailed(meta, itemID, block.Family, err.Error(), block.Raw, ProjectionMetaFromDefaults(defaults, nil, block.Ordinal)))
				continue
			}
			payload.Normalize()
			anchor := ApplyProjectionDefaultsToQuerySuggestionPayload(&payload, defaults)
			if !payload.IsValid() {
				result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadFailed(meta, itemID, block.Family, "invalid query suggestion payload", block.Raw, ProjectionMetaFromDefaults(defaults, anchor, block.Ordinal)))
				continue
			}
			result.QuerySuggestions = append(result.QuerySuggestions, payload)
			result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadExtracted(meta, itemID, block.Family, payload, ProjectionMetaFromDefaults(defaults, anchor, block.Ordinal)))
		case TagTypeDocRef:
			var payload DocRefPayload
			if err := yaml.Unmarshal([]byte(block.Raw), &payload); err != nil {
				result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadFailed(meta, itemID, block.Family, err.Error(), block.Raw, ProjectionMetaFromDefaults(defaults, nil, block.Ordinal)))
				continue
			}
			payload.Normalize()
			anchor := ApplyProjectionDefaultsToDocRefPayload(&payload, defaults)
			if !payload.IsValid() {
				result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadFailed(meta, itemID, block.Family, "invalid doc ref payload", block.Raw, ProjectionMetaFromDefaults(defaults, anchor, block.Ordinal)))
				continue
			}
			result.DocRefs = append(result.DocRefs, payload)
			result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadExtracted(meta, itemID, block.Family, payload, ProjectionMetaFromDefaults(defaults, anchor, block.Ordinal)))
		default:
			result.AuthoritativeEvents = append(result.AuthoritativeEvents, NewCozoPayloadFailed(meta, itemID, block.Family, "unsupported structured family", block.Raw, ProjectionMetaFromDefaults(defaults, nil, block.Ordinal)))
		}
	}

	result.AuthoritativeEvents = append(result.AuthoritativeEvents, malformed...)
	return result
}

func scanStructuredBlocks(meta gepevents.EventMetadata, fullText string, defaults ProjectionDefaults) (string, []structuredBlock, []gepevents.Event) {
	var visible strings.Builder
	blocks := []structuredBlock{}
	malformed := []gepevents.Event{}

	cursor := 0
	seq := 0
	for cursor < len(fullText) {
		startRel := strings.Index(fullText[cursor:], "<"+TagPackageCozo+":")
		if startRel < 0 {
			visible.WriteString(fullText[cursor:])
			break
		}

		start := cursor + startRel
		visible.WriteString(fullText[cursor:start])

		tagEndRel := strings.Index(fullText[start:], ">")
		if tagEndRel < 0 {
			visible.WriteString(fullText[start:])
			break
		}

		tagEnd := start + tagEndRel
		tagBody := fullText[start+1 : tagEnd]
		parts := strings.Split(tagBody, ":")
		if len(parts) != 3 || parts[0] != TagPackageCozo || parts[2] != TagVersionV1 || !isSupportedFamily(parts[1]) {
			visible.WriteString(fullText[start : tagEnd+1])
			cursor = tagEnd + 1
			continue
		}

		family := parts[1]
		closeTag := fmt.Sprintf("</%s:%s:%s>", TagPackageCozo, family, TagVersionV1)
		payloadStart := tagEnd + 1
		closeRel := strings.Index(fullText[payloadStart:], closeTag)
		if closeRel < 0 {
			seq++
			itemID := CanonicalChildEntityID(defaults, family, seq, structuredItemID(meta, seq))
			malformed = append(malformed, NewCozoPayloadFailed(meta, itemID, family, "unterminated structured block", fullText[start:], ProjectionMetaFromDefaults(defaults, nil, seq)))
			cursor = len(fullText)
			break
		}

		seq++
		payloadEnd := payloadStart + closeRel
		blocks = append(blocks, structuredBlock{
			Family:  family,
			Raw:     strings.TrimSpace(fullText[payloadStart:payloadEnd]),
			Ordinal: seq,
		})
		cursor = payloadEnd + len(closeTag)
	}

	return normalizeVisibleText(visible.String()), blocks, malformed
}

func normalizeVisibleText(text string) string {
	lines := strings.Split(text, "\n")
	out := make([]string, 0, len(lines))
	prevBlank := false
	for _, line := range lines {
		line = strings.TrimRight(line, " \t")
		if strings.TrimSpace(line) == "" {
			if prevBlank {
				continue
			}
			prevBlank = true
			out = append(out, "")
			continue
		}
		prevBlank = false
		out = append(out, line)
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

func structuredItemID(meta gepevents.EventMetadata, seq int) string {
	if meta.ID != uuid.Nil && seq > 0 {
		return fmt.Sprintf("%s:%d", meta.ID.String(), seq)
	}
	if seq > 0 {
		return fmt.Sprintf("cozo-item-%d", seq)
	}
	return "cozo-item"
}

func isSupportedFamily(family string) bool {
	switch family {
	case TagTypeHint, TagTypeQuerySuggestion, TagTypeDocRef:
		return true
	default:
		return false
	}
}
