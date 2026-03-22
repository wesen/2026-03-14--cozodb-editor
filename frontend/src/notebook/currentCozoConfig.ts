import { makeStore } from "../app/store";
import { createHTTPNotebookTransport } from "../transport/httpClient";
import { defaultNotebookShellConfig, type NotebookShellConfig } from "./config";

export const currentCozoNotebookShellConfig: NotebookShellConfig = {
  ...defaultNotebookShellConfig,
};

export function createCurrentCozoNotebookStore({ apiBase = "" }: { apiBase?: string } = {}) {
  return makeStore({
    services: {
      notebookTransport: createHTTPNotebookTransport({ apiBase }),
    },
  });
}
