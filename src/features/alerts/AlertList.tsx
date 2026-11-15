// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import { deliveryText, fmtTime } from "../../lib/log";
import { isHealthIndicator, type Alert, type AlertSource, type IndicatorId, type LogEntry } from "../../lib/types";

interface Props {
  alerts: Alert[];
  linkOn: boolean;
  showName?: boolean;
  /** The log, used to show whether an alert was acknowledged and whether its report was sent. */
  log?: LogEntry[];
  onAck?: (id: string) => void;
  onOpen?: (indicator: IndicatorId) => void;
}

export const sourceLabel = (s: AlertSource) =>
  s === "vision" ? "Camera safety check" : s === "spine" ? "Spine posture check" : INDICATOR_BY_ID[s].label;

/** Yellow stays with the astronaut. Red goes to the crew and the flight surgeon. */
export function AlertList({ alerts, linkOn, showName, log, onAck, onOpen }: Props) {
  if (alerts.length === 0) {
    return <p className="muted">No alerts. All indicators are in the expected range.</p>;
  }
  return (
    <ul className="alerts">
      {alerts.map((a) => {
        const entry = log?.find((e) => e.id === a.id);
        const source = a.indicator;
        return (
          <li key={a.id} className={`alert alert-${a.status}${entry?.ackAt ? " alert-acked" : ""}`}>
            <div className="alert-main">
              <StatusBadge status={a.status} />
              <strong>
                {showName ? `${a.crewName}: ` : ""}
                {sourceLabel(a.indicator)}
              </strong>
              <span className="muted">{entry ? fmtTime(entry.at) : `Day ${a.day}`}</span>
            </div>
            <p>{a.reason}</p>
            <p className="muted">{deliveryText(entry, a.status, linkOn)}</p>
            <div className="alert-actions">
              {onOpen && isHealthIndicator(source) && (
                <button className="link-button" onClick={() => onOpen(source)}>
                  See what to do
                </button>
              )}
              {onAck &&
                (entry?.ackAt ? (
                  <span className="done">ACKNOWLEDGED {fmtTime(entry.ackAt)}</span>
                ) : (
                  <button className="link-button" onClick={() => onAck(a.id)}>
                    {a.indicator === "vision" ? "I'm OK, cancel alert" : "Acknowledge"}
                  </button>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
