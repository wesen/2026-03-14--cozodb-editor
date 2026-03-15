import { type KeyboardEvent, useState } from "react";
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

export interface NotebookCellCardProps {
  aiPrompt: string;
  cell: NotebookCell;
  cellIndex: number;
  collapsedThreads: Record<string, boolean>;
  dismissedThreads: Record<string, boolean>;
  onAskAI: (cellId: string, question: string) => void;
  onChangeSource: (cellId: string, source: string) => void;
  onDelete: (cellId: string) => void;
  onDiagnose: (cell: NotebookCell) => void;
  onDismissThread: (threadId: string) => void;
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
  executionState,
}: NotebookCellCardProps) {
  const [showAIForm, setShowAIForm] = useState(false);
  const streams = getStreamingEntriesForCell(semProjection, cell.id);
  const threads = getSemThreadsForCell(semProjection, cell.id).filter((thread) => !dismissedThreads[thread.id]);
  const fallbackHint = getHintResponseForCell(semProjection, cell.id);
  const diagnosisEntity = getDiagnosisForCell(semProjection, cell.id);
  const diagnosisResponse = (diagnosisEntity?.response || {}) as Record<string, unknown>;
  const isCode = cell.kind === "code";
  const runStatus = runtime?.run?.status || "idle";
  const executionCount = runtime?.run?.execution_count;
  const isDirty = Boolean(executionState?.dirty);
  const isStale = Boolean(executionState?.stale);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.shiftKey && isCode) {
      event.preventDefault();
      onRun(cell.id);
    }
  }

  const statusClass = runStatus === "complete" ? "is-ok" : runStatus === "error" ? "is-error" : "";

  return (
    <div className="mac-window mac-cell-card">
      <div className="mac-window__titlebar">
        <div className="mac-window__titlebar-left">
          <span className="mac-window__close" onClick={() => onDelete(cell.id)} />
          <span className="mac-cell-label">
            [{executionCount ?? " "}] {cell.kind.toUpperCase()}
          </span>
          <span className={`mac-cell-status ${statusClass}`}>
            {runStatus}
          </span>
          {isDirty ? <span className="mac-cell-status is-dirty">dirty</span> : null}
          {isStale ? <span className="mac-cell-status is-stale">stale</span> : null}
        </div>
        <div className="mac-window__titlebar-right">
          {isCode ? <button className="mac-btn" onClick={() => onRun(cell.id)}>Run</button> : null}
          {isCode ? (
            <button className="mac-btn" onClick={() => setShowAIForm((current) => !current)}>
              Ask AI
            </button>
          ) : null}
          <button className="mac-btn" onClick={() => onInsertCodeBelow(cell.id)}>+Code</button>
          <button className="mac-btn" onClick={() => onInsertMarkdownBelow(cell.id)}>+MD</button>
          <button className="mac-btn" onClick={() => onMoveUp(cell.id, cellIndex - 1)} disabled={cellIndex === 0}>^</button>
          <button className="mac-btn" onClick={() => onMoveDown(cell.id, cellIndex + 1)}>v</button>
        </div>
      </div>

      <div className="mac-cell-body">
        <textarea
          className="mac-cell-editor"
          value={cell.source}
          onChange={(event) => onChangeSource(cell.id, event.target.value)}
          onBlur={() => onPersistSource(cell)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          rows={cell.kind === "markdown" ? 4 : 5}
          placeholder={isCode ? "-- Enter Datalog query... (Shift+Enter to run)" : "Enter markdown..."}
        />

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
      </div>
    </div>
  );
}
