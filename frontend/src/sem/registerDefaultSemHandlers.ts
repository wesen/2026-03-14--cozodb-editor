import {
  DEFAULT_SEM_EVENT_TYPES,
  HINT_RESULT_EVENT,
  LLM_ERROR_EVENT,
} from "./semEventTypes";
import type { HintsSocket, SemEvent } from "../transport/hintsSocket";

export interface DefaultSemHandlerOptions {
  onError?: (event: SemEvent) => void;
  onHintResult?: (event: SemEvent) => void;
  onProject?: (event: SemEvent) => void;
}

export function registerDefaultSemHandlers(socket: HintsSocket, { onError, onHintResult, onProject }: DefaultSemHandlerOptions = {}): (() => void)[] {
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
