interface APIError {
  ok: false;
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requestJSON<T = Record<string, any>>(apiBase: string, path: string, options: RequestInit = {}): Promise<T | APIError> {
  try {
    const res = await fetch(`${apiBase}${path}`, options);
    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { message: rawText };
      }
    }
    if (!res.ok) {
      return { ok: false, message: (data?.message as string) || (data?.error as string) || `request failed: ${res.status}` };
    }
    return data as T;
  } catch (err) {
    return { ok: false, message: `Network error: ${(err as Error).message}` };
  }
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  took?: number;
}

export async function executeQuery(script: string, params: Record<string, unknown> = {}) {
  return requestJSON<QueryResult>("", "/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script, params }),
  });
}

export async function fetchSchema() {
  const res = await fetch("/api/schema");
  if (!res.ok) {
    throw new Error(`schema request failed: ${res.status}`);
  }
  return await res.json();
}

export interface NotebookCell {
  id: string;
  notebook_id: string;
  kind: "code" | "markdown";
  source: string;
  position: number;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface Notebook {
  id: string;
  title: string;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface CellRunOutput {
  kind: "query_result" | "error_result";
  headers?: string[];
  rows?: unknown[][];
  took?: number;
  display?: string;
  message?: string;
}

export interface CellRun {
  id: string;
  cell_id: string;
  notebook_id: string;
  status: "running" | "complete" | "error";
  execution_count: number;
  started_at_ms?: number;
  finished_at_ms?: number;
}

export interface CellRuntime {
  run?: CellRun;
  output?: CellRunOutput;
}

export interface NotebookDocument {
  notebook: Notebook;
  cells: NotebookCell[];
  runtime?: Record<string, CellRuntime>;
}

export interface NotebookMutationResult {
  document?: NotebookDocument;
  cell?: NotebookCell;
}

export interface ResetKernelResponse {
  kernel_generation: number;
  ok: true;
}

export interface NotebookTransport {
  bootstrapNotebook(): Promise<NotebookDocument | APIError>;
  updateNotebookTitle(notebookId: string, title: string): Promise<NotebookDocument | APIError>;
  insertNotebookCell(notebookId: string, payload: InsertCellPayload): Promise<NotebookMutationResult | APIError>;
  clearNotebook(notebookId: string): Promise<NotebookDocument | APIError>;
  updateNotebookCell(cellId: string, payload: UpdateCellPayload): Promise<NotebookCell | APIError>;
  moveNotebookCell(cellId: string, targetIndex: number): Promise<NotebookMutationResult | APIError>;
  deleteNotebookCell(cellId: string): Promise<NotebookMutationResult | APIError>;
  runNotebookCell(cellId: string): Promise<CellRuntime | APIError>;
  resetNotebookKernel(): Promise<ResetKernelResponse | APIError>;
}

export interface HTTPNotebookTransportOptions {
  apiBase?: string;
}

export function createHTTPNotebookTransport({ apiBase = "" }: HTTPNotebookTransportOptions = {}): NotebookTransport {
  return {
    bootstrapNotebook() {
      return requestJSON<NotebookDocument>(apiBase, "/api/notebooks/bootstrap");
    },
    updateNotebookTitle(notebookId: string, title: string) {
      return requestJSON<NotebookDocument>(apiBase, `/api/notebooks/${notebookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    },
    insertNotebookCell(notebookId: string, payload: InsertCellPayload) {
      return requestJSON<NotebookMutationResult>(apiBase, `/api/notebooks/${notebookId}/cells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    clearNotebook(notebookId: string) {
      return requestJSON<NotebookDocument>(apiBase, `/api/notebooks/${notebookId}/clear`, {
        method: "POST",
      });
    },
    updateNotebookCell(cellId: string, payload: UpdateCellPayload) {
      return requestJSON<NotebookCell>(apiBase, `/api/notebook-cells/${cellId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    moveNotebookCell(cellId: string, targetIndex: number) {
      return requestJSON<NotebookMutationResult>(apiBase, `/api/notebook-cells/${cellId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_index: targetIndex }),
      });
    },
    deleteNotebookCell(cellId: string) {
      return requestJSON<NotebookMutationResult>(apiBase, `/api/notebook-cells/${cellId}`, {
        method: "DELETE",
      });
    },
    runNotebookCell(cellId: string) {
      return requestJSON<CellRuntime>(apiBase, `/api/notebook-cells/${cellId}/run`, {
        method: "POST",
      });
    },
    resetNotebookKernel() {
      return requestJSON<ResetKernelResponse>(apiBase, "/api/runtime/reset-kernel", {
        method: "POST",
      });
    },
  };
}

export const defaultNotebookTransport = createHTTPNotebookTransport();

export async function bootstrapNotebook() {
  return defaultNotebookTransport.bootstrapNotebook();
}

export async function updateNotebookTitle(notebookId: string, title: string) {
  return defaultNotebookTransport.updateNotebookTitle(notebookId, title);
}

export interface InsertCellPayload {
  after_cell_id: string;
  kind: "code" | "markdown";
  source: string;
}

export async function insertNotebookCell(notebookId: string, payload: InsertCellPayload) {
  return defaultNotebookTransport.insertNotebookCell(notebookId, payload);
}

export async function clearNotebook(notebookId: string) {
  return defaultNotebookTransport.clearNotebook(notebookId);
}

export interface UpdateCellPayload {
  kind?: string;
  source?: string;
}

export async function updateNotebookCell(cellId: string, payload: UpdateCellPayload) {
  return defaultNotebookTransport.updateNotebookCell(cellId, payload);
}

export async function moveNotebookCell(cellId: string, targetIndex: number) {
  return defaultNotebookTransport.moveNotebookCell(cellId, targetIndex);
}

export async function deleteNotebookCell(cellId: string) {
  return defaultNotebookTransport.deleteNotebookCell(cellId);
}

export async function runNotebookCell(cellId: string) {
  return defaultNotebookTransport.runNotebookCell(cellId);
}

export async function resetNotebookKernel() {
  return defaultNotebookTransport.resetNotebookKernel();
}
