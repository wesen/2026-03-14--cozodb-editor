package notebook

import (
	"fmt"
	"strings"

	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

type CurrentJavaScriptModuleConfig struct {
	AppDBPath string
	EnableAI  bool
	BasePaths BasePaths
	Logf      func(format string, args ...any)
}

func OpenCurrentJavaScriptModule(config CurrentJavaScriptModuleConfig) (*Module, error) {
	runtime, err := OpenJavaScriptRuntime(JavaScriptRuntimeConfig{})
	if err != nil {
		return nil, fmt.Errorf("open javascript runtime: %w", err)
	}

	var engine AIEngine
	if config.EnableAI {
		hintEngine, err := hints.NewEngine()
		if err != nil {
			config.logf("[NOTEBOOK] JavaScript AI hints disabled: %v", err)
		} else {
			engine = hintEngine
			config.logf("[NOTEBOOK] JavaScript AI hints enabled (Anthropic)")
		}
	} else {
		config.logf("[NOTEBOOK] JavaScript AI hints disabled (no ANTHROPIC_API_KEY)")
	}

	profile := currentJavaScriptNotebookProfile()
	store, err := OpenStoreWithConfig(StoreConfig{
		DBPath:  config.AppDBPath,
		Profile: profile,
	})
	if err != nil {
		_ = runtime.Close()
		return nil, err
	}

	timeline, err := OpenSQLiteTimelineStore(store.DBPath())
	if err != nil {
		_ = store.Close()
		_ = runtime.Close()
		return nil, err
	}

	module, err := NewModule(ModuleConfig{
		ServiceConfig: ServiceConfig{
			Runtime:    runtime,
			SessionID:  "javascript-notebook-session",
			RuntimeKey: "javascript-runtime",
			Store:      store,
			Timeline:   timeline,
		},
		AI:        engine,
		BasePaths: config.BasePaths,
		WebSocket: currentJavaScriptWebSocketConfig(),
	})
	if err != nil {
		_ = timeline.Close()
		_ = store.Close()
		_ = runtime.Close()
		return nil, err
	}

	module.additionalClosers = append(module.additionalClosers, func() error {
		return runtime.Close()
	})
	return module, nil
}

func currentJavaScriptNotebookProfile() NotebookProfile {
	return NotebookProfile{
		DefaultLanguage:      "javascript",
		DefaultNotebookTitle: "JavaScript Notebook",
		StarterCells: []StarterCellTemplate{
			{
				Kind:   "markdown",
				Source: "## JavaScript Notebook\n\nWrite JavaScript in the next cell and run it. Values persist until you reset the runtime.",
			},
			{
				Kind: "code",
				Source: strings.TrimSpace(`
globalThis.users = [
  { name: "Ada", age: 31 },
  { name: "Grace", age: 42 },
]

globalThis.users
`),
			},
		},
	}
}

func currentJavaScriptWebSocketConfig() WebSocketConfig {
	return WebSocketConfig{
		HintUnavailable: WebSocketFallbackResponse{
			Text:  "AI hints are unavailable right now. Try asking for a smaller JavaScript explanation, or inspect the current value directly in the notebook output.",
			Chips: []string{"explain this code", "show async example", "inspect this value"},
			Docs: []hints.DocRef{{
				Title:   "JavaScript guide",
				Section: "MDN",
				Body:    "Start with expressions and arrays of objects so notebook results stay easy to inspect and tabulate.",
			}},
		},
		DiagnosisUnavailable: WebSocketFallbackResponse{
			Text:  "AI diagnosis is unavailable right now. Check the exception text, re-run a smaller snippet, or inspect the current globals and returned value.",
			Chips: []string{"explain this exception", "show safer version", "how do I debug this"},
			Docs: []hints.DocRef{{
				Title:   "JavaScript debugging reference",
				Section: "MDN",
				Body:    "Reduce the snippet, inspect returned values, and reset the runtime if a previous cell polluted global state.",
			}},
		},
	}
}

func (c CurrentJavaScriptModuleConfig) logf(format string, args ...any) {
	if c.Logf != nil {
		c.Logf(format, args...)
	}
}
