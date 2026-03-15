package notebook

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

const defaultNotebookID = "nbk_default"

type Store struct {
	db     *sql.DB
	dbPath string
}

func OpenStore(dbPath string) (*Store, error) {
	dbPath = strings.TrimSpace(dbPath)
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
	store := &Store{db: db, dbPath: dbPath}
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

func (s *Store) migrate() error {
	stmts := []string{
		`PRAGMA foreign_keys = ON;`,
		`CREATE TABLE IF NOT EXISTS nb_notebooks (
			notebook_id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			language TEXT NOT NULL DEFAULT 'cozoscript',
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

func (s *Store) EnsureDefaultNotebook(ctx context.Context) (*NotebookDocument, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	doc, err := s.GetNotebook(ctx, defaultNotebookID)
	if err == nil {
		return doc, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	now := time.Now().UnixMilli()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO nb_notebooks(notebook_id, title, language, created_at_ms, updated_at_ms)
		VALUES(?, ?, 'cozoscript', ?, ?)
	`, defaultNotebookID, "Notebook Playground", now, now); err != nil {
		return nil, err
	}

	cells := []struct {
		id       string
		position int
		kind     string
		source   string
	}{
		{id: "cell_intro", position: 0, kind: "markdown", source: "## Cozo Notebook\n\nWrite a query in the next cell and run it."},
		{id: "cell_query", position: 1, kind: "code", source: "?[x] <- [[1], [2], [3]]"},
	}

	for _, cell := range cells {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO nb_cells(cell_id, notebook_id, position, kind, source, created_at_ms, updated_at_ms)
			VALUES(?, ?, ?, ?, ?, ?, ?)
		`, cell.id, defaultNotebookID, cell.position, cell.kind, cell.source, now, now); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetNotebook(ctx, defaultNotebookID)
}

func (s *Store) CreateNotebook(ctx context.Context, title string) (*Notebook, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	title = strings.TrimSpace(title)
	if title == "" {
		title = "Untitled Notebook"
	}
	now := time.Now().UnixMilli()
	nb := &Notebook{
		ID:          "nbk_" + uuid.NewString(),
		Title:       title,
		Language:    "cozoscript",
		CreatedAtMs: now,
		UpdatedAtMs: now,
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO nb_notebooks(notebook_id, title, language, created_at_ms, updated_at_ms)
		VALUES(?, ?, ?, ?, ?)
	`, nb.ID, nb.Title, nb.Language, nb.CreatedAtMs, nb.UpdatedAtMs)
	if err != nil {
		return nil, err
	}
	return nb, nil
}

func (s *Store) GetNotebook(ctx context.Context, notebookID string) (*NotebookDocument, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	notebookID = strings.TrimSpace(notebookID)
	if notebookID == "" {
		return nil, sql.ErrNoRows
	}

	var nb Notebook
	err := s.db.QueryRowContext(ctx, `
		SELECT notebook_id, title, language, created_at_ms, updated_at_ms
		FROM nb_notebooks
		WHERE notebook_id = ?
	`, notebookID).Scan(&nb.ID, &nb.Title, &nb.Language, &nb.CreatedAtMs, &nb.UpdatedAtMs)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT cell_id, notebook_id, position, kind, source, created_at_ms, updated_at_ms
		FROM nb_cells
		WHERE notebook_id = ?
		ORDER BY position ASC
	`, notebookID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	cells := []NotebookCell{}
	for rows.Next() {
		var cell NotebookCell
		if err := rows.Scan(&cell.ID, &cell.NotebookID, &cell.Position, &cell.Kind, &cell.Source, &cell.CreatedAtMs, &cell.UpdatedAtMs); err != nil {
			return nil, err
		}
		cells = append(cells, cell)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &NotebookDocument{
		Notebook: nb,
		Cells:    cells,
	}, nil
}

func (s *Store) GetCell(ctx context.Context, cellID string) (*NotebookCell, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	cellID = strings.TrimSpace(cellID)
	var cell NotebookCell
	err := s.db.QueryRowContext(ctx, `
		SELECT cell_id, notebook_id, position, kind, source, created_at_ms, updated_at_ms
		FROM nb_cells
		WHERE cell_id = ?
	`, cellID).Scan(&cell.ID, &cell.NotebookID, &cell.Position, &cell.Kind, &cell.Source, &cell.CreatedAtMs, &cell.UpdatedAtMs)
	if err != nil {
		return nil, err
	}
	return &cell, nil
}

func (s *Store) UpdateNotebookTitle(ctx context.Context, notebookID string, title string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	title = strings.TrimSpace(title)
	if title == "" {
		title = "Untitled Notebook"
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE nb_notebooks
		SET title = ?, updated_at_ms = ?
		WHERE notebook_id = ?
	`, title, time.Now().UnixMilli(), notebookID)
	return err
}

