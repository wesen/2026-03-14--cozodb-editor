import { useCallback, useEffect, useRef, useState } from "react";

export interface SemEvent {
  type: string;
  id?: string;
  stream_id?: string;
  data?: Record<string, unknown> | string;
}

export interface SemEnvelope {
  sem: true;
  event: SemEvent;
}

export type SemEventHandler = (event: SemEvent, envelope: SemEnvelope) => void;

export interface HintsSocket {
  connected: boolean;
  send: (type: string, data: Record<string, unknown>) => boolean;
  on: (type: string, handler: SemEventHandler) => () => void;
  onAny: (handler: SemEventHandler) => () => void;
  off: (type: string, handler?: SemEventHandler) => void;
}

function buildWSURL(path: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}

function parseEnvelope(raw: string): SemEnvelope {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.sem !== true || !parsed.event || typeof parsed.event.type !== "string") {
    throw new Error("invalid websocket envelope");
  }
  return parsed as SemEnvelope;
}

export function useHintsSocket(path = "/ws/hints"): HintsSocket {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(new Map<string, Set<SemEventHandler>>());
  const wildcardHandlersRef = useRef(new Set<SemEventHandler>());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((type: string, handler: SemEventHandler): (() => void) => {
    const existing = handlersRef.current.get(type);
    if (existing) {
      existing.add(handler);
      return () => {
        const current = handlersRef.current.get(type);
        if (!current) return;
        current.delete(handler);
        if (current.size === 0) {
          handlersRef.current.delete(type);
        }
      };
    }

    handlersRef.current.set(type, new Set([handler]));
    return () => {
      const current = handlersRef.current.get(type);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        handlersRef.current.delete(type);
      }
    };
  }, []);

  const subscribeAll = useCallback((handler: SemEventHandler): (() => void) => {
    wildcardHandlersRef.current.add(handler);
    return () => {
      wildcardHandlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let ws: WebSocket | undefined;

    function connect() {
      if (!active) return;

      try {
        ws = new WebSocket(buildWSURL(path));
      } catch {
        return;
      }

      ws.onopen = () => {
        if (!active) return;
        wsRef.current = ws!;
        setConnected(true);
      };

      ws.onclose = () => {
        if (!active) return;
        wsRef.current = null;
        setConnected(false);
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws!.close();
      };

      ws.onmessage = (event: MessageEvent) => {
        let envelope: SemEnvelope;
        try {
          envelope = parseEnvelope(event.data as string);
        } catch (err) {
          console.warn("[WS] invalid websocket payload", err);
          return;
        }

        for (const handler of wildcardHandlersRef.current) {
          handler(envelope.event, envelope);
        }

        const handlers = handlersRef.current.get(envelope.event.type);
        if (!handlers) return;
        for (const handler of handlers) {
          handler(envelope.event, envelope);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (ws) ws.close();
    };
  }, [path]);

  const send = useCallback((type: string, data: Record<string, unknown>): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        sem: true,
        event: { type, data },
      }));
      return true;
    }

    return false;
  }, []);

  const on = useCallback((type: string, handler: SemEventHandler) => subscribe(type, handler), [subscribe]);
  const onAny = useCallback((handler: SemEventHandler) => subscribeAll(handler), [subscribeAll]);
  const off = useCallback((type: string, handler?: SemEventHandler) => {
    if (!handler) {
      handlersRef.current.delete(type);
      return;
    }
    const handlers = handlersRef.current.get(type);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      handlersRef.current.delete(type);
    }
  }, []);

  return { connected, send, on, onAny, off };
}
