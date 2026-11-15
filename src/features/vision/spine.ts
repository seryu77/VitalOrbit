// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Spine alignment screening. The camera sees only the surface of the body, so the spine is
// modeled as an axis through three measured points: the head, the shoulders, and the hips.
// This is a screening cue for posture, not a diagnosis. A curve of the spine can only be
// confirmed by a clinical exam and an X-ray.
//
// All angles are in degrees. All thresholds are illustrative and set for demonstration.

import type { Point } from "./monitor";

export type SpineView = "front" | "side";
export type Pos = { x: number; y: number };

export interface SpineAxis {
  view: SpineView;
  /** Skull base, seventh neck vertebra, and tailbone, in normalized image coordinates. */
  head: Pos;
  c7: Pos;
  sacrum: Pos;
  /** Distance between the shoulders (front) or the torso length (side), in image units. Sets drawing sizes. */
  size: number;
  /** Measured values for this frame. Only the ones for the current view are set. */
  m: SpineMetrics;
}

export interface SpineMetrics {
  /** Front: how far the shoulder line is from level. Positive when the person's left shoulder is lower. */
  shoulderTilt?: number;
  /** Front: how far the hip line is from level. Positive when the person's left hip is lower. */
  hipTilt?: number;
  /** Front: lean of the trunk from vertical, from hips to shoulders. Positive leans to the person's left. */
  lean?: number;
  /** Front: how much the axis bends at the shoulders, between hips-to-shoulders and shoulders-to-head. */
  bend?: number;
  /** Front: sideways offset of the head from the shoulders, as a percent of torso length. */
  headOffset?: number;
  /** Side: craniovertebral angle, from the shoulder up to the ear. Lower means the head is further forward. */
  headAngle?: number;
  /** Side: how far the ear-shoulder-hip line is from straight. Higher means a rounder upper back. */
  roundness?: number;
}

export type Level = 0 | 1 | 2;

export interface SpineResult {
  view: SpineView;
  /** 0 aligned, 1 mild, 2 marked. */
  level: Level;
  findings: string[];
  summary: string;
}

const MIN_VIS = 0.5;
const deg = (r: number) => (r * 180) / Math.PI;
const vis = (p: Point | undefined) => (p?.visibility ?? 0) >= MIN_VIS;
const mid = (a: Pos, b: Pos): Pos => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const lerp = (a: Pos, b: Pos, t: number): Pos => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * Build the spine axis and measure it for one frame. Returns null when the head, shoulders, and
 * hips are not all in view, or when the person is turned part way between facing and sideways.
 */
export function spineAxis(pose: Point[] | null, aspect: number): SpineAxis | null {
  if (!pose) return null;
  const P = (i: number): Pos => ({ x: pose[i].x * aspect, y: pose[i].y });
  const back = (p: Pos): Pos => ({ x: p.x / aspect, y: p.y });

  const front = [11, 12, 23, 24].every((i) => vis(pose[i])) && ((vis(pose[7]) && vis(pose[8])) || vis(pose[0]));
  if (front) {
    const ls = P(11);
    const rs = P(12);
    const lh = P(23);
    const rh = P(24);
    const ms = mid(ls, rs);
    const mh = mid(lh, rh);
    const head = vis(pose[7]) && vis(pose[8]) ? mid(P(7), P(8)) : P(0);
    const torso = Math.hypot(ms.x - mh.x, ms.y - mh.y);
    const shoulderW = Math.hypot(ls.x - rs.x, ls.y - rs.y);
    // Facing the camera: the shoulders are about as wide as the torso is long.
    if (torso > 0 && shoulderW / torso > 0.55) {
      // The person's left is the landmark with the larger x in an unmirrored image.
      const tilt = (a: Pos, b: Pos) => {
        const [l, r] = a.x > b.x ? [a, b] : [b, a]; // l is the one on the image right = person's left
        return deg(Math.atan2(l.y - r.y, Math.abs(l.x - r.x)));
      };
      const up = (a: Pos, b: Pos) => deg(Math.atan2(a.x - b.x, b.y - a.y)); // angle of a from b, from vertical
      const trunk = up(ms, mh);
      const neck = up(head, ms);
      // Image right is the person's left, so a lean toward image right is a lean to the left.
      return {
        view: "front",
        head: back(lerp(head, ms, 0.3)),
        c7: back(lerp(ms, head, 0.12)),
        sacrum: back(lerp(mh, ms, 0.06)),
        size: shoulderW,
        m: {
          shoulderTilt: tilt(ls, rs),
          hipTilt: tilt(lh, rh),
          lean: trunk,
          bend: neck - trunk,
          headOffset: ((head.x - ms.x) / torso) * 100,
        },
      };
    }
  }

  // Sideways: use the side of the body that is better in view.
  const sides: [number, number, number][] = [
    [7, 11, 23],
    [8, 12, 24],
  ];
  const best = sides
    .filter(([e, s, h]) => vis(pose[e]) && vis(pose[s]) && vis(pose[h]))
    .sort((a, b) => (pose[b[1]].visibility ?? 0) - (pose[a[1]].visibility ?? 0))[0];
  if (!best) return null;
  const ear = P(best[0]);
  const sh = P(best[1]);
  const hip = P(best[2]);
  const torso = Math.hypot(sh.x - hip.x, sh.y - hip.y);
  const shoulderW = vis(pose[11]) && vis(pose[12]) ? Math.hypot(P(11).x - P(12).x, P(11).y - P(12).y) : 0;
  if (torso === 0 || shoulderW / torso > 0.4) return null;

  const headAngle = deg(Math.atan2(sh.y - ear.y, Math.abs(ear.x - sh.x)));
  const a = Math.atan2(sh.x - hip.x, hip.y - sh.y); // hip to shoulder, from vertical
  const b = Math.atan2(ear.x - sh.x, sh.y - ear.y); // shoulder to ear, from vertical
  return {
    view: "side",
    head: back(lerp(ear, sh, 0.35)),
    c7: back(lerp(sh, ear, 0.1)),
    sacrum: back(lerp(hip, sh, 0.06)),
    size: torso,
    m: { headAngle, roundness: Math.abs(deg(b - a)) },
  };
}

