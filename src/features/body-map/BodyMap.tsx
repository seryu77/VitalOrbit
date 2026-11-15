// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import type { KeyboardEvent } from "react";
import { REGIONS } from "../../data/rules/indicators";
import { STATUS_LABEL } from "../../lib/engine";
import type { Region, Status } from "../../lib/types";

interface Props {
  statusByRegion: Record<Region, Status>;
  selected: Region | null;
  onSelect: (region: Region) => void;
}

/** An abstract human figure. Each region takes the color of its most serious indicator. */
export function BodyMap({ statusByRegion, selected, onSelect }: Props) {
  const part = (region: Region) => {
    const label = REGIONS.find((r) => r.id === region)!.label;
    return {
      className: `region region-${statusByRegion[region]}${selected === region ? " region-selected" : ""}`,
      role: "button",
      tabIndex: 0,
      "aria-label": `${label}: ${STATUS_LABEL[statusByRegion[region]]}`,
      "aria-pressed": selected === region,
      onClick: () => onSelect(region),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(region);
        }
      },
    };
  };

  return (
    <div className="bodymap">
      <svg viewBox="0 0 220 400" role="group" aria-label="Body map. Select a region to see its indicators.">
        {/* Whole body: radiation. Drawn as a ring around the figure. */}
        <ellipse cx="110" cy="200" rx="100" ry="190" {...part("body")} fillOpacity="0.08" strokeDasharray="6 6" />

        {/* Bones and muscles: arms and legs. */}
        <g {...part("limbs")}>
          <rect x="38" y="98" width="22" height="120" rx="11" />
          <rect x="160" y="98" width="22" height="120" rx="11" />
          <rect x="74" y="226" width="30" height="150" rx="14" />
          <rect x="116" y="226" width="30" height="150" rx="14" />
        </g>

        {/* Torso. */}
        <rect x="66" y="92" width="88" height="140" rx="22" {...part("torso")} />

        {/* Lungs. */}
        <g {...part("lungs")}>
          <ellipse cx="90" cy="134" rx="15" ry="26" />
          <ellipse cx="130" cy="134" rx="15" ry="26" />
        </g>

        {/* Heart. */}
        <circle cx="116" cy="140" r="12" {...part("heart")} />

        {/* Head. */}
        <circle cx="110" cy="50" r="32" {...part("head")} />
      </svg>

      <ul className="bodymap-legend">
        {REGIONS.map((r) => (
          <li key={r.id}>
            <button
              className={`legend-item${selected === r.id ? " legend-selected" : ""}`}
              onClick={() => onSelect(r.id)}
            >
              <span className={`dot dot-${statusByRegion[r.id]}`} aria-hidden="true" />
              {r.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
