package notebook

import "fmt"

func (s *Store) migrate() error {
	stmts := []string{
		`PRAGMA foreign_keys = ON;`,
		`CREATE TABLE IF NOT EXISTS nb_notebooks (
			notebook_id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			language TEXT NOT NULL DEFAULT 'notebook',
			created_at_ms INTEGER NOT NULL,
			updated_at_ms INTEGER NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS nb_cells (
			cell_id TEXT PRIMARY KEY,
			notebook_id TEXT NOT NULL,
			position INTEGER NOT NULL,
			kind TEXT NOT NULL,
			source TEXT NOT NULL,
			created_at_ms INTEGER NOT NULL,
			updated_at_ms INTEGER NOT NULL,
			FOREIGN KEY(notebook_id) REFERENCES nb_notebooks(notebook_id) ON DELETE CASCADE
		);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS nb_cells_notebook_position_idx
			ON nb_cells(notebook_id, position);`,
		`CREATE TABLE IF NOT EXISTS nb_runs (
			run_id TEXT PRIMARY KEY,
			notebook_id TEXT NOT NULL,
			cell_id TEXT NOT NULL,
			conv_id TEXT NOT NULL,
			execution_count INTEGER NOT NULL,
			status TEXT NOT NULL,
			source_hash TEXT NOT NULL,
			started_at_ms INTEGER NOT NULL,
			finished_at_ms INTEGER,
			FOREIGN KEY(notebook_id) REFERENCES nb_notebooks(notebook_id) ON DELETE CASCADE,
			FOREIGN KEY(cell_id) REFERENCES nb_cells(cell_id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS nb_runs_cell_started_idx
			ON nb_runs(cell_id, started_at_ms DESC);`,
		`CREATE TABLE IF NOT EXISTS nb_link_timeline_snapshots (
			notebook_id TEXT NOT NULL,
			cell_id TEXT,
			run_id TEXT,
			conv_id TEXT NOT NULL,
			snapshot_version INTEGER NOT NULL,
			created_at_ms INTEGER NOT NULL,
			PRIMARY KEY(conv_id, snapshot_version)
		);`,
		`CREATE INDEX IF NOT EXISTS nb_link_timeline_snapshots_cell_idx
			ON nb_link_timeline_snapshots(cell_id, created_at_ms DESC);`,
	}

	for _, stmt := range stmts {
		if _, err := s.db.Exec(stmt); err != nil {
			return fmt.Errorf("notebook store: migrate: %w", err)
		}
	}
	return nil
}
