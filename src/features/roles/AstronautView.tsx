// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { StatusIcon } from "../../components/StatusIcon";
import { INDICATOR_BY_ID, REGIONS } from "../../data/rules/indicators";
import { overallStatus, STATUS_LABEL, worst } from "../../lib/engine";
import type { Alert, Assessment, CrewMember, IndicatorId, Region, Status } from "../../lib/types";
import { AlertList } from "../alerts/AlertList";
import { TodayStrip } from "../gamification/TodayStrip";
import { DetailPanel } from "../guidance/DetailPanel";
import { IndicatorCard } from "../vitals/IndicatorCard";

// three.js is large, so the 3D body map loads separately from the rest of the dashboard.
const BodyMap3D = lazy(() => import("../body-map/BodyMap3D").then((m) => ({ default: m.BodyMap3D })));

interface Props {
  member: CrewMember;
  assessments: Assessment[];
  alerts: Alert[];
  linkOn: boolean;
  moodToday: number | null;
  onMood: (score: number) => void;
}

const OVERALL_TEXT: Record<Status, string> = {
  green: "You are doing well. All indicators are in the expected range.",
  yellow: "Something needs your attention. Check the highlighted indicators.",
  red: "Act now. Your crew has been notified.",
};

/** Indicators read continuously by the wearable. Their display value moves slightly between readings. */
const LIVE: IndicatorId[] = ["hr", "spo2"];

/** Below 600 px the body map starts collapsed (DESIGN.md section 11). */
const wideScreen = () => {
  try {
    return window.matchMedia("(min-width: 600px)").matches;
  } catch {
    return true;
  }
};

