package hints

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// Engine generates AI hints using the Anthropic API.
type Engine struct {
	client *anthropic.Client
	model  anthropic.Model
}

// DeltaCallback is called with each streaming text delta.
type DeltaCallback func(delta string)

// NewEngine creates a new hint engine.
// Reads ANTHROPIC_API_KEY from environment.
func NewEngine() (*Engine, error) {
	key := os.Getenv("ANTHROPIC_API_KEY")
	if key == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY not set")
	}

	client := anthropic.NewClient(option.WithAPIKey(key))
	return &Engine{
		client: &client,
		model:  anthropic.ModelClaudeSonnet4_20250514,
	}, nil
}

// streamMessages runs a streaming Anthropic request and collects the full text.
func (e *Engine) streamMessages(ctx context.Context, systemPrompt, userMsg string, onDelta DeltaCallback) (string, error) {
	stream := e.client.Messages.NewStreaming(ctx, anthropic.MessageNewParams{
		Model:     e.model,
		MaxTokens: 1024,
		System: []anthropic.TextBlockParam{
			{Text: systemPrompt},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(userMsg)),
		},
	})
	defer stream.Close()

	var fullText string

	for stream.Next() {
		event := stream.Current()
		if event.Type == "content_block_delta" {
			delta := event.AsContentBlockDelta()
			switch v := delta.Delta.AsAny().(type) {
			case anthropic.TextDelta:
				fullText += v.Text
				if onDelta != nil {
					onDelta(v.Text)
				}
			}
		}
	}

	if err := stream.Err(); err != nil {
		return "", fmt.Errorf("streaming error: %w", err)
	}

	return fullText, nil
}

// parseHintResponse parses the AI response into a HintResponse.
func parseHintResponse(fullText string) *HintResponse {
	var hint HintResponse
	if err := json.Unmarshal([]byte(fullText), &hint); err != nil {
		// If the response isn't valid JSON, wrap it as plain text
		return &HintResponse{
			Text:  fullText,
			Chips: []string{"try again", "show me an example"},
		}
	}
	return &hint
}

// GenerateHint generates an AI hint with streaming.
func (e *Engine) GenerateHint(ctx context.Context, req HintRequest, onDelta DeltaCallback) (*HintResponse, error) {
	systemPrompt := buildSystemPrompt(req.Schema)

	userMsg := req.Question
	if len(req.History) > 0 {
		userMsg = fmt.Sprintf("Previous queries:\n%s\n\nQuestion: %s", formatHistory(req.History), req.Question)
	}

	fullText, err := e.streamMessages(ctx, systemPrompt, userMsg, onDelta)
	if err != nil {
		return nil, err
	}

	return parseHintResponse(fullText), nil
}

// DiagnoseError generates an AI diagnosis for a query error.
func (e *Engine) DiagnoseError(ctx context.Context, req DiagnosisRequest, onDelta DeltaCallback) (*HintResponse, error) {
	systemPrompt := buildDiagnosisPrompt(req.Schema)
	userMsg := fmt.Sprintf("Query:\n```\n%s\n```\n\nError:\n%s", req.Script, req.Error)

	fullText, err := e.streamMessages(ctx, systemPrompt, userMsg, onDelta)
	if err != nil {
		return nil, err
	}

	return parseHintResponse(fullText), nil
}

func formatHistory(history []string) string {
	var s string
	for i, h := range history {
		s += fmt.Sprintf("%d. %s\n", i+1, h)
	}
	return s
}
