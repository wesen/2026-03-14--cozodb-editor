package hints

import (
	"context"
	"fmt"
	"os"
	"strings"

	gepevents "github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/geppetto/pkg/events/structuredsink"
	"github.com/go-go-golems/geppetto/pkg/inference/engine"
	"github.com/go-go-golems/geppetto/pkg/inference/engine/factory"
	"github.com/go-go-golems/geppetto/pkg/inference/session"
	"github.com/go-go-golems/geppetto/pkg/inference/toolloop"
	"github.com/go-go-golems/geppetto/pkg/inference/toolloop/enginebuilder"
	aistettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	aitypes "github.com/go-go-golems/geppetto/pkg/steps/ai/types"
	"github.com/go-go-golems/geppetto/pkg/turns"
)

const (
	defaultClaudeModel   = "claude-sonnet-4-20250514"
	defaultClaudeBaseURL = "https://api.anthropic.com"
	defaultMaxTokens     = 1024
)

// Engine generates AI hints using a geppetto-backed Claude engine.
type Engine struct {
	engine         engine.Engine
	stepController *toolloop.StepController
}

// DeltaCallback is called with each streaming text delta.
type DeltaCallback func(delta string)

// NewEngine creates a new hint engine using geppetto step settings.
// Reads ANTHROPIC_API_KEY and optional ANTHROPIC_MODEL from environment.
func NewEngine() (*Engine, error) {
	key := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY"))
	if key == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY not set")
	}

	stepSettings, err := aistettings.NewStepSettings()
	if err != nil {
		return nil, fmt.Errorf("create step settings: %w", err)
	}

	model := strings.TrimSpace(os.Getenv("ANTHROPIC_MODEL"))
	if model == "" {
		model = defaultClaudeModel
	}

	apiType := aitypes.ApiTypeClaude
	stepSettings.Chat.ApiType = &apiType
	stepSettings.Chat.Engine = &model
	stepSettings.Chat.Stream = true
	stepSettings.Chat.MaxResponseTokens = intPtr(defaultMaxTokens)

	if stepSettings.API == nil {
		stepSettings.API = aistettings.NewAPISettings()
	}
	if stepSettings.API.APIKeys == nil {
		stepSettings.API.APIKeys = map[string]string{}
	}
	if stepSettings.API.BaseUrls == nil {
		stepSettings.API.BaseUrls = map[string]string{}
	}
	stepSettings.API.APIKeys["claude-api-key"] = key
	stepSettings.API.BaseUrls["claude-base-url"] = defaultClaudeBaseURL

	baseEngine, err := factory.NewEngineFromStepSettings(stepSettings)
	if err != nil {
		return nil, fmt.Errorf("create geppetto engine: %w", err)
	}

	return &Engine{
		engine:         baseEngine,
		stepController: toolloop.NewStepController(),
	}, nil
}

func intPtr(v int) *int {
	return &v
}

type inferenceRunResult struct {
	Response *HintResponse
}

