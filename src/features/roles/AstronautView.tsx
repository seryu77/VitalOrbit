// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID, REGIONS } from "../../data/rules/indicators";
import { overallStatus, worst } from "../../lib/engine";
import type { Alert, Assessment, CrewMember, IndicatorId, Region, Status } from "../../lib/types";
import { AlertList } from "../alerts/AlertList";
import { BodyMap } from "../body-map/BodyMap";
import { TodayStrip } from "../gamification/TodayStrip";
import { DetailPanel } from "../guidance/DetailPanel";
import { IndicatorCard } from "../vitals/IndicatorCard";

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

export function AstronautView({ member, assessments, alerts, linkOn, moodToday, onMood }: Props) {
  const overall = overallStatus(assessments);
  const [selected, setSelected] = useState<IndicatorId | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [tick, setTick] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);

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

  const open = (id: IndicatorId) => {
    setSelected(id);
    setRegion(INDICATOR_BY_ID[id].region);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  return (
    <>
      <section className={`overall overall-${overall}`} role="status">
        <div>
          <p className="overall-label">Overall status</p>
          <StatusBadge status={overall} large />
        </div>
        <p className="overall-text">{OVERALL_TEXT[overall]}</p>
        <p className="overall-who">
          {member.name} · {member.role}
        </p>
      </section>

      <div className="dash">
        <section className="panel">
          <h2>Body map</h2>
          <p className="muted">Select a body part to see its indicators.</p>
          <BodyMap statusByRegion={statusByRegion} selected={region} onSelect={selectRegion} />
        </section>

        <section className="panel">
          <h2>
            Health indicators
            {region && (
              <button className="link-button" onClick={() => setRegion(null)}>
                Show all
              </button>
            )}
          </h2>
          <div className="cards">
            {assessments.map((a) => (
              <IndicatorCard
                key={a.indicator}
                assessment={a}
                displayValue={live(a)}
                live={LIVE.includes(a.indicator)}
                selected={current.indicator === a.indicator}
                dimmed={region !== null && INDICATOR_BY_ID[a.indicator].region !== region}
                onSelect={() => open(a.indicator)}
              />
            ))}
          </div>
        </section>
      </div>

      <div ref={detailRef}>
        <DetailPanel member={member} assessment={current} />
      </div>

      <div className="dash dash-even">
        <section className="panel">
          <h2>Alerts ({alerts.length})</h2>
          <AlertList alerts={alerts} linkOn={linkOn} onOpen={open} />
        </section>
        <TodayStrip member={member} moodToday={moodToday} onMood={onMood} />
      </div>
    </>
  );
}
