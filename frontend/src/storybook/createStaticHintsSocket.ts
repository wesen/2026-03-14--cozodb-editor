import type { HintsSocket } from "../transport/hintsSocket";

export function createStaticHintsSocket(connected = true): HintsSocket {
  return {
    connected,
    send: () => connected,
    on: () => () => {},
    onAny: () => () => {},
    off: () => {},
  };
}
