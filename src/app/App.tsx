// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROFILES } from "../data/rules/indicators";
import { buildCrew, MISSION_DAY, SCENARIOS } from "../data/simulated/crew";
import { AstronautView } from "../features/roles/AstronautView";
import { CrewView } from "../features/roles/CrewView";
import { SurgeonView } from "../features/roles/SurgeonView";
import { alertsFor, assessMember, overallStatus, worst } from "../lib/engine";
import { useLiveFeed } from "../lib/live";
import { loadLog, mergeAlerts, saveLog } from "../lib/log";
import type { Alert, Assessment, CheckupEntry, CheckupId, LogEntry, ScenarioId, Status } from "../lib/types";
import { askNotificationPermission, useReminders } from "../features/reminders/useReminders";
import { DEFAULT_VISION, type VisionConfig } from "../features/vision/monitor";
import type { SpineResult } from "../features/vision/spine";
import { VisionPanel } from "../features/vision/VisionPanel";

type Role = "astronaut" | "crew" | "surgeon";

const ROLES: { id: Role; label: string }[] = [
  { id: "astronaut", label: "Astronaut" },
  { id: "crew", label: "Crew" },
  { id: "surgeon", label: "Flight surgeon" },
];

const STORE_KEY = "vitalorbit-settings-v1";

interface Settings {
  profileId: string;
  scenario: ScenarioId;
  linkOn: boolean;
  moodToday: number | null;
  /** Checkup values entered today. They replace the simulated values until the scenario changes. */
  overrides: Partial<Record<CheckupId, number>>;
  checkups: CheckupEntry[];
  extraExercise: number;
  lastWater: number | null;
  notify: boolean;
  waterEveryMin: number;
  vision: VisionConfig;
}

const DEFAULTS: Settings = {
  profileId: "mars",
  scenario: "nominal",
  linkOn: false,
  moodToday: null,
  overrides: {},
  checkups: [],
  extraExercise: 0,
  lastWater: null,
  notify: false,
  waterEveryMin: 30,
  vision: DEFAULT_VISION,
};

