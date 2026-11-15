// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bands, CrewMember, IndicatorDef } from "../../lib/types";

interface Props {
  def: IndicatorDef;
  member: CrewMember;
  bands: Bands;
  /** Chart height in px. */
  height?: number;
}

// SVG attributes cannot read CSS variables, so the DESIGN.md palette is repeated here.
const C = {
  green: "#2E9E5B",
  yellow: "#E0A100",
  red: "#D64045",
  grid: "#27304A",
  axis: "#A9B3C7",
  line: "#F2F5FA",
  surface: "#151B2E",
  accent: "#4C8DFF",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Line chart of one indicator across mission days, with status ranges as background bands. */
export function TrendChart({ def, member, bands, height = 240 }: Props) {
  const data = member.history.map((d) => ({ day: d.day, value: d.values[def.id] }));
  const values = data.map((d) => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  // Show the data plus the nearby edges of the green range, with some padding.
  let lo = Math.min(dataMin, bands.green[0]);
  let hi = Math.max(dataMax, Math.min(bands.green[1], dataMax + (dataMax - lo) * 0.3));
  const pad = (hi - lo) * 0.15 || 1;
  lo = lo - pad;
  hi = hi + pad;
  if (bands.green[0] === 0 && lo < 0) lo = 0;

  const band = (range: [number, number]) => ({ y1: clamp(range[0], lo, hi), y2: clamp(range[1], lo, hi) });
  const fmt = (v: number) => `${v.toFixed(def.decimals)} ${def.unit}`;
  const gradId = `trend-fill-${def.id}`;

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.line} stopOpacity={0.22} />
              <stop offset="1" stopColor={C.line} stopOpacity={0} />
            </linearGradient>
          </defs>
          <ReferenceArea y1={lo} y2={hi} fill={C.red} fillOpacity={0.1} ifOverflow="hidden" />
          <ReferenceArea {...band(bands.yellow)} fill={C.yellow} fillOpacity={0.14} ifOverflow="hidden" />
          <ReferenceArea {...band(bands.green)} fill={C.green} fillOpacity={0.2} ifOverflow="hidden" />
          <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            stroke={C.axis}
            tick={{ fontSize: 12, fill: C.axis }}
            tickLine={false}
            axisLine={{ stroke: C.grid }}
            minTickGap={24}
          />
          <YAxis
            domain={[lo, hi]}
            stroke={C.axis}
            tick={{ fontSize: 12, fill: C.axis }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => v.toFixed(def.decimals > 1 ? 1 : def.decimals)}
          />
          <Tooltip
            cursor={{ stroke: C.accent, strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              background: C.surface,
              border: `1px solid ${C.grid}`,
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
              padding: "8px 12px",
            }}
            labelStyle={{ color: C.axis, fontSize: 12, marginBottom: 2 }}
            itemStyle={{ color: C.line, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
            labelFormatter={(day) => `Mission day ${day}`}
            formatter={(v: number) => [fmt(v), def.label]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={C.line}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2, fill: C.line }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="chart-legend">
        <span className="legend-swatch swatch-green" aria-hidden="true" /> Normal range
        <span className="legend-swatch swatch-yellow" aria-hidden="true" /> Attention
        <span className="legend-swatch swatch-red" aria-hidden="true" /> Critical
      </p>
    </div>
  );
}
