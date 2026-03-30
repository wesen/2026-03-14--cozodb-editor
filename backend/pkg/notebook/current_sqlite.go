package notebook

import (
	"fmt"
	"strings"

	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
)

type CurrentSQLiteModuleConfig struct {
	RuntimeDBPath     string
	AppDBPath         string
	EnableAI          bool
	InferenceSettings *aisettings.InferenceSettings
	BasePaths         BasePaths
	Logf              func(format string, args ...any)
}

func OpenCurrentSQLiteModule(config CurrentSQLiteModuleConfig) (*Module, error) {
	runtime, err := OpenSQLiteRuntime(SQLiteRuntimeConfig{DBPath: config.RuntimeDBPath})
	if err != nil {
		return nil, fmt.Errorf("open sqlite runtime: %w", err)
	}

	engine := newAIEngine("SQLite", config.EnableAI, config.InferenceSettings, config.logf)

	profile := currentSQLiteNotebookProfile()
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
			SessionID:  "sqlite-notebook-session",
			RuntimeKey: "sqlite-runtime",
			Store:      store,
			Timeline:   timeline,
		},
		AI:        engine,
		BasePaths: config.BasePaths,
		WebSocket: currentSQLiteWebSocketConfig(),
	})
	if err != nil {
		_ = timeline.Close()
		_ = store.Close()
		_ = runtime.Close()
		return nil, err
	}

	module.additionalClosers = append(module.additionalClosers, runtime.Close)
	return module, nil
}

func currentSQLiteNotebookProfile() NotebookProfile {
	return NotebookProfile{
		DefaultNotebookID:    "nbk_default_sqlite",
		DefaultLanguage:      "sql",
		DefaultNotebookTitle: "SQLite Notebook",
		StarterCells: []StarterCellTemplate{
			{
				Kind:   "markdown",
				Source: "## SQLite Notebook\n\nCreate tables, insert rows, and query them from the next code cell.",
			},
			{
				Kind: "code",
				Source: strings.TrimSpace(`
create table users (
  id integer primary key,
  name text not null,
  age integer not null
);

insert into users (name, age)
values ('Ada', 31), ('Grace', 42);

select id, name, age
from users
order by age desc;
`),
			},
		},
	}
}

func currentSQLiteWebSocketConfig() WebSocketConfig {
	return WebSocketConfig{
		HintUnavailable: WebSocketFallbackResponse{
			Text:  "AI hints are unavailable right now. Try reducing the SQL query, inspecting the schema, or selecting from a smaller intermediate result.",
			Chips: []string{"explain this SQL", "show the table schema", "suggest a smaller query"},
			Docs: []hints.DocRef{{
				Title:   "SQLite quick reference",
				Section: "Queries",
				Body:    "Build queries incrementally: create tables, insert sample rows, then run smaller SELECT statements before composing joins or aggregations.",
			}},
		},
		DiagnosisUnavailable: WebSocketFallbackResponse{
			Text:  "AI diagnosis is unavailable right now. Check the SQLite error text, inspect the table definitions, and rerun a smaller subset of the script.",
			Chips: []string{"explain this SQLite error", "show a safer query", "how do I debug this SQL"},
			Docs: []hints.DocRef{{
				Title:   "SQLite debugging",
				Section: "Errors",
				Body:    "Validate one statement at a time, inspect sqlite_master for schema shape, and reset the runtime if previous setup statements may have polluted the state.",
			}},
		},
	}
}

func (c CurrentSQLiteModuleConfig) logf(format string, args ...any) {
	if c.Logf != nil {
		c.Logf(format, args...)
	}
}
