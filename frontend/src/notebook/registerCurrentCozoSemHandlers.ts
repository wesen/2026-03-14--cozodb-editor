import { registerCozoSemHandlers } from "../sem/registerCozoSemHandlers";
import { registerDefaultSemHandlers } from "../sem/registerDefaultSemHandlers";
import type { HintsSocket, SemEvent } from "../transport/hintsSocket";

export interface NotebookSemHandlerOptions {
  onProject?: (event: SemEvent) => void;
}

export type NotebookSemHandlerRegistrar = (
  socket: HintsSocket,
  options?: NotebookSemHandlerOptions,
) => Array<() => void>;

export const registerCurrentCozoSemHandlers: NotebookSemHandlerRegistrar = (socket, { onProject } = {}) => ([
  ...registerDefaultSemHandlers(socket, { onProject }),
  ...registerCozoSemHandlers(socket, { onProject }),
]);
