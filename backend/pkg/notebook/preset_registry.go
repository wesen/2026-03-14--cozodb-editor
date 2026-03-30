package notebook

import (
	"fmt"
	"sort"
	"strings"

	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
)

type PresetOptions struct {
	AppDBPath         string
	BasePaths         BasePaths
	CozoDBPath        string
	CozoEngine        string
	InferenceSettings *aisettings.InferenceSettings
	Logf              func(format string, args ...any)
	SQLiteRuntimePath string
}

type PresetDescriptor struct {
	Name        string
	Description string
	Open        func(options PresetOptions) (*Module, error)
}

type PresetRegistry struct {
	descriptors map[string]PresetDescriptor
}

func NewPresetRegistry() *PresetRegistry {
	return &PresetRegistry{descriptors: map[string]PresetDescriptor{}}
}

func DefaultPresetRegistry() *PresetRegistry {
	registry := NewPresetRegistry()
	registry.mustRegister(PresetDescriptor{
		Name:        "cozo",
		Description: "Current Cozo notebook preset",
		Open: func(options PresetOptions) (*Module, error) {
			options.logf("[MAIN] Opening current Cozo notebook preset (engine=%s, path=%s)", options.CozoEngine, options.CozoDBPath)
			return OpenCurrentCozoModule(CurrentCozoModuleConfig{
				Engine:            options.CozoEngine,
				DBPath:            options.CozoDBPath,
				AppDBPath:         options.AppDBPath,
				InferenceSettings: options.InferenceSettings,
				BasePaths:         options.BasePaths,
				Logf:              options.Logf,
			})
		},
	})
	registry.mustRegister(PresetDescriptor{
		Name:        "javascript",
		Description: "Current JavaScript notebook preset",
		Open: func(options PresetOptions) (*Module, error) {
			options.logf("[MAIN] Opening current JavaScript notebook preset")
			return OpenCurrentJavaScriptModule(CurrentJavaScriptModuleConfig{
				AppDBPath:         options.AppDBPath,
				InferenceSettings: options.InferenceSettings,
				BasePaths:         options.BasePaths,
				Logf:              options.Logf,
			})
		},
	})
	registry.mustRegister(PresetDescriptor{
		Name:        "sqlite",
		Description: "Current SQLite notebook preset",
		Open: func(options PresetOptions) (*Module, error) {
			options.logf("[MAIN] Opening current SQLite notebook preset (runtime path=%s)", options.SQLiteRuntimePath)
			return OpenCurrentSQLiteModule(CurrentSQLiteModuleConfig{
				RuntimeDBPath:     options.SQLiteRuntimePath,
				AppDBPath:         options.AppDBPath,
				InferenceSettings: options.InferenceSettings,
				BasePaths:         options.BasePaths,
				Logf:              options.Logf,
			})
		},
	})
	return registry
}

func (r *PresetRegistry) Register(descriptor PresetDescriptor) error {
	if r == nil {
		return fmt.Errorf("preset registry is nil")
	}
	name := strings.TrimSpace(descriptor.Name)
	if name == "" {
		return fmt.Errorf("preset descriptor name is empty")
	}
	if descriptor.Open == nil {
		return fmt.Errorf("preset %q has nil opener", name)
	}
	if _, ok := r.descriptors[name]; ok {
		return fmt.Errorf("preset %q already registered", name)
	}
	descriptor.Name = name
	r.descriptors[name] = descriptor
	return nil
}

func (r *PresetRegistry) mustRegister(descriptor PresetDescriptor) {
	if err := r.Register(descriptor); err != nil {
		panic(err)
	}
}

func (r *PresetRegistry) Names() []string {
	if r == nil {
		return nil
	}
	names := make([]string, 0, len(r.descriptors))
	for name := range r.descriptors {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func (r *PresetRegistry) Descriptors() []PresetDescriptor {
	if r == nil {
		return nil
	}
	names := r.Names()
	descriptors := make([]PresetDescriptor, 0, len(names))
	for _, name := range names {
		descriptors = append(descriptors, r.descriptors[name])
	}
	return descriptors
}

func (r *PresetRegistry) Open(name string, options PresetOptions) (*Module, error) {
	if r == nil {
		return nil, fmt.Errorf("preset registry is nil")
	}
	name = strings.TrimSpace(name)
	descriptor, ok := r.descriptors[name]
	if !ok {
		return nil, fmt.Errorf("unknown preset %q (available: %s)", name, strings.Join(r.Names(), ", "))
	}
	return descriptor.Open(options)
}

func (o PresetOptions) logf(format string, args ...any) {
	if o.Logf != nil {
		o.Logf(format, args...)
	}
}
