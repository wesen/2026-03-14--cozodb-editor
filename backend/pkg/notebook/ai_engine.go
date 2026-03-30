package notebook

import (
	"strings"

	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

func newAIEngine(label string, inferenceSettings *aisettings.InferenceSettings, logf func(format string, args ...any)) AIEngine {
	prefix := strings.TrimSpace(label)
	if prefix != "" {
		prefix += " "
	}

	if inferenceSettings == nil {
		logIfConfigured(logf, "[NOTEBOOK] %sAI hints disabled (no inference settings configured)", prefix)
		return nil
	}

	hintEngine, err := hints.NewEngineFromSettings(inferenceSettings)
	if err != nil {
		logIfConfigured(logf, "[NOTEBOOK] %sAI hints disabled: %v", prefix, err)
		return nil
	}
	logIfConfigured(logf, "[NOTEBOOK] %sAI hints enabled (%s)", prefix, hints.DescribeInferenceSettings(inferenceSettings))
	return hintEngine
}

func logIfConfigured(logf func(format string, args ...any), format string, args ...any) {
	if logf != nil {
		logf(format, args...)
	}
}
