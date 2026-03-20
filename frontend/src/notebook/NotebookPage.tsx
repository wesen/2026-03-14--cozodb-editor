import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { registerCozoSemHandlers } from "../sem/registerCozoSemHandlers";
import { registerDefaultSemHandlers } from "../sem/registerDefaultSemHandlers";
import type { NotebookCell } from "../transport/httpClient";
import { useHintsSocket, type SemEvent } from "../transport/hintsSocket";
import { NotebookCellCard } from "./NotebookCellCard";
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
import "./notebook.css";
import "../theme/cards.css";
import "../theme/layout.css";
import "../theme/tokens.css";

const EMPTY_CELLS: NotebookCell[] = [];

function clampIndex(index: number, maxIndex: number): number {
  return Math.max(0, Math.min(maxIndex, index));
}

export default function NotebookPage() {
  const dispatch = useAppDispatch();
  const ws = useHintsSocket();
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

    const unsubscribers = [
      ...registerDefaultSemHandlers(ws, { onProject }),
      ...registerCozoSemHandlers(ws, { onProject }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [dispatch, ws]);

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
    if (!window.confirm("Clear the notebook and restore the starter cells? This removes current cells and outputs.")) {
      return;
    }
    await dispatch(clearCurrentNotebook());
  }, [dispatch]);

  const handleResetKernel = useCallback(async () => {
    if (!window.confirm("Reset the kernel and clear runtime outputs? Notebook cells will be preserved.")) {
      return;
    }
    await dispatch(resetNotebookKernelState());
  }, [dispatch]);

  const handleNotebookKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
    if (!document) {
      return;
    }

    const target = event.target as HTMLElement;
    const isInInput = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.closest(".cm-editor") != null;
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
      const card = window.document.querySelector(
        ".mac-cell-card.is-active textarea, .mac-cell-card.is-active .mac-md-preview, .mac-cell-card.is-active .cm-editor"
      );
      if (card instanceof HTMLElement) {
        card.click();
      }
      if (card instanceof HTMLTextAreaElement) {
        card.focus();
      }
      // Focus CodeMirror editor: .cm-content is the focusable element
      const cmContent = card?.querySelector(".cm-content");
      if (cmContent instanceof HTMLElement) {
        cmContent.focus();
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

  if (loading) {
    return (
      <div className="mac-desktop">
        <div className="mac-window mac-notebook-chrome">
          <div className="mac-window__titlebar">
            <div className="mac-window__titlebar-left">
              <span className="mac-window__close" />
              <span className="mac-window__title">CozoDB Notebook</span>
            </div>
          </div>
          <div className="mac-notebook-body">
            <div className="mac-status-msg">Loading notebook...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="mac-desktop">
        <div className="mac-window mac-notebook-chrome">
          <div className="mac-window__titlebar">
            <div className="mac-window__titlebar-left">
              <span className="mac-window__close" />
              <span className="mac-window__title">CozoDB Notebook</span>
            </div>
          </div>
          <div className="mac-notebook-body">
            <div className="mac-status-msg">{error || "Failed to load notebook"}</div>
          </div>
        </div>
      </div>
    );
  }

  const lastCellId = document.cells.at(-1)?.id || "";

  return (
    <div className="mac-desktop">
      <div className="mac-menubar">
        <span className="mac-menubar__apple">&#63743;</span>
        <span className="mac-menubar__item">File</span>
        <span className="mac-menubar__item">Edit</span>
        <span className="mac-menubar__item">Cell</span>
        <span className="mac-menubar__item">Runtime</span>
        <span className="mac-menubar__spacer" />
        <span className="mac-menubar__hint">j/k nav | Enter edit | Shift+Enter run+advance | Alt/Ctrl+Enter run+new | a +code | m +md | x delete</span>
        <span className={`mac-menubar__status ${ws.connected ? "is-connected" : ""}`}>
          {ws.connected ? "Connected" : "Offline"}
        </span>
      </div>

      <div className="mac-window mac-notebook-chrome">
        <div className="mac-window__titlebar">
          <div className="mac-window__titlebar-left">
            <span className="mac-window__close" />
            <input
              className="mac-window__title-input"
              defaultValue={document.notebook.title}
              key={`${document.notebook.id}:${document.notebook.updated_at_ms}`}
              onBlur={(event) => {
                void dispatch(persistNotebookTitle(event.target.value));
              }}
            />
          </div>
          <div className="mac-window__titlebar-right">
            <button className="mac-btn" onClick={() => { void handleInsertBelow(lastCellId, "code"); }}>
              New Code Cell
            </button>
            <button className="mac-btn" onClick={() => { void handleInsertBelow(lastCellId, "markdown"); }}>
              New Markdown Cell
            </button>
            <button className="mac-btn" onClick={() => { void handleClearNotebook(); }}>
              Clear Notebook
            </button>
            <button className="mac-btn" onClick={() => { void handleResetKernel(); }}>
              Reset Kernel
            </button>
          </div>
        </div>

        {error ? <div className="mac-status-msg mac-status-msg--error">{error}</div> : null}

        <div className="mac-notebook-body">
          {document.cells.map((cell, index) => (
            <NotebookCellCard
              key={cell.id}
              cellId={cell.id}
              cellIndex={index}
              onAskAI={handleAskAI}
              onDiagnose={handleDiagnose}
              onRunAndInsertBelow={handleRunAndInsertBelow}
              wsConnected={ws.connected}
            />
          ))}

          {document.cells.length === 0 ? (
            <div className="mac-empty-state">
              <div className="mac-empty-state__icon">&#9000;</div>
              <div className="mac-empty-state__text">No cells yet.</div>
              <div className="mac-empty-state__actions">
                <button className="mac-btn" onClick={() => { void handleInsertBelow("", "code"); }}>New Code Cell</button>
                <button className="mac-btn" onClick={() => { void handleInsertBelow("", "markdown"); }}>New Markdown Cell</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
