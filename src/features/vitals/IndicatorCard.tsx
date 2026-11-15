// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { Sparkline } from "../../components/Sparkline";
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
  /** Recent values, oldest first. Drawn as a small trend line when given. */
  history?: number[];
}

/** One instrument row: name and source, recent trend, value, status. */
export function IndicatorCard({ assessment, displayValue, live, selected, dimmed, onSelect, history }: Props) {
  const def = INDICATOR_BY_ID[assessment.indicator];
  return (
    <button
      className={`row row-${assessment.status}${selected ? " is-on" : ""}${dimmed ? " is-dim" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="row-name">
        <span className="row-label">{def.label}</span>
        <span className="row-source mono">
          {live && <span className="live">Live</span>}
          {def.source}
        </span>
      </span>
      <span className="row-spark">
        {history && <Sparkline values={history} bands={assessment.bands} status={assessment.status} />}
      </span>
      <span className="row-value">
        {formatValue(def, displayValue ?? assessment.value)}
        <span className="row-unit">{def.unit}</span>
      </span>
      <span className="row-status">
        <StatusBadge status={assessment.status} />
      </span>
    </button>
  );
}
