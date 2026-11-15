// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import { formatValue, overallStatus } from "../../lib/engine";
import type { Alert, Assessment, CrewMember, IndicatorId, MissionProfile } from "../../lib/types";
import { AlertList } from "../alerts/AlertList";
import { DetailPanel } from "../guidance/DetailPanel";

interface Props {
  crew: CrewMember[];
  assessmentsById: Record<string, Assessment[]>;
  alerts: Alert[];
  linkOn: boolean;
  profile: MissionProfile;
}

/** The flight surgeon on Earth sees full history, trends, and the alert log. */
export function SurgeonView({ crew, assessmentsById, alerts, linkOn, profile }: Props) {
  const [crewId, setCrewId] = useState(crew[0].id);
  const [indicator, setIndicator] = useState<IndicatorId>("hr");
  const member = crew.find((m) => m.id === crewId)!;
  const assessments = assessmentsById[crewId];
  const current = assessments.find((a) => a.indicator === indicator)!;
  const memberAlerts = alerts.filter((a) => a.crewId === crewId);
  const waiting = alerts.filter((a) => a.status === "red").length;

  return (
    <>
      <section className={`panel sync ${linkOn ? "sync-on" : "sync-off"}`} role="status">
        <h2>Link to {profile.name}</h2>
        {linkOn ? (
          <p>Link is up ({profile.delayLabel}). All reports have been received.</p>
        ) : (
          <p>
            Link is down. {waiting} priority report{waiting === 1 ? "" : "s"} waiting on board. The crew is following
            on-board guidance. Data below is from the last sync.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Crew member</h2>
        <div className="tabs" role="tablist">
          {crew.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === crewId}
              className={`tab${m.id === crewId ? " tab-active" : ""}`}
              onClick={() => setCrewId(m.id)}
            >
              {m.name} <StatusBadge status={overallStatus(assessmentsById[m.id])} />
            </button>
          ))}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Latest</th>
              <th>Status</th>
              <th>Source</th>
              <th>Hazard</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const def = INDICATOR_BY_ID[a.indicator];
              return (
                <tr
                  key={a.indicator}
                  className={a.indicator === indicator ? "row-active" : ""}
                  onClick={() => setIndicator(a.indicator)}
                >
                  <td>
                    <button className="link-button" onClick={() => setIndicator(a.indicator)}>
                      {def.label}
                    </button>
                  </td>
                  <td>
                    {formatValue(def, a.value)} {def.unit}
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>{def.source}</td>
                  <td>{def.hazard}</td>
                  <td>{a.status === "green" ? "" : a.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <DetailPanel member={member} assessment={current} showGuidance={false} />

      <section className="panel">
        <h2>Alert log: {member.name}</h2>
        <AlertList alerts={memberAlerts} linkOn={linkOn} />
      </section>
    </>
  );
}
