// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import type { KeyboardEvent } from "react";
import { StatusIcon } from "../../components/StatusIcon";
import { REGIONS } from "../../data/rules/indicators";
import { STATUS_LABEL } from "../../lib/engine";
import type { Region, Status } from "../../lib/types";

interface Props {
  statusByRegion: Record<Region, Status>;
  selected: Region | null;
  onSelect: (region: Region) => void;
}

/**
 * An abstract, neutral human figure (DESIGN.md section 4). Each region takes the color of its
 * most serious indicator. "Whole body" (radiation) is drawn as an orbit around the figure.
 */
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
    <div className={`bodymap${selected ? " bodymap-has-selection" : ""}`}>
      <svg viewBox="0 0 240 410" role="group" aria-label="Body map. Select a region to see its indicators.">
        <defs>
          <radialGradient id="bm-halo" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#4c8dff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#4c8dff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="200" rx="118" ry="200" fill="url(#bm-halo)" aria-hidden="true" />

        {/* Whole body: radiation. An orbit behind the figure, so the figure keeps its own clicks. */}
        <g {...part("body")}>
          <ellipse className="orbit-hit" cx="120" cy="214" rx="112" ry="38" transform="rotate(-14 120 214)" />
          <ellipse className="orbit-ring" cx="120" cy="214" rx="112" ry="38" transform="rotate(-14 120 214)" />
          <circle className="orbit-sat" cx="226" cy="188" r="5" />
        </g>

        {/* Bones and muscles: arms and legs. */}
        <g {...part("limbs")}>
          <path d="M70 108Q56 110 54 126L42 226Q41 238 51 239Q60 240 62 228L72 150Z" />
          <path d="M170 108Q184 110 186 126L198 226Q199 238 189 239Q180 240 178 228L168 150Z" />
          <path d="M84 236 80 380Q80 394 92 394Q103 394 104 380L117 244Z" />
          <path d="M156 236 160 380Q160 394 148 394Q137 394 136 380L123 244Z" />
        </g>

        {/* Torso, with the neck. */}
        <path
          {...part("torso")}
          className={`${part("torso").className} region-shell`}
          d="M110 86H130V98Q146 99 158 102Q172 106 171 122L163 210Q159 238 120 240Q81 238 77 210L69 122Q68 106 82 102Q94 99 110 98Z"
        />

        {/* Lungs. */}
        <g {...part("lungs")}>
          <path d="M104 118Q89 117 87 134L85 170Q87 182 100 177L111 170V125Q111 118 104 118Z" />
          <path d="M136 118Q151 117 153 134L155 170Q153 182 140 177L129 170V125Q129 118 136 118Z" />
        </g>

        {/* Heart. Drawn on the crew member's left side, over the lung. */}
        <path
          {...part("heart")}
          d="M127 144C124 137 113 138 113 146C113 153 121 157 127 163C133 157 141 153 141 146C141 138 130 137 127 144Z"
        />

        {/* Head. */}
        <circle cx="120" cy="56" r="30" {...part("head")} />
      </svg>

      <ul className="bodymap-legend">
        {REGIONS.map((r) => (
          <li key={r.id}>
            <button
              className={`legend-item legend-${statusByRegion[r.id]}${selected === r.id ? " legend-selected" : ""}`}
              onClick={() => onSelect(r.id)}
              aria-pressed={selected === r.id}
            >
              <StatusIcon status={statusByRegion[r.id]} size={16} />
              <span>{r.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
