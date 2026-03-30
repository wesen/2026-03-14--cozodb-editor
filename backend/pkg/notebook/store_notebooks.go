package notebook

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
)

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
		Language:    s.profile.DefaultLanguage,
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
