package notebook

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (s *Store) EnsureDefaultNotebook(ctx context.Context) (*NotebookDocument, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	defaultID := s.DefaultNotebookID()

	doc, err := s.GetNotebook(ctx, defaultID)
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
		VALUES(?, ?, ?, ?, ?)
	`, defaultID, s.profile.DefaultNotebookTitle, s.profile.DefaultLanguage, now, now); err != nil {
		return nil, err
	}

	for _, cell := range initialDefaultNotebookCells(defaultID, now, s.profile) {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO nb_cells(cell_id, notebook_id, position, kind, source, created_at_ms, updated_at_ms)
			VALUES(?, ?, ?, ?, ?, ?, ?)
		`, cell.ID, defaultID, cell.Position, cell.Kind, cell.Source, now, now); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetNotebook(ctx, defaultID)
}

func normalizeCellKind(kind string) string {
	kind = strings.TrimSpace(kind)
	if kind != "markdown" {
		return "code"
	}
	return kind
}

func initialDefaultNotebookCells(notebookID string, now int64, profile NotebookProfile) []NotebookCell {
	starterCells := profile.withDefaults().StarterCells
	return []NotebookCell{
		{
			ID:          defaultNotebookIntroCellID(notebookID),
			NotebookID:  notebookID,
			Position:    0,
			Kind:        starterCells[0].Kind,
			Source:      starterCells[0].Source,
			CreatedAtMs: now,
			UpdatedAtMs: now,
		},
		{
			ID:          defaultNotebookQueryCellID(notebookID),
			NotebookID:  notebookID,
			Position:    1,
			Kind:        starterCells[1].Kind,
			Source:      starterCells[1].Source,
			CreatedAtMs: now,
			UpdatedAtMs: now,
		},
	}
}

func defaultNotebookIntroCellID(notebookID string) string {
	if notebookID == defaultNotebookID {
		return "cell_intro"
	}
	return notebookID + "__intro"
}

func defaultNotebookQueryCellID(notebookID string) string {
	if notebookID == defaultNotebookID {
		return "cell_query"
	}
	return notebookID + "__query"
}

func starterCellsForNotebook(notebookID string, now int64, profile NotebookProfile) []NotebookCell {
	starterCells := profile.withDefaults().StarterCells
	cells := make([]NotebookCell, 0, len(starterCells))
	for index, cell := range starterCells {
		cells = append(cells, NotebookCell{
			ID:          "cell_" + uuid.NewString(),
			NotebookID:  notebookID,
			Position:    index,
			Kind:        cell.Kind,
			Source:      cell.Source,
			CreatedAtMs: now,
			UpdatedAtMs: now,
		})
	}
	return cells
}
