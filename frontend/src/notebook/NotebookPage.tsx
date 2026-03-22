import { useHintsSocket, type HintsSocket } from "../transport/hintsSocket";
import { MacButton } from "../components/primitives";
import { NotebookCellCard } from "./NotebookCellCard";
import { NotebookPageView } from "./NotebookPageView";
import { useNotebookPageController } from "./useNotebookPageController";
import type { NotebookShellConfig } from "./config";
import type { NotebookSemHandlerRegistrar } from "./semHandlers";

interface NotebookPageContainerProps {
  confirmAction?: (message: string) => boolean;
  registerSemHandlers?: NotebookSemHandlerRegistrar;
  shellConfig?: Partial<NotebookShellConfig>;
  ws: HintsSocket;
}

export function NotebookPageContainer({ confirmAction, registerSemHandlers, shellConfig, ws }: NotebookPageContainerProps) {
  const {
    document,
    error,
    handleAskAI,
    handleClearNotebook,
    handleDiagnose,
    handleInsertBelow,
    handleResetKernel,
    handleRunAndInsertBelow,
    loading,
    persistTitle,
    wsConnected,
  } = useNotebookPageController({ confirmAction, registerSemHandlers, ws });

  const lastCellId = document?.cells.at(-1)?.id || "";

  return (
    <NotebookPageView
      error={error}
      loading={loading}
      notebook={document?.notebook || null}
      onClearNotebook={() => { void handleClearNotebook(); }}
      onCreateCodeCell={() => { void handleInsertBelow(lastCellId, "code"); }}
      onCreateMarkdownCell={() => { void handleInsertBelow(lastCellId, "markdown"); }}
      onPersistTitle={(title) => { void persistTitle(title); }}
      onResetKernel={() => { void handleResetKernel(); }}
      renderedCells={document ? (
        <div className="mac-notebook-stack" data-part="notebook-cell-stack">
          {document.cells.map((cell, index) => (
            <NotebookCellCard
              key={cell.id}
              cellId={cell.id}
              cellIndex={index}
              onAskAI={handleAskAI}
              onDiagnose={handleDiagnose}
              onRunAndInsertBelow={handleRunAndInsertBelow}
              wsConnected={wsConnected}
            />
          ))}

          {document.cells.length === 0 ? (
            <div className="mac-empty-state">
              <div className="mac-empty-state__icon">&#9000;</div>
              <div className="mac-empty-state__text">No cells yet.</div>
              <div className="mac-empty-state__actions mac-notebook-empty-actions" data-part="notebook-empty-actions">
                <MacButton onClick={() => { void handleInsertBelow("", "code"); }}>New Code Cell</MacButton>
                <MacButton onClick={() => { void handleInsertBelow("", "markdown"); }}>New Markdown Cell</MacButton>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      shellConfig={shellConfig}
      titleKey={document ? `${document.notebook.id}:${document.notebook.updated_at_ms}` : undefined}
      wsConnected={wsConnected}
    />
  );
}

export default function NotebookPage() {
  const ws = useHintsSocket();
  return <NotebookPageContainer confirmAction={(message) => window.confirm(message)} ws={ws} />;
}
