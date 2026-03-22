import { registerCozoSemHandlers } from "../sem/registerCozoSemHandlers";
import { registerDefaultSemHandlers } from "../sem/registerDefaultSemHandlers";
import type { NotebookSemHandlerRegistrar } from "./semHandlers";

export const registerCurrentCozoSemHandlers: NotebookSemHandlerRegistrar = (socket, { onProject } = {}) => ([
  ...registerDefaultSemHandlers(socket, { onProject }),
  ...registerCozoSemHandlers(socket, { onProject }),
]);
