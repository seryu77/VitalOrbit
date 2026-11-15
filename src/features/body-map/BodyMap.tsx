// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { INDICATOR_BY_ID, REGIONS } from "../../data/rules/indicators";
import { formatValue, STATUS_ICON, STATUS_LABEL } from "../../lib/engine";
import type { Assessment, IndicatorId, Region, Status } from "../../lib/types";

interface Props {
  statusByRegion: Record<Region, Status>;
  assessments: Assessment[];
  selected: Region | null;
  onSelect: (region: Region) => void;
  onOpenIndicator: (id: IndicatorId) => void;
}

interface VB {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The figure is drawn centered on x = 200. It is shifted right by OFFSET so there is room
// for the labels on both sides when the whole figure is in view.
const BASE: VB = { x: 0, y: 0, w: 460, h: 470 };
const OFFSET = 30;
const ASPECT = BASE.w / BASE.h;

const focus = (cx: number, cy: number, h: number): VB => ({ x: cx + OFFSET - (h * ASPECT) / 2, y: cy - h / 2, w: h * ASPECT, h });

/** Where the camera goes when a region is selected. */
const ZOOM: Record<Region, VB> = {
  head: focus(200, 64, 112),
  heart: focus(208, 168, 96),
  lungs: focus(200, 166, 132),
  torso: focus(200, 192, 182),
  limbs: focus(200, 236, 424),
  body: BASE,
};

const INFO: Record<Region, string> = {
  head: "Brain, skull, and jaw. Mood, stress, and sleep show here, because isolation and distance from Earth affect them.",
  heart: "Heart and the large vessels. Weightlessness changes how blood is pumped, so heart rate and pressure are watched.",
  lungs: "Both lungs and the airway. Blood oxygen shows how well the air on board is doing its job.",
  torso: "Liver, stomach, intestines, and diaphragm. Temperature and blood glucose reflect the whole trunk.",
  limbs: "Skeleton and muscles. Bones lose density and muscles lose mass in microgravity, so body mass and exercise matter.",
  body: "The whole body. Space radiation passes through everything, so one dose reading covers it all.",
};

/** Names drawn next to the parts when a region is zoomed in. Positions are in figure coordinates. */
interface Part {
  t: string;
  ax: number;
  ay: number;
  side: 1 | -1;
  dy?: number;
}
const PARTS: Record<Region, Part[]> = {
  head: [
    { t: "Brain", ax: 206, ay: 46, side: 1, dy: -14 },
    { t: "Skull", ax: 174, ay: 62, side: -1, dy: -6 },
    { t: "Jaw", ax: 184, ay: 88, side: -1, dy: 14 },
    { t: "Neck", ax: 200, ay: 104, side: 1, dy: 10 },
  ],
  heart: [
    { t: "Heart", ax: 218, ay: 170, side: 1, dy: 4 },
    { t: "Aorta", ax: 194, ay: 150, side: -1, dy: -14 },
    { t: "Ventricles", ax: 218, ay: 178, side: 1, dy: 30 },
  ],
  lungs: [
    { t: "Right lung", ax: 180, ay: 162, side: -1 },
    { t: "Left lung", ax: 224, ay: 150, side: 1, dy: -14 },
    { t: "Trachea", ax: 200, ay: 122, side: 1, dy: -14 },
    { t: "Bronchi", ax: 190, ay: 148, side: -1, dy: -26 },
  ],
  torso: [
    { t: "Liver", ax: 186, ay: 214, side: -1 },
    { t: "Stomach", ax: 226, ay: 212, side: 1, dy: -8 },
    { t: "Intestines", ax: 200, ay: 246, side: 1, dy: 16 },
    { t: "Diaphragm", ax: 168, ay: 192, side: -1, dy: -20 },
  ],
  limbs: [
    { t: "Humerus", ax: 140, ay: 160, side: -1 },
    { t: "Ribcage", ax: 232, ay: 140, side: 1, dy: -14 },
    { t: "Spine", ax: 200, ay: 214, side: 1, dy: 18 },
    { t: "Pelvis", ax: 226, ay: 290, side: 1 },
    { t: "Femur", ax: 222, ay: 336, side: 1, dy: 10 },
    { t: "Thigh muscle", ax: 168, ay: 332, side: -1 },
    { t: "Tibia", ax: 175, ay: 400, side: -1 },
  ],
  body: [
    { t: "Radiation exposure", ax: 50, ay: 236, side: -1 },
    { t: "Whole-body dose", ax: 350, ay: 236, side: 1 },
  ],
};

/** Labels shown next to the figure when nothing is selected, so the state reads from a distance. */
const FAR: { region: Region; bx: number; by: number; ax: number; ay: number }[] = [
  { region: "head", bx: 352, by: 24, ax: 264, ay: 56 },
  { region: "lungs", bx: 8, by: 118, ax: 214, ay: 160 },
  { region: "heart", bx: 352, by: 130, ax: 256, ay: 172 },
  { region: "torso", bx: 8, by: 206, ax: 206, ay: 224 },
  { region: "limbs", bx: 352, by: 270, ax: 252, ay: 330 },
  { region: "body", bx: 8, by: 380, ax: 118, ay: 380 },
];
const FAR_W = 100;
const FAR_H = 38;

const label = (r: Region) => REGIONS.find((x) => x.id === r)!.label;
/** Short names for the distance labels, so they fit in the box. */
const FAR_NAME: Record<Region, string> = {
  head: "Head",
  heart: "Heart",
  lungs: "Lungs",
  torso: "Torso",
  limbs: "Skeleton",
  body: "Whole body",
};

/** Smoothly moves the view box toward its target. It jumps when the user prefers reduced motion. */
function useViewBox(target: VB): VB {
  const [vb, setVb] = useState<VB>(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setVb(target);
      return;
    }
    const start = performance.now();
    const DURATION = 420;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const next = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      };
      current.current = next;
      setVb(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return vb;
}

/** Draws its children twice: once as given, once mirrored across the body's center line. */
function Pair({ children }: { children: ReactNode }) {
  return (
    <>
      <g>{children}</g>
      <g transform="translate(400 0) scale(-1 1)">{children}</g>
    </>
  );
}

const VERTEBRAE = Array.from({ length: 16 }, (_, i) => 110 + i * 10);
const RIBS = Array.from({ length: 6 }, (_, i) => 132 + i * 11);

/**
 * A human figure with the skeleton, muscles, organs, and brain. Each region takes the color of its
 * most serious indicator. From a distance the figure carries a status label for every region.
 * Selecting a region zooms in, shows finer detail, and names the parts.
 */
export function BodyMap({ statusByRegion, assessments, selected, onSelect, onOpenIndicator }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(420);
  const vb = useViewBox(selected ? ZOOM[selected] : BASE);
  const zoomed = selected !== null;

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 420));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Convert on-screen pixels to drawing units, so text keeps the same size at every zoom. */
  const u = (px: number) => (px * vb.w) / width;

  const part = (region: Region) => ({
    className: `bm-region region-${statusByRegion[region]}${selected === region ? " bm-selected" : ""}${
      zoomed && selected !== region ? " bm-dim" : ""
    }`,
    role: "button",
    tabIndex: 0,
    "aria-label": `${label(region)}: ${STATUS_LABEL[statusByRegion[region]]}`,
    "aria-pressed": selected === region,
    onClick: () => onSelect(region),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(region);
      }
    },
  });

  const inRegion = selected ? assessments.filter((a) => INDICATOR_BY_ID[a.indicator].region === selected) : [];

  return (
    <div
      className={`bodymap${zoomed ? " bodymap-zoomed" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && selected) onSelect(selected);
      }}
    >
      <div className="bm-stage">
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          role="group"
          aria-label="Body map. Select a region to zoom in and see its indicators."
        >
          <g transform={`translate(${OFFSET} 0)`}>
            {/* Whole body: radiation. A ring around the figure. */}
            <ellipse cx="200" cy="236" rx="150" ry="220" {...part("body")} className={`${part("body").className} bm-ring`} />

            {/* Bones and muscles. */}
            <g {...part("limbs")}>
              <Pair>
                {/* Muscle: shoulder, upper arm, forearm, hand, thigh, calf, foot. */}
                <circle className="bm-muscle-fill" cx="152" cy="124" r="14" />
                <line className="bm-muscle" x1="150" y1="126" x2="130" y2="200" strokeWidth="24" />
                <line className="bm-muscle" x1="130" y1="204" x2="118" y2="266" strokeWidth="18" />
                <ellipse className="bm-muscle-fill" cx="114" cy="278" rx="8" ry="12" />
                <line className="bm-muscle" x1="180" y1="286" x2="177" y2="362" strokeWidth="36" />
                <line className="bm-muscle" x1="176" y1="368" x2="175" y2="428" strokeWidth="26" />
                <ellipse className="bm-muscle-fill" cx="172" cy="440" rx="16" ry="6" />

                {/* Muscle fibers, visible up close. */}
                <path className="bm-fine" d="M146 140 L132 192 M154 138 L138 190 M140 142 L126 194" />
                <path className="bm-fine" d="M170 296 L168 356 M180 296 L178 358 M190 296 L188 356" />
                <path className="bm-fine" d="M170 378 L169 424 M178 378 L178 424" />

                {/* Bones. */}
                <path className="bm-bone" d="M198 122 Q174 112 154 122" />
                <line className="bm-bone" x1="150" y1="126" x2="131" y2="198" />
                <circle className="bm-joint" cx="150" cy="126" r="4.5" />
                <circle className="bm-joint" cx="131" cy="201" r="4" />
                <line className="bm-bone" x1="130" y1="205" x2="120" y2="262" />
                <line className="bm-bone" x1="134" y1="204" x2="127" y2="262" />
                <circle className="bm-joint" cx="123" cy="266" r="3.2" />
                <path className="bm-bone-thin" d="M122 268 L116 284 M124 268 L121 287 M126 267 L127 285" />
                <path className="bm-bone" d="M200 270 Q170 262 164 286 Q166 302 184 299 Q196 296 200 288" />
                <circle className="bm-joint" cx="184" cy="292" r="6" />
                <line className="bm-bone" x1="182" y1="298" x2="178" y2="360" />
                <circle className="bm-joint" cx="177" cy="364" r="6" />
                <circle className="bm-fine bm-fine-fill" cx="179" cy="362" r="4.5" />
                <line className="bm-bone" x1="177" y1="371" x2="175" y2="432" />
                <line className="bm-bone-thin" x1="182" y1="371" x2="182" y2="430" />
                <circle className="bm-joint" cx="176" cy="435" r="3.5" />
                <path className="bm-bone" d="M166 440 L190 440" />
              </Pair>
              {/* Spine. */}
              {VERTEBRAE.map((y) => (
                <rect key={y} className="bm-vertebra" x="195" y={y} width="10" height="7" rx="2.5" />
              ))}
            </g>

            {/* Torso: outline, diaphragm, and organs. */}
            <g {...part("torso")}>
              <path
                className="bm-tint"
                d="M152 118 Q200 108 248 118 L252 220 Q250 262 238 270 L162 270 Q150 262 148 220 Z"
              />
              <path className="bm-line" d="M156 196 Q200 184 244 196" />
              <path className="bm-organ" d="M166 206 Q190 194 214 204 Q208 228 184 232 Q164 230 166 206 Z" />
              <ellipse className="bm-organ" cx="228" cy="214" rx="15" ry="11" transform="rotate(-18 228 214)" />
              <path className="bm-line bm-gut" d="M174 242 Q188 232 200 244 T226 244 M174 255 Q188 246 200 258 T226 258" />
              <path className="bm-fine" d="M186 200 Q188 216 196 228 M200 198 Q200 214 206 222" />
              <path className="bm-fine" d="M178 249 Q190 266 204 250 T230 250" />
            </g>

            {/* Lungs, with the airway. */}
            <g {...part("lungs")}>
              <path className="bm-tint" d="M196 140 Q176 130 168 150 Q160 178 170 196 Q186 198 196 190 Z" />
              <path className="bm-tint" d="M204 140 Q224 130 232 150 Q240 178 230 196 Q220 198 214 190 Q222 172 206 160 Z" />
              <path className="bm-line" d="M200 108 L200 140 M200 140 L186 156 M200 140 L214 154" />
              <path className="bm-fine" d="M186 156 L178 170 M186 156 L184 178 M180 170 L172 176 M214 154 L224 168 M214 154 L228 176" />
              <g className="bm-fine bm-fine-fill">
                <circle cx="176" cy="178" r="2" />
                <circle cx="171" cy="176" r="1.8" />
                <circle cx="184" cy="184" r="2" />
                <circle cx="178" cy="186" r="1.8" />
                <circle cx="226" cy="178" r="2" />
                <circle cx="231" cy="174" r="1.8" />
                <circle cx="222" cy="186" r="2" />
              </g>
            </g>

            {/* Ribcage over the lungs. It belongs to the skeleton, so it is not clickable on its own. */}
            <g className={`bm-ribs region-${statusByRegion.limbs}${zoomed && selected !== "limbs" ? " bm-dim" : ""}`} pointerEvents="none">
              <Pair>
                {RIBS.map((y, i) => (
                  <path key={y} className="bm-bone-thin" d={`M198 ${y} Q172 ${y - 8} ${166 + i} ${y + 18}`} />
                ))}
              </Pair>
              <rect className="bm-bone-thin" x="198" y="126" width="4" height="44" rx="2" />
            </g>

            {/* Heart and the large vessels. */}
            <g {...part("heart")}>
              <path
                className="bm-solid"
                d="M212 190 C194 176 196 156 210 158 C214 158 216 161 217 164 C219 158 227 156 232 161 C239 170 229 182 212 190 Z"
              />
              <path className="bm-line" d="M215 158 Q215 144 202 144 Q190 146 190 156" />
              <path className="bm-fine" d="M213 164 L212 184 M200 172 Q213 177 228 170 M206 160 Q210 168 208 176" />
            </g>

            {/* Head. */}
            <g {...part("head")}>
              <rect className="bm-tint" x="190" y="96" width="20" height="16" rx="5" />
              <ellipse className="bm-tint" cx="200" cy="62" rx="30" ry="35" />
              <path className="bm-line" d="M178 84 Q200 106 222 84" />
              <path className="bm-organ" d="M178 50 Q178 32 200 32 Q222 32 222 50 Q222 66 200 68 Q178 66 178 50 Z" />
              <path className="bm-line" d="M186 52 Q192 44 200 52 T214 52 M190 62 Q198 56 206 62 T216 60" />
              <path className="bm-fine" d="M200 34 L200 66 M184 40 Q192 46 190 56 M216 40 Q208 46 210 56 M178 50 Q200 56 222 50" />
              <path className="bm-fine" d="M176 44 Q200 20 224 44" />
              <circle className="bm-eye" cx="190" cy="76" r="3" />
              <circle className="bm-eye" cx="210" cy="76" r="3" />
            </g>

            {/* Part names, shown when a region is zoomed in. */}
            {selected &&
              PARTS[selected].map((p) => {
                const x2 = p.ax + p.side * u(34);
                const y2 = p.ay + u(p.dy ?? 0);
                return (
                  <g key={p.t} className="bm-part" pointerEvents="none">
                    <line x1={p.ax} y1={p.ay} x2={x2} y2={y2} />
                    <circle cx={p.ax} cy={p.ay} r={u(2.5)} />
                    <text
                      x={x2 + p.side * u(4)}
                      y={y2}
                      textAnchor={p.side === 1 ? "start" : "end"}
                      dominantBaseline="middle"
                      fontSize={u(12.5)}
                      strokeWidth={u(3)}
                    >
                      {p.t}
                    </text>
                  </g>
                );
              })}
          </g>

          {/* Status labels for every region, readable from a distance. They fade out when zoomed in. */}
          <g className={`bm-far${zoomed ? " bm-far-hidden" : ""}`} aria-hidden="true">
            {FAR.map((f) => {
              const s = statusByRegion[f.region];
              const right = f.bx > 200;
              const ex = right ? f.bx : f.bx + FAR_W;
              return (
                <g key={f.region} className={`bm-label region-${s}`} onClick={() => onSelect(f.region)}>
                  <line x1={ex} y1={f.by + FAR_H / 2} x2={f.ax + (right ? 0 : 0)} y2={f.ay} />
                  <circle cx={f.ax} cy={f.ay} r="3.5" />
                  <rect x={f.bx} y={f.by} width={FAR_W} height={FAR_H} rx="8" />
                  <text x={f.bx + 8} y={f.by + 15} className="bm-label-name">
                    {FAR_NAME[f.region]}
                  </text>
                  <text x={f.bx + 8} y={f.by + 30} className="bm-label-status">
                    {STATUS_ICON[s]} {STATUS_LABEL[s]}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {zoomed ? (
          <button className="bm-zoom-out" onClick={() => onSelect(selected)} aria-label="Zoom out to the whole body">
            Zoom out
          </button>
        ) : (
          <p className="bm-hint muted">Select a part of the body to zoom in.</p>
        )}
      </div>

      {selected && (
        <div className={`bm-detail region-${statusByRegion[selected]}`} aria-live="polite">
          <h3>
            {label(selected)} <StatusBadge status={statusByRegion[selected]} />
          </h3>
          <p className="muted">{INFO[selected]}</p>
          <ul className="bm-indicators">
            {inRegion.map((a) => {
              const def = INDICATOR_BY_ID[a.indicator];
              return (
                <li key={a.indicator}>
                  <button className="bm-ind" onClick={() => onOpenIndicator(a.indicator)}>
                    <span>{def.label}</span>
                    <strong>
                      {formatValue(def, a.value)} {def.unit}
                    </strong>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
