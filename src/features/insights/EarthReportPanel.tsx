// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useState } from "react";
import { downloadText, type EarthReport } from "../../lib/insights";
import type { MissionProfile } from "../../lib/types";

interface Props {
  report: EarthReport;
  linkOn: boolean;
  profile: MissionProfile;
}

/**
 * The report for the flight surgeon. It is built automatically on board. A priority
 * report goes out first when the link to Earth is up. It can always be saved as a file.
 */
export function EarthReportPanel({ report, linkOn, profile }: Props) {
  const [show, setShow] = useState(false);
  const priority = report.priority === "priority";
  const state = priority
    ? linkOn
      ? `Sent to the flight surgeon automatically (link to Earth: ${profile.delayLabel}).`
      : "Built automatically and waiting on board. It goes out first when the link is up."
    : "No critical finding. A routine report is ready to send with the next scheduled sync.";

  return (
    <div className={`er${priority ? " er-priority" : ""}`}>
      <p className="er-title">
        <span className={`er-tag mono${priority ? " er-tag-red" : ""}`}>{priority ? "Priority" : "Routine"}</span>
        {report.title}
      </p>
      <p className="er-state">{state}</p>
      <div className="er-actions">
        <button className="btn btn-line btn-sm" onClick={() => setShow((s) => !s)} aria-expanded={show}>
          {show ? "Hide report" : "Preview report"}
        </button>
        <button
          className="btn btn-line btn-sm"
          onClick={() => downloadText(`vitalorbit-report-day-${report.title.split("day ").pop()}.txt`, report.text)}
        >
          Download as file
        </button>
      </div>
      {show && <pre className="er-text">{report.text}</pre>}
    </div>
  );
}
