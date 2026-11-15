// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import type { Alert, IndicatorId } from "../../lib/types";

interface Props {
  alerts: Alert[];
  linkOn: boolean;
  showName?: boolean;
  onOpen?: (indicator: IndicatorId) => void;
}

/** Yellow stays with the astronaut. Red goes to the crew and the flight surgeon. */
export function AlertList({ alerts, linkOn, showName, onOpen }: Props) {
  if (alerts.length === 0) {
    return <p className="muted">No alerts. All indicators are in the expected range.</p>;
  }
  return (
    <ul className="alerts">
      {alerts.map((a) => {
        const def = INDICATOR_BY_ID[a.indicator];
        const sentTo =
          a.status === "red"
            ? `Crew notified. Flight surgeon report: ${linkOn ? "sent" : "queued on board, link is down"}.`
            : "Shown to you only.";
        return (
          <li key={a.id} className={`alert alert-${a.status}`}>
            <div className="alert-main">
              <StatusBadge status={a.status} />
              <strong>
                {showName ? `${a.crewName}: ` : ""}
                {def.label}
              </strong>
              <span className="muted">Day {a.day}</span>
            </div>
            <p>{a.reason}</p>
            <p className="muted">{sentTo}</p>
            {onOpen && (
              <button className="link-button" onClick={() => onOpen(a.indicator)}>
                See what to do
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
