package notebook

import (
	"strings"

	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

func newAIEngine(label string, enableAI bool, inferenceSettings *aisettings.InferenceSettings, logf func(format string, args ...any)) AIEngine {
	prefix := strings.TrimSpace(label)
	if prefix != "" {
		prefix += " "
	}

	if inferenceSettings != nil {
		hintEngine, err := hints.NewEngineFromSettings(inferenceSettings)
		if err != nil {
			logIfConfigured(logf, "[NOTEBOOK] %sAI hints disabled: %v", prefix, err)
			return nil
		}
		logIfConfigured(logf, "[NOTEBOOK] %sAI hints enabled (%s)", prefix, hints.DescribeInferenceSettings(inferenceSettings))
		return hintEngine
	}

	if enableAI {
		hintEngine, err := hints.NewEngine()
		if err != nil {
			logIfConfigured(logf, "[NOTEBOOK] %sAI hints disabled: %v", prefix, err)
			return nil
		}
		logIfConfigured(logf, "[NOTEBOOK] %sAI hints enabled (Anthropic)", prefix)
		return hintEngine
	}

	logIfConfigured(logf, "[NOTEBOOK] %sAI hints disabled (no ANTHROPIC_API_KEY or inference settings)", prefix)
	return nil
}

func logIfConfigured(logf func(format string, args ...any), format string, args ...any) {
	if logf != nil {
		logf(format, args...)
	}
}
