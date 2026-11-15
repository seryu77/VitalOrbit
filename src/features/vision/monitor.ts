// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Movement and responsiveness check. Takes body, hand, and face landmarks frame by frame and
// decides whether a person has been motionless for too long. It has no dependency on UI code,
// and it never sees or stores video, only landmark positions.

export interface Point {
  x: number;
  y: number;
  visibility?: number;
}

/** What the detectors found in one frame. Any part can be missing. */
export interface Frame {
  pose: Point[] | null;
  hands: { side: string; points: Point[] }[];
  face: Point[] | null;
}

export interface VisionConfig {
  /** Seconds without movement before the system asks the person to respond. */
  stillSeconds: number;
  /** Seconds the person has to respond before a red alert is raised. */
  responseSeconds: number;
}

export const DEFAULT_VISION: VisionConfig = { stillSeconds: 15, responseSeconds: 8 };

export type VisionPhase = "no-person" | "watching" | "prompt" | "alert";

export interface VisionState {
  phase: VisionPhase;
  /** Seconds since the last noticeable movement. */
  stillFor: number;
  /** Seconds left to respond while the phase is "prompt". */
  responseLeft: number;
  /** Current drift from the reference pose, in body widths. */
  drift: number;
  /** True only on the frame where the alert is raised. */
  raised: boolean;
}

// Landmarks that are followed for movement: nose, shoulders, elbows, wrists, hips (body),
// wrist and fingertips (each hand), and nose tip, eye corners, mouth corners, chin (face).
const POSE_KEYS = [0, 11, 12, 13, 14, 15, 16, 23, 24];
const HAND_KEYS = [0, 4, 8, 12, 16, 20];
const FACE_KEYS = [1, 33, 263, 61, 291, 152];
const MIN_VISIBLE = 4;
const MIN_VISIBILITY = 0.5;
/** Drift, in body widths, that counts as real movement. Smaller values are landmark noise. */
const MOVE = 0.12;
/** Larger movement, such as waving, also counts as a response to the prompt. */
const WAVE = 0.35;
const SMOOTHING = 0.35;
/** A person out of view for this long cancels the check. Absence is not evidence of an emergency. */
const LOST_AFTER = 3;
/** Eye corner distance times this gives an estimate of shoulder width, for when only the face is in view. */
const EYE_TO_BODY = 4;

type Pos = { x: number; y: number };

export class StillnessMonitor {
  cfg: VisionConfig;
  private smooth = new Map<string, Pos>();
  private anchor = new Map<string, Pos>();
  private lastMove = 0;
  private promptAt: number | null = null;
  private alerted = false;
  private lastSeen = 0;
  private present = false;
  private drift = 0;
  private scale = 0.25;

  constructor(cfg: VisionConfig, now: number) {
    this.cfg = cfg;
    this.lastMove = now;
    this.lastSeen = now;
  }

  /** `aspect` is video width over height. */
  update(frame: Frame, now: number, aspect: number): VisionState {
    const keys = new Map<string, Pos>();
    const pose = frame.pose;
    let poseVisible = 0;
    if (pose) {
      for (const k of POSE_KEYS) {
        if ((pose[k]?.visibility ?? 0) >= MIN_VISIBILITY) {
          keys.set(`p${k}`, { x: pose[k].x * aspect, y: pose[k].y });
          poseVisible++;
        }
      }
    }
    for (const h of frame.hands) for (const k of HAND_KEYS) keys.set(`h${h.side}${k}`, { x: h.points[k].x * aspect, y: h.points[k].y });
    if (frame.face) for (const k of FACE_KEYS) keys.set(`f${k}`, { x: frame.face[k].x * aspect, y: frame.face[k].y });

    // Someone is in view if the body, a face, or a hand is found. This keeps the check working
    // when the person is close to the camera and the body is out of frame.
    const inView = poseVisible >= MIN_VISIBLE || frame.face !== null || frame.hands.length > 0;
    if (!inView) {
      if (this.present && now - this.lastSeen > LOST_AFTER * 1000) this.clear(now);
      return this.state(now, false);
    }

    this.lastSeen = now;
    this.present = true;
    this.updateScale(frame, aspect);

    // Landmarks that disappeared are forgotten, so a flickering detection is not mistaken for movement.
    for (const id of [...this.smooth.keys()]) {
      if (!keys.has(id)) {
        this.smooth.delete(id);
        this.anchor.delete(id);
      }
    }

    // Smooth each landmark so frame to frame jitter is not mistaken for movement.
    const groups = new Map<string, { total: number; n: number }>();
    for (const [id, p] of keys) {
      const s = this.smooth.get(id);
      const next = s ? { x: s.x + (p.x - s.x) * SMOOTHING, y: s.y + (p.y - s.y) * SMOOTHING } : p;
      this.smooth.set(id, next);
      const a = this.anchor.get(id);
      if (!a) {
        this.anchor.set(id, next);
        continue;
      }
      // Body, each hand, and the face are measured separately. A moving hand counts even if the body is still.
      const g = id.startsWith("h") ? id.slice(0, 2) : id[0];
      const acc = groups.get(g) ?? { total: 0, n: 0 };
      acc.total += Math.hypot(next.x - a.x, next.y - a.y);
      acc.n++;
      groups.set(g, acc);
    }
    let drift = 0;
    for (const { total, n } of groups.values()) if (n >= 3) drift = Math.max(drift, total / n / this.scale);
    this.drift = drift;

    if (this.drift > MOVE) {
      this.anchor = new Map(this.smooth);
      this.lastMove = now;
      // Waving or standing up answers the prompt. A raised alert stays until it is acknowledged.
      if (this.drift > WAVE && this.promptAt !== null && !this.alerted) this.promptAt = null;
    }

    return this.state(now, true);
  }

