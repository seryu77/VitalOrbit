// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import { formatValue } from "../../lib/engine";
import type { Assessment, CrewMember, IndicatorId, LogEntry, MissionProfile, Status } from "../../lib/types";
import { AlertLog } from "../alerts/AlertLog";
import { DetailPanel } from "../guidance/DetailPanel";
import { SyncPanel } from "../sync/SyncPanel";

interface Props {
  crew: CrewMember[];
  assessmentsById: Record<string, Assessment[]>;
  overallById: Record<string, Status>;
  log: LogEntry[];
  linkOn: boolean;
  profile: MissionProfile;
}

/** The flight surgeon on Earth sees full history, trends, and the alert log. */
export function SurgeonView({ crew, assessmentsById, overallById, log, linkOn, profile }: Props) {
  const [crewId, setCrewId] = useState(crew[0].id);
  const [indicator, setIndicator] = useState<IndicatorId>("hr");
  const member = crew.find((m) => m.id === crewId)!;
  const assessments = assessmentsById[crewId];
  const current = assessments.find((a) => a.indicator === indicator)!;
  const memberLog = log.filter((e) => e.crewId === crewId);

  return (
    <>
      <SyncPanel log={log} linkOn={linkOn} profile={profile} />

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
              {m.name} <StatusBadge status={overallById[m.id]} />
            </button>
          ))}
        </div>

        <div className="table-wrap">
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
        </div>
      </section>

      <DetailPanel member={member} assessment={current} showGuidance={false} />

      <section className="panel">
        <h2>Alert log: {member.name}</h2>
        <AlertLog entries={memberLog} linkOn={linkOn} />
      </section>
    </>
  );
}
