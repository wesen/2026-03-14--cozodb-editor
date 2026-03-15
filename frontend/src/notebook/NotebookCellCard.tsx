import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { CozoSemRenderer } from "../features/cozo-sem/CozoSemRenderer";
import { DiagnosisCard } from "../features/diagnosis/DiagnosisCard";
import { HintResponseCard } from "../features/hints/HintResponseCard";
import { QueryResultsTable } from "../features/query-results/QueryResultsTable";
import { StreamingMessageCard } from "../features/hints/StreamingMessageCard";
import {
  getDiagnosisForCell,
  getHintResponseForCell,
  getSemThreadsForCell,
  getStreamingEntriesForCell,
} from "../sem/semProjection";
import type { SemProjectionState } from "../sem/semProjection";
import type { CellRunOutput, CellRuntime, NotebookCell } from "../transport/httpClient";
import type { NotebookExecutionState } from "./runtimeState";
import { renderMarkdown } from "./renderMarkdown";

interface CellErrorCardProps {
  output: CellRunOutput;
  onDiagnose: () => void;
}

function CellErrorCard({ output, onDiagnose }: CellErrorCardProps) {
  return (
    <div className="mac-cell-error">
      <div className="mac-cell-error__header">
        ERROR
      </div>
      <div className="mac-cell-error__body">
        {output.display || output.message || "Unknown error"}
      </div>
      <div className="mac-cell-error__actions">
        <button className="mac-btn" onClick={onDiagnose}>Diagnose with AI</button>
      </div>
    </div>
  );
}

function formatRelativeTime(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 5000) return "just now";
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3600_000) return `${Math.floor(delta / 60_000)}m ago`;
  return `${Math.floor(delta / 3600_000)}h ago`;
}

export interface NotebookCellCardProps {
  aiPrompt: string;
  cell: NotebookCell;
  cellIndex: number;
  isActive: boolean;
  collapsedThreads: Record<string, boolean>;
  dismissedThreads: Record<string, boolean>;
  onAskAI: (cellId: string, question: string) => void;
  onChangeSource: (cellId: string, source: string) => void;
  onDelete: (cellId: string) => void;
  onDiagnose: (cell: NotebookCell) => void;
  onDismissThread: (threadId: string) => void;
  onFocus: (cellIndex: number) => void;
  onInsertCodeBelow: (cellId: string, source?: string) => void;
  onInsertMarkdownBelow: (cellId: string) => void;
  onMoveDown: (cellId: string, targetIndex: number) => void;
  onMoveUp: (cellId: string, targetIndex: number) => void;
  onPersistSource: (cell: NotebookCell) => void;
  onRun: (cellId: string) => void;
  onSetAIPrompt: (cellId: string, value: string) => void;
  onToggleThreadCollapse: (threadId: string) => void;
  executionState?: NotebookExecutionState;
  runtime?: CellRuntime;
  semProjection: SemProjectionState;
  wsConnected: boolean;
}

