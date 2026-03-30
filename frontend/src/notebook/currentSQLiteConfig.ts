import { makeStore } from "../app/store";
import { SQLiteNotebookEditor } from "../editor/SQLiteNotebookEditor";
import { createHTTPNotebookTransport } from "../transport/httpClient";
import { defaultNotebookShellConfig, type NotebookShellConfig } from "./config";
import { defaultNotebookExperienceConfig, type NotebookExperienceConfig } from "./experienceConfig";

export const currentSQLiteNotebookShellConfig: NotebookShellConfig = {
  ...defaultNotebookShellConfig,
  appName: "SQLite Notebook",
};

export function createCurrentSQLiteNotebookStore({ apiBase = "" }: { apiBase?: string } = {}) {
  return makeStore({
    services: {
      notebookTransport: createHTTPNotebookTransport({ apiBase }),
    },
  });
}

export const currentSQLiteNotebookExperienceConfig: NotebookExperienceConfig = {
  ...defaultNotebookExperienceConfig,
  codeCellPlaceholder: "-- Enter SQL... (Shift+Enter run, Alt/Ctrl+Enter run+new)",
  codeFenceLanguage: "sql",
  CodeCellEditor: SQLiteNotebookEditor,
};
