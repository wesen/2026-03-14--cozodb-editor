package notebook

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
)

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

	cells, err := s.listCellsTx(ctx, tx, notebookID)
	if err != nil {
		return nil, err
	}
	insertPosition, err := nextInsertPosition(ctx, tx, notebookID, afterCellID)
	if err != nil {
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
	`, cell.ID, cell.NotebookID, -(len(cells) + 1000), cell.Kind, cell.Source, cell.CreatedAtMs, cell.UpdatedAtMs); err != nil {
		return nil, err
	}
	cell.Position = insertPosition

	orderedCellIDs := insertCellIDAtPosition(cells, cell.ID, insertPosition)
	if err := s.rewriteNotebookOrderTx(ctx, tx, notebookID, orderedCellIDs, now); err != nil {
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

	cells, err := s.listCellsTx(ctx, tx, cell.NotebookID)
	if err != nil {
		return err
	}
	maxPos := len(cells) - 1
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
	orderedCellIDs, err := moveCellIDToIndex(cells, cellID, targetIndex)
	if err != nil {
		return err
	}
	if err := s.rewriteNotebookOrderTx(ctx, tx, cell.NotebookID, orderedCellIDs, now); err != nil {
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

	cells, err := s.listCellsTx(ctx, tx, cell.NotebookID)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM nb_cells WHERE cell_id = ?`, cellID); err != nil {
		return err
	}

	now := time.Now().UnixMilli()
	orderedCellIDs := removeCellID(cells, cellID)
	if err := s.rewriteNotebookOrderTx(ctx, tx, cell.NotebookID, orderedCellIDs, now); err != nil {
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

func (s *Store) ClearNotebook(ctx context.Context, notebookID string) error {
	if ctx == nil {
		ctx = context.Background()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var exists int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM nb_notebooks WHERE notebook_id = ?`, notebookID).Scan(&exists); err != nil {
		return err
	}
	if exists == 0 {
		return sql.ErrNoRows
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM nb_link_timeline_snapshots WHERE notebook_id = ?`, notebookID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM nb_cells WHERE notebook_id = ?`, notebookID); err != nil {
		return err
	}

	now := time.Now().UnixMilli()
	for _, cell := range starterCellsForNotebook(notebookID, now, s.profile) {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO nb_cells(cell_id, notebook_id, position, kind, source, created_at_ms, updated_at_ms)
			VALUES(?, ?, ?, ?, ?, ?, ?)
		`, cell.ID, cell.NotebookID, cell.Position, cell.Kind, cell.Source, cell.CreatedAtMs, cell.UpdatedAtMs); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE nb_notebooks
		SET updated_at_ms = ?
		WHERE notebook_id = ?
	`, now, notebookID); err != nil {
		return err
	}

	return tx.Commit()
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

func (s *Store) listCellsTx(ctx context.Context, tx *sql.Tx, notebookID string) ([]NotebookCell, error) {
	rows, err := tx.QueryContext(ctx, `
		SELECT cell_id, notebook_id, position, kind, source, created_at_ms, updated_at_ms
		FROM nb_cells
		WHERE notebook_id = ?
		ORDER BY position ASC
	`, notebookID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := []NotebookCell{}
	for rows.Next() {
		var cell NotebookCell
		if err := rows.Scan(&cell.ID, &cell.NotebookID, &cell.Position, &cell.Kind, &cell.Source, &cell.CreatedAtMs, &cell.UpdatedAtMs); err != nil {
			return nil, err
		}
		out = append(out, cell)
	}
	return out, rows.Err()
}

func (s *Store) rewriteNotebookOrderTx(ctx context.Context, tx *sql.Tx, notebookID string, orderedCellIDs []string, now int64) error {
	for index, cellID := range orderedCellIDs {
		if _, err := tx.ExecContext(ctx, `
			UPDATE nb_cells
			SET position = ?, updated_at_ms = ?
			WHERE notebook_id = ? AND cell_id = ?
		`, -(index + 1), now, notebookID, cellID); err != nil {
			return err
		}
	}

	for index, cellID := range orderedCellIDs {
		if _, err := tx.ExecContext(ctx, `
			UPDATE nb_cells
			SET position = ?, updated_at_ms = ?
			WHERE notebook_id = ? AND cell_id = ?
		`, index, now, notebookID, cellID); err != nil {
			return err
		}
	}

	return nil
}

func insertCellIDAtPosition(cells []NotebookCell, cellID string, position int) []string {
	orderedCellIDs := make([]string, 0, len(cells)+1)
	inserted := false
	for index, cell := range cells {
		if !inserted && index == position {
			orderedCellIDs = append(orderedCellIDs, cellID)
			inserted = true
		}
		orderedCellIDs = append(orderedCellIDs, cell.ID)
	}
	if !inserted {
		orderedCellIDs = append(orderedCellIDs, cellID)
	}
	return orderedCellIDs
}

func moveCellIDToIndex(cells []NotebookCell, cellID string, targetIndex int) ([]string, error) {
	orderedCellIDs := make([]string, 0, len(cells))
	currentIndex := -1
	for index, cell := range cells {
		if cell.ID == cellID {
			currentIndex = index
			continue
		}
		orderedCellIDs = append(orderedCellIDs, cell.ID)
	}
	if currentIndex < 0 {
		return nil, sql.ErrNoRows
	}
	if targetIndex < 0 {
		targetIndex = 0
	}
	if targetIndex > len(orderedCellIDs) {
		targetIndex = len(orderedCellIDs)
	}
	orderedCellIDs = append(orderedCellIDs, "")
	copy(orderedCellIDs[targetIndex+1:], orderedCellIDs[targetIndex:])
	orderedCellIDs[targetIndex] = cellID
	return orderedCellIDs, nil
}

func removeCellID(cells []NotebookCell, cellID string) []string {
	orderedCellIDs := make([]string, 0, len(cells))
	for _, cell := range cells {
		if cell.ID == cellID {
			continue
		}
		orderedCellIDs = append(orderedCellIDs, cell.ID)
	}
	return orderedCellIDs
}
