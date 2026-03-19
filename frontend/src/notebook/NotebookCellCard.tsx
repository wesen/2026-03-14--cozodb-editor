import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
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
import type { CellRunOutput, NotebookCell } from "../transport/httpClient";
import {
  deleteNotebookCellById,
  dismissThread,
  insertNotebookCellBelow,
  moveNotebookCellToIndex,
  persistNotebookCell,
  runNotebookCellById,
  selectAIPromptForCell,
  selectActiveCellId,
  selectCellById,
  selectCollapsedThreads,
  selectDismissedThreads,
  selectExecutionStateForCell,
  selectRuntimeForCell,
  selectSemProjection,
  setAIPrompt,
  setActiveCellId,
  setCellSource,
  toggleThreadCollapse,
} from "./state/notebookSlice";
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
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  return `${Math.floor(delta / 3_600_000)}h ago`;
}

export interface NotebookCellCardProps {
  cellId: string;
  cellIndex: number;
  onAskAI: (cellId: string, question: string) => void;
  onDiagnose: (cellId: string) => void;
  onRunAndInsertBelow: (cellId: string) => void | Promise<void>;
  wsConnected: boolean;
}

export function NotebookCellCard({
  cellId,
  cellIndex,
  onAskAI,
  onDiagnose,
  onRunAndInsertBelow,
  wsConnected,
}: NotebookCellCardProps) {
  const dispatch = useAppDispatch();
  const cell = useAppSelector((state) => selectCellById(state, cellId));
  const activeCellId = useAppSelector(selectActiveCellId);
  const aiPrompt = useAppSelector((state) => selectAIPromptForCell(state, cellId));
  const runtime = useAppSelector((state) => selectRuntimeForCell(state, cellId));
  const executionState = useAppSelector((state) => selectExecutionStateForCell(state, cellId));
  const semProjection = useAppSelector(selectSemProjection);
  const collapsedThreads = useAppSelector(selectCollapsedThreads);
  const dismissedThreads = useAppSelector(selectDismissedThreads);
  const [showAIForm, setShowAIForm] = useState(false);
  const [markdownEditing, setMarkdownEditing] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const isActive = activeCellId === cellId;

  useEffect(() => {
    const editing = cell?.kind === "code" || markdownEditing;
    if (editing && isActive && editorRef.current) {
      editorRef.current.focus();
    }
  }, [cell?.kind, isActive, markdownEditing]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.style.height = "0px";
    editorRef.current.style.height = `${editorRef.current.scrollHeight}px`;
  }, [cell?.source, cell?.kind, markdownEditing]);

  if (!cell) {
    return null;
  }
  const resolvedCell: NotebookCell = cell;

  const streams = getStreamingEntriesForCell(semProjection, resolvedCell.id);
  const threads = getSemThreadsForCell(semProjection, resolvedCell.id).filter((thread) => !dismissedThreads[thread.id]);
  const fallbackHint = getHintResponseForCell(semProjection, resolvedCell.id);
  const diagnosisEntity = getDiagnosisForCell(semProjection, resolvedCell.id);
  const diagnosisResponse = (diagnosisEntity?.response || {}) as Record<string, unknown>;
  const isCode = resolvedCell.kind === "code";
  const isMarkdown = resolvedCell.kind === "markdown";
  const editing = isCode || markdownEditing;
  const runStatus = runtime?.run?.status || "idle";
  const executionCount = runtime?.run?.execution_count;
  const isDirty = Boolean(executionState?.dirty);
  const isStale = Boolean(executionState?.stale);
  const hasAI = threads.length > 0 || Boolean(fallbackHint) || Boolean(diagnosisEntity);
  const finishedAt = runtime?.run?.finished_at_ms;
  const rowCount = runtime?.output?.rows?.length ?? 0;
  const showCollapseToggle = rowCount > 10 || threads.length > 2;
  const statusClass = runStatus === "complete" ? "is-ok" : runStatus === "error" ? "is-error" : "";
  const activeClass = isActive ? "is-active" : "";
  const outputDimmed = isDirty || isStale;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.altKey || event.ctrlKey) && isCode) {
      event.preventDefault();
      event.stopPropagation();
      void onRunAndInsertBelow(resolvedCell.id);
      return;
    }
    if (event.key === "Enter" && event.shiftKey && isCode) {
      event.preventDefault();
      void dispatch(runNotebookCellById(resolvedCell.id));
      return;
    }
    if (event.key === "Escape" && isMarkdown) {
      event.preventDefault();
      setMarkdownEditing(false);
      void dispatch(persistNotebookCell(resolvedCell.id));
    }
  }

  function handleMarkdownClick() {
    if (!editing) {
      setMarkdownEditing(true);
      dispatch(setActiveCellId(resolvedCell.id));
    }
  }

  function handleEditorBlur() {
    void dispatch(persistNotebookCell(resolvedCell.id));
    if (isMarkdown && resolvedCell.source.trim() !== "") {
      setMarkdownEditing(false);
    }
  }

  async function handleInsertBelow(kind: "code" | "markdown", source = "") {
    const newCell = await dispatch(insertNotebookCellBelow(resolvedCell.id, kind, source));
    if (newCell) {
      dispatch(setActiveCellId(newCell.id));
    }
  }

  return (
    <div
      className={`mac-window mac-cell-card ${activeClass}`}
      onClick={() => dispatch(setActiveCellId(resolvedCell.id))}
    >
      <div className="mac-window__titlebar">
        <div className="mac-window__titlebar-left">
          <span className="mac-window__close" onClick={(event) => { event.stopPropagation(); void dispatch(deleteNotebookCellById(resolvedCell.id)); }} />
          <span className="mac-cell-label">
            {isCode ? `[${executionCount ?? " "}]` : ""} {resolvedCell.kind.toUpperCase()}
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
          {isCode ? <button className="mac-btn" onClick={(event) => { event.stopPropagation(); void dispatch(runNotebookCellById(resolvedCell.id)); }}>Run</button> : null}
          {isCode ? (
            <button className="mac-btn" onClick={(event) => { event.stopPropagation(); setShowAIForm((current) => !current); }}>
              Ask AI
            </button>
          ) : null}
          <button className="mac-btn" onClick={(event) => { event.stopPropagation(); void handleInsertBelow("code"); }}>+Code</button>
          <button className="mac-btn" onClick={(event) => { event.stopPropagation(); void handleInsertBelow("markdown"); }}>+MD</button>
          <button className="mac-btn" onClick={(event) => { event.stopPropagation(); void dispatch(moveNotebookCellToIndex(resolvedCell.id, cellIndex - 1)); }} disabled={cellIndex === 0}>^</button>
          <button className="mac-btn" onClick={(event) => { event.stopPropagation(); void dispatch(moveNotebookCellToIndex(resolvedCell.id, cellIndex + 1)); }}>v</button>
        </div>
      </div>

      <div className="mac-cell-body">
        {isMarkdown && !editing ? (
          <div
            className="mac-md-preview"
            onClick={handleMarkdownClick}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(resolvedCell.source || "_Click to edit..._") }}
          />
        ) : (
          <textarea
            ref={editorRef}
            className="mac-cell-editor"
            value={resolvedCell.source}
            onChange={(event) => dispatch(setCellSource({ cellId: resolvedCell.id, source: event.target.value }))}
            onBlur={handleEditorBlur}
            onFocus={() => dispatch(setActiveCellId(resolvedCell.id))}
            onKeyDown={handleKeyDown}
            placeholder={isCode ? "-- Enter Datalog query... (Shift+Enter run, Alt/Ctrl+Enter run+new)" : "Enter markdown... (Esc to preview)"}
            rows={1}
            spellCheck={false}
          />
        )}

        {showAIForm ? (
          <div className="mac-ai-form">
            <input
              className="mac-ai-input"
              value={aiPrompt}
              onChange={(event) => dispatch(setAIPrompt({ cellId: resolvedCell.id, value: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onAskAI(resolvedCell.id, aiPrompt);
                  setShowAIForm(false);
                }
              }}
              placeholder={wsConnected ? "Ask about this cell... (Enter to send)" : "WebSocket offline"}
            />
            <button
              className="mac-btn"
              disabled={!wsConnected}
              onClick={() => {
                onAskAI(resolvedCell.id, aiPrompt);
                setShowAIForm(false);
              }}
            >
              Send
            </button>
          </div>
        ) : null}

        {(runtime?.output || streams.length > 0 || threads.length > 0 || fallbackHint) ? (
          <div className={`mac-cell-output ${outputDimmed ? "is-dimmed" : ""}`}>
            {showCollapseToggle ? (
              <div className="mac-cell-output__toggle">
                <button className="mac-btn" onClick={(event) => { event.stopPropagation(); setOutputCollapsed(!outputCollapsed); }}>
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
                      onApplyFix={typeof diagnosisResponse.code === "string" ? () => { void handleInsertBelow("code", diagnosisResponse.code as string); } : undefined}
                    />
                  ) : (
                    <CellErrorCard output={runtime.output} onDiagnose={() => onDiagnose(resolvedCell.id)} />
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
                      collapsed={Boolean(collapsedThreads[`hint:${resolvedCell.id}`])}
                      onChipClick={(chip) => {
                        dispatch(setAIPrompt({ cellId: resolvedCell.id, value: chip }));
                        setShowAIForm(true);
                      }}
                      onInsert={(code) => { void handleInsertBelow("code", code); }}
                      onToggleCollapse={() => dispatch(toggleThreadCollapse(`hint:${resolvedCell.id}`))}
                      response={{ ...fallbackHint, code: fallbackHint.code ?? undefined }}
                    />
                  </div>
                ) : null}

                {threads.map((thread) => (
                  <div key={thread.id} style={{ marginTop: 8 }}>
                    <CozoSemRenderer
                      collapsed={Boolean(collapsedThreads[thread.id])}
                      onAskQuestion={(question: string) => {
                        dispatch(setAIPrompt({ cellId: resolvedCell.id, value: question }));
                        setShowAIForm(true);
                      }}
                      onDismiss={() => dispatch(dismissThread(thread.id))}
                      onInsertCode={(code: string) => { void handleInsertBelow("code", code); }}
                      onToggleCollapse={() => dispatch(toggleThreadCollapse(thread.id))}
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