func (s *Store) InsertCell(ctx context.Context, notebookID string, afterCellID string, kind string, source string) (*NotebookCell, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	kind = normalizeCellKind(kind)
	now := time.Now().UnixMilli()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	insertPosition, err := nextInsertPosition(ctx, tx, notebookID, afterCellID)
	if err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE nb_cells
		SET position = position + 1, updated_at_ms = ?
		WHERE notebook_id = ? AND position >= ?
	`, now, notebookID, insertPosition); err != nil {
		return nil, err
	}

	cell := &NotebookCell{
		ID:          "cell_" + uuid.NewString(),
		NotebookID:  notebookID,
		Position:    insertPosition,
		Kind:        kind,
		Source:      source,
		CreatedAtMs: now,
		UpdatedAtMs: now,
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO nb_cells(cell_id, notebook_id, position, kind, source, created_at_ms, updated_at_ms)
		VALUES(?, ?, ?, ?, ?, ?, ?)
	`, cell.ID, cell.NotebookID, cell.Position, cell.Kind, cell.Source, cell.CreatedAtMs, cell.UpdatedAtMs); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE nb_notebooks
		SET updated_at_ms = ?
		WHERE notebook_id = ?
	`, now, notebookID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return cell, nil
}

func (s *Store) UpdateCell(ctx context.Context, cellID string, kind string, source string) (*NotebookCell, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	cell, err := s.GetCell(ctx, cellID)
	if err != nil {
		return nil, err
	}
	kind = normalizeCellKind(kind)
	now := time.Now().UnixMilli()
	if _, err := s.db.ExecContext(ctx, `
		UPDATE nb_cells
		SET kind = ?, source = ?, updated_at_ms = ?
		WHERE cell_id = ?
	`, kind, source, now, cellID); err != nil {
		return nil, err
	}
	if _, err := s.db.ExecContext(ctx, `
		UPDATE nb_notebooks
		SET updated_at_ms = ?
		WHERE notebook_id = ?
	`, now, cell.NotebookID); err != nil {
		return nil, err
	}
	return s.GetCell(ctx, cellID)
}

func (s *Store) MoveCell(ctx context.Context, cellID string, targetIndex int) error {
	if ctx == nil {
		ctx = context.Background()
	}
	cell, err := s.GetCell(ctx, cellID)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	maxPos, err := maxCellPosition(ctx, tx, cell.NotebookID)
	if err != nil {
		return err
	}
	if targetIndex < 0 {
		targetIndex = 0
	}
	if targetIndex > maxPos {
		targetIndex = maxPos
	}
	if targetIndex == cell.Position {
		return nil
	}

	now := time.Now().UnixMilli()
	if targetIndex < cell.Position {
		if _, err := tx.ExecContext(ctx, `
			UPDATE nb_cells
			SET position = position + 1, updated_at_ms = ?
			WHERE notebook_id = ? AND position >= ? AND position < ?
		`, now, cell.NotebookID, targetIndex, cell.Position); err != nil {
			return err
		}
	} else {
		if _, err := tx.ExecContext(ctx, `
			UPDATE nb_cells
			SET position = position - 1, updated_at_ms = ?
			WHERE notebook_id = ? AND position > ? AND position <= ?
		`, now, cell.NotebookID, cell.Position, targetIndex); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE nb_cells
		SET position = ?, updated_at_ms = ?
		WHERE cell_id = ?
	`, targetIndex, now, cellID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE nb_notebooks
		SET updated_at_ms = ?
		WHERE notebook_id = ?
	`, now, cell.NotebookID); err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Store) DeleteCell(ctx context.Context, cellID string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	cell, err := s.GetCell(ctx, cellID)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM nb_cells WHERE cell_id = ?`, cellID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE nb_cells
		SET position = position - 1, updated_at_ms = ?
		WHERE notebook_id = ? AND position > ?
	`, time.Now().UnixMilli(), cell.NotebookID, cell.Position); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE nb_notebooks
		SET updated_at_ms = ?
		WHERE notebook_id = ?
	`, time.Now().UnixMilli(), cell.NotebookID); err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Store) NextExecutionCount(ctx context.Context, notebookID string, cellID string) (int, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	var maxCount sql.NullInt64
	if err := s.db.QueryRowContext(ctx, `
		SELECT MAX(execution_count)
		FROM nb_runs
		WHERE notebook_id = ? AND cell_id = ?
	`, notebookID, cellID).Scan(&maxCount); err != nil {
		return 0, err
	}
	if !maxCount.Valid {
		return 1, nil
	}
	return int(maxCount.Int64) + 1, nil
}

