package notebook

import "fmt"

const (
	defaultSessionID  = "cozodb-editor-notebook"
	defaultRuntimeKey = "cozodb-notebook"
)

type ServiceConfig struct {
	Runtime    Runtime
	SessionID  string
	RuntimeKey string
	Store      *Store
	Timeline   TimelineStore
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
