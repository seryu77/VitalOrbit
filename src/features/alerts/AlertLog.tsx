// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { deliveryText, fmtTime } from "../../lib/log";
import type { LogEntry, Status } from "../../lib/types";
import { sourceLabel } from "./AlertList";

interface Props {
  entries: LogEntry[];
  linkOn: boolean;
  showName?: boolean;
}

const FILTERS: { id: "all" | Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "red", label: "Critical" },
  { id: "yellow", label: "Attention" },
];

/** Every alert with its time and cause, newest first. It is kept on the device. */
export function AlertLog({ entries, linkOn, showName }: Props) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const shown = entries.filter((e) => filter === "all" || e.status === filter).sort((a, b) => b.at - a.at);

  return (
    <>
      <div className="scenario-buttons" role="group" aria-label="Filter the alert log">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip${filter === f.id ? " chip-active" : ""}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="muted">No entries yet. Alerts appear here as they are raised.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                {showName && <th>Crew</th>}
                <th>Source</th>
                <th>Status</th>
                <th>Cause</th>
                <th>Delivery</th>
                <th>Acknowledged</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id}>
                  <td>{fmtTime(e.at)}</td>
                  {showName && <td>{e.crewName}</td>}
                  <td>{sourceLabel(e.indicator)}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td>{e.reason}</td>
                  <td>{deliveryText(e, e.status, linkOn)}</td>
                  <td>{e.ackAt ? fmtTime(e.ackAt) : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
