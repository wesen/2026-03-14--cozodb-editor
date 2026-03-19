import { useCallback, useEffect, useState } from "react";
import { NotebookCellCard } from "./NotebookCellCard";
import { useNotebookDocument } from "./useNotebookDocument";
import { createSemProjectionState, applySemEvent } from "../sem/semProjection";
import { registerCozoSemHandlers } from "../sem/registerCozoSemHandlers";
import { registerDefaultSemHandlers } from "../sem/registerDefaultSemHandlers";
import { useHintsSocket } from "../transport/hintsSocket";
import type { SemEvent } from "../transport/hintsSocket";
import type { NotebookCell } from "../transport/httpClient";
import "./notebook.css";
import "../theme/cards.css";
import "../theme/layout.css";
import "../theme/tokens.css";

export default function NotebookPage() {
  const ws = useHintsSocket();
  const {
    document,
    error,
    executionStateByCell,
    loading,
    runtimeByCell,
    insertCellAfter,
    moveCell,
    persistCell,
    persistTitle,
    removeCell,
    runCell,
    setCellSource,
    setCellRuntime,
  } = useNotebookDocument();
  const [semProjection, setSemProjection] = useState(() => createSemProjectionState());
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [dismissedThreads, setDismissedThreads] = useState<Record<string, boolean>>({});
  const [aiPrompts, setAIPrompts] = useState<Record<string, string>>({});
  const [rawActiveCellIndex, setActiveCellIndex] = useState(0);
  const activeCellIndex = document ? Math.min(rawActiveCellIndex, Math.max(0, document.cells.length - 1)) : 0;

  useEffect(() => {
    const onProject = (event: SemEvent) => {
      setSemProjection((current) => applySemEvent(current, event));
    };

    const unsubscribers = [
      ...registerDefaultSemHandlers(ws, { onProject }),
      ...registerCozoSemHandlers(ws, { onProject }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [ws]);

  // Run active cell and advance focus to the next code cell
  async function handleRunAndAdvance(cellId: string) {
    const runtime = await runCell(cellId);
    if (runtime) {
      setCellRuntime((current) => ({ ...current, [cellId]: runtime }));
    }
    if (!document) return;
    // Advance to next code cell, or stay if none
    const currentIdx = document.cells.findIndex((c) => c.id === cellId);
    for (let i = currentIdx + 1; i < document.cells.length; i++) {
      if (document.cells[i]?.kind === "code") {
        setActiveCellIndex(i);
        return;
      }
    }
  }

  async function handleRunAndInsertBelow(cellId: string) {
    const runtime = await runCell(cellId);
    if (runtime) {
      setCellRuntime((current) => ({ ...current, [cellId]: runtime }));
    }
    await handleInsertCodeBelow(cellId);
  }

  // Keyboard navigation at notebook level
  const handleNotebookKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
    if (!document) return;
    const target = event.target as HTMLElement;
    const isInInput = target.tagName === "TEXTAREA" || target.tagName === "INPUT";

    // Ctrl+Shift+ArrowUp/Down: move between cells even when in editor
    if (event.ctrlKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      setActiveCellIndex((current) => {
        const max = document.cells.length - 1;
        return event.key === "ArrowUp" ? Math.max(0, current - 1) : Math.min(max, current + 1);
      });
      return;
    }

    // Alt/Ctrl+Enter in editor: run and insert a new code cell below
    if ((event.altKey || event.ctrlKey) && event.key === "Enter" && isInInput) {
      event.preventDefault();
      const activeCell = document.cells[activeCellIndex];
      if (activeCell?.kind === "code") {
        handleRunAndInsertBelow(activeCell.id);
      }
      return;
    }

    // Don't intercept other keys when typing in an input
    if (isInInput) return;

    // Arrow keys / j/k: navigate cells
    if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      setActiveCellIndex((current) => Math.max(0, current - 1));
    } else if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      setActiveCellIndex((current) => Math.min(document.cells.length - 1, current + 1));
    } else if (event.key === "Enter" && event.shiftKey) {
      // Shift+Enter outside editor: run active cell and advance
      event.preventDefault();
      const activeCell = document.cells[activeCellIndex];
      if (activeCell?.kind === "code") {
        handleRunAndAdvance(activeCell.id);
      }
    } else if (event.key === "Enter" && (event.altKey || event.ctrlKey)) {
      event.preventDefault();
      const activeCell = document.cells[activeCellIndex];
      if (activeCell?.kind === "code") {
        handleRunAndInsertBelow(activeCell.id);
      }
    } else if (event.key === "Enter") {
      // Enter: focus editor of active cell
      event.preventDefault();
      const card = window.document.querySelector(`.mac-cell-card.is-active textarea, .mac-cell-card.is-active .mac-md-preview`);
      if (card instanceof HTMLElement) card.click();
      if (card instanceof HTMLTextAreaElement) card.focus();
    } else if (event.key === "a") {
      // a: insert code cell after active
      event.preventDefault();
      const activeCell = document.cells[activeCellIndex];
      if (activeCell) handleInsertCodeBelow(activeCell.id);
    } else if (event.key === "m") {
      // m: insert markdown cell after active
      event.preventDefault();
      const activeCell = document.cells[activeCellIndex];
      if (activeCell) handleInsertMarkdownBelow(activeCell.id);
    } else if (event.key === "x") {
      // x: delete active cell
      event.preventDefault();
      const activeCell = document.cells[activeCellIndex];
      if (activeCell) removeCell(activeCell.id);
    } else if (event.key === "Escape") {
      // Escape: blur any focused element, return to nav mode
      (window.document.activeElement as HTMLElement)?.blur?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document, activeCellIndex]);

  useEffect(() => {
    window.addEventListener("keydown", handleNotebookKeyDown);
    return () => window.removeEventListener("keydown", handleNotebookKeyDown);
  }, [handleNotebookKeyDown]);

  function setAIPrompt(cellId: string, value: string) {
    setAIPrompts((current) => ({ ...current, [cellId]: value }));
  }

  function handleAskAI(cellId: string, question: string) {
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
    setAIPrompts((current) => ({ ...current, [cellId]: "" }));
  }

  function handleDiagnose(cell: NotebookCell) {
    if (!document?.notebook?.id) {
      return;
    }
    const output = runtimeByCell[cell.id]?.output;
    if (!output) {
      return;
    }
    ws.send("diagnosis.request", {
      error: output.display || output.message || "Unknown error",
      script: cell.source,
      notebookId: document.notebook.id,
      ownerCellId: cell.id,
      runId: runtimeByCell[cell.id]?.run?.id || "",
    });
  }

  async function handlePersistSource(cell: NotebookCell) {
    await persistCell(cell.id, {
      kind: cell.kind,
      source: cell.source,
    });
  }

  async function handleRunCell(cellId: string) {
    const runtime = await runCell(cellId);
    if (!runtime) {
      return;
    }
    setCellRuntime((current) => ({ ...current, [cellId]: runtime }));
  }

  async function handleInsertCodeBelow(cellId: string, source = "") {
    const newCell = await insertCellAfter(cellId, "code", source);
    if (newCell && document) {
      // Focus the new cell
      const idx = document.cells.findIndex((c) => c.id === cellId);
      if (idx >= 0) setActiveCellIndex(idx + 1);
    }
  }

  async function handleInsertMarkdownBelow(cellId: string) {
    const newCell = await insertCellAfter(cellId, "markdown", "");
    if (newCell && document) {
      const idx = document.cells.findIndex((c) => c.id === cellId);
      if (idx >= 0) setActiveCellIndex(idx + 1);
    }
  }

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
              onBlur={(event) => persistTitle(event.target.value)}
            />
          </div>
          <div className="mac-window__titlebar-right">
            <button className="mac-btn" onClick={() => insertCellAfter(document.cells.at(-1)?.id || "", "code", "")}>
              New Code Cell
            </button>
            <button className="mac-btn" onClick={() => insertCellAfter(document.cells.at(-1)?.id || "", "markdown", "")}>
              New Markdown Cell
            </button>
          </div>
        </div>

        {error ? <div className="mac-status-msg mac-status-msg--error">{error}</div> : null}

        <div className="mac-notebook-body">
          {document.cells.map((cell, index) => (
            <NotebookCellCard
              key={cell.id}
              aiPrompt={aiPrompts[cell.id] || ""}
              cell={cell}
              cellIndex={index}
              isActive={index === activeCellIndex}
              collapsedThreads={collapsedThreads}
              dismissedThreads={dismissedThreads}
              onAskAI={handleAskAI}
              onChangeSource={setCellSource}
              onDelete={removeCell}
              onDiagnose={handleDiagnose}
              onDismissThread={(threadId: string) => setDismissedThreads((current) => ({ ...current, [threadId]: true }))}
              onFocus={setActiveCellIndex}
              onInsertCodeBelow={handleInsertCodeBelow}
              onInsertMarkdownBelow={handleInsertMarkdownBelow}
              onMoveDown={moveCell}
              onMoveUp={moveCell}
              onPersistSource={handlePersistSource}
              onRun={handleRunCell}
              onRunAndInsertBelow={handleRunAndInsertBelow}
              onSetAIPrompt={setAIPrompt}
              onToggleThreadCollapse={(threadId: string) => setCollapsedThreads((current) => ({ ...current, [threadId]: !current[threadId] }))}
              executionState={executionStateByCell[cell.id]}
              runtime={runtimeByCell[cell.id]}
              semProjection={semProjection}
              wsConnected={ws.connected}
            />
          ))}

          {document.cells.length === 0 ? (
            <div className="mac-empty-state">
              <div className="mac-empty-state__icon">&#9000;</div>
              <div className="mac-empty-state__text">No cells yet.</div>
              <div className="mac-empty-state__actions">
                <button className="mac-btn" onClick={() => insertCellAfter("", "code", "")}>New Code Cell</button>
                <button className="mac-btn" onClick={() => insertCellAfter("", "markdown", "")}>New Markdown Cell</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
