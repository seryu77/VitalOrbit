// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { StatusBadge } from "../../components/StatusBadge";
import type { Alert, CrewMember, LogEntry, Status } from "../../lib/types";
import { AlertList } from "../alerts/AlertList";

interface Props {
  crew: CrewMember[];
  overallById: Record<string, Status>;
  alerts: Alert[];
  log: LogEntry[];
  linkOn: boolean;
}

/** The crew sees who needs help. Detailed readings stay private to each astronaut. */
export function CrewView({ crew, overallById, alerts, log, linkOn }: Props) {
  const emergencies = alerts.filter((a) => a.status === "red");
  return (
    <>
      <section className="panel">
        <h2>Crew status</h2>
        <p className="muted">
          Overall status only. Detailed readings are private to each crew member and the flight surgeon.
        </p>
        <ul className="crew-list">
          {crew.map((m) => {
            const status = overallById[m.id];
            return (
              <li key={m.id} className={`crew-row crew-${status}`}>
                <div className="crew-id">
                  <span className="initials" aria-hidden="true">
                    {m.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </span>
                  <div>
                    <strong>{m.name}</strong>
                    <p className="muted">{m.role}</p>
                  </div>
                </div>
                <p className="crew-note">
                  {status === "red"
                    ? "Needs help now. Check on this crew member."
                    : status === "yellow"
                      ? "Managing a minor issue."
                      : "No concerns."}
                </p>
                <StatusBadge status={status} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Emergency alerts ({emergencies.length})</h2>
        <AlertList alerts={emergencies} linkOn={linkOn} log={log} showName />
      </section>
    </>
  );
}