// runInference runs a single geppetto inference and returns a compatibility response plus authoritative derived events.
func (e *Engine) runInference(
	ctx context.Context,
	systemPrompt string,
	userMsg string,
	onDelta DeltaCallback,
	externalSinks ...gepevents.EventSink,
) (*inferenceRunResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	initialTurn := turns.NewTurnBuilder().
		WithSystemPrompt(systemPrompt).
		WithUserPrompt(userMsg).
		Build()

	sink := newStreamingTextSink(onDelta)
	engineSinks := []gepevents.EventSink{sink}
	engineSinks = append(engineSinks, externalSinks...)

	filteringSink := structuredsink.NewFilteringSinkWithContext(
		ctx,
		&fanoutSink{sinks: engineSinks},
		structuredsink.Options{Malformed: structuredsink.MalformedErrorEvents},
		NewCozoExtractors()...,
	)

	sess := session.NewSession()
	sess.Builder = enginebuilder.New(
		enginebuilder.WithBase(e.engine),
		enginebuilder.WithEventSinks(filteringSink),
		enginebuilder.WithStepController(e.stepController),
	)
	sess.Append(initialTurn)

	handle, err := sess.StartInference(ctx)
	if err != nil {
		return nil, fmt.Errorf("start inference: %w", err)
	}

	updatedTurn, err := handle.Wait()
	if err != nil {
		return nil, fmt.Errorf("run inference: %w", err)
	}

	fullText := assistantTextFromTurn(updatedTurn)
	if strings.TrimSpace(fullText) == "" {
		fullText = sink.FinalText()
	}
	if strings.TrimSpace(fullText) == "" {
		return nil, fmt.Errorf("inference produced no assistant text")
	}

	parsed := ParseStructuredResponse(sink.Metadata(), fullText, ProjectionDefaultsFromContext(ctx))
	if len(externalSinks) > 0 && len(parsed.AuthoritativeEvents) > 0 {
		derivedSink := &fanoutSink{sinks: externalSinks}
		for _, event := range parsed.AuthoritativeEvents {
			if err := derivedSink.PublishEvent(event); err != nil {
				return nil, fmt.Errorf("publish derived event: %w", err)
			}
		}
	}

	return &inferenceRunResult{
		Response: parsed.ToHintResponse(),
	}, nil
}

func assistantTextFromTurn(t *turns.Turn) string {
	if t == nil {
		return ""
	}

	parts := make([]string, 0, len(t.Blocks))
	for _, block := range t.Blocks {
		if block.Kind != turns.BlockKindLLMText {
			continue
		}
		text, _ := block.Payload[turns.PayloadKeyText].(string)
		text = strings.TrimSpace(text)
		if text == "" {
			continue
		}
		parts = append(parts, text)
	}

	return strings.Join(parts, "\n")
}

// GenerateHint generates an AI hint with streaming.
func (e *Engine) GenerateHint(ctx context.Context, req HintRequest, onDelta DeltaCallback) (*HintResponse, error) {
	return e.GenerateHintWithSinks(ctx, req, onDelta)
}

// GenerateHintWithSinks generates an AI hint with streaming and optional derived sinks for structured events.
func (e *Engine) GenerateHintWithSinks(ctx context.Context, req HintRequest, onDelta DeltaCallback, sinks ...gepevents.EventSink) (*HintResponse, error) {
	systemPrompt := buildSystemPrompt(req.Schema)

	userMsg := req.Question
	if len(req.History) > 0 {
		userMsg = fmt.Sprintf("Previous queries:\n%s\n\nQuestion: %s", formatHistory(req.History), req.Question)
	}

	result, err := e.runInference(ctx, systemPrompt, userMsg, onDelta, sinks...)
	if err != nil {
		return nil, err
	}

	return result.Response, nil
}

// DiagnoseError generates an AI diagnosis for a query error.
func (e *Engine) DiagnoseError(ctx context.Context, req DiagnosisRequest, onDelta DeltaCallback) (*HintResponse, error) {
	return e.DiagnoseErrorWithSinks(ctx, req, onDelta)
}

// DiagnoseErrorWithSinks generates an AI diagnosis and forwards structured extraction events to the provided sinks.
func (e *Engine) DiagnoseErrorWithSinks(ctx context.Context, req DiagnosisRequest, onDelta DeltaCallback, sinks ...gepevents.EventSink) (*HintResponse, error) {
	systemPrompt := buildDiagnosisPrompt(req.Schema)
	userMsg := fmt.Sprintf("Query:\n```\n%s\n```\n\nError:\n%s", req.Script, req.Error)

	result, err := e.runInference(ctx, systemPrompt, userMsg, onDelta, sinks...)
	if err != nil {
		return nil, err
	}

	return result.Response, nil
}

func formatHistory(history []string) string {
	var s string
	for i, h := range history {
		s += fmt.Sprintf("%d. %s\n", i+1, h)
	}
	return s
}
