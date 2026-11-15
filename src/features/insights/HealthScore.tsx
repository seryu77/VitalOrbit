// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useState } from "react";
import type { HealthScore as Score } from "../../lib/insights";

/** The 0 to 100 score as a ring, with the list of what lowered it. */
export function HealthScore({ score }: { score: Score }) {
  const [open, setOpen] = useState(false);
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (score.score / 100) * c;

  return (
    <div className={`hs hs-${score.band}`}>
      <div className="hs-top">
        <svg className="hs-ring" viewBox="0 0 80 80" width="80" height="80" role="img" aria-label={`Health score ${score.score} out of 100`}>
          <circle cx="40" cy="40" r={r} className="hs-track" />
          <circle
            cx="40"
            cy="40"
            r={r}
            className="hs-value"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 40 40)"
          />
          <text x="40" y="44" textAnchor="middle" className="hs-num">
            {score.score}
          </text>
        </svg>
        <div>
          <p className="label mono">Health score</p>
          <p className="hs-caption">
            {score.parts.length === 0 ? "Nothing is lowering your score." : `${score.parts.length} thing${score.parts.length === 1 ? "" : "s"} lowering it.`}
          </p>
          {score.parts.length > 0 && (
            <button className="btn btn-line btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? "Hide why" : "Why this score?"}
            </button>
          )}
        </div>
      </div>
      {open && (
        <ul className="hs-parts">
          {score.parts.map((p) => (
            <li key={p.label}>
              <span className="hs-minus mono">-{p.points}</span>
              <span>
                <strong>{p.label}.</strong> {p.reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
