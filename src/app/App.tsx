// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useEffect, useMemo, useState } from "react";
import { PROFILES } from "../data/rules/indicators";
import { buildCrew, MISSION_DAY, SCENARIOS } from "../data/simulated/crew";
import { AstronautView } from "../features/roles/AstronautView";
import { CrewView } from "../features/roles/CrewView";
import { SurgeonView } from "../features/roles/SurgeonView";
import { alertsFor, assessMember } from "../lib/engine";
import type { Assessment, ScenarioId } from "../lib/types";

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
}

const DEFAULTS: Settings = { profileId: "mars", scenario: "nominal", linkOn: false, moodToday: null };

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
  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch {
      // Storage can be unavailable in private windows. The app still works.
    }
  }, [settings]);

  const profile = PROFILES.find((p) => p.id === profileId) ?? PROFILES[0];

  const { crew, assessmentsById, alerts } = useMemo(() => {
    const crew = buildCrew(profile, scenario, moodToday);
    const assessmentsById: Record<string, Assessment[]> = {};
    for (const m of crew) assessmentsById[m.id] = assessMember(m, profile);
    const alerts = crew.flatMap((m) => alertsFor(m, assessmentsById[m.id]));
    return { crew, assessmentsById, alerts };
  }, [profile, scenario, moodToday]);

  const me = crew[0];
  const myAlerts = alerts.filter((a) => a.crewId === me.id);

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
              onClick={() => update({ scenario: s.id, moodToday: null })}
            >
              {s.label}
            </button>
          ))}
        </div>
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
            alerts={myAlerts}
            linkOn={linkOn}
            moodToday={moodToday}
            onMood={(score) => update({ moodToday: score })}
          />
        )}
        {role === "crew" && <CrewView crew={crew} assessmentsById={assessmentsById} alerts={alerts} linkOn={linkOn} />}
        {role === "surgeon" && (
          <SurgeonView crew={crew} assessmentsById={assessmentsById} alerts={alerts} linkOn={linkOn} profile={profile} />
        )}
      </main>

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
