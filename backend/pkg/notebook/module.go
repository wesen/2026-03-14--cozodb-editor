package notebook

import (
	"errors"
	"net/http"
)

type Module struct {
	Service           *Service
	AI                AIEngine
	BasePaths         BasePaths
	WebSocketConfig   WebSocketConfig
	additionalClosers []func() error
}

func NewModule(config ModuleConfig) (*Module, error) {
	config = config.withDefaults()
	if err := config.validate(); err != nil {
		return nil, err
	}

	service, err := NewService(config.ServiceConfig)
	if err != nil {
		return nil, err
	}

	return &Module{
		Service:         service,
		AI:              config.AI,
		BasePaths:       config.BasePaths,
		WebSocketConfig: config.WebSocket,
	}, nil
}

func OpenModule(appDBPath string, runtime Runtime, engine AIEngine) (*Module, error) {
	service, err := OpenService(appDBPath, runtime)
	if err != nil {
		return nil, err
	}

	return &Module{
		Service:         service,
		AI:              engine,
		BasePaths:       DefaultBasePaths(),
		WebSocketConfig: DefaultWebSocketConfig(),
	}, nil
}

func (m *Module) Close() error {
	if m == nil {
		return nil
	}

	var closeErr error
	if m.Service != nil {
		closeErr = errors.Join(closeErr, m.Service.Close())
	}
	for i := len(m.additionalClosers) - 1; i >= 0; i-- {
		closeErr = errors.Join(closeErr, m.additionalClosers[i]())
	}
	return closeErr
}

func (m *Module) MountHTTP(mux *http.ServeMux) {
	if m == nil {
		return
	}
	MountHTTPRoutesWithBasePaths(mux, m.Service, m.BasePaths)
}

func (m *Module) MountWebSocket(mux *http.ServeMux) {
	if m == nil || m.Service == nil {
		return
	}
	MountWebSocketRoutesWithConfig(mux, m.Service.runtime, m.AI, m.BasePaths, m.WebSocketConfig)
}
