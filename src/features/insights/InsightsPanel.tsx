// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { StatusIcon } from "../../components/StatusIcon";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import type { Forecast, PossibleCause } from "../../lib/insights";
import type { IndicatorId } from "../../lib/types";

interface Props {
  summary: string;
  forecasts: Forecast[];
  causes: PossibleCause[];
  onOpen: (id: IndicatorId) => void;
}

/** Plain-language summary, early warnings from trends, and possible causes with on-board resources. */
export function InsightsPanel({ summary, forecasts, causes, onOpen }: Props) {
  return (
    <div className="ins">
      <div className="ins-summary">
        <h3 className="mono">Summary</h3>
        <p>{summary}</p>
        <p className="ins-note">Written on board by rules from your readings. An on-board language model is planned.</p>
      </div>

      <div className="ins-col">
        <h3 className="mono">Early warning</h3>
        {forecasts.length === 0 ? (
          <p className="muted">No indicator is trending out of its normal range in the next 7 days.</p>
        ) : (
          <ul className="ins-list">
            {forecasts.map((f) => (
              <li key={f.indicator}>
                <button className="ins-fc" onClick={() => onOpen(f.indicator)}>
                  <StatusIcon status="yellow" size={12} />
                  <span>
                    <strong>{INDICATOR_BY_ID[f.indicator].label}</strong> is {f.direction} and may leave its normal range in about{" "}
                    {f.days} day{f.days === 1 ? "" : "s"}.
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ins-col ins-causes">
        <h3 className="mono">Possible causes</h3>
        {causes.length === 0 ? (
          <p className="muted">Nothing to look into. All readings match a normal day.</p>
        ) : (
          causes.map((c) => (
            <details key={c.title} className={`cause cause-${c.severity}`} open={c.severity === "red"}>
              <summary>
                <StatusIcon status={c.severity} size={12} />
                <strong>{c.title}</strong>
              </summary>
              <p className="cause-because">{c.because}</p>
              <ol className="cause-steps">
                {c.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="cause-kit">
                <span className="mono">From the med kit</span> {c.kit.map((k) => k.name).join(" · ")}
              </p>
              <p className="cause-esc">
                <span className="mono">Escalate</span> {c.escalate}
              </p>
            </details>
          ))
        )}
        <p className="ins-note">Decision support, not a diagnosis. The crew and flight surgeons make medical decisions.</p>
      </div>
    </div>
  );
}