export function AstronautView({ member, assessments, alerts, linkOn, moodToday, onMood }: Props) {
  const overall = overallStatus(assessments);
  const [selected, setSelected] = useState<IndicatorId | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [tick, setTick] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [mapOpen, setMapOpen] = useState(wideScreen);
  const detailRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLElement>(null);

  // Simulated real-time stream from the wearable.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  const statusByRegion = Object.fromEntries(
    REGIONS.map((r) => [
      r.id,
      worst(assessments.filter((a) => INDICATOR_BY_ID[a.indicator].region === r.id).map((a) => a.status)),
    ]),
  ) as Record<Region, Status>;

  // Open the most serious indicator by default, so there is always a next step on screen.
  const fallback = alerts[0]?.indicator ?? "hr";
  const current = assessments.find((a) => a.indicator === (selected ?? fallback))!;
  const redAlerts = alerts.filter((a) => a.status === "red");
  const showWarning = redAlerts.length > 0 && !acknowledged;
  const counts = {
    yellow: assessments.filter((a) => a.status === "yellow").length,
    red: assessments.filter((a) => a.status === "red").length,
  };

  const open = (id: IndicatorId) => {
    setSelected(id);
    setRegion(INDICATOR_BY_ID[id].region);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectRegion = (r: Region) => {
    if (region === r) {
      setRegion(null);
      return;
    }
    setRegion(r);
    const inRegion = assessments.filter((a) => INDICATOR_BY_ID[a.indicator].region === r);
    const order: Status[] = ["red", "yellow", "green"];
    inRegion.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    if (inRegion[0]) setSelected(inRegion[0].indicator);
  };

  const live = (a: Assessment) => (LIVE.includes(a.indicator) ? a.value + ((tick * 7) % 3) - 1 : a.value);
  const recent = (id: IndicatorId) => member.history.slice(-14).map((d) => d.values[id]);

  return (
    <>
      {showWarning && (
        <div className="master-warning" role="alert">
          <div className="mw-lamp">
            <StatusIcon status="red" size={22} />
            <span className="mono">Master warning</span>
          </div>
          <div className="mw-text">
            <strong>{redAlerts.map((a) => INDICATOR_BY_ID[a.indicator].label).join(" · ")}</strong>
            <span>{redAlerts[0].reason} Your crew has been notified.</span>
          </div>
          <div className="mw-actions">
            <button className="btn btn-line" onClick={() => open(redAlerts[0].indicator)}>
              See what to do
            </button>
            <button className="btn btn-red" onClick={() => setAcknowledged(true)}>
              Acknowledge
            </button>
          </div>
        </div>
      )}

      <section className={`status-deck sd-${overall}`} role="status">
        <div className="sd-main">
          <p className="label mono">Overall status · {member.name}, {member.role.toLowerCase()}</p>
          <p className={`sd-word sd-word-${overall}${showWarning ? " is-pulsing" : ""}`}>
            <StatusIcon status={overall} size={30} />
            {STATUS_LABEL[overall]}
          </p>
          <p className="sd-text">{OVERALL_TEXT[overall]}</p>
          <div className="sd-meta">
            <span className="mono">
              {counts.red} critical · {counts.yellow} attention · {assessments.length - counts.red - counts.yellow} normal
            </span>
            <button className="btn btn-line btn-sm" onClick={() => alertsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Alerts ({alerts.length})
            </button>
          </div>
        </div>

        <div className="annunciator" role="group" aria-label="All indicators. Lit cells need attention.">
          {assessments.map((a) => {
            const def = INDICATOR_BY_ID[a.indicator];
            return (
              <button
                key={a.indicator}
                className={`ann ann-${a.status}${current.indicator === a.indicator ? " is-on" : ""}`}
                onClick={() => open(a.indicator)}
                aria-label={`${def.label}: ${STATUS_LABEL[a.status]}`}
              >
                <span className="ann-name">{def.label}</span>
                <span className="ann-state mono">
                  <StatusIcon status={a.status} size={12} />
                  {STATUS_LABEL[a.status]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid-main">
        <section className={`block block-map${mapOpen ? "" : " is-collapsed"}`}>
          <header className="block-head">
            <h2>
              <span className="idx mono">01</span> Body map
            </h2>
            <button className="btn btn-line btn-sm map-toggle" onClick={() => setMapOpen((o) => !o)} aria-expanded={mapOpen}>
              {mapOpen ? "Hide" : "Show"}
            </button>
          </header>
          <div className="map-body">
            <Suspense fallback={<div className="viewport viewport-loading mono">Loading body model…</div>}>
              <BodyMap3D
                statusByRegion={statusByRegion}
                selected={region}
                onSelect={selectRegion}
                onClear={() => setRegion(null)}
                assessments={assessments}
                valueOf={live}
              />
            </Suspense>
          </div>
        </section>

        <section className="block">
          <header className="block-head">
            <h2>
              <span className="idx mono">02</span> Health indicators
            </h2>
            {region ? (
              <button className="btn btn-line btn-sm" onClick={() => setRegion(null)}>
                Show all
              </button>
            ) : (
              <span className="label mono">Last 14 days</span>
            )}
          </header>
          <div className="rows">
            {assessments.map((a) => (
              <IndicatorCard
                key={a.indicator}
                assessment={a}
                displayValue={live(a)}
                live={LIVE.includes(a.indicator)}
                selected={current.indicator === a.indicator}
                dimmed={region !== null && INDICATOR_BY_ID[a.indicator].region !== region}
                onSelect={() => open(a.indicator)}
                history={recent(a.indicator)}
              />
            ))}
          </div>
        </section>
      </div>

      <div ref={detailRef} className="scroll-anchor">
        <DetailPanel member={member} assessment={current} />
      </div>

      <div className="grid-even">
        <section className="block scroll-anchor" ref={alertsRef}>
          <header className="block-head">
            <h2>
              <span className="idx mono">04</span> Alerts
            </h2>
            <span className="label mono">{alerts.length} active</span>
          </header>
          <AlertList alerts={alerts} linkOn={linkOn} onOpen={open} />
        </section>
        <TodayStrip member={member} moodToday={moodToday} onMood={onMood} />
      </div>
    </>
  );
}
