// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// The on-device alert log and the sync queue for the flight surgeon. Red entries are
// the queue: they wait on board until the Earth link is up, then are sent one by one.

import type { Alert, LogEntry } from "./types";

export const LOG_KEY = "vitalorbit-log-v1";
const MAX_ENTRIES = 200;

export function loadLog(): LogEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveLog(log: LogEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_ENTRIES)));
  } catch {
    // Storage can be unavailable in private windows. The log still works for this session.
  }
}

/** Add alerts the log has not seen yet. An alert is not repeated while its cause is unchanged. */
export function mergeAlerts(log: LogEntry[], alerts: Alert[], now: number): LogEntry[] {
  const known = new Set(log.map((e) => e.id));
  const added = alerts.filter((a) => !known.has(a.id)).map((a) => ({ ...a, at: now, ackAt: null, sentAt: null }));
  return added.length ? [...log, ...added] : log;
}

export const isQueued = (e: LogEntry) => e.status === "red" && e.sentAt === null;

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** What happened to an alert, in words. Yellow stays with the astronaut. Red goes to the crew and the surgeon. */
export function deliveryText(e: LogEntry | undefined, status: Alert["status"], linkOn: boolean): string {
  if (status !== "red") return "Shown to you only.";
  if (e?.sentAt) return `Crew notified. Flight surgeon report sent at ${fmtTime(e.sentAt)}.`;
  return linkOn
    ? "Crew notified. Sending the flight surgeon report…"
    : "Crew notified. Flight surgeon report queued on board, link is down.";
}
