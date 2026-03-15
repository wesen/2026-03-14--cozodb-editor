import { COZO_SEM_EVENT_TYPES } from "./semEventTypes";
import type { HintsSocket, SemEvent } from "../transport/hintsSocket";

export interface CozoSemHandlerOptions {
  onProject?: (event: SemEvent) => void;
}

export function registerCozoSemHandlers(socket: HintsSocket, { onProject }: CozoSemHandlerOptions = {}): (() => void)[] {
  if (!socket || typeof onProject !== "function") {
    return [];
  }

  return COZO_SEM_EVENT_TYPES.map((type) => socket.on(type, onProject));
}
