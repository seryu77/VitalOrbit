// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import { formatValue } from "../../lib/engine";
import type { Assessment, CrewMember } from "../../lib/types";
import { TrendChart } from "../vitals/TrendChart";

interface Props {
  member: CrewMember;
  assessment: Assessment;
  /** The flight surgeon view shows the data without the self-care guidance. */
  showGuidance?: boolean;
}

/** Everything about one indicator: value, trend, plain explanation, and what to do. */
export function DetailPanel({ member, assessment, showGuidance = true }: Props) {
  const def = INDICATOR_BY_ID[assessment.indicator];
  const g = def.guidance;
  const steps = assessment.status === "red" ? g.red : assessment.status === "yellow" ? g.yellow : [];

  return (
    <section className="panel detail" aria-live="polite">
      <header className="detail-head">
        <div>
          <h2>{def.label}</h2>
          <p className="muted">
            {def.source} · Hazard: {def.hazard}
          </p>
        </div>
        <div className="detail-value">
          <span className="card-value">
            {formatValue(def, assessment.value)} <span className="card-unit">{def.unit}</span>
          </span>
          <StatusBadge status={assessment.status} />
        </div>
      </header>

      <p className={`reason reason-${assessment.status}`}>{assessment.reason}</p>

      <h3>Last 30 mission days</h3>
      <TrendChart def={def} member={member} bands={assessment.bands} />

      {showGuidance && (
        <div className="guide-grid">
          <div>
            {steps.length > 0 ? (
              <>
                <h3>What to do now</h3>
                <ol className="steps">
                  {steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <h3>What to do now</h3>
                <p>Nothing. Keep your normal routine.</p>
              </>
            )}
            <h3>When to escalate</h3>
            <p>{g.escalate}</p>
          </div>
          <div>
            <h3>What it is</h3>
            <p>{g.what}</p>
            <h3>Why it matters in space</h3>
            <p>{g.why}</p>
            <h3>How to measure it</h3>
            <p>{g.how}</p>
          </div>
        </div>
      )}
    </section>
  );
}
