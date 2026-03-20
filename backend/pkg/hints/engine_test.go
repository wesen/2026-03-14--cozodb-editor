package hints

import (
	"strings"
	"testing"

	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	aitypes "github.com/go-go-golems/geppetto/pkg/steps/ai/types"
)

func TestNewEngineRequiresAnthropicAPIKey(t *testing.T) {
	t.Setenv("ANTHROPIC_API_KEY", "")
	t.Setenv("ANTHROPIC_MODEL", "")

	engine, err := NewEngine()
	if err == nil {
		t.Fatalf("expected missing API key error, got engine %#v", engine)
	}
	if !strings.Contains(err.Error(), "ANTHROPIC_API_KEY not set") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestNewEngineBuildsWithCurrentGeppettoSettingsAPI(t *testing.T) {
	t.Setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
	t.Setenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

	engine, err := NewEngine()
	if err != nil {
		t.Fatalf("NewEngine returned error: %v", err)
	}
	if engine == nil {
		t.Fatalf("expected engine, got nil")
	}
	if engine.engine == nil {
		t.Fatalf("expected underlying geppetto engine, got nil")
	}
	if engine.stepController == nil {
		t.Fatalf("expected step controller, got nil")
	}
}

func TestNewEngineFromSettingsBuildsWithResolvedInferenceSettings(t *testing.T) {
	stepSettings, err := aisettings.NewInferenceSettings()
	if err != nil {
		t.Fatalf("NewInferenceSettings returned error: %v", err)
	}

	apiType := aitypes.ApiTypeClaude
	model := "claude-sonnet-4-20250514"
	stepSettings.Chat.ApiType = &apiType
	stepSettings.Chat.Engine = &model
	stepSettings.API.APIKeys["claude-api-key"] = "test-anthropic-key"
	stepSettings.API.BaseUrls["claude-base-url"] = defaultClaudeBaseURL

	engine, err := NewEngineFromSettings(stepSettings)
	if err != nil {
		t.Fatalf("NewEngineFromSettings returned error: %v", err)
	}
	if engine == nil || engine.engine == nil || engine.stepController == nil {
		t.Fatalf("expected fully initialized engine, got %#v", engine)
	}
}
