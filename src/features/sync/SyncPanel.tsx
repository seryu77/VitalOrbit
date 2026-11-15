// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { fmtTime, isQueued } from "../../lib/log";
import type { LogEntry, MissionProfile } from "../../lib/types";
import { sourceLabel } from "../alerts/AlertList";

interface Props {
  log: LogEntry[];
  linkOn: boolean;
  profile: MissionProfile;
}

/** What has been sent to Earth and what is waiting on board. Priority reports leave first. */
export function SyncPanel({ log, linkOn, profile }: Props) {
  const reports = log.filter((e) => e.status === "red").sort((a, b) => a.at - b.at);
  const waiting = reports.filter(isQueued);
  const sent = reports.filter((e) => !isQueued(e));

  return (
    <section className={`panel sync ${linkOn ? "sync-on" : "sync-off"}`} aria-labelledby="sync-title">
      <h2 id="sync-title">Link to {profile.name}</h2>
      <p role="status">
        {linkOn
          ? waiting.length > 0
            ? `Link is up (${profile.delayLabel}). Sending ${waiting.length} priority report${waiting.length === 1 ? "" : "s"}…`
            : `Link is up (${profile.delayLabel}). All reports have been received.`
          : `Link is down. ${waiting.length} priority report${waiting.length === 1 ? "" : "s"} waiting on board. The crew is following on-board guidance.`}
      </p>
      <p className="sync-counts">
        <strong>{sent.length}</strong> sent · <strong>{waiting.length}</strong> waiting
      </p>
      {reports.length > 0 && (
        <ul className="queue">
          {[...waiting, ...sent.reverse()].map((e) => (
            <li key={e.id} className={e.sentAt ? "queue-sent" : "queue-wait"}>
              <span className={e.sentAt ? "done" : "due"}>{e.sentAt ? "SENT" : "WAITING"}</span> {e.crewName}:{" "}
              {sourceLabel(e.indicator)} <span className="muted">{e.sentAt ? `at ${fmtTime(e.sentAt)}` : "queued"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
