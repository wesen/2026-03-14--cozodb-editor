package cozo

import (
	"fmt"
	"strings"
	"sync"
)

// Manager owns the process runtime and can replace it on reset.
type Manager struct {
	db         *DB
	engine     string
	generation int64
	mu         sync.RWMutex
	path       string
}

func NewManager(engine string, path string) (*Manager, error) {
	db, err := NewDB(engine, path)
	if err != nil {
		return nil, err
	}

	return &Manager{
		db:         db,
		engine:     strings.TrimSpace(engine),
		generation: 1,
		path:       path,
	}, nil
}

func (m *Manager) Query(script string, params map[string]any) (*QueryResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.db.Query(script, params)
}

func (m *Manager) ListRelations() ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.db.ListRelations()
}

func (m *Manager) DescribeRelation(name string) (*RelationInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.db.DescribeRelation(name)
}

func (m *Manager) GetSchema() (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.db.GetSchema()
}

func (m *Manager) Generation() int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.generation
}

func (m *Manager) Reset() (int64, error) {
	if m == nil {
		return 0, fmt.Errorf("cozo runtime manager is nil")
	}
	if m.engine != "mem" {
		return m.Generation(), fmt.Errorf("reset kernel is only supported for mem engine")
	}

	nextDB, err := NewDB(m.engine, m.path)
	if err != nil {
		return 0, err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	oldDB := m.db
	m.db = nextDB
	m.generation++
	generation := m.generation
	if oldDB != nil {
		oldDB.Close()
	}
	return generation, nil
}

func (m *Manager) Close() {
	if m == nil {
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	if m.db != nil {
		m.db.Close()
		m.db = nil
	}
}
