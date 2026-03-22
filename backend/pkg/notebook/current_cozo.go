package notebook

import (
	"fmt"

	"github.com/wesen/cozodb-editor/backend/pkg/cozo"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

const defaultWarmupScript = "?[] <- [[1, 'hello']]"

type CurrentCozoModuleConfig struct {
	Engine    string
	DBPath    string
	AppDBPath string
	EnableAI  bool
	BasePaths BasePaths
	Logf      func(format string, args ...any)
}

func OpenCurrentCozoModule(config CurrentCozoModuleConfig) (*Module, error) {
	runtime, err := cozo.NewManager(config.Engine, config.DBPath)
	if err != nil {
		return nil, fmt.Errorf("open cozo runtime: %w", err)
	}

	if _, err := runtime.Query(defaultWarmupScript, nil); err != nil {
		runtime.Close()
		return nil, fmt.Errorf("warm up cozo runtime: %w", err)
	}

	var engine AIEngine
	if config.EnableAI {
		hintEngine, err := hints.NewEngine()
		if err != nil {
			config.logf("[NOTEBOOK] AI hints disabled: %v", err)
		} else {
			engine = hintEngine
			config.logf("[NOTEBOOK] AI hints enabled (Anthropic)")
		}
	} else {
		config.logf("[NOTEBOOK] AI hints disabled (no ANTHROPIC_API_KEY)")
	}

	module, err := OpenModule(config.AppDBPath, runtime, engine)
	if err != nil {
		runtime.Close()
		return nil, err
	}

	module.BasePaths = config.BasePaths.withDefaults()
	module.additionalClosers = append(module.additionalClosers, func() error {
		runtime.Close()
		return nil
	})
	return module, nil
}

func (c CurrentCozoModuleConfig) logf(format string, args ...any) {
	if c.Logf != nil {
		c.Logf(format, args...)
	}
}
