import type { ReactNode } from "react";
import { MacButton } from "../components/primitives";
import type { Notebook } from "../transport/httpClient";
import { mergeNotebookShellConfig, type NotebookShellConfig } from "./config";

interface NotebookShellProps {
  children: ReactNode;
  notebook?: Notebook | null;
  shellConfig?: Partial<NotebookShellConfig>;
  wsConnected?: boolean;
}

function NotebookShell({ children, notebook, shellConfig, wsConnected = false }: NotebookShellProps) {
  const resolvedShellConfig = mergeNotebookShellConfig(shellConfig);

  return (
    <div className="mac-desktop" data-part="notebook-root">
      <div className="mac-menubar" data-part="notebook-menubar">
        <span className="mac-menubar__apple" data-part="notebook-menubar-apple">&#63743;</span>
        {resolvedShellConfig.menuItems.map((item) => (
          <span className="mac-menubar__item" data-part="notebook-menubar-item" key={item}>{item}</span>
        ))}
        <span className="mac-menubar__spacer" />
        <span className="mac-menubar__hint" data-part="notebook-shortcut-hint">{resolvedShellConfig.shortcutHint}</span>
        <span
          className={`mac-menubar__status ${wsConnected ? "is-connected" : ""}`}
          data-part="notebook-menubar-status"
        >
          {wsConnected ? "Connected" : notebook ? "Loaded" : "Offline"}
        </span>
      </div>
      {children}
    </div>
  );
}

export interface NotebookPageViewProps {
  error: string | null;
  loading: boolean;
  notebook: Notebook | null;
  shellConfig?: Partial<NotebookShellConfig>;
  renderedCells: ReactNode;
  titleKey?: string;
  wsConnected: boolean;
  onClearNotebook: () => void;
  onCreateCodeCell: () => void;
  onCreateMarkdownCell: () => void;
  onPersistTitle: (title: string) => void;
  onResetKernel: () => void;
}

export function NotebookPageView({
  error,
  loading,
  notebook,
  shellConfig,
  renderedCells,
  titleKey,
  wsConnected,
  onClearNotebook,
  onCreateCodeCell,
  onCreateMarkdownCell,
  onPersistTitle,
  onResetKernel,
}: NotebookPageViewProps) {
  if (loading) {
    return (
      <NotebookShell shellConfig={shellConfig}>
        <div className="mac-window mac-notebook-chrome" data-part="notebook-window">
          <div className="mac-window__titlebar">
            <div className="mac-window__titlebar-left">
              <span className="mac-window__close" data-state="inert" />
              <span className="mac-window__title">{mergeNotebookShellConfig(shellConfig).appName}</span>
            </div>
          </div>
          <div className="mac-notebook-body">
            <div className="mac-status-msg" data-part="notebook-status-msg">Loading notebook...</div>
          </div>
        </div>
      </NotebookShell>
    );
  }

  if (!notebook) {
    return (
      <NotebookShell shellConfig={shellConfig}>
        <div className="mac-window mac-notebook-chrome" data-part="notebook-window">
          <div className="mac-window__titlebar">
            <div className="mac-window__titlebar-left">
              <span className="mac-window__close" data-state="inert" />
              <span className="mac-window__title">{mergeNotebookShellConfig(shellConfig).appName}</span>
            </div>
          </div>
          <div className="mac-notebook-body">
            <div className="mac-status-msg" data-part="notebook-status-msg">{error || "Failed to load notebook"}</div>
          </div>
        </div>
      </NotebookShell>
    );
  }

  return (
    <NotebookShell notebook={notebook} shellConfig={shellConfig} wsConnected={wsConnected}>
      <div className="mac-window mac-notebook-chrome" data-part="notebook-window">
        <div className="mac-window__titlebar">
          <div className="mac-window__titlebar-left">
            <span className="mac-window__close" data-state="inert" />
            <input
              className="mac-window__title-input"
              data-part="notebook-title-input"
              defaultValue={notebook.title}
              key={titleKey}
              onBlur={(event) => onPersistTitle(event.target.value)}
            />
          </div>
          <div className="mac-window__titlebar-right mac-notebook-toolbar" data-part="notebook-toolbar">
            <MacButton onClick={onCreateCodeCell}>New Code Cell</MacButton>
            <MacButton onClick={onCreateMarkdownCell}>New Markdown Cell</MacButton>
            <MacButton onClick={onClearNotebook}>Clear Notebook</MacButton>
            <MacButton onClick={onResetKernel}>Reset Kernel</MacButton>
          </div>
        </div>

        {error ? <div className="mac-status-msg mac-status-msg--error" data-part="notebook-status-msg">{error}</div> : null}

        <div className="mac-notebook-body" data-part="notebook-body">
          {renderedCells}
        </div>
      </div>
    </NotebookShell>
  );
}
