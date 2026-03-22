import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import type { HintsSocket, SemEvent } from "../transport/hintsSocket";
import type { NotebookCell } from "../transport/httpClient";
import { registerCurrentCozoSemHandlers, type NotebookSemHandlerRegistrar } from "./registerCurrentCozoSemHandlers";
import {
  clearCurrentNotebook,
  insertNotebookCellBelow,
  loadNotebook,
  persistNotebookTitle,
  resetNotebookKernelState,
  runNotebookCellById,
  selectActiveCellId,
  selectActiveCellIndex,
  selectCellsById,
  selectNotebookDocument,
  selectNotebookError,
  selectNotebookRuntimeByCell,
  selectNotebookStatus,
  setActiveCellId,
  semEventProjected,
} from "./state/notebookSlice";

const EMPTY_CELLS: NotebookCell[] = [];

function clampIndex(index: number, maxIndex: number): number {
  return Math.max(0, Math.min(maxIndex, index));
}

export interface NotebookPageControllerOptions {
  confirmAction?: (message: string) => boolean;
  registerSemHandlers?: NotebookSemHandlerRegistrar;
  ws: HintsSocket;
}

export function useNotebookPageController({ confirmAction, registerSemHandlers = registerCurrentCozoSemHandlers, ws }: NotebookPageControllerOptions) {
  const dispatch = useAppDispatch();
  const document = useAppSelector(selectNotebookDocument);
  const error = useAppSelector(selectNotebookError);
  const status = useAppSelector(selectNotebookStatus);
  const activeCellId = useAppSelector(selectActiveCellId);
  const activeCellIndex = useAppSelector(selectActiveCellIndex);
  const runtimeByCell = useAppSelector(selectNotebookRuntimeByCell);
  const cellsById = useAppSelector(selectCellsById);
  const cells = document?.cells ?? EMPTY_CELLS;
  const loading = status === "idle" || status === "loading";

  useEffect(() => {
    if (status === "idle") {
      void dispatch(loadNotebook());
    }
  }, [dispatch, status]);

  useEffect(() => {
    const onProject = (event: SemEvent) => {
      dispatch(semEventProjected(event));
    };

    const unsubscribers = registerSemHandlers(ws, { onProject });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [dispatch, registerSemHandlers, ws]);

  const focusCellAtIndex = useCallback((index: number) => {
    if (cells.length === 0) {
      dispatch(setActiveCellId(null));
      return;
    }

    const nextCell = cells[clampIndex(index, cells.length - 1)];
    dispatch(setActiveCellId(nextCell?.id || null));
  }, [cells, dispatch]);

  const handleAskAI = useCallback((cellId: string, question: string) => {
    const trimmed = question.trim();
    if (!trimmed || !document?.notebook?.id) {
      return;
    }

    ws.send("hint.request", {
      question: trimmed,
      history: [],
      notebookId: document.notebook.id,
      ownerCellId: cellId,
      runId: runtimeByCell[cellId]?.run?.id || "",
    });
  }, [document, runtimeByCell, ws]);

  const handleDiagnose = useCallback((cellId: string) => {
    const cell = cellsById[cellId];
    const output = runtimeByCell[cellId]?.output;
    if (!document?.notebook?.id || !cell || !output) {
      return;
    }

    ws.send("diagnosis.request", {
      error: output.display || output.message || "Unknown error",
      script: cell.source,
      notebookId: document.notebook.id,
      ownerCellId: cell.id,
      runId: runtimeByCell[cell.id]?.run?.id || "",
    });
  }, [cellsById, document, runtimeByCell, ws]);

  const handleRunAndAdvance = useCallback(async (cellId: string) => {
    const runtime = await dispatch(runNotebookCellById(cellId));
    if (!runtime) {
      return;
    }

    const currentIndex = cells.findIndex((cell) => cell.id === cellId);
    for (let index = currentIndex + 1; index < cells.length; index += 1) {
      if (cells[index]?.kind === "code") {
        dispatch(setActiveCellId(cells[index]?.id || null));
        return;
      }
    }
  }, [cells, dispatch]);

  const handleInsertBelow = useCallback(async (
    afterCellId: string,
    kind: "code" | "markdown",
    source = "",
  ) => {
    const newCell = await dispatch(insertNotebookCellBelow(afterCellId, kind, source));
    if (newCell) {
      dispatch(setActiveCellId(newCell.id));
    }
  }, [dispatch]);

  const handleRunAndInsertBelow = useCallback(async (cellId: string) => {
    const runtime = await dispatch(runNotebookCellById(cellId));
    if (!runtime) {
      return;
    }

    const newCell = await dispatch(insertNotebookCellBelow(cellId, "code", ""));
    if (newCell) {
      dispatch(setActiveCellId(newCell.id));
    }
  }, [dispatch]);

  const handleClearNotebook = useCallback(async () => {
    if (confirmAction && !confirmAction("Clear the notebook and restore the starter cells? This removes current cells and outputs.")) {
      return;
    }
    await dispatch(clearCurrentNotebook());
  }, [confirmAction, dispatch]);

  const handleResetKernel = useCallback(async () => {
    if (confirmAction && !confirmAction("Reset the kernel and clear runtime outputs? Notebook cells will be preserved.")) {
      return;
    }
    await dispatch(resetNotebookKernelState());
  }, [confirmAction, dispatch]);

  const handleNotebookKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
    if (!document) {
      return;
    }

    const target = event.target as HTMLElement;
    const isInInput = target.tagName === "TEXTAREA" || target.tagName === "INPUT";
    const currentIndex = activeCellIndex < 0 ? 0 : activeCellIndex;
    const activeCell = activeCellId ? cellsById[activeCellId] || null : cells[currentIndex] || null;

    if (event.ctrlKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      focusCellAtIndex(event.key === "ArrowUp" ? currentIndex - 1 : currentIndex + 1);
      return;
    }

    if (isInInput) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      focusCellAtIndex(currentIndex - 1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      focusCellAtIndex(currentIndex + 1);
      return;
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      if (activeCell?.kind === "code") {
        void handleRunAndAdvance(activeCell.id);
      }
      return;
    }

    if (event.key === "Enter" && (event.altKey || event.ctrlKey)) {
      event.preventDefault();
      if (activeCell?.kind === "code") {
        void handleRunAndInsertBelow(activeCell.id);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const card = window.document.querySelector(".mac-cell-card.is-active textarea, .mac-cell-card.is-active .mac-md-preview");
      if (card instanceof HTMLElement) {
        card.click();
      }
      if (card instanceof HTMLTextAreaElement) {
        card.focus();
      }
      return;
    }

    if (event.key === "a") {
      event.preventDefault();
      void handleInsertBelow(activeCell?.id || "", "code");
      return;
    }

    if (event.key === "m") {
      event.preventDefault();
      void handleInsertBelow(activeCell?.id || "", "markdown");
      return;
    }

    if (event.key === "x") {
      event.preventDefault();
      const closeButton = window.document.querySelector(".mac-cell-card.is-active .mac-window__close");
      if (closeButton instanceof HTMLElement) {
        closeButton.click();
      }
      return;
    }

    if (event.key === "Escape") {
      (window.document.activeElement as HTMLElement | null)?.blur?.();
    }
  }, [activeCellId, activeCellIndex, cells, cellsById, document, focusCellAtIndex, handleInsertBelow, handleRunAndAdvance, handleRunAndInsertBelow]);

  useEffect(() => {
    window.addEventListener("keydown", handleNotebookKeyDown);
    return () => window.removeEventListener("keydown", handleNotebookKeyDown);
  }, [handleNotebookKeyDown]);

  return {
    document,
    error,
    handleAskAI,
    handleClearNotebook,
    handleDiagnose,
    handleInsertBelow,
    handleResetKernel,
    handleRunAndInsertBelow,
    loading,
    persistTitle: (title: string) => dispatch(persistNotebookTitle(title)),
    wsConnected: ws.connected,
  };
}
