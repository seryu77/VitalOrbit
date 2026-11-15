// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Draws what the detectors found on top of the camera preview: a face mesh, the body
// skeleton, and every joint of both hands with each finger in its own color.

import type { DrawingUtils, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { VisionPhase } from "./monitor";
import { vertebrae, type Level, type SpineAxis } from "./spine";

type Vision = typeof import("@mediapipe/tasks-vision");
type Conn = { start: number; end: number };

export interface Layers {
  body: boolean;
  hands: boolean;
  face: boolean;
  spine: boolean;
}

export interface Detection {
  pose: NormalizedLandmark[] | null;
  hands: { side: string; points: NormalizedLandmark[] }[];
  face: NormalizedLandmark[] | null;
}

export const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Little"] as const;
export const FINGER_COLORS = ["#ff8a8e", "#ffcf4d", "#6fdc9c", "#5eb0ff", "#c9a0ff"];

const BODY_COLOR: Record<VisionPhase, string> = {
  "no-person": "#a9b3c7",
  watching: "#6fdc9c",
  prompt: "#ffcf4d",
  alert: "#ff8a8e",
};

const SHOWN = 0.5;
const POSE_FACE = (i: number) => i <= 10;
const POSE_HAND = (i: number) => i >= 17 && i <= 22;

/** Finger of a hand connection (0 thumb to 4 little), or -1 for the palm. */
function fingerOf(c: Conn): number {
  if (c.start === 0 || (c.start % 4 === 1 && c.end % 4 === 1 && c.start > 1)) return -1;
  return Math.ceil(c.end / 4) - 1;
}

export function drawDetection(v: Vision, du: DrawingUtils, d: Detection, layers: Layers, phase: VisionPhase) {
  const body = BODY_COLOR[phase];

  if (layers.face && d.face) {
    const F = v.FaceLandmarker;
    du.drawConnectors(d.face, F.FACE_LANDMARKS_TESSELATION, { color: "rgba(255,255,255,0.22)", lineWidth: 0.5 });
    du.drawConnectors(d.face, F.FACE_LANDMARKS_FACE_OVAL, { color: "#e9eef7", lineWidth: 2 });
    du.drawConnectors(d.face, F.FACE_LANDMARKS_LIPS, { color: "#ff8a8e", lineWidth: 2 });
    du.drawConnectors(d.face, F.FACE_LANDMARKS_LEFT_EYE, { color: "#5eb0ff", lineWidth: 2 });
    du.drawConnectors(d.face, F.FACE_LANDMARKS_RIGHT_EYE, { color: "#5eb0ff", lineWidth: 2 });
    du.drawConnectors(d.face, F.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#ffcf4d", lineWidth: 2 });
    du.drawConnectors(d.face, F.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#ffcf4d", lineWidth: 2 });
    if (d.face.length > 468) {
      du.drawConnectors(d.face, F.FACE_LANDMARKS_LEFT_IRIS, { color: "#6fdc9c", lineWidth: 2 });
      du.drawConnectors(d.face, F.FACE_LANDMARKS_RIGHT_IRIS, { color: "#6fdc9c", lineWidth: 2 });
    }
  }

  if (layers.body && d.pose) {
    const p = d.pose;
    const shown = (i: number) => (p[i]?.visibility ?? 0) >= SHOWN;
    // The face and hands have their own detail, so the coarse body points for them are left out when those layers draw.
    const skipFace = layers.face && d.face !== null;
    const skipHands = layers.hands && d.hands.length > 0;
    const skip = (i: number) => (skipFace && POSE_FACE(i)) || (skipHands && POSE_HAND(i));
    const conns = (v.PoseLandmarker.POSE_CONNECTIONS as Conn[]).filter(
      (c) => shown(c.start) && shown(c.end) && !skip(c.start) && !skip(c.end),
    );
    du.drawConnectors(p, conns, { color: body, lineWidth: 4 });
    const joints = p.map((pt, i) => (shown(i) && !skip(i) ? pt : null));
    du.drawLandmarks(
      joints.filter((x): x is NormalizedLandmark => x !== null),
      { color: "#0b1020", fillColor: body, radius: 4, lineWidth: 1.5 },
    );
  }

  if (layers.hands) {
    for (const h of d.hands) {
      const conns = v.HandLandmarker.HAND_CONNECTIONS as Conn[];
      // Palm first, then each finger in its own color.
      du.drawConnectors(
        h.points,
        conns.filter((c) => fingerOf(c) === -1),
        { color: "#e9eef7", lineWidth: 3 },
      );
      for (let f = 0; f < 5; f++) {
        du.drawConnectors(
          h.points,
          conns.filter((c) => fingerOf(c) === f),
          { color: FINGER_COLORS[f], lineWidth: 3 },
        );
      }
      // Every joint, with the fingertips larger so each finger can be counted.
      du.drawLandmarks(h.points, { color: "#0b1020", fillColor: "#e9eef7", radius: 3, lineWidth: 1 });
      for (let f = 0; f < 5; f++) {
        du.drawLandmarks([h.points[(f + 1) * 4]], {
          color: "#0b1020",
          fillColor: FINGER_COLORS[f],
          radius: 6,
          lineWidth: 1.5,
        });
      }
    }
  }
}

const LEVEL_COLOR = ["#6fdc9c", "#ffcf4d", "#ff8a8e"];
const REGION_COLOR = { C: "#9fd0ff", T: "#e9eef7", L: "#ffd9a0" };

/**
 * Draws text that reads correctly even though the camera preview is mirrored with CSS.
 * `side` is where the text goes on screen, next to the point.
 */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, px: number, side: "left" | "right", gap: number) {
  ctx.save();
  // The preview is mirrored, so screen-left is the larger canvas x.
  ctx.translate(side === "left" ? x + gap : x - gap, y);
  ctx.scale(-1, 1);
  ctx.font = `600 ${px}px system-ui, sans-serif`;
  ctx.textAlign = side === "left" ? "right" : "left";
  ctx.textBaseline = "middle";
  ctx.lineWidth = px / 4;
  ctx.strokeStyle = "#0b1020";
  ctx.lineJoin = "round";
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * Draws the estimated spine as a line down the middle of the body with a mark for each of the 24
 * vertebrae, a vertical reference line, and, facing the camera, the shoulder and hip lines.
 */
export function drawSpine(ctx: CanvasRenderingContext2D, axis: SpineAxis, pose: NormalizedLandmark[] | null, level: Level) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const color = LEVEL_COLOR[level];
  const X = (p: { x: number }) => p.x * W;
  const Y = (p: { y: number }) => p.y * H;
  const unit = Math.max(8, axis.size * H * 0.05);
  const text = Math.max(12, Math.min(20, H / 38));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Vertical reference through the tailbone, so a lean or bend can be seen against it.
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "rgba(233,238,247,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X(axis.sacrum), Y(axis.sacrum) + unit * 2);
  ctx.lineTo(X(axis.sacrum), Y(axis.head) - unit * 1.5);
  ctx.stroke();
  ctx.setLineDash([]);

  if (axis.view === "front" && pose) {
    // Shoulder and hip lines, drawn between the landmarks, to show any tilt.
    for (const [a, b, name, v] of [
      [11, 12, "Shoulders", axis.m.shoulderTilt],
      [23, 24, "Hips", axis.m.hipTilt],
    ] as const) {
      ctx.strokeStyle = "rgba(94,176,255,0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(X(pose[a]), Y(pose[a]));
      ctx.lineTo(X(pose[b]), Y(pose[b]));
      ctx.stroke();
      if (v !== undefined) {
        const lx = Math.min(X(pose[a]), X(pose[b]));
        const ly = (Y(pose[a]) + Y(pose[b])) / 2;
        label(ctx, `${name} ${Math.abs(v).toFixed(1)}°`, lx, ly, "#9fd0ff", text, "right", unit * 1.2);
      }
    }
  }

  // The spine: a line through the three measured points, then a mark for each vertebra.
  const marks = vertebrae(axis);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(4, unit * 0.5);
  ctx.beginPath();
  marks.forEach((m, i) => (i === 0 ? ctx.moveTo(X(m.p), Y(m.p)) : ctx.lineTo(X(m.p), Y(m.p))));
  ctx.stroke();
  for (const m of marks) {
    ctx.fillStyle = REGION_COLOR[m.region];
    ctx.strokeStyle = "#0b1020";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(m.p), Y(m.p), Math.max(3, unit * (m.region === "C" ? 0.32 : m.region === "T" ? 0.4 : 0.5)), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  label(ctx, "C7", X(axis.c7), Y(axis.c7), "#9fd0ff", text, "left", unit * 1.2);
  label(ctx, "Sacrum", X(axis.sacrum), Y(axis.sacrum), "#ffd9a0", text, "left", unit * 1.2);
  label(ctx, "Spine", X(axis.c7), (Y(axis.c7) + Y(axis.sacrum)) / 2, color, text, "right", unit * 1.2);
  ctx.restore();
}
