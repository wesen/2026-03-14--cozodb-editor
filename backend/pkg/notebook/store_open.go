package notebook

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

const defaultNotebookID = "nbk_default"

type StoreConfig struct {
	DBPath  string
	Profile NotebookProfile
}

type Store struct {
	db      *sql.DB
	dbPath  string
	profile NotebookProfile
}

func OpenStore(dbPath string) (*Store, error) {
	return OpenStoreWithConfig(StoreConfig{DBPath: dbPath})
}

func OpenStoreWithConfig(config StoreConfig) (*Store, error) {
	config.Profile = config.Profile.withDefaults()

	dbPath := strings.TrimSpace(config.DBPath)
	if dbPath == "" {
		return nil, fmt.Errorf("notebook store: db path is empty")
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil && filepath.Dir(dbPath) != "." {
		return nil, fmt.Errorf("notebook store: create db dir: %w", err)
	}
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("notebook store: open sqlite: %w", err)
	}
	store := &Store{db: db, dbPath: dbPath, profile: config.Profile}
	if err := store.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *Store) DBPath() string {
	if s == nil {
		return ""
	}
	return s.dbPath
}

func (s *Store) DefaultNotebookID() string {
	if s == nil {
		return defaultNotebookID
	}
	return s.profile.withDefaults().DefaultNotebookID
}
