import { useEffect, useState } from "react";
import {
  bootstrapNotebook,
  deleteNotebookCell,
  insertNotebookCell,
  moveNotebookCell,
  runNotebookCell,
  updateNotebookCell,
  updateNotebookTitle,
} from "../transport/httpClient";

function reorderCells(cells, cellId, targetIndex) {
  const currentIndex = cells.findIndex((cell) => cell.id === cellId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= cells.length) {
    return cells;
  }

  const next = [...cells];
  const [cell] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, cell);
  return next.map((item, index) => ({ ...item, position: index }));
}

export function useNotebookDocument() {
  const [document, setDocument] = useState(null);
  const [runtimeByCell, setRuntimeByCell] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadNotebook() {
    setLoading(true);
    const response = await bootstrapNotebook();
    if (!response?.notebook) {
      setError(response?.message || "Failed to load notebook");
      setLoading(false);
      return;
    }

    setDocument(response);
    setRuntimeByCell(response.runtime || {});
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
      if (!response?.notebook) {
        setError(response?.message || "Failed to load notebook");
        setLoading(false);
        return;
      }
      setDocument(response);
      setRuntimeByCell(response.runtime || {});
      setError(null);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  function setCellSource(cellId, source) {
    setDocument((current) => current ? {
      ...current,
      cells: current.cells.map((cell) => cell.id === cellId ? { ...cell, source } : cell),
    } : current);
  }

  async function persistCell(cellId, updates) {
    const response = await updateNotebookCell(cellId, updates);
    if (response?.id) {
      setDocument((current) => current ? {
        ...current,
        cells: current.cells.map((cell) => cell.id === cellId ? response : cell),
      } : current);
      return response;
    }

    setError(response?.message || "Failed to save cell");
    return null;
  }

  async function persistTitle(title) {
    if (!document?.notebook?.id) return;
    const response = await updateNotebookTitle(document.notebook.id, title);
    if (response?.notebook) {
      setDocument(response);
      setRuntimeByCell(response.runtime || {});
      return;
    }
    setError(response?.message || "Failed to update notebook title");
  }

  async function insertCellAfter(afterCellId, kind, source = "") {
    if (!document?.notebook?.id) return null;
    const response = await insertNotebookCell(document.notebook.id, {
      after_cell_id: afterCellId,
      kind,
      source,
    });
    if (response?.id) {
      setDocument((current) => current ? {
        ...current,
        cells: [...current.cells, response].sort((left, right) => left.position - right.position),
      } : current);
      return response;
    }

    setError(response?.message || "Failed to insert cell");
    return null;
  }

  async function moveCell(cellId, targetIndex) {
    setDocument((current) => current ? {
      ...current,
      cells: reorderCells(current.cells, cellId, targetIndex),
    } : current);

    const response = await moveNotebookCell(cellId, targetIndex);
    if (response?.ok !== true) {
      setError(response?.message || "Failed to move cell");
      await loadNotebook();
    }
  }

  async function removeCell(cellId) {
    setDocument((current) => current ? {
      ...current,
      cells: current.cells.filter((cell) => cell.id !== cellId).map((cell, index) => ({ ...cell, position: index })),
    } : current);
    setRuntimeByCell((current) => {
      const next = { ...current };
      delete next[cellId];
      return next;
    });

    const response = await deleteNotebookCell(cellId);
    if (response?.ok !== true) {
      setError(response?.message || "Failed to delete cell");
      await loadNotebook();
    }
  }

  async function runCell(cellId) {
    const response = await runNotebookCell(cellId);
    if (response?.run) {
      setRuntimeByCell((current) => ({
        ...current,
        [cellId]: response,
      }));
      return response;
    }

    setError(response?.message || "Failed to run cell");
    return null;
  }

  return {
    document,
    error,
    loading,
    runtimeByCell,
    insertCellAfter,
    load: loadNotebook,
    moveCell,
    persistCell,
    persistTitle,
    removeCell,
    runCell,
    setCellRuntime: setRuntimeByCell,
    setCellSource,
  };
}
