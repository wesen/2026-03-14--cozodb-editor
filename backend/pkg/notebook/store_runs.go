package notebook

import (
	"context"
	"database/sql"
	"time"
)

func (s *Store) ClearRuntimeState(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM nb_link_timeline_snapshots`); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM nb_runs`); err != nil {
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
