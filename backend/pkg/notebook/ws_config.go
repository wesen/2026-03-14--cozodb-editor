package notebook

import (
	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

type WebSocketFallbackResponse struct {
	Text  string
	Chips []string
	Docs  []hints.DocRef
}

type WebSocketConfig struct {
	DiagnosisUnavailable WebSocketFallbackResponse
	HintUnavailable      WebSocketFallbackResponse
	SEMSinkFactory       func(writeJSON func(wsMessage)) gepevents.EventSink
}

func DefaultWebSocketConfig() WebSocketConfig {
	return WebSocketConfig{
		HintUnavailable: WebSocketFallbackResponse{
			Text:  "AI hints are not available right now. Continue working directly in the notebook.",
			Chips: []string{"summarize this cell", "suggest a next step"},
		},
		DiagnosisUnavailable: WebSocketFallbackResponse{
			Text:  "AI diagnosis is not available right now. Inspect the error output and notebook state directly.",
			Chips: []string{"explain this error"},
		},
	}
}

func (c WebSocketConfig) withDefaults() WebSocketConfig {
	defaults := DefaultWebSocketConfig()
	if c.HintUnavailable.Text == "" {
		c.HintUnavailable = defaults.HintUnavailable
	}
	if c.DiagnosisUnavailable.Text == "" {
		c.DiagnosisUnavailable = defaults.DiagnosisUnavailable
	}
	return c
}
