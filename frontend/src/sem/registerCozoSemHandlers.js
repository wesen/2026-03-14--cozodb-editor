import { COZO_SEM_EVENT_TYPES } from "./semEventTypes";

export function registerCozoSemHandlers(socket, { onProject } = {}) {
  if (!socket || typeof onProject !== "function") {
    return [];
  }

  return COZO_SEM_EVENT_TYPES.map((type) => socket.on(type, onProject));
}
