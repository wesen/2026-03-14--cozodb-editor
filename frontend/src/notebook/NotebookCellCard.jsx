import { useState } from "react";
import { CozoSemRenderer } from "../features/cozo-sem/CozoSemRenderer";
import { QueryResultsTable } from "../features/query-results/QueryResultsTable";
import { StreamingMessageCard } from "../features/hints/StreamingMessageCard";
import { getSemThreadsForCell, getStreamingEntriesForCell } from "../sem/semProjection";

function CellErrorCard({ output, onDiagnose }) {
  return (
    <div style={{
      marginTop: 12,
      borderRadius: 8,
      border: "1px solid rgba(255, 120, 120, 0.25)",
      background: "rgba(120, 30, 30, 0.18)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.05em",
        color: "rgba(255, 160, 160, 0.92)",
        borderBottom: "1px solid rgba(255, 120, 120, 0.18)",
      }}>
        ERROR
      </div>
      <div style={{ padding: 12, color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
        {output.display || output.message || "Unknown error"}
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <button className="cozo-notebook-action" onClick={onDiagnose}>Diagnose with AI</button>
      </div>
    </div>
  );
}

export function NotebookCellCard({
  cell,
  cellIndex,
  runtime,
  semProjection,
  wsConnected,
  collapsedThreads,
  dismissedThreads,
  onAskAI,
  onChangeSource,
  onDelete,
  onDiagnose,
  onInsertCodeBelow,
  onInsertMarkdownBelow,
  onMoveDown,
  onMoveUp,
  onPersistSource,
  onRun,
  onSetAIPrompt,
  aiPrompt,
  onDismissThread,
  onToggleThreadCollapse,
}) {
  const [showAIForm, setShowAIForm] = useState(false);
  const streams = getStreamingEntriesForCell(semProjection, cell.id);
  const threads = getSemThreadsForCell(semProjection, cell.id).filter((thread) => !dismissedThreads[thread.id]);
  const isCode = cell.kind === "code";
  const runStatus = runtime?.run?.status || "idle";
  const executionCount = runtime?.run?.execution_count;

  return (
    <div style={{
      marginBottom: 18,
      borderRadius: 12,
      border: "1px solid var(--border-subtle)",
      background: "rgba(12, 16, 24, 0.82)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            [{executionCount ?? " "}] {cell.kind.toUpperCase()}
          </span>
          <span style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            background: runStatus === "complete"
              ? "rgba(80, 200, 120, 0.16)"
              : runStatus === "error"
                ? "rgba(255, 120, 120, 0.18)"
                : "rgba(255,255,255,0.06)",
            color: runStatus === "complete"
              ? "rgba(80, 200, 120, 0.92)"
              : runStatus === "error"
                ? "rgba(255, 160, 160, 0.92)"
                : "var(--text-muted)",
          }}>
            {runStatus}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isCode ? <button className="cozo-notebook-action" onClick={() => onRun(cell.id)}>Run</button> : null}
          {isCode ? (
            <button className="cozo-notebook-action" onClick={() => setShowAIForm((current) => !current)}>
              Ask AI
            </button>
          ) : null}
          <button className="cozo-notebook-action" onClick={() => onInsertCodeBelow(cell.id)}>+ Code</button>
          <button className="cozo-notebook-action" onClick={() => onInsertMarkdownBelow(cell.id)}>+ Markdown</button>
          <button className="cozo-notebook-action" onClick={() => onMoveUp(cell.id, cellIndex - 1)} disabled={cellIndex === 0}>Up</button>
          <button className="cozo-notebook-action" onClick={() => onMoveDown(cell.id, cellIndex + 1)}>Down</button>
          <button className="cozo-notebook-action" onClick={() => onDelete(cell.id)}>Delete</button>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <textarea
          value={cell.source}
          onChange={(event) => onChangeSource(cell.id, event.target.value)}
          onBlur={() => onPersistSource(cell)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: cell.kind === "markdown" ? 110 : 140,
            resize: "vertical",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(7, 10, 18, 0.88)",
            color: cell.kind === "markdown" ? "var(--text-secondary)" : "var(--text-primary)",
            padding: 14,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        />

        {showAIForm ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={aiPrompt}
                onChange={(event) => onSetAIPrompt(cell.id, event.target.value)}
                placeholder={wsConnected ? "Ask about this cell" : "WebSocket offline"}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--text-primary)",
                  padding: "10px 12px",
                  fontSize: 13,
                }}
              />
              <button
                className="cozo-notebook-action"
                disabled={!wsConnected}
                onClick={() => {
                  onAskAI(cell.id, aiPrompt);
                  setShowAIForm(false);
                }}
              >
                Send
              </button>
            </div>
          </div>
        ) : null}

        {runtime?.output?.kind === "query_result" ? (
          <div style={{ marginTop: 12 }}>
            <QueryResultsTable result={{
              columns: runtime.output.headers || [],
              rows: runtime.output.rows || [],
              took: runtime.output.took,
            }} />
          </div>
        ) : null}

        {runtime?.output?.kind === "error_result" ? (
          <CellErrorCard output={runtime.output} onDiagnose={() => onDiagnose(cell)} />
        ) : null}

        {streams.map(([id, text]) => (
          <div key={id} style={{ marginTop: 12 }}>
            <StreamingMessageCard text={text} />
          </div>
        ))}

        {threads.map((thread) => (
          <div key={thread.id} style={{ marginTop: 12 }}>
            <CozoSemRenderer
              collapsed={Boolean(collapsedThreads[thread.id])}
              onAskQuestion={(question) => {
                onSetAIPrompt(cell.id, question);
                setShowAIForm(true);
              }}
              onDismiss={() => onDismissThread(thread.id)}
              onInsertCode={(code) => onInsertCodeBelow(cell.id, code)}
              onToggleCollapse={() => onToggleThreadCollapse(thread.id)}
              thread={thread}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
