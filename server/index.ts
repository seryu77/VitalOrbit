// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Local real-time backend for the demo. It streams a simulated wearable feed over a
// WebSocket and relays alerts between open VitalOrbit windows, so the astronaut, crew,
// and flight surgeon views can run on different devices. The app works without it.

import { DatabaseSync } from "node:sqlite";
import Fastify from "fastify";
import websocket from "@fastify/websocket";

const PORT = Number(process.env.PORT ?? 8787);
const TICK_MS = 1000;

const db = new DatabaseSync(new URL("./vitalorbit.db", import.meta.url).pathname);
db.exec("CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, at INTEGER NOT NULL, json TEXT NOT NULL)");
const saveAlert = db.prepare("INSERT OR IGNORE INTO alerts (id, at, json) VALUES (?, ?, ?)");
const recentAlerts = db.prepare("SELECT json FROM alerts ORDER BY at DESC LIMIT 50");

const app = Fastify({ logger: { level: "warn" } });
await app.register(websocket);

type Socket = { send: (data: string) => void; readyState: number };
const clients = new Set<Socket>();

function broadcast(data: unknown, except?: Socket) {
  const text = JSON.stringify(data);
  for (const c of clients) if (c !== except && c.readyState === 1) c.send(text);
}

app.get("/health", async () => ({ ok: true, clients: clients.size }));

app.get("/ws", { websocket: true }, (socket) => {
  clients.add(socket);
  // A window that joins late still gets the recent alerts.
  const alerts = (recentAlerts.all() as { json: string }[]).map((r) => JSON.parse(r.json)).reverse();
  socket.send(JSON.stringify({ type: "hello", alerts }));

  socket.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "alert" && msg.entry?.id) {
        saveAlert.run(msg.entry.id, msg.entry.at ?? Date.now(), JSON.stringify(msg.entry));
        broadcast(msg, socket);
      } else if (msg.type === "ack" && typeof msg.id === "string") {
        broadcast(msg, socket);
      }
    } catch {
      // Ignore malformed messages.
    }
  });
  socket.on("close", () => clients.delete(socket));
});

// Simulated wearable: heart rate and SpO2 drift around the stored reading as small offsets.
let hr = 0;
let spo2 = 0;
const walk = (v: number, step: number, limit: number) =>
  Math.max(-limit, Math.min(limit, v + (Math.random() - 0.5) * 2 * step));

setInterval(() => {
  if (clients.size === 0) return;
  hr = walk(hr, 1.5, 3);
  spo2 = walk(spo2, 0.6, 1);
  broadcast({ type: "vitals", hr: Math.round(hr), spo2: Math.round(spo2), t: Date.now() });
}, TICK_MS);

await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`VitalOrbit server on ws://127.0.0.1:${PORT}/ws`);
