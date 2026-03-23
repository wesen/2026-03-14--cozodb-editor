import { makeStore } from "../app/store";
import { CozoScriptEditor } from "../editor/CozoScriptEditor";
import { CozoSemRenderer } from "../features/cozo-sem/CozoSemRenderer";
import { createHTTPNotebookTransport } from "../transport/httpClient";
import { defaultNotebookShellConfig, type NotebookShellConfig } from "./config";
import type { NotebookExperienceConfig } from "./experienceConfig";

export const currentCozoNotebookShellConfig: NotebookShellConfig = {
  ...defaultNotebookShellConfig,
  appName: "CozoDB Notebook",
};

export function createCurrentCozoNotebookStore({ apiBase = "" }: { apiBase?: string } = {}) {
  return makeStore({
    services: {
      notebookTransport: createHTTPNotebookTransport({ apiBase }),
    },
  });
}

export const currentCozoNotebookExperienceConfig: NotebookExperienceConfig = {
  codeCellPlaceholder: "-- Enter Datalog query... (Shift+Enter run, Alt/Ctrl+Enter run+new)",
  codeFenceLanguage: "cozoscript",
  CodeCellEditor: CozoScriptEditor,
  SemThreadRenderer: CozoSemRenderer,
};
