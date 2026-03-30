import { registerDefaultSemHandlers } from "../sem/registerDefaultSemHandlers";
import type { HintsSocket, SemEvent } from "../transport/hintsSocket";

export interface NotebookSemHandlerOptions {
  onProject?: (event: SemEvent) => void;
}

export type NotebookSemHandlerRegistrar = (
  socket: HintsSocket,
  options?: NotebookSemHandlerOptions,
) => Array<() => void>;

export const registerDefaultNotebookSemHandlers: NotebookSemHandlerRegistrar = (socket, { onProject } = {}) => (
  registerDefaultSemHandlers(socket, { onProject })
);