const abs = Math.abs;
const grade = (v: number | undefined, mild: number, marked: number): Level =>
  v === undefined ? 0 : abs(v) >= marked ? 2 : abs(v) >= mild ? 1 : 0;
const gradeLow = (v: number | undefined, mild: number, marked: number): Level =>
  v === undefined ? 0 : v < marked ? 2 : v < mild ? 1 : 0;

const sideName = (v: number) => (v > 0 ? "left" : "right");

/** Turn measurements into a level and plain-language findings. Illustrative thresholds. */
export function assessSpine(view: SpineView, m: SpineMetrics): SpineResult {
  const findings: string[] = [];
  let level: Level = 0;
  const add = (l: Level, text: string) => {
    if (l > 0) {
      findings.push(text);
      level = Math.max(level, l) as Level;
    }
  };

  if (view === "front") {
    const st = grade(m.shoulderTilt, 3, 6);
    const ht = grade(m.hipTilt, 3, 6);
    const ln = grade(m.lean, 3, 6);
    const bd = grade(m.bend, 4, 8);
    const ho = grade(m.headOffset, 8, 15);
    if (st) add(st, `Shoulders are uneven: the ${sideName(m.shoulderTilt!)} shoulder is lower (${abs(m.shoulderTilt!).toFixed(1)}°).`);
    if (ht) add(ht, `Hips are uneven: the ${sideName(m.hipTilt!)} hip is lower (${abs(m.hipTilt!).toFixed(1)}°).`);
    if (ln) add(ln, `The trunk leans to the ${sideName(m.lean!)} (${abs(m.lean!).toFixed(1)}° from vertical).`);
    if (bd) add(bd, `The spine axis bends at the shoulders (${abs(m.bend!).toFixed(1)}°).`);
    if (ho) add(ho, `The head is shifted to one side (${abs(m.headOffset!).toFixed(0)}% of torso length).`);
    // Shoulders and hips tilting in opposite directions, with a lean or bend, is the pattern of a lateral curve.
    const opposite = st && ht && m.shoulderTilt! * m.hipTilt! < 0;
    if (opposite && (ln || bd)) {
      add(2, "Pattern consistent with a lateral curve of the spine (scoliosis-like). Needs a clinical exam to confirm.");
    }
  } else {
    add(gradeLow(m.headAngle, 50, 40), `The head sits forward of the shoulders (angle ${m.headAngle!.toFixed(0)}°, expected 50° or more).`);
    add(grade(m.roundness, 15, 25), `The upper back is rounded (${m.roundness!.toFixed(0)}° off straight). Pattern consistent with kyphosis-like posture.`);
  }

  const summary =
    level === 0
      ? "Aligned. No notable asymmetry in this view."
      : level === 1
        ? "Mild asymmetry. Recheck on another day and keep the camera level."
        : "Marked asymmetry. Repeat the check, and contact the flight surgeon if it persists.";
  return { view, level, findings, summary };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** The middle value of each measurement across a run of frames, so noise in single frames does not decide. */
export function medianMetrics(samples: SpineMetrics[]): SpineMetrics {
  const out: SpineMetrics = {};
  for (const k of Object.keys(samples[0]) as (keyof SpineMetrics)[]) {
    const vals = samples.map((s) => s[k]).filter((v): v is number => v !== undefined);
    if (vals.length > 0) out[k] = median(vals);
  }
  return out;
}

/** Points along the spine, from the skull base to the tailbone, for drawing: 7 neck, 12 chest, and 5 lower back vertebrae. */
export function vertebrae(a: SpineAxis): { p: Pos; region: "C" | "T" | "L" }[] {
  // A smooth curve through the three measured points, sampled finely, then placed by arc length.
  const pts = [a.head, a.c7, lerp(a.c7, a.sacrum, 0.5), a.sacrum];
  const curve: Pos[] = [];
  const cr = (p0: Pos, p1: Pos, p2: Pos, p3: Pos, t: number): Pos => {
    const f = (a0: number, a1: number, a2: number, a3: number) =>
      0.5 * (2 * a1 + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t * t + (-a0 + 3 * a1 - 3 * a2 + a3) * t * t * t);
    return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
  };
  for (let i = 0; i < pts.length - 1; i++) {
    for (let s = 0; s < 20; s++) curve.push(cr(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)], s / 20));
  }
  curve.push(pts[pts.length - 1]);
  const cum = [0];
  for (let i = 1; i < curve.length; i++) cum.push(cum[i - 1] + Math.hypot(curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y));
  const total = cum[cum.length - 1];
  const at = (frac: number): Pos => {
    const d = frac * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return lerp(curve[i - 1], curve[i], t);
  };
  // The neck part runs from the head to the seventh vertebra, which is about a fifth of the whole axis.
  const neckEnd = Math.min(0.3, Math.max(0.12, cum[20] / total));
  const out: { p: Pos; region: "C" | "T" | "L" }[] = [];
  for (let i = 0; i < 7; i++) out.push({ p: at((neckEnd * i) / 7), region: "C" });
  for (let i = 0; i < 12; i++) out.push({ p: at(neckEnd + ((0.78 - neckEnd) * i) / 12), region: "T" });
  for (let i = 0; i < 5; i++) out.push({ p: at(0.78 + ((1 - 0.78) * i) / 4.5), region: "L" });
  return out;
}