  /** Body width in drawing units: shoulder width, or an estimate from the eyes when only the face is in view. */
  private updateScale(frame: Frame, aspect: number) {
    const pose = frame.pose;
    let w = 0;
    if (pose && (pose[11]?.visibility ?? 0) >= MIN_VISIBILITY && (pose[12]?.visibility ?? 0) >= MIN_VISIBILITY) {
      w = Math.hypot((pose[11].x - pose[12].x) * aspect, pose[11].y - pose[12].y);
    } else if (frame.face) {
      const a = frame.face[33];
      const b = frame.face[263];
      w = Math.hypot((a.x - b.x) * aspect, a.y - b.y) * EYE_TO_BODY;
    }
    if (w > 0.03) this.scale = this.scale * 0.8 + w * 0.2;
  }

  private state(now: number, personInView: boolean): VisionState {
    const stillFor = (now - this.lastMove) / 1000;
    let raised = false;

    if (personInView && !this.alerted) {
      if (this.promptAt === null && stillFor >= this.cfg.stillSeconds) this.promptAt = now;
      if (this.promptAt !== null && (now - this.promptAt) / 1000 >= this.cfg.responseSeconds) {
        this.alerted = true;
        raised = true;
      }
    }

    const responseLeft =
      this.promptAt === null ? 0 : Math.max(0, this.cfg.responseSeconds - (now - this.promptAt) / 1000);
    const phase: VisionPhase = !this.present
      ? "no-person"
      : this.alerted
        ? "alert"
        : this.promptAt !== null
          ? "prompt"
          : "watching";
    return { phase, stillFor, responseLeft, drift: this.drift, raised };
  }

  /** The person answered on screen, or the alert was acknowledged. */
  respond(now: number) {
    this.promptAt = null;
    this.alerted = false;
    this.lastMove = now;
    this.anchor = new Map(this.smooth);
  }

  /** Start the prompt now. Used to test the flow without waiting. */
  forcePrompt(now: number) {
    if (!this.alerted) this.promptAt = now;
    this.present = true;
    this.lastSeen = now;
  }

  private clear(now: number) {
    this.present = false;
    this.promptAt = null;
    this.alerted = false;
    this.smooth.clear();
    this.anchor.clear();
    this.lastMove = now;
  }
}

/** How many fingers of one hand are extended, from its 21 landmarks. */
export function extendedFingers(points: Point[], aspect: number): number {
  const d = (a: Point, b: Point) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const wrist = points[0];
  let count = 0;
  // Index, middle, ring, pinky: the tip is farther from the wrist than the middle joint.
  for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
    if (d(points[tip], wrist) > d(points[pip], wrist) * 1.1) count++;
  }
  // Thumb: the tip is farther from the base of the little finger than the thumb's own joint.
  if (d(points[4], points[17]) > d(points[3], points[17]) * 1.05) count++;
  return count;
}
