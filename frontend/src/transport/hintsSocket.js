import { useCallback, useEffect, useRef, useState } from "react";

function buildWSURL(path) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}

function parseEnvelope(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.sem !== true || !parsed.event || typeof parsed.event.type !== "string") {
    throw new Error("invalid websocket envelope");
  }
  return parsed;
}

export function useHintsSocket(path = "/ws/hints") {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const handlersRef = useRef(new Map());
  const wildcardHandlersRef = useRef(new Set());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((type, handler) => {
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

  const subscribeAll = useCallback((handler) => {
    wildcardHandlersRef.current.add(handler);
    return () => {
      wildcardHandlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let ws;

    function connect() {
      if (!active) return;

      try {
        ws = new WebSocket(buildWSURL(path));
      } catch {
        return;
      }

      ws.onopen = () => {
        if (!active) return;
        wsRef.current = ws;
        setConnected(true);
      };

      ws.onclose = () => {
        if (!active) return;
        wsRef.current = null;
        setConnected(false);
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        let envelope;
        try {
          envelope = parseEnvelope(event.data);
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
      clearTimeout(reconnectTimerRef.current);
      if (ws) ws.close();
    };
  }, [path]);

  const send = useCallback((type, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        sem: true,
        event: { type, data },
      }));
      return true;
    }

    return false;
  }, []);

  const on = useCallback((type, handler) => subscribe(type, handler), [subscribe]);
  const onAny = useCallback((handler) => subscribeAll(handler), [subscribeAll]);
  const off = useCallback((type, handler) => {
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