// Everything is stored on the device. The app needs no server and works offline.
function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function App() {
  const [role, setRole] = useState<Role>("astronaut");
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const { profileId, scenario, linkOn, moodToday } = settings;
  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const [log, setLog] = useState<LogEntry[]>(loadLog);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [permission, setPermission] = useState<string>(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  );

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch {
      // Storage can be unavailable in private windows. The app still works.
    }
  }, [settings]);

  const profile = PROFILES.find((p) => p.id === profileId) ?? PROFILES[0];

  const { crew, assessmentsById, engineAlerts } = useMemo(() => {
    const crew = buildCrew(profile, scenario, {
      mood: moodToday,
      values: settings.overrides,
      extraExercise: settings.extraExercise,
    });
    const assessmentsById: Record<string, Assessment[]> = {};
    for (const m of crew) assessmentsById[m.id] = assessMember(m, profile);
    const engineAlerts = crew.flatMap((m) => alertsFor(m, assessmentsById[m.id]));
    return { crew, assessmentsById, engineAlerts };
  }, [profile, scenario, moodToday, settings.overrides, settings.extraExercise]);

  const me = crew[0];

  // Optional local server: live wearable feed, and alerts shared between open windows.
  const known = useRef(new Set<string>());
  const live = useLiveFeed({
    onAlert: (entry) => {
      if (known.current.has(entry.id)) return;
      known.current.add(entry.id);
      setLog((l) => (l.some((e) => e.id === entry.id) ? l : [...l, { ...entry, sentAt: null }]));
    },
    onAck: (id) => setLog((l) => l.map((e) => (e.id === id && e.ackAt === null ? { ...e, ackAt: Date.now() } : e))),
  });
  useEffect(() => {
    for (const e of log) {
      // Alerts raised while the server was off are sent once it is back.
      if (!known.current.has(e.id) && live.send({ type: "alert", entry: e })) known.current.add(e.id);
    }
  }, [log, live.send, live.connected]);

  // Keep the alert log on the device. An alert is added once while its cause is unchanged.
  useEffect(() => {
    setLog((l) => mergeAlerts(l, engineAlerts, Date.now()));
  }, [engineAlerts]);
  useEffect(() => saveLog(log), [log]);

  // Red alerts wait in the log until the link is up, then are sent one by one.
  useEffect(() => {
    if (!linkOn) return;
    const next = log.filter((e) => e.status === "red" && e.sentAt === null).sort((a, b) => a.at - b.at)[0];
    if (!next) return;
    const timer = setTimeout(
      () => setLog((l) => l.map((e) => (e.id === next.id ? { ...e, sentAt: Date.now() } : e))),
      700,
    );
    return () => clearTimeout(timer);
  }, [linkOn, log]);

  // A camera alert stays open until the person says they are fine.
  const openVision = log.filter((e) => e.indicator === "vision" && e.ackAt === null);
  // Camera findings stay open until acknowledged: the safety check (red) and the spine check (yellow).
  const openCv = log.filter((e) => (e.indicator === "vision" || e.indicator === "spine") && e.ackAt === null);
  const alerts: Alert[] = useMemo(
    () => [...engineAlerts, ...openCv].sort((a, b) => (a.status === b.status ? 0 : a.status === "red" ? -1 : 1)),
    [engineAlerts, openVision],
  );
  const myAlerts = alerts.filter((a) => a.crewId === me.id);

  const overallById = useMemo(() => {
    const out: Record<string, Status> = {};
    for (const m of crew) {
      const extra = worst(openCv.filter((e) => e.crewId === m.id).map((e) => e.status));
      out[m.id] = worst([overallStatus(assessmentsById[m.id]), extra]);
    }
    return out;
  }, [crew, assessmentsById, openCv]);

  const ack = (id: string) => {
    setLog((l) => l.map((e) => (e.id === id && e.ackAt === null ? { ...e, ackAt: Date.now() } : e)));
    live.send({ type: "ack", id });
  };

  const raiseVision = (reason: string) => {
    const at = Date.now();
    setLog((l) => [
      ...l,
      { id: `${me.id}-vision-${at}`, crewId: me.id, crewName: me.name, indicator: "vision", status: "red", reason, day: MISSION_DAY, at, ackAt: null, sentAt: null },
    ]);
    toast("Camera safety check: no response. Emergency alert raised.");
  };
  const raiseSpine = (r: SpineResult) => {
    const at = Date.now();
    setLog((l) => [
      ...l,
      {
        id: `${me.id}-spine-${at}`,
        crewId: me.id,
        crewName: me.name,
        indicator: "spine",
        status: "yellow",
        reason: `${r.summary} ${r.findings.join(" ")}`,
        day: MISSION_DAY,
        at,
        ackAt: null,
        sentAt: null,
      },
    ]);
    toast("Spine check found an asymmetry. See your alerts.");
  };
  const resolveVision = () => {
    openVision.forEach((e) => live.send({ type: "ack", id: e.id }));
    setLog((l) => l.map((e) => (e.indicator === "vision" && e.ackAt === null ? { ...e, ackAt: Date.now() } : e)));
  };

  const addCheckup = (values: Partial<Record<CheckupId, number>>) => {
    const entry: CheckupEntry = { id: `chk-${Date.now()}`, at: Date.now(), values };
    setSettings((s) => ({ ...s, checkups: [...s.checkups, entry], overrides: { ...s.overrides, ...values } }));
  };

  const resetDemo = () => {
    setLog([]);
    setSettings((s) => ({
      ...s,
      scenario: "nominal",
      moodToday: null,
      overrides: {},
      checkups: [],
      extraExercise: 0,
      lastWater: null,
    }));
  };

  const reminders = useReminders({
    notify: settings.notify,
    checkupDone: settings.overrides.bp !== undefined && settings.overrides.mass !== undefined,
    moodDone: moodToday !== null,
    exerciseDone: me.history[me.history.length - 1].exerciseMin >= 120,
    lastWater: settings.lastWater,
    waterEveryMin: settings.waterEveryMin,
    onReminder: toast,
  });

  const setNotify = async (on: boolean) => {
    if (on) setPermission(await askNotificationPermission());
    update({ notify: on });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ◉
          </span>
          <div>
            <h1>VitalOrbit</h1>
            <p>Your health copilot, even when Earth is out of reach.</p>
          </div>
        </div>

        <div className="mission">
          <label>
            Mission
            <select value={profileId} onChange={(e) => update({ profileId: e.target.value })}>
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <span className="pill">Day {MISSION_DAY}</span>
          <span className={`pill ${live.connected ? "pill-on" : "pill-off"}`} title="Optional local real-time server">
            {live.connected ? "Live server: connected" : "Live server: off, using local simulator"}
          </span>
          <button
            className={`pill pill-button ${linkOn ? "pill-on" : "pill-off"}`}
            onClick={() => update({ linkOn: !linkOn })}
            aria-pressed={linkOn}
            title="Simulate the link to Earth"
          >
            Earth link: {linkOn ? `up, ${profile.delayLabel}` : "down, working offline"}
          </button>
        </div>
      </header>

      <div className="demo-bar">
        <span className="sim-tag">SIMULATED DATA</span>
        <span>Demo scenario for the astronaut:</span>
        <div className="scenario-buttons" role="group" aria-label="Demo scenario">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`chip${scenario === s.id ? " chip-active" : ""}`}
              aria-pressed={scenario === s.id}
              onClick={() => update({ scenario: s.id, moodToday: null, overrides: {}, extraExercise: 0 })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button className="chip chip-reset" onClick={resetDemo} title="Clear the alert log and today's entries">
          Reset demo
        </button>
      </div>

      <nav className="tabs tabs-main" role="tablist" aria-label="View">
        {ROLES.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={role === r.id}
            className={`tab${role === r.id ? " tab-active" : ""}`}
            onClick={() => setRole(r.id)}
          >
            {r.label}
          </button>
        ))}
      </nav>

      <main>
        {role === "astronaut" && (
          <AstronautView
            key={scenario + profileId}
            member={me}
            assessments={assessmentsById[me.id]}
            overall={overallById[me.id]}
            alerts={myAlerts}
            log={log}
            onAck={ack}
            linkOn={linkOn}
            profile={profile}
            liveVitals={live.vitals}
            moodToday={moodToday}
            onMood={(score) => update({ moodToday: score })}
            checkups={settings.checkups}
            onCheckup={addCheckup}
            today={{
              checkupDone: settings.overrides.bp !== undefined && settings.overrides.mass !== undefined,
              onExercise: (m) => update({ extraExercise: settings.extraExercise + m }),
              waterDue: reminders.waterDue,
              waterInMin: reminders.waterInMin,
              waterEveryMin: settings.waterEveryMin,
              onWater: () => update({ lastWater: Date.now() }),
              onWaterEvery: (m) => update({ waterEveryMin: m }),
              notify: settings.notify,
              permission,
              onNotify: setNotify,
            }}
          />
        )}
        {role === "crew" && (
          <CrewView crew={crew} overallById={overallById} alerts={alerts} log={log} linkOn={linkOn} />
        )}
        {role === "surgeon" && (
          <SurgeonView
            crew={crew}
            assessmentsById={assessmentsById}
            overallById={overallById}
            log={log}
            linkOn={linkOn}
            profile={profile}
          />
        )}
      </main>

      <VisionPanel
        config={settings.vision}
        onConfig={(vision) => update({ vision })}
        onEmergency={raiseVision}
        onResolved={resolveVision}
        onSpineResult={raiseSpine}
        emergencyOpen={openVision.length > 0}
      />

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className="toast">
            {t.text}
          </p>
        ))}
      </div>

      <footer className="footer">
        <p>
          Prototype for the 2026 NASA Space Apps Challenge. All readings are simulated and all thresholds are
          illustrative. VitalOrbit is not a medical device and does not give medical advice.
        </p>
        <p>
          Hazard mapping is based on NASA Human Research Program resources. Built with AI assistance (Claude,
          Anthropic).
        </p>
      </footer>
    </div>
  );
}
