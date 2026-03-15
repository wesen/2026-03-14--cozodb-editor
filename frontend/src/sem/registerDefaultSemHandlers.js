import {
  DEFAULT_SEM_EVENT_TYPES,
  HINT_RESULT_EVENT,
  LLM_ERROR_EVENT,
} from "./semEventTypes";

export function registerDefaultSemHandlers(socket, { onError, onHintResult, onProject } = {}) {
  if (!socket || typeof onProject !== "function") {
    return [];
  }

  return DEFAULT_SEM_EVENT_TYPES.map((type) => socket.on(type, (event) => {
    onProject(event);

    if (type === HINT_RESULT_EVENT) {
      onHintResult?.(event);
    }

    if (type === LLM_ERROR_EVENT) {
      onError?.(event);
    }
  }));
}
