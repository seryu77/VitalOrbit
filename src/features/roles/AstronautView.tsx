// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { StatusIcon } from "../../components/StatusIcon";
import { INDICATOR_BY_ID, REGIONS } from "../../data/rules/indicators";
import { STATUS_LABEL, worst } from "../../lib/engine";
import { isHealthIndicator } from "../../lib/types";
import type {
  Alert,
  Assessment,
  CheckupEntry,
  CheckupId,
  CrewMember,
  IndicatorId,
  LogEntry,
  MissionProfile,
  Region,
  Status,
} from "../../lib/types";
import { AlertList, sourceLabel } from "../alerts/AlertList";
import { AlertLog } from "../alerts/AlertLog";
import { CheckupForm } from "../checkup/CheckupForm";
import { TodayStrip } from "../gamification/TodayStrip";
import { SyncPanel } from "../sync/SyncPanel";
import { DetailPanel } from "../guidance/DetailPanel";
import { IndicatorCard } from "../vitals/IndicatorCard";
import { EarthReportPanel } from "../insights/EarthReportPanel";
import { HealthScore } from "../insights/HealthScore";
import { InsightsPanel } from "../insights/InsightsPanel";
import { LiveHeart } from "../insights/LiveHeart";
import { earlyWarnings, earthReport, healthScore, possibleCauses, summary } from "../../lib/insights";

// three.js is large, so the 3D body map loads separately from the rest of the dashboard.
const BodyMap3D = lazy(() => import("../body-map/BodyMap3D").then((m) => ({ default: m.BodyMap3D })));

interface Props {
  member: CrewMember;
  assessments: Assessment[];
  /** Includes the camera safety check, so it can be worse than any single indicator. */
  overall: Status;
  alerts: Alert[];
  log: LogEntry[];
  onAck: (id: string) => void;
  linkOn: boolean;
  profile: MissionProfile;
  /** Offsets from the local server's wearable stream. Null when the server is not running. */
  liveVitals: { hr: number; spo2: number } | null;
  moodToday: number | null;
  onMood: (score: number) => void;
  checkups: CheckupEntry[];
  onCheckup: (values: Partial<Record<CheckupId, number>>) => void;
  today: Omit<React.ComponentProps<typeof TodayStrip>, "member" | "moodToday" | "onMood">;
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

export function AstronautView({
  member,
  assessments,
  overall,
  alerts,
  log,
  onAck,
  linkOn,
  profile,
  liveVitals,
  moodToday,
  onMood,
  checkups,
  onCheckup,
  today,
}: Props) {
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
  const fallback = alerts.find((a) => isHealthIndicator(a.indicator))?.indicator as IndicatorId | undefined ?? "hr";
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

  const live = (a: Assessment) => {
    if (!LIVE.includes(a.indicator)) return a.value;
    if (liveVitals) return Math.min(100, a.value + (a.indicator === "hr" ? liveVitals.hr : liveVitals.spo2));
    return a.value + ((tick * 7) % 3) - 1;
  };
  const recent = (id: IndicatorId) => member.history.slice(-14).map((d) => d.values[id]);

  // Insights: score, early warning, possible causes, summary, and the report for Earth.
  const insights = useMemo(() => {
    const camera = alerts.filter((a) => !isHealthIndicator(a.indicator));
    const score = healthScore(assessments, camera);
    const forecasts = earlyWarnings(member, assessments);
    const causes = possibleCauses(assessments);
    return {
      score,
      forecasts,
      causes,
      text: summary(member, assessments, score, forecasts),
      report: earthReport(member, assessments, alerts, profile, score, causes),
    };
  }, [member, assessments, alerts, profile]);
  const hrNow = assessments.find((a) => a.indicator === "hr")!;

  return (
    <>
      {showWarning && (
        <div className="master-warning" role="alert">
          <div className="mw-lamp">
            <StatusIcon status="red" size={22} />
            <span className="mono">Master warning</span>
          </div>
          <div className="mw-text">
            <strong>{redAlerts.map((a) => (isHealthIndicator(a.indicator) ? INDICATOR_BY_ID[a.indicator].label : sourceLabel(a.indicator))).join(" · ")}</strong>
            <span>{redAlerts[0].reason} Your crew has been notified.</span>
          </div>
          <div className="mw-actions">
            <button className="btn btn-line" onClick={() => {
                const first = redAlerts[0].indicator;
                if (isHealthIndicator(first)) open(first);
                else alertsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
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
          <HealthScore score={insights.score} />
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

      <section className="block">
        <header className="block-head">
          <h2>
            <span className="idx mono">01</span> Live heart rate
          </h2>
          <span className="label mono">Wearable · real time</span>
        </header>
        <LiveHeart resting={hrNow.value} bands={hrNow.bands} serverOffset={liveVitals ? liveVitals.hr : null} />
      </section>

      <div className="grid-main">
        <section className={`block block-map${mapOpen ? "" : " is-collapsed"}`}>
          <header className="block-head">
            <h2>
              <span className="idx mono">02</span> Body map
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
              <span className="idx mono">03</span> Health indicators
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

      <section className="block">
        <header className="block-head">
          <h2>
            <span className="idx mono">05</span> Insights
          </h2>
          <span className="label mono">On board · rule based</span>
        </header>
        <InsightsPanel summary={insights.text} forecasts={insights.forecasts} causes={insights.causes} onOpen={open} />
      </section>

      <div className="grid-even">
        <section className="block scroll-anchor" ref={alertsRef}>
          <header className="block-head">
            <h2>
              <span className="idx mono">06</span> Alerts
            </h2>
            <span className="label mono">{alerts.length} active</span>
          </header>
          <AlertList alerts={alerts} linkOn={linkOn} log={log} onAck={onAck} onOpen={open} />
        </section>
        <TodayStrip member={member} moodToday={moodToday} onMood={onMood} {...today} />
      </div>

      <div className="grid-even">
        <CheckupForm entries={checkups} onSubmit={onCheckup} />
        <SyncPanel log={log} linkOn={linkOn} profile={profile} />
      </div>

      <section className="block">
        <header className="block-head">
          <h2>
            <span className="idx mono">08</span> Report to Earth
          </h2>
          <span className="label mono">Built automatically</span>
        </header>
        <EarthReportPanel report={insights.report} linkOn={linkOn} profile={profile} />
      </section>

      <section className="block">
        <header className="block-head">
          <h2>
            <span className="idx mono">09</span> Alert log
          </h2>
        </header>
        <AlertLog entries={log.filter((e) => e.crewId === member.id)} linkOn={linkOn} />
      </section>
    </>
  );
}
