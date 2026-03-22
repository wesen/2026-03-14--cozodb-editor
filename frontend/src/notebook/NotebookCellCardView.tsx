import type { KeyboardEventHandler, RefObject } from "react";
import { MacButton } from "../components/primitives";
import { CozoSemRenderer } from "../features/cozo-sem/CozoSemRenderer";
import { DiagnosisCard } from "../features/diagnosis/DiagnosisCard";
import { HintResponseCard } from "../features/hints/HintResponseCard";
import { QueryResultsTable } from "../features/query-results/QueryResultsTable";
import { StreamingMessageCard } from "../features/hints/StreamingMessageCard";
import type { HintResponsePayload, SemThread } from "../sem/semProjection";
import type { CellRuntime, NotebookCell } from "../transport/httpClient";
import { renderMarkdown } from "./renderMarkdown";

interface CellErrorCardProps {
  errorText: string;
  onDiagnose: () => void;
}

function CellErrorCard({ errorText, onDiagnose }: CellErrorCardProps) {
  return (
    <div className="mac-cell-error">
      <div className="mac-cell-error__header">
        ERROR
      </div>
      <div className="mac-cell-error__body">
        {errorText}
      </div>
      <div className="mac-cell-error__actions">
        <MacButton onClick={onDiagnose}>Diagnose with AI</MacButton>
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

export interface NotebookCellCardViewProps {
  aiPrompt: string;
  cell: NotebookCell;
  cellIndex: number;
  collapsedThreadIds: Record<string, boolean>;
  diagnosisFix: { text: string; code?: string } | null;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  executionCount?: number;
  fallbackHint: HintResponsePayload | null;
  finishedAt?: number;
  isActive: boolean;
  isDirty: boolean;
  isEditing: boolean;
  isStale: boolean;
  onActivate: () => void;
  onAIInputChange: (value: string) => void;
  onAIInputSubmit: () => void;
  onDelete: () => void;
  onDiagnose: () => void;
  onDiagnosisAddToNotebook: (markdown: string) => void;
  onDiagnosisApplyFix: (source: string) => void;
  onEditorBlur: () => void;
  onEditorChange: (value: string) => void;
  onEditorFocus: () => void;
  onEditorKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onHintAddToNotebook: (markdown: string) => void;
  onHintChipClick: (chip: string) => void;
  onHintInsert: (code: string) => void;
  onHintToggleCollapse: () => void;
  onInsertCodeBelow: () => void;
  onInsertMarkdownBelow: () => void;
  onMarkdownPreviewClick: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRun: () => void;
  onThreadAddToNotebook: (markdown: string) => void;
  onThreadAskQuestion: (question: string) => void;
  onThreadDismiss: (threadId: string) => void;
  onThreadInsertCode: (code: string) => void;
  onThreadToggleCollapse: (threadId: string) => void;
  onToggleAIForm: () => void;
  onToggleOutputCollapsed: () => void;
  outputCollapsed: boolean;
  runtime?: CellRuntime;
  showAIForm: boolean;
  streams: Array<[string, string]>;
  threads: SemThread[];
  wsConnected: boolean;
}

export function NotebookCellCardView({
  aiPrompt,
  cell,
  cellIndex,
  collapsedThreadIds,
  diagnosisFix,
  editorRef,
  executionCount,
  fallbackHint,
  finishedAt,
  isActive,
  isDirty,
  isEditing,
  isStale,
  onActivate,
  onAIInputChange,
  onAIInputSubmit,
  onDelete,
  onDiagnose,
  onDiagnosisAddToNotebook,
  onDiagnosisApplyFix,
  onEditorBlur,
  onEditorChange,
  onEditorFocus,
  onEditorKeyDown,
  onHintAddToNotebook,
  onHintChipClick,
  onHintInsert,
  onHintToggleCollapse,
  onInsertCodeBelow,
  onInsertMarkdownBelow,
  onMarkdownPreviewClick,
  onMoveDown,
  onMoveUp,
  onRun,
  onThreadAddToNotebook,
  onThreadAskQuestion,
  onThreadDismiss,
  onThreadInsertCode,
  onThreadToggleCollapse,
  onToggleAIForm,
  onToggleOutputCollapsed,
  outputCollapsed,
  runtime,
  showAIForm,
  streams,
  threads,
  wsConnected,
}: NotebookCellCardViewProps) {
  const isCode = cell.kind === "code";
  const isMarkdown = cell.kind === "markdown";
  const runStatus = runtime?.run?.status || "idle";
  const rowCount = runtime?.output?.rows?.length ?? 0;
  const showCollapseToggle = rowCount > 10 || threads.length > 2;
  const statusClass = runStatus === "complete" ? "is-ok" : runStatus === "error" ? "is-error" : "";
  const activeClass = isActive ? "is-active" : "";
  const outputDimmed = isDirty || isStale;
  const hasAI = threads.length > 0 || Boolean(fallbackHint) || Boolean(diagnosisFix);
  const hintCollapsed = Boolean(collapsedThreadIds[`hint:${cell.id}`]);

  return (
    <div
      className={`mac-window mac-cell-card ${activeClass}`}
      onClick={onActivate}
    >
      <div className="mac-window__titlebar">
        <div className="mac-window__titlebar-left">
          <span className="mac-window__close" onClick={(event) => { event.stopPropagation(); onDelete(); }} />
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
          {isCode ? <MacButton onClick={(event) => { event.stopPropagation(); onRun(); }}>Run</MacButton> : null}
          {isCode ? (
            <MacButton onClick={(event) => { event.stopPropagation(); onToggleAIForm(); }}>
              Ask AI
            </MacButton>
          ) : null}
          <MacButton onClick={(event) => { event.stopPropagation(); onInsertCodeBelow(); }}>+Code</MacButton>
          <MacButton onClick={(event) => { event.stopPropagation(); onInsertMarkdownBelow(); }}>+MD</MacButton>
          <MacButton onClick={(event) => { event.stopPropagation(); onMoveUp(); }} disabled={cellIndex === 0}>^</MacButton>
          <MacButton onClick={(event) => { event.stopPropagation(); onMoveDown(); }}>v</MacButton>
        </div>
      </div>

      <div className="mac-cell-body">
        {isMarkdown && !isEditing ? (
          <div
            className="mac-md-preview"
            onClick={onMarkdownPreviewClick}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.source || "_Click to edit..._") }}
          />
        ) : (
          <textarea
            ref={editorRef}
            className="mac-cell-editor"
            value={cell.source}
            onChange={(event) => onEditorChange(event.target.value)}
            onBlur={onEditorBlur}
            onFocus={onEditorFocus}
            onKeyDown={onEditorKeyDown}
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
              onChange={(event) => onAIInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onAIInputSubmit();
                }
              }}
              placeholder={wsConnected ? "Ask about this cell... (Enter to send)" : "WebSocket offline"}
            />
            <MacButton disabled={!wsConnected} onClick={onAIInputSubmit}>
              Send
            </MacButton>
          </div>
        ) : null}

        {(runtime?.output || streams.length > 0 || threads.length > 0 || fallbackHint) ? (
          <div className={`mac-cell-output ${outputDimmed ? "is-dimmed" : ""}`}>
            {showCollapseToggle ? (
              <div className="mac-cell-output__toggle">
                <MacButton onClick={(event) => { event.stopPropagation(); onToggleOutputCollapsed(); }}>
                  {outputCollapsed ? "Show output" : "Hide output"}
                </MacButton>
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
                  diagnosisFix ? (
                    <DiagnosisCard
                      diagnosing={false}
                      error={runtime.output.display || runtime.output.message || "Unknown error"}
                      fix={diagnosisFix}
                      onAddToNotebook={onDiagnosisAddToNotebook}
                      onApplyFix={diagnosisFix.code ? () => onDiagnosisApplyFix(diagnosisFix.code as string) : undefined}
                    />
                  ) : (
                    <CellErrorCard
                      errorText={runtime.output.display || runtime.output.message || "Unknown error"}
                      onDiagnose={onDiagnose}
                    />
                  )
                ) : null}

                {streams.map(([id, text]) => (
                  <div key={id} style={{ marginTop: 8 }}>
                    <StreamingMessageCard text={text} />
                  </div>
                ))}

                {!diagnosisFix && threads.length === 0 && fallbackHint ? (
                  <div style={{ marginTop: 8 }}>
                    <HintResponseCard
                      onAddToNotebook={onHintAddToNotebook}
                      collapsed={hintCollapsed}
                      onChipClick={onHintChipClick}
                      onInsert={onHintInsert}
                      onToggleCollapse={onHintToggleCollapse}
                      response={{ ...fallbackHint, code: fallbackHint.code ?? undefined }}
                    />
                  </div>
                ) : null}

                {threads.map((thread) => (
                  <div key={thread.id} style={{ marginTop: 8 }}>
                    <CozoSemRenderer
                      onAddToNotebook={onThreadAddToNotebook}
                      collapsed={Boolean(collapsedThreadIds[thread.id])}
                      onAskQuestion={onThreadAskQuestion}
                      onDismiss={() => onThreadDismiss(thread.id)}
                      onInsertCode={onThreadInsertCode}
                      onToggleCollapse={() => onThreadToggleCollapse(thread.id)}
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