func (s *Store) CreateRun(ctx context.Context, run CellRun) error {
	if ctx == nil {
		ctx = context.Background()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO nb_runs(run_id, notebook_id, cell_id, conv_id, execution_count, status, source_hash, started_at_ms, finished_at_ms)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, run.ID, run.NotebookID, run.CellID, run.ConvID, run.ExecutionCount, run.Status, run.SourceHash, run.StartedAtMs, run.FinishedAtMs)
	return err
}

func (s *Store) FinishRun(ctx context.Context, runID string, status string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	now := time.Now().UnixMilli()
	_, err := s.db.ExecContext(ctx, `
		UPDATE nb_runs
		SET status = ?, finished_at_ms = ?
		WHERE run_id = ?
	`, status, now, runID)
	return err
}

func (s *Store) ListLatestRunsByCell(ctx context.Context, notebookID string) (map[string]*CellRun, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT r.run_id, r.notebook_id, r.cell_id, r.conv_id, r.execution_count, r.status, r.source_hash, r.started_at_ms, r.finished_at_ms
		FROM nb_runs r
		INNER JOIN (
			SELECT cell_id, MAX(started_at_ms) AS max_started
			FROM nb_runs
			WHERE notebook_id = ?
			GROUP BY cell_id
		) latest
		ON latest.cell_id = r.cell_id AND latest.max_started = r.started_at_ms
		WHERE r.notebook_id = ?
	`, notebookID, notebookID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := map[string]*CellRun{}
	for rows.Next() {
		var run CellRun
		var finished sql.NullInt64
		if err := rows.Scan(&run.ID, &run.NotebookID, &run.CellID, &run.ConvID, &run.ExecutionCount, &run.Status, &run.SourceHash, &run.StartedAtMs, &finished); err != nil {
			return nil, err
		}
		if finished.Valid {
			value := finished.Int64
			run.FinishedAtMs = &value
		}
		out[run.CellID] = &run
	}
	return out, rows.Err()
}

func (s *Store) RecordTimelineSnapshot(ctx context.Context, link TimelineSnapshotLink) error {
	if ctx == nil {
		ctx = context.Background()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT OR REPLACE INTO nb_link_timeline_snapshots(notebook_id, cell_id, run_id, conv_id, snapshot_version, created_at_ms)
		VALUES(?, ?, ?, ?, ?, ?)
	`, link.NotebookID, link.CellID, link.RunID, link.ConvID, link.SnapshotVersion, link.CreatedAtMs)
	return err
}

func normalizeCellKind(kind string) string {
	kind = strings.TrimSpace(kind)
	if kind != "markdown" {
		return "code"
	}
	return kind
}

func nextInsertPosition(ctx context.Context, tx *sql.Tx, notebookID string, afterCellID string) (int, error) {
	afterCellID = strings.TrimSpace(afterCellID)
	if afterCellID == "" {
		var count int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM nb_cells WHERE notebook_id = ?`, notebookID).Scan(&count); err != nil {
			return 0, err
		}
		return count, nil
	}

	var position int
	if err := tx.QueryRowContext(ctx, `
		SELECT position
		FROM nb_cells
		WHERE notebook_id = ? AND cell_id = ?
	`, notebookID, afterCellID).Scan(&position); err != nil {
		return 0, err
	}
	return position + 1, nil
}

func maxCellPosition(ctx context.Context, tx *sql.Tx, notebookID string) (int, error) {
	var maxPos sql.NullInt64
	if err := tx.QueryRowContext(ctx, `SELECT MAX(position) FROM nb_cells WHERE notebook_id = ?`, notebookID).Scan(&maxPos); err != nil {
		return 0, err
	}
	if !maxPos.Valid {
		return 0, nil
	}
	return int(maxPos.Int64), nil
}
