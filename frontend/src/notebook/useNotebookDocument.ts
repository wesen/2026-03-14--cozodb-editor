import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import {
  bootstrapNotebook,
  deleteNotebookCell,
  insertNotebookCell,
  moveNotebookCell,
  runNotebookCell,
  updateNotebookCell,
  updateNotebookTitle,
} from "../transport/httpClient";
import type {
  CellRuntime,
  NotebookCell,
  NotebookDocument,
  NotebookMutationResult,
  UpdateCellPayload,
} from "../transport/httpClient";
import { buildNotebookExecutionState, type NotebookExecutionState } from "./runtimeState";

function reorderCells(cells: NotebookCell[], cellId: string, targetIndex: number): NotebookCell[] {
  const currentIndex = cells.findIndex((cell) => cell.id === cellId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= cells.length) {
    return cells;
  }

  const next = [...cells];
  const [cell] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, cell!);
  return next.map((item, index) => ({ ...item, position: index }));
}

function mergeServerDocumentWithLocalDrafts(
  serverDocument: NotebookDocument,
  currentDocument: NotebookDocument | null,
  localDirtyCellIds: Set<string>,
): NotebookDocument {
  if (!currentDocument || localDirtyCellIds.size === 0) {
    return serverDocument;
  }

  const localCellsById = new Map(currentDocument.cells.map((cell) => [cell.id, cell]));
  return {
    ...serverDocument,
    cells: serverDocument.cells.map((cell) => {
      if (!localDirtyCellIds.has(cell.id)) {
        return cell;
      }
      const localCell = localCellsById.get(cell.id);
      if (!localCell) {
        return cell;
      }
      return {
        ...cell,
        kind: localCell.kind,
        source: localCell.source,
      };
    }),
  };
}

export interface UseNotebookDocumentResult {
  document: NotebookDocument | null;
  error: string | null;
  executionStateByCell: Record<string, NotebookExecutionState>;
  loading: boolean;
  runtimeByCell: Record<string, CellRuntime>;
  insertCellAfter: (afterCellId: string, kind: "code" | "markdown", source?: string) => Promise<NotebookCell | null>;
  load: () => Promise<void>;
  moveCell: (cellId: string, targetIndex: number) => Promise<void>;
  persistCell: (cellId: string, updates: UpdateCellPayload) => Promise<NotebookCell | null>;
  persistTitle: (title: string) => Promise<void>;
  removeCell: (cellId: string) => Promise<void>;
  runCell: (cellId: string) => Promise<CellRuntime | null>;
  setCellRuntime: Dispatch<SetStateAction<Record<string, CellRuntime>>>;
  setCellSource: (cellId: string, source: string) => void;
}

