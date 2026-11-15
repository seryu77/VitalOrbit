// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useEffect, useRef, useState } from "react";
import type { Bands } from "../../lib/types";

interface Props {
  /** Today's resting heart rate from the wearable record. */
  resting: number;
  bands: Bands;
  /** Offset from the local server's wearable stream, when it is running. */
  serverOffset: number | null;
}

const POINTS = 60;
const W = 600;
const H = 120;
const LO = 35;
const HI = 135;

/**
 * A rolling 60-second heart rate graph. The stream is simulated around today's
 * resting value unless the optional local server sends real-time offsets.
 */
export function LiveHeart({ resting, bands, serverOffset }: Props) {
  const [series, setSeries] = useState<number[]>(() => Array.from({ length: POINTS }, () => resting));
  const phase = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      phase.current += 1;
      const wave = Math.sin(phase.current / 4) * 1.8 + Math.sin(phase.current / 1.7) * 0.9;
      const noise = (Math.random() - 0.5) * 1.6;
      const next = Math.round((resting + (serverOffset ?? 0) + wave + noise) * 10) / 10;
      setSeries((s) => [...s.slice(1), next]);
    }, 1000);
    return () => clearInterval(timer);
  }, [resting, serverOffset]);

  const y = (v: number) => H - ((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * H;
  const x = (i: number) => (i / (POINTS - 1)) * W;
  const path = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const now = series[series.length - 1];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const inRange = now >= bands.green[0] && now <= bands.green[1];

  return (
    <div className="lh">
      <div className="lh-head">
        <p className="lh-now">
          <span className="lh-dot" aria-hidden="true" />
          <strong className={inRange ? "" : "lh-out"}>{Math.round(now)}</strong>
          <span className="dp-unit">bpm</span>
        </p>
        <span className="label mono">
          Last 60 s · min {Math.round(min)} · max {Math.round(max)} · resting {Math.round(resting)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="lh-svg" role="img" aria-label={`Heart rate now ${Math.round(now)} beats per minute`}>
        <rect x="0" y={y(bands.green[1])} width={W} height={y(bands.green[0]) - y(bands.green[1])} className="lh-band" />
        <line x1="0" x2={W} y1={y(resting)} y2={y(resting)} className="lh-rest" />
        <path d={path} className="lh-line" />
      </svg>
      <p className="lh-note mono">{serverOffset === null ? "Simulated wearable stream" : "Stream from the local real-time server"}</p>
    </div>
  );
}
