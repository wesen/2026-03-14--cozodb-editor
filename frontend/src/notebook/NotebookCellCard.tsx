import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  getDiagnosisForCell,
  getHintResponseForCell,
  getSemThreadsForCell,
  getStreamingEntriesForCell,
} from "../sem/semProjection";
import type { NotebookCell } from "../transport/httpClient";
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
import { NotebookCellCardView } from "./NotebookCellCardView";

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
    if (markdownEditing && isActive && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isActive, markdownEditing]);

  useEffect(() => {
    if (cell?.kind !== "markdown" || !editorRef.current) {
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
  const executionCount = runtime?.run?.execution_count;
  const finishedAt = runtime?.run?.finished_at_ms;
  const isDirty = Boolean(executionState?.dirty);
  const isStale = Boolean(executionState?.stale);
  const diagnosisFix = diagnosisEntity
    ? {
        text: typeof diagnosisResponse.text === "string" ? diagnosisResponse.text : "See the suggested fix.",
        code: typeof diagnosisResponse.code === "string" ? diagnosisResponse.code : undefined,
      }
    : null;

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

  async function handleApplyFixToCurrentCell(source: string) {
    dispatch(setCellSource({ cellId: resolvedCell.id, source }));
    await dispatch(persistNotebookCell(resolvedCell.id));
  }

  async function handleInsertBelow(kind: "code" | "markdown", source = "") {
    const newCell = await dispatch(insertNotebookCellBelow(resolvedCell.id, kind, source));
    if (newCell) {
      dispatch(setActiveCellId(newCell.id));
    }
  }

  return (
    <NotebookCellCardView
      aiPrompt={aiPrompt}
      cell={resolvedCell}
      cellIndex={cellIndex}
      collapsedThreadIds={collapsedThreads}
      diagnosisFix={diagnosisFix}
      editorRef={editorRef}
      executionCount={executionCount}
      fallbackHint={fallbackHint}
      finishedAt={finishedAt}
      isActive={isActive}
      isDirty={isDirty}
      isEditing={editing}
      isStale={isStale}
      onActivate={() => dispatch(setActiveCellId(resolvedCell.id))}
      onAIInputChange={(value) => dispatch(setAIPrompt({ cellId: resolvedCell.id, value }))}
      onAIInputSubmit={() => {
        onAskAI(resolvedCell.id, aiPrompt);
        setShowAIForm(false);
      }}
      onDelete={() => {
        void dispatch(deleteNotebookCellById(resolvedCell.id));
      }}
      onDiagnose={() => onDiagnose(resolvedCell.id)}
      onDiagnosisAddToNotebook={(markdown) => {
        void handleInsertBelow("markdown", markdown);
      }}
      onDiagnosisApplyFix={(source) => {
        void handleApplyFixToCurrentCell(source);
      }}
      onEditorBlur={handleEditorBlur}
      onEditorChange={(source) => dispatch(setCellSource({ cellId: resolvedCell.id, source }))}
      onEditorFocus={() => dispatch(setActiveCellId(resolvedCell.id))}
      onEditorKeyDown={handleKeyDown}
      onHintAddToNotebook={(markdown) => {
        void handleInsertBelow("markdown", markdown);
      }}
      onHintChipClick={(chip) => {
        dispatch(setAIPrompt({ cellId: resolvedCell.id, value: chip }));
        setShowAIForm(true);
      }}
      onHintInsert={(code) => {
        void handleInsertBelow("code", code);
      }}
      onHintToggleCollapse={() => dispatch(toggleThreadCollapse(`hint:${resolvedCell.id}`))}
      onInsertCodeBelow={() => {
        void handleInsertBelow("code");
      }}
      onInsertMarkdownBelow={() => {
        void handleInsertBelow("markdown");
      }}
      onMarkdownPreviewClick={handleMarkdownClick}
      onMoveDown={() => {
        void dispatch(moveNotebookCellToIndex(resolvedCell.id, cellIndex + 1));
      }}
      onMoveUp={() => {
        void dispatch(moveNotebookCellToIndex(resolvedCell.id, cellIndex - 1));
      }}
      onRun={() => {
        void dispatch(runNotebookCellById(resolvedCell.id));
      }}
      onRunAndInsertBelow={() => {
        void onRunAndInsertBelow(resolvedCell.id);
      }}
      onThreadAddToNotebook={(markdown) => {
        void handleInsertBelow("markdown", markdown);
      }}
      onThreadAskQuestion={(question) => {
        dispatch(setAIPrompt({ cellId: resolvedCell.id, value: question }));
        setShowAIForm(true);
      }}
      onThreadDismiss={(threadId) => dispatch(dismissThread(threadId))}
      onThreadInsertCode={(code) => {
        void handleInsertBelow("code", code);
      }}
      onThreadToggleCollapse={(threadId) => dispatch(toggleThreadCollapse(threadId))}
      onToggleAIForm={() => setShowAIForm((current) => !current)}
      onToggleOutputCollapsed={() => setOutputCollapsed((current) => !current)}
      outputCollapsed={outputCollapsed}
      runtime={runtime}
      showAIForm={showAIForm}
      streams={streams}
      threads={threads}
      wsConnected={wsConnected}
    />
  );
}
