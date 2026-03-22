import { makeStore } from "../app/store";
import { createHTTPNotebookTransport } from "../transport/httpClient";
import { defaultNotebookShellConfig, type NotebookShellConfig } from "./config";
import { defaultNotebookExperienceConfig, type NotebookExperienceConfig } from "./experienceConfig";

export const currentJavaScriptNotebookShellConfig: NotebookShellConfig = {
  ...defaultNotebookShellConfig,
  appName: "JavaScript Notebook",
};

export function createCurrentJavaScriptNotebookStore({ apiBase = "" }: { apiBase?: string } = {}) {
  return makeStore({
    services: {
      notebookTransport: createHTTPNotebookTransport({ apiBase }),
    },
  });
}

export const currentJavaScriptNotebookExperienceConfig: NotebookExperienceConfig = {
  ...defaultNotebookExperienceConfig,
  codeCellPlaceholder: "// Enter JavaScript... (Shift+Enter run, Alt/Ctrl+Enter run+new)",
  codeFenceLanguage: "javascript",
};
