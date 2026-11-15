// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import {
  CartesianGrid,
  Line,
  LineChart,
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
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Line chart of one indicator across mission days, with status ranges as background bands. */
export function TrendChart({ def, member, bands }: Props) {
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

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <ReferenceArea y1={lo} y2={hi} fill="#D64045" fillOpacity={0.14} />
          <ReferenceArea {...band(bands.yellow)} fill="#E0A100" fillOpacity={0.22} />
          <ReferenceArea {...band(bands.green)} fill="#2E9E5B" fillOpacity={0.3} />
          <CartesianGrid stroke="#27304A" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" stroke="#A9B3C7" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis
            domain={[lo, hi]}
            stroke="#A9B3C7"
            tick={{ fontSize: 12 }}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(def.decimals > 1 ? 1 : def.decimals)}
          />
          <Tooltip
            contentStyle={{ background: "#151B2E", border: "1px solid #27304A", borderRadius: 8 }}
            labelStyle={{ color: "#A9B3C7" }}
            itemStyle={{ color: "#F2F5FA" }}
            labelFormatter={(day) => `Mission day ${day}`}
            formatter={(v: number) => [`${v.toFixed(def.decimals)} ${def.unit}`, def.label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#F2F5FA"
            strokeWidth={2}
            dot={{ r: 2, fill: "#F2F5FA" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-legend">
        <span className="dot dot-green" aria-hidden="true" /> Normal range
        <span className="dot dot-yellow" aria-hidden="true" /> Attention
        <span className="dot dot-red" aria-hidden="true" /> Critical
      </p>
    </div>
  );
}
