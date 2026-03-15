import { useEffect, useState } from "react";
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
    await insertCellAfter(cellId, "code", source);
  }

  async function handleInsertMarkdownBelow(cellId: string) {
    await insertCellAfter(cellId, "markdown", "");
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
              collapsedThreads={collapsedThreads}
              dismissedThreads={dismissedThreads}
              onAskAI={handleAskAI}
              onChangeSource={setCellSource}
              onDelete={removeCell}
              onDiagnose={handleDiagnose}
              onDismissThread={(threadId: string) => setDismissedThreads((current) => ({ ...current, [threadId]: true }))}
              onInsertCodeBelow={handleInsertCodeBelow}
              onInsertMarkdownBelow={handleInsertMarkdownBelow}
              onMoveDown={moveCell}
              onMoveUp={moveCell}
              onPersistSource={handlePersistSource}
              onRun={handleRunCell}
              onSetAIPrompt={setAIPrompt}
              onToggleThreadCollapse={(threadId: string) => setCollapsedThreads((current) => ({ ...current, [threadId]: !current[threadId] }))}
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
