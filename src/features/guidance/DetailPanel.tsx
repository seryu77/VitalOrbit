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

/**
 * One indicator at a glance: the value and why it has this status, what to do now,
 * and the recent trend. The background explanation is folded away under "About".
 */
export function DetailPanel({ member, assessment, showGuidance = true }: Props) {
  const def = INDICATOR_BY_ID[assessment.indicator];
  const g = def.guidance;
  const steps = assessment.status === "red" ? g.red : assessment.status === "yellow" ? g.yellow : [];
  const lastDay = member.history[member.history.length - 1].day;

  return (
    <section className={`block detail detail-${assessment.status}`} aria-live="polite">
      <header className="block-head">
        <h2>
          {showGuidance && <span className="idx mono">04</span>} {def.label}
        </h2>
        <span className="label mono">
          {def.source} · {def.hazard} · Day {lastDay}
        </span>
      </header>

      <div className={`dp${showGuidance ? "" : " dp-data"}`}>
        <div className="dp-now">
          <p className="dp-number">
            {formatValue(def, assessment.value)}
            <span className="dp-unit">{def.unit}</span>
          </p>
          <StatusBadge status={assessment.status} />
          <p className="dp-reason">{assessment.reason}</p>
        </div>

        {showGuidance && (
          <div className={`dp-do do-${assessment.status}`}>
            <h3 className="mono">Do now</h3>
            {steps.length > 0 ? (
              <ol className="dp-steps">
                {steps.map((s, i) => (
                  <li key={s}>
                    <span className="step-n mono">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="dp-calm">Nothing. Keep your normal routine.</p>
            )}
            <p className="dp-escalate">
              <span className="mono">Escalate</span> {g.escalate}
            </p>
          </div>
        )}

        <div className="dp-trend">
          <h3 className="mono">Last 30 days</h3>
          <TrendChart def={def} member={member} bands={assessment.bands} height={150} />
        </div>
      </div>

      {showGuidance && (
        <details className="dp-about">
          <summary>
            <span className="mono">About {def.label.toLowerCase()}</span>
            <span className="dp-about-hint">What it is, why it matters in space, how to measure it</span>
          </summary>
          <dl>
            <div>
              <dt className="mono">What it is</dt>
              <dd>{g.what}</dd>
            </div>
            <div>
              <dt className="mono">Why it matters in space</dt>
              <dd>{g.why}</dd>
            </div>
            <div>
              <dt className="mono">How to measure it</dt>
              <dd>{g.how}</dd>
            </div>
          </dl>
        </details>
      )}
    </section>
  );
}
