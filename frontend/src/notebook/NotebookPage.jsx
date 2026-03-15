import { useEffect, useState } from "react";
import { NotebookCellCard } from "./NotebookCellCard";
import { useNotebookDocument } from "./useNotebookDocument";
import { createSemProjectionState, applySemEvent } from "../sem/semProjection";
import { registerCozoSemHandlers } from "../sem/registerCozoSemHandlers";
import { registerDefaultSemHandlers } from "../sem/registerDefaultSemHandlers";
import { useHintsSocket } from "../transport/hintsSocket";
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
  const [collapsedThreads, setCollapsedThreads] = useState({});
  const [dismissedThreads, setDismissedThreads] = useState({});
  const [aiPrompts, setAIPrompts] = useState({});

  useEffect(() => {
    const onProject = (event) => {
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

  function setAIPrompt(cellId, value) {
    setAIPrompts((current) => ({ ...current, [cellId]: value }));
  }

  function handleAskAI(cellId, question) {
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

  function handleDiagnose(cell) {
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

  async function handlePersistSource(cell) {
    await persistCell(cell.id, {
      kind: cell.kind,
      source: cell.source,
    });
  }

  async function handleRunCell(cellId) {
    const runtime = await runCell(cellId);
    if (!runtime) {
      return;
    }
    setCellRuntime((current) => ({ ...current, [cellId]: runtime }));
  }

  async function handleInsertCodeBelow(cellId, source = "") {
    await insertCellAfter(cellId, "code", source);
  }

  async function handleInsertMarkdownBelow(cellId) {
    await insertCellAfter(cellId, "markdown", "");
  }

  if (loading) {
    return <div className="cozo-notebook-root"><div className="cozo-notebook-status">Loading notebook...</div></div>;
  }

  if (!document) {
    return <div className="cozo-notebook-root"><div className="cozo-notebook-status">{error || "Failed to load notebook"}</div></div>;
  }

  return (
    <div className="cozo-notebook-root">
      <div className="cozo-notebook-shell">
        <div className="cozo-shell-bar cozo-shell-bar--header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "var(--accent)", fontSize: 18 }}>[]</span>
            <input
              defaultValue={document.notebook.title}
              key={`${document.notebook.id}:${document.notebook.updated_at_ms}`}
              onBlur={(event) => persistTitle(event.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                minWidth: 320,
              }}
            />
            <span className={`cozo-notebook-badge ${ws.connected ? "is-connected" : ""}`}>
              {ws.connected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cozo-notebook-action" onClick={() => insertCellAfter(document.cells.at(-1)?.id || "", "code", "")}>
              New Code Cell
            </button>
            <button className="cozo-notebook-action" onClick={() => insertCellAfter(document.cells.at(-1)?.id || "", "markdown", "")}>
              New Markdown Cell
            </button>
          </div>
        </div>

        {error ? <div className="cozo-notebook-status">{error}</div> : null}

        <div style={{ padding: "24px 28px 42px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
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
              onDismissThread={(threadId) => setDismissedThreads((current) => ({ ...current, [threadId]: true }))}
              onInsertCodeBelow={handleInsertCodeBelow}
              onInsertMarkdownBelow={handleInsertMarkdownBelow}
              onMoveDown={moveCell}
              onMoveUp={moveCell}
              onPersistSource={handlePersistSource}
              onRun={handleRunCell}
              onSetAIPrompt={setAIPrompt}
              onToggleThreadCollapse={(threadId) => setCollapsedThreads((current) => ({ ...current, [threadId]: !current[threadId] }))}
              runtime={runtimeByCell[cell.id]}
              semProjection={semProjection}
              wsConnected={ws.connected}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
