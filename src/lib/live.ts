// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Optional connection to the local real-time server. When it is not running, the app
// keeps working with its on-device simulator and the alert log stays on the device.

import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry } from "./types";

const URL_ = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:8787/ws";
const RETRY_MS = 4000;

export interface LiveVitals {
  /** Offset from the stored reading, in bpm. */
  hr: number;
  /** Offset from the stored reading, in percentage points. */
  spo2: number;
}

interface Handlers {
  onAlert: (entry: LogEntry) => void;
  onAck: (id: string) => void;
}

export function useLiveFeed(handlers: Handlers) {
  const [connected, setConnected] = useState(false);
  const [vitals, setVitals] = useState<LiveVitals | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    const open = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(URL_);
      } catch {
        retry = setTimeout(open, RETRY_MS);
        return;
      }
      socket.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "vitals") setVitals({ hr: msg.hr, spo2: msg.spo2 });
          else if (msg.type === "hello") msg.alerts.forEach((e: LogEntry) => latest.current.onAlert(e));
          else if (msg.type === "alert") latest.current.onAlert(msg.entry);
          else if (msg.type === "ack") latest.current.onAck(msg.id);
        } catch {
          // Ignore malformed messages.
        }
      };
      ws.onclose = () => {
        setConnected(false);
        setVitals(null);
        socket.current = null;
        if (!closed) retry = setTimeout(open, RETRY_MS);
      };
      ws.onerror = () => ws.close();
    };

    open();
    return () => {
      closed = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, []);

  /** Returns false when the server is not connected, so the caller can try again later. */
  const send = useCallback((msg: unknown): boolean => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify(msg));
    return true;
  }, []);

  return { connected, vitals, send };
}
