// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import { formatValue } from "../../lib/engine";
import type { Assessment } from "../../lib/types";

interface Props {
  assessment: Assessment;
  displayValue?: number;
  live?: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}

export function IndicatorCard({ assessment, displayValue, live, selected, dimmed, onSelect }: Props) {
  const def = INDICATOR_BY_ID[assessment.indicator];
  return (
    <button
      className={`card card-${assessment.status}${selected ? " card-selected" : ""}${dimmed ? " card-dimmed" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="card-top">
        <span className="card-label">{def.label}</span>
        {live && <span className="live">LIVE</span>}
      </span>
      <span className="card-value">
        {formatValue(def, displayValue ?? assessment.value)} <span className="card-unit">{def.unit}</span>
      </span>
      <StatusBadge status={assessment.status} />
      <span className="card-source">{def.source}</span>
    </button>
  );
}
