import { createContext, useContext, type ComponentType } from "react";
import type { SemThread } from "../sem/semProjection";

export interface NotebookSemThreadRendererProps {
  onAddToNotebook?: (markdown: string) => void;
  collapsed?: boolean;
  onAskQuestion?: (question: string) => void;
  onDismiss: () => void;
  onInsertCode?: (code: string) => void;
  onToggleCollapse: () => void;
  thread: SemThread;
}

function DefaultSemThreadRenderer() {
  return null;
}

export interface NotebookCodeCellEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onRunAndInsert?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export interface NotebookExperienceConfig {
  codeCellPlaceholder: string;
  codeFenceLanguage: string;
  CodeCellEditor?: ComponentType<NotebookCodeCellEditorProps>;
  SemThreadRenderer: ComponentType<NotebookSemThreadRendererProps>;
}

export const defaultNotebookExperienceConfig: NotebookExperienceConfig = {
  codeCellPlaceholder: "// Enter code... (Shift+Enter run, Alt/Ctrl+Enter run+new)",
  codeFenceLanguage: "text",
  CodeCellEditor: undefined,
  SemThreadRenderer: DefaultSemThreadRenderer,
};

export const NotebookExperienceContext = createContext<NotebookExperienceConfig>(defaultNotebookExperienceConfig);

export function useNotebookExperience() {
  return useContext(NotebookExperienceContext);
}
