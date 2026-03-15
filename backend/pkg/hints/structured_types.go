package hints

import "strings"

const (
	TagPackageCozo         = "cozo"
	TagVersionV1           = "v1"
	TagTypeHint            = "hint"
	TagTypeQuerySuggestion = "query_suggestion"
	TagTypeDocRef          = "doc_ref"
)

type AnchorPayload struct {
	Line   *int   `json:"line,omitempty" yaml:"line,omitempty"`
	Source string `json:"source,omitempty" yaml:"source,omitempty"`
}

func (p *AnchorPayload) Normalize() {
	if p == nil {
		return
	}
	p.Source = strings.TrimSpace(p.Source)
	if p.Line != nil && *p.Line < 0 {
		p.Line = nil
	}
}

type HintPayload struct {
	HintID  string         `json:"hint_id,omitempty" yaml:"hint_id,omitempty"`
	Text    string         `json:"text" yaml:"text"`
	Code    string         `json:"code,omitempty" yaml:"code,omitempty"`
	Chips   []string       `json:"chips,omitempty" yaml:"chips,omitempty"`
	Warning string         `json:"warning,omitempty" yaml:"warning,omitempty"`
	Anchor  *AnchorPayload `json:"anchor,omitempty" yaml:"anchor,omitempty"`
}

func (p *HintPayload) Normalize() {
	if p == nil {
		return
	}
	p.HintID = strings.TrimSpace(p.HintID)
	p.Text = strings.TrimSpace(p.Text)
	p.Code = strings.TrimSpace(p.Code)
	p.Warning = strings.TrimSpace(p.Warning)
	p.Chips = normalizeStrings(p.Chips)
	if p.Anchor != nil {
		p.Anchor.Normalize()
	}
}

func (p *HintPayload) IsValid() bool {
	return p != nil && p.Text != ""
}

func (p *HintPayload) Identifier() string {
	if p == nil {
		return ""
	}
	return strings.TrimSpace(p.HintID)
}

type QuerySuggestionPayload struct {
	SuggestionID string         `json:"suggestion_id,omitempty" yaml:"suggestion_id,omitempty"`
	Label        string         `json:"label" yaml:"label"`
	Code         string         `json:"code" yaml:"code"`
	Reason       string         `json:"reason,omitempty" yaml:"reason,omitempty"`
	Anchor       *AnchorPayload `json:"anchor,omitempty" yaml:"anchor,omitempty"`
}

func (p *QuerySuggestionPayload) Normalize() {
	if p == nil {
		return
	}
	p.SuggestionID = strings.TrimSpace(p.SuggestionID)
	p.Label = strings.TrimSpace(p.Label)
	p.Code = strings.TrimSpace(p.Code)
	p.Reason = strings.TrimSpace(p.Reason)
	if p.Anchor != nil {
		p.Anchor.Normalize()
	}
}

func (p *QuerySuggestionPayload) IsValid() bool {
	return p != nil && p.Label != "" && p.Code != ""
}

func (p *QuerySuggestionPayload) Identifier() string {
	if p == nil {
		return ""
	}
	return strings.TrimSpace(p.SuggestionID)
}

type DocRefPayload struct {
	DocRefID string `json:"doc_ref_id,omitempty" yaml:"doc_ref_id,omitempty"`
	Title    string `json:"title" yaml:"title"`
	Section  string `json:"section,omitempty" yaml:"section,omitempty"`
	Body     string `json:"body" yaml:"body"`
	URL      string `json:"url,omitempty" yaml:"url,omitempty"`
}

func (p *DocRefPayload) Normalize() {
	if p == nil {
		return
	}
	p.DocRefID = strings.TrimSpace(p.DocRefID)
	p.Title = strings.TrimSpace(p.Title)
	p.Section = strings.TrimSpace(p.Section)
	p.Body = strings.TrimSpace(p.Body)
	p.URL = strings.TrimSpace(p.URL)
}

func (p *DocRefPayload) IsValid() bool {
	return p != nil && p.Title != "" && p.Body != ""
}

func (p *DocRefPayload) Identifier() string {
	if p == nil {
		return ""
	}
	return strings.TrimSpace(p.DocRefID)
}

func normalizeStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
