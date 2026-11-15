// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import type { Bands, Status } from "../lib/types";

interface Props {
  values: number[];
  bands: Bands;
  status: Status;
  width?: number;
  height?: number;
}

/**
 * The "small trend line" of an indicator card (DESIGN.md section 7).
 * The green range is drawn as a faint band, so the line reads as "inside" or "outside" at a glance.
 * Decorative: the exact values are in the detail panel and its chart.
 */
export function Sparkline({ values, bands, status, width = 120, height = 32 }: Props) {
  if (values.length < 2) return null;

  const lo0 = Math.min(...values);
  const hi0 = Math.max(...values);
  // Include the nearest edge of the green range when it is close, so the band is visible.
  const span = hi0 - lo0 || 1;
  const lo = Math.max(Math.min(lo0, bands.green[0]), lo0 - span * 1.5) - span * 0.15;
  const hi = Math.min(Math.max(hi0, bands.green[1]), hi0 + span * 1.5) + span * 0.15;

  const x = (i: number) => (i / (values.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 2 - ((v - lo) / (hi - lo)) * (height - 4);
  const clampY = (v: number) => Math.min(height, Math.max(0, y(v)));

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  const bandTop = clampY(bands.green[1]);
  const bandBottom = clampY(bands.green[0]);
  const gradId = `spark-${status}`;

  return (
    <svg className={`spark spark-${status}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect className="spark-band" x="0" y={bandTop} width={width} height={Math.max(0, bandBottom - bandTop)} rx="2" />
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} className="spark-line" />
    </svg>
  );
}