export function NotebookCellCard({
  cell,
  cellIndex,
  isActive,
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
  onFocus,
  onToggleThreadCollapse,
  executionState,
}: NotebookCellCardProps) {
  const [showAIForm, setShowAIForm] = useState(false);
  const [editing, setEditing] = useState(cell.kind === "code");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const streams = getStreamingEntriesForCell(semProjection, cell.id);
  const threads = getSemThreadsForCell(semProjection, cell.id).filter((thread) => !dismissedThreads[thread.id]);
  const fallbackHint = getHintResponseForCell(semProjection, cell.id);
  const diagnosisEntity = getDiagnosisForCell(semProjection, cell.id);
  const diagnosisResponse = (diagnosisEntity?.response || {}) as Record<string, unknown>;
  const isCode = cell.kind === "code";
  const isMarkdown = cell.kind === "markdown";
  const runStatus = runtime?.run?.status || "idle";
  const executionCount = runtime?.run?.execution_count;
  const isDirty = Boolean(executionState?.dirty);
  const isStale = Boolean(executionState?.stale);
  const hasAI = threads.length > 0 || Boolean(fallbackHint) || Boolean(diagnosisEntity);
  const finishedAt = runtime?.run?.finished_at_ms;

  // Output collapse
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const rowCount = runtime?.output?.rows?.length ?? 0;
  const showCollapseToggle = rowCount > 10 || threads.length > 2;

  // Focus editor when entering edit mode
  useEffect(() => {
    if (editing && isActive && editorRef.current) {
      editorRef.current.focus();
    }
  }, [editing, isActive]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.shiftKey && isCode) {
      event.preventDefault();
      onRun(cell.id);
    }
    if (event.key === "Escape" && isMarkdown) {
      event.preventDefault();
      setEditing(false);
      onPersistSource(cell);
    }
  }

  function handleMarkdownClick() {
    if (!editing) {
      setEditing(true);
      onFocus(cellIndex);
    }
  }

  function handleEditorBlur() {
    onPersistSource(cell);
    if (isMarkdown && cell.source.trim() !== "") {
      setEditing(false);
    }
  }

  const statusClass = runStatus === "complete" ? "is-ok" : runStatus === "error" ? "is-error" : "";
  const activeClass = isActive ? "is-active" : "";
  const outputDimmed = isDirty || isStale;

  return (
    <div
      ref={cardRef}
      className={`mac-window mac-cell-card ${activeClass}`}
      onClick={() => onFocus(cellIndex)}
    >
      <div className="mac-window__titlebar">
        <div className="mac-window__titlebar-left">
          <span className="mac-window__close" onClick={(e) => { e.stopPropagation(); onDelete(cell.id); }} />
          <span className="mac-cell-label">
            {isCode ? `[${executionCount ?? " "}]` : ""} {cell.kind.toUpperCase()}
          </span>
          {isCode ? (
            <span className={`mac-cell-status ${statusClass}`}>
              {runStatus}
            </span>
          ) : null}
          {isDirty ? <span className="mac-cell-status is-dirty">dirty</span> : null}
          {isStale ? <span className="mac-cell-status is-stale">stale</span> : null}
          {hasAI ? <span className="mac-cell-status is-ai">AI</span> : null}
          {finishedAt ? (
            <span className="mac-cell-timestamp">{formatRelativeTime(finishedAt)}</span>
          ) : null}
        </div>
        <div className="mac-window__titlebar-right">
          {isCode ? <button className="mac-btn" onClick={(e) => { e.stopPropagation(); onRun(cell.id); }}>Run</button> : null}
          {isCode ? (
            <button className="mac-btn" onClick={(e) => { e.stopPropagation(); setShowAIForm((current) => !current); }}>
              Ask AI
            </button>
          ) : null}
          <button className="mac-btn" onClick={(e) => { e.stopPropagation(); onInsertCodeBelow(cell.id); }}>+Code</button>
          <button className="mac-btn" onClick={(e) => { e.stopPropagation(); onInsertMarkdownBelow(cell.id); }}>+MD</button>
          <button className="mac-btn" onClick={(e) => { e.stopPropagation(); onMoveUp(cell.id, cellIndex - 1); }} disabled={cellIndex === 0}>^</button>
          <button className="mac-btn" onClick={(e) => { e.stopPropagation(); onMoveDown(cell.id, cellIndex + 1); }}>v</button>
        </div>
      </div>

      <div className="mac-cell-body">
        {/* Markdown preview mode */}
        {isMarkdown && !editing ? (
          <div
            className="mac-md-preview"
            onClick={handleMarkdownClick}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.source || "_Click to edit..._") }}
          />
        ) : (
          <textarea
            ref={editorRef}
            className="mac-cell-editor"
            value={cell.source}
            onChange={(event) => onChangeSource(cell.id, event.target.value)}
            onBlur={handleEditorBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocus(cellIndex)}
            spellCheck={false}
            rows={cell.kind === "markdown" ? 4 : 5}
            placeholder={isCode ? "-- Enter Datalog query... (Shift+Enter to run)" : "Enter markdown... (Esc to preview)"}
          />
        )}

        {showAIForm ? (
          <div className="mac-ai-form">
            <input
              className="mac-ai-input"
              value={aiPrompt}
              onChange={(event) => onSetAIPrompt(cell.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onAskAI(cell.id, aiPrompt);
                  setShowAIForm(false);
                }
              }}
              placeholder={wsConnected ? "Ask about this cell... (Enter to send)" : "WebSocket offline"}
            />
            <button
              className="mac-btn"
              disabled={!wsConnected}
              onClick={() => {
                onAskAI(cell.id, aiPrompt);
                setShowAIForm(false);
              }}
            >
              Send
            </button>
          </div>
        ) : null}

        {/* Output section with collapse and dimming */}
        {(runtime?.output || streams.length > 0 || threads.length > 0 || fallbackHint) ? (
          <div className={`mac-cell-output ${outputDimmed ? "is-dimmed" : ""}`}>
            {showCollapseToggle ? (
              <div className="mac-cell-output__toggle">
                <button className="mac-btn" onClick={(e) => { e.stopPropagation(); setOutputCollapsed(!outputCollapsed); }}>
                  {outputCollapsed ? "Show output" : "Hide output"}
                </button>
              </div>
            ) : null}

            {outputCollapsed ? null : (
              <>
                {runtime?.output?.kind === "query_result" ? (
                  <div style={{ marginTop: 8 }}>
                    <QueryResultsTable result={{
                      columns: runtime.output.headers || [],
                      rows: runtime.output.rows || [],
                      took: runtime.output.took,
                    }} />
                  </div>
                ) : null}

                {runtime?.output?.kind === "error_result" ? (
                  diagnosisEntity ? (
                    <DiagnosisCard
                      diagnosing={false}
                      error={runtime.output.display || runtime.output.message || "Unknown error"}
                      fix={{
                        text: typeof diagnosisResponse.text === "string" ? diagnosisResponse.text : "See the suggested fix.",
                        code: typeof diagnosisResponse.code === "string" ? diagnosisResponse.code : undefined,
                      }}
                      onApplyFix={typeof diagnosisResponse.code === "string" ? () => onInsertCodeBelow(cell.id, diagnosisResponse.code as string) : undefined}
                    />
                  ) : (
                    <CellErrorCard output={runtime.output} onDiagnose={() => onDiagnose(cell)} />
                  )
                ) : null}

                {streams.map(([id, text]) => (
                  <div key={id} style={{ marginTop: 8 }}>
                    <StreamingMessageCard text={text} />
                  </div>
                ))}

                {!diagnosisEntity && threads.length === 0 && fallbackHint ? (
                  <div style={{ marginTop: 8 }}>
                    <HintResponseCard
                      collapsed={Boolean(collapsedThreads[`hint:${cell.id}`])}
                      onChipClick={(chip) => {
                        onSetAIPrompt(cell.id, chip);
                        setShowAIForm(true);
                      }}
                      onInsert={(code) => onInsertCodeBelow(cell.id, code)}
                      onToggleCollapse={() => onToggleThreadCollapse(`hint:${cell.id}`)}
                      response={{ ...fallbackHint, code: fallbackHint.code ?? undefined }}
                    />
                  </div>
                ) : null}

                {threads.map((thread) => (
                  <div key={thread.id} style={{ marginTop: 8 }}>
                    <CozoSemRenderer
                      collapsed={Boolean(collapsedThreads[thread.id])}
                      onAskQuestion={(question: string) => {
                        onSetAIPrompt(cell.id, question);
                        setShowAIForm(true);
                      }}
                      onDismiss={() => onDismissThread(thread.id)}
                      onInsertCode={(code: string) => onInsertCodeBelow(cell.id, code)}
                      onToggleCollapse={() => onToggleThreadCollapse(thread.id)}
                      thread={thread}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