export function useNotebookDocument(): UseNotebookDocumentResult {
  const [document, setDocument] = useState<NotebookDocument | null>(null);
  const [runtimeByCell, setRuntimeByCell] = useState<Record<string, CellRuntime>>({});
  const [localDirtyCellIds, setLocalDirtyCellIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function applyMutationResult(response: NotebookMutationResult): NotebookCell | null {
    if (!response.document) {
      return null;
    }

    const mergedDocument = mergeServerDocumentWithLocalDrafts(response.document, document, localDirtyCellIds);
    const cellIDs = new Set(mergedDocument.cells.map((cell) => cell.id));
    setDocument(mergedDocument);
    setRuntimeByCell(mergedDocument.runtime || {});
    setLocalDirtyCellIds((current) => {
      const next = new Set<string>();
      for (const cellID of current) {
        if (cellIDs.has(cellID)) {
          next.add(cellID);
        }
      }
      return next;
    });
    return response.cell || null;
  }

  async function loadNotebook() {
    setLoading(true);
    const response = await bootstrapNotebook();
    if (!("notebook" in response)) {
      setError("message" in response ? response.message : "Failed to load notebook");
      setLoading(false);
      return;
    }

    setDocument(response as NotebookDocument);
    setRuntimeByCell((response as NotebookDocument).runtime || {});
    setLocalDirtyCellIds(new Set());
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      const response = await bootstrapNotebook();
      if (!active) {
        return;
      }
      if (!("notebook" in response)) {
        setError("message" in response ? response.message : "Failed to load notebook");
        setLoading(false);
        return;
      }
      setDocument(response as NotebookDocument);
      setRuntimeByCell((response as NotebookDocument).runtime || {});
      setLocalDirtyCellIds(new Set());
      setError(null);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  function setCellSource(cellId: string, source: string) {
    setDocument((current) => current ? {
      ...current,
      cells: current.cells.map((cell) => cell.id === cellId ? { ...cell, source } : cell),
    } : current);
    setLocalDirtyCellIds((current) => new Set(current).add(cellId));
  }

  async function persistCell(cellId: string, updates: UpdateCellPayload): Promise<NotebookCell | null> {
    if (!localDirtyCellIds.has(cellId)) {
      const existingCell = document?.cells.find((cell) => cell.id === cellId) || null;
      return existingCell;
    }
    const response = await updateNotebookCell(cellId, updates);
    if ("id" in response) {
      const cell = response as NotebookCell;
      setDocument((current) => current ? {
        ...current,
        cells: current.cells.map((c) => c.id === cellId ? cell : c),
      } : current);
      setLocalDirtyCellIds((current) => {
        const next = new Set(current);
        next.delete(cellId);
        return next;
      });
      return cell;
    }

    setError("message" in response ? response.message : "Failed to save cell");
    return null;
  }

  async function persistTitle(title: string): Promise<void> {
    if (!document?.notebook?.id) return;
    const response = await updateNotebookTitle(document.notebook.id, title);
    if ("notebook" in response) {
      const doc = response as NotebookDocument;
      setDocument(doc);
      setRuntimeByCell(doc.runtime || {});
      return;
    }
    setError("message" in response ? response.message : "Failed to update notebook title");
  }

  async function insertCellAfter(afterCellId: string, kind: "code" | "markdown", source = ""): Promise<NotebookCell | null> {
    if (!document?.notebook?.id) return null;
    const response = await insertNotebookCell(document.notebook.id, {
      after_cell_id: afterCellId,
      kind,
      source,
    });
    if ("document" in response) {
      const cell = applyMutationResult(response as NotebookMutationResult);
      if (cell?.kind === "code" && cell.source.trim() !== "") {
        setLocalDirtyCellIds((current) => new Set(current).add(cell.id));
      }
      return cell;
    }

    setError("message" in response ? response.message : "Failed to insert cell");
    return null;
  }

  async function moveCell(cellId: string, targetIndex: number): Promise<void> {
    setDocument((current) => current ? {
      ...current,
      cells: reorderCells(current.cells, cellId, targetIndex),
    } : current);

    const response = await moveNotebookCell(cellId, targetIndex);
    if (!("document" in response)) {
      setError("message" in response ? response.message : "Failed to move cell");
      await loadNotebook();
      return;
    }
    applyMutationResult(response as NotebookMutationResult);
  }

  async function removeCell(cellId: string): Promise<void> {
    setDocument((current) => current ? {
      ...current,
      cells: current.cells.filter((cell) => cell.id !== cellId).map((cell, index) => ({ ...cell, position: index })),
    } : current);
    setRuntimeByCell((current) => {
      const next = { ...current };
      delete next[cellId];
      return next;
    });
    setLocalDirtyCellIds((current) => {
      const next = new Set(current);
      next.delete(cellId);
      return next;
    });

    const response = await deleteNotebookCell(cellId);
    if (!("document" in response)) {
      setError("message" in response ? response.message : "Failed to delete cell");
      await loadNotebook();
      return;
    }
    applyMutationResult(response as NotebookMutationResult);
  }

  async function runCellAction(cellId: string): Promise<CellRuntime | null> {
    const cell = document?.cells.find((item) => item.id === cellId) || null;
    if (!cell) {
      setError("Cell not found");
      return null;
    }

    if (localDirtyCellIds.has(cellId)) {
      const persisted = await persistCell(cellId, {
        kind: cell.kind,
        source: cell.source,
      });
      if (!persisted) {
        return null;
      }
    }

    const response = await runNotebookCell(cellId);
    if ("run" in response) {
      const runtime = response as CellRuntime;
      setRuntimeByCell((current) => ({
        ...current,
        [cellId]: runtime,
      }));
      setLocalDirtyCellIds((current) => {
        const next = new Set(current);
        next.delete(cellId);
        return next;
      });
      return runtime;
    }

    setError("message" in response ? response.message : "Failed to run cell");
    return null;
  }

  const executionStateByCell = document
    ? buildNotebookExecutionState(document.cells, runtimeByCell, localDirtyCellIds)
    : {};

  return {
    document,
    error,
    executionStateByCell,
    loading,
    runtimeByCell,
    insertCellAfter,
    load: loadNotebook,
    moveCell,
    persistCell,
    persistTitle,
    removeCell,
    runCell: runCellAction,
    setCellRuntime: setRuntimeByCell,
    setCellSource,
  };
}
