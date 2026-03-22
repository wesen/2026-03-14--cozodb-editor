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

export interface NotebookExperienceConfig {
  codeCellPlaceholder: string;
  codeFenceLanguage: string;
  SemThreadRenderer: ComponentType<NotebookSemThreadRendererProps>;
}

export const defaultNotebookExperienceConfig: NotebookExperienceConfig = {
  codeCellPlaceholder: "// Enter code... (Shift+Enter run, Alt/Ctrl+Enter run+new)",
  codeFenceLanguage: "text",
  SemThreadRenderer: DefaultSemThreadRenderer,
};

export const NotebookExperienceContext = createContext<NotebookExperienceConfig>(defaultNotebookExperienceConfig);

export function useNotebookExperience() {
  return useContext(NotebookExperienceContext);
}
