package notebook

import "fmt"

const (
	defaultSessionID         = "notebook-editor-session"
	defaultRuntimeKey        = "notebook-runtime"
	defaultNotebooksPath     = "/api/notebooks"
	defaultNotebookCellsPath = "/api/notebook-cells"
	defaultResetKernelPath   = "/api/runtime/reset-kernel"
	defaultHintsWSPath       = "/ws/hints"
)

type ServiceConfig struct {
	Runtime    Runtime
	SessionID  string
	RuntimeKey string
	Store      *Store
	Timeline   TimelineStore
}

type BasePaths struct {
	Notebooks     string
	NotebookCells string
	ResetKernel   string
	HintsWS       string
}

type ModuleConfig struct {
	ServiceConfig ServiceConfig
	AI            AIEngine
	BasePaths     BasePaths
	WebSocket     WebSocketConfig
}

func (c ServiceConfig) withDefaults() ServiceConfig {
	if c.SessionID == "" {
		c.SessionID = defaultSessionID
	}
	if c.RuntimeKey == "" {
		c.RuntimeKey = defaultRuntimeKey
	}
	return c
}

func (c ServiceConfig) validate() error {
	if c.Store == nil {
		return fmt.Errorf("notebook service store is nil")
	}
	if c.Timeline == nil {
		return fmt.Errorf("notebook service timeline is nil")
	}
	if c.Runtime == nil {
		return fmt.Errorf("notebook service runtime is nil")
	}
	return nil
}

func DefaultBasePaths() BasePaths {
	return BasePaths{}.withDefaults()
}

func (p BasePaths) withDefaults() BasePaths {
	if p.Notebooks == "" {
		p.Notebooks = defaultNotebooksPath
	}
	if p.NotebookCells == "" {
		p.NotebookCells = defaultNotebookCellsPath
	}
	if p.ResetKernel == "" {
		p.ResetKernel = defaultResetKernelPath
	}
	if p.HintsWS == "" {
		p.HintsWS = defaultHintsWSPath
	}
	return p
}

func (p BasePaths) validate() error {
	if p.Notebooks == "" || p.NotebookCells == "" || p.ResetKernel == "" || p.HintsWS == "" {
		return fmt.Errorf("notebook module base paths must not be empty")
	}
	for _, path := range []string{p.Notebooks, p.NotebookCells, p.ResetKernel, p.HintsWS} {
		if path[0] != '/' {
			return fmt.Errorf("notebook module base path %q must start with /", path)
		}
	}
	return nil
}

func (c ModuleConfig) withDefaults() ModuleConfig {
	c.ServiceConfig = c.ServiceConfig.withDefaults()
	c.BasePaths = c.BasePaths.withDefaults()
	c.WebSocket = c.WebSocket.withDefaults()
	return c
}

func (c ModuleConfig) validate() error {
	if err := c.ServiceConfig.validate(); err != nil {
		return err
	}
	if err := c.BasePaths.validate(); err != nil {
		return err
	}
	return nil
}
