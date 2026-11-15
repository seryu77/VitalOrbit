// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { drawDetection, drawSpine, FINGER_COLORS, FINGERS, type Detection, type Layers } from "./draw";
import { extendedFingers, StillnessMonitor, type VisionConfig, type VisionPhase, type VisionState } from "./monitor";
import { assessSpine, medianMetrics, spineAxis, type Level, type SpineMetrics, type SpineResult, type SpineView } from "./spine";

interface Props {
  config: VisionConfig;
  onConfig: (c: VisionConfig) => void;
  /** Called once when a prompt goes unanswered and a red alert must be raised. */
  onEmergency: (reason: string) => void;
  /** Called when the person says they are fine. */
  onResolved: () => void;
  /** True while a camera alert is raised and not yet acknowledged. */
  emergencyOpen: boolean;
  /** Called when a spine check finds an asymmetry. */
  onSpineResult: (result: SpineResult) => void;
}

const SPINE_RUN_S = 8;
const SPINE_MIN_FRAMES = 20;

interface SpineUi {
  view: SpineView | null;
  level: Level;
  m: SpineMetrics;
  /** 0 to 1 while a check is running, otherwise null. */
  progress: number | null;
  result: { at: number; result: SpineResult } | null;
  message: string;
}
const NO_SPINE: SpineUi = { view: null, level: 0, m: {}, progress: null, result: null, message: "" };

type Status = "off" | "starting" | "on" | "error";

const IDLE: VisionState = { phase: "no-person", stillFor: 0, responseLeft: 0, drift: 0, raised: false };
const MIN_FRAME_MS = 80;
const BASE = import.meta.env.BASE_URL;

/** What the detectors found, summarized for the panel. */
interface Seen {
  body: number;
  face: number;
  hands: { side: string; fingers: number; extended: boolean[] }[];
  fps: number;
}
const NOTHING: Seen = { body: 0, face: 0, hands: [], fps: 0 };
const MODELS = `${import.meta.env.BASE_URL}models/`;

const PHASE_LABEL: Record<VisionPhase, string> = {
  "no-person": "No person in view",
  watching: "Watching",
  prompt: "Are you OK?",
  alert: "Emergency raised",
};

/**
 * Camera safety check. Frames are read from the device camera, turned into body landmarks
 * in the browser, and discarded. No video is stored or sent anywhere.
 */
export function VisionPanel({ config, onConfig, onEmergency, onResolved, emergencyOpen, onSpineResult }: Props) {
  const [status, setStatus] = useState<Status>("off");
  const [error, setError] = useState("");
  const [vis, setVis] = useState<VisionState>(IDLE);
  const [open, setOpen] = useState(true);
  const [large, setLarge] = useState(false);
  const [layers, setLayers] = useState<Layers>({ body: true, hands: true, face: true, spine: true });
  const [seen, setSeen] = useState<Seen>(NOTHING);
  const [spine, setSpine] = useState<SpineUi>(NO_SPINE);
  const spineRun = useRef<{ start: number; samples: { view: SpineView; m: SpineMetrics }[] } | null>(null);
  const spineSmooth = useRef<SpineMetrics>({});
  const spineLive = useRef<{ view: SpineView; level: Level; m: SpineMetrics } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<{ pose: PoseLandmarker; hand: HandLandmarker | null; face: FaceLandmarker | null } | null>(null);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const frames = useRef({ count: 0, since: 0 });
  const monitorRef = useRef<StillnessMonitor | null>(null);
  const rafRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const phaseRef = useRef<VisionPhase>("no-person");
  const lastUi = useRef(0);
  const beepSec = useRef(-1);
  const callbacks = useRef({ onEmergency, config, onSpineResult });
  callbacks.current = { onEmergency, config, onSpineResult };

  const beep = useCallback((freq: number, ms = 180) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const lm = landmarkerRef.current;
    lm?.pose.close();
    lm?.hand?.close();
    lm?.face?.close();
    landmarkerRef.current = null;
    monitorRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    phaseRef.current = "no-person";
    setVis(IDLE);
    setSeen(NOTHING);
    spineRun.current = null;
    spineLive.current = null;
    setSpine((sp) => ({ ...NO_SPINE, result: sp.result }));
    setStatus("off");
  }, []);

  useEffect(() => stop, [stop]);

  // The alert was acknowledged somewhere else, such as the alert list. Clear the camera state too.
  useEffect(() => {
    if (!emergencyOpen && monitorRef.current && phaseRef.current === "alert") {
      monitorRef.current.respond(performance.now());
    }
  }, [emergencyOpen]);

  useEffect(() => {
    if (monitorRef.current) monitorRef.current.cfg = config;
  }, [config]);

  const start = async () => {
    setStatus("starting");
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot open the camera.");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      audioRef.current = new AudioContext();
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const vision = await import("@mediapipe/tasks-vision");
      const { FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker, DrawingUtils } = vision;
      const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe/wasm`);
      // GPU first, CPU if the graphics driver does not support it.
      const withDelegate = async <T,>(make: (d: "GPU" | "CPU") => Promise<T>): Promise<T> => {
        try {
          return await make("GPU");
        } catch {
          return make("CPU");
        }
      };
      const [pose, hand, face] = await Promise.all([
        withDelegate((delegate) =>
          PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: `${MODELS}pose_landmarker_full.task`, delegate },
            runningMode: "VIDEO",
            numPoses: 1,
          }),
        ),
        withDelegate((delegate) =>
          HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: `${MODELS}hand_landmarker.task`, delegate },
            runningMode: "VIDEO",
            numHands: 2,
          }),
        ).catch(() => null),
        withDelegate((delegate) =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: `${MODELS}face_landmarker.task`, delegate },
            runningMode: "VIDEO",
            numFaces: 1,
          }),
        ).catch(() => null),
      ]);
      if (!streamRef.current) {
        pose.close();
        hand?.close();
        face?.close();
        return;
      }
      landmarkerRef.current = { pose, hand, face };
      monitorRef.current = new StillnessMonitor(callbacks.current.config, performance.now());
      frames.current = { count: 0, since: performance.now() };

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const drawing = new DrawingUtils(ctx);
      let lastTime = -1;
      let lastRun = 0;

      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        const now = performance.now();
        const monitor = monitorRef.current;
        if (!monitor || video.readyState < 2 || video.currentTime === lastTime || now - lastRun < MIN_FRAME_MS) return;
        lastTime = video.currentTime;
        lastRun = now;

        const found: Detection = {
          pose: pose.detectForVideo(video, now).landmarks[0] ?? null,
          hands: [],
          face: null,
        };
        if (hand) {
          const r = hand.detectForVideo(video, now);
          found.hands = r.landmarks.map((points, i) => ({ side: r.handedness[i]?.[0]?.categoryName ?? String(i), points }));
        }
        if (face) found.face = face.detectForVideo(video, now).faceLandmarks[0] ?? null;

        const aspect = video.videoWidth / video.videoHeight;
        const state = monitor.update(found, now, aspect);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDetection(vision, drawing, found, layersRef.current, state.phase);

        // Spine: measured every frame, smoothed for the color and readout, and averaged over a run for a result.
        const axis = spineAxis(found.pose, aspect);
        if (axis) {
          const sm = spineSmooth.current;
          for (const k of Object.keys(axis.m) as (keyof SpineMetrics)[]) {
            const v = axis.m[k]!;
            sm[k] = sm[k] === undefined ? v : sm[k]! + (v - sm[k]!) * 0.15;
          }
          const level = assessSpine(axis.view, sm).level;
          spineLive.current = { view: axis.view, level, m: { ...sm } };
          if (layersRef.current.spine) drawSpine(ctx, axis, found.pose, level);
          spineRun.current?.samples.push({ view: axis.view, m: axis.m });
        } else {
          spineSmooth.current = {};
          spineLive.current = null;
        }
        const run = spineRun.current;
        if (run && now - run.start >= SPINE_RUN_S * 1000) {
          spineRun.current = null;
          const front = run.samples.filter((x) => x.view === "front");
          const side = run.samples.filter((x) => x.view === "side");
          const use = front.length >= side.length ? front : side;
          if (use.length < SPINE_MIN_FRAMES) {
            setSpine((sp) => ({ ...sp, progress: null, message: "Not enough frames. Keep your head, shoulders, and hips in view, and hold still." }));
          } else {
            const view = use[0].view;
            const result = assessSpine(view, medianMetrics(use.map((x) => x.m)));
            setSpine((sp) => ({ ...sp, progress: null, message: "", result: { at: Date.now(), result } }));
            if (result.level > 0) callbacks.current.onSpineResult(result);
          }
        }

        frames.current.count++;

        if (state.phase !== phaseRef.current) {
          if (state.phase === "prompt") beep(660);
          phaseRef.current = state.phase;
        }
        if (state.phase === "prompt" && Math.ceil(state.responseLeft) !== beepSec.current) {
          beepSec.current = Math.ceil(state.responseLeft);
          beep(520, 90);
        }
        if (state.raised) {
          beep(880, 600);
          callbacks.current.onEmergency(
            `No movement or response for ${Math.round(state.stillFor)} seconds. The person did not answer the on-screen check.`,
          );
        }
        if (now - lastUi.current > 250 || state.raised) {
          lastUi.current = now;
          setVis(state);
          setSpine((sp) => ({
            ...sp,
            view: spineLive.current?.view ?? null,
            level: spineLive.current?.level ?? 0,
            m: spineLive.current?.m ?? {},
            progress: spineRun.current ? Math.min(1, (now - spineRun.current.start) / (SPINE_RUN_S * 1000)) : null,
          }));
          const elapsed = (now - frames.current.since) / 1000;
          const fps = elapsed > 1 ? Math.round(frames.current.count / elapsed) : 0;
          if (elapsed > 2) frames.current = { count: 0, since: now };
          setSeen((prev) => ({
            body: found.pose ? found.pose.filter((p) => (p.visibility ?? 0) >= 0.5).length : 0,
            face: found.face?.length ?? 0,
            hands: found.hands.map((h) => {
              const pts = h.points;
              const d = (a: number, b: number) => Math.hypot((pts[a].x - pts[b].x) * aspect, pts[a].y - pts[b].y);
              const extended = [
                d(4, 17) > d(3, 17) * 1.05,
                d(8, 0) > d(6, 0) * 1.1,
                d(12, 0) > d(10, 0) * 1.1,
                d(16, 0) > d(14, 0) * 1.1,
                d(20, 0) > d(18, 0) * 1.1,
              ];
              return { side: h.side, fingers: extendedFingers(pts, aspect), extended };
            }),
            fps: fps || prev.fps,
          }));
        }
      };
      setStatus("on");
      loop();
    } catch (e) {
      stop();
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in the browser and try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : e instanceof Error
              ? e.message
              : "The camera check could not start.",
      );
      setStatus("error");
    }
  };

  const imOk = () => {
    monitorRef.current?.respond(performance.now());
    phaseRef.current = "watching";
    setVis((v) => ({ ...v, phase: "watching", stillFor: 0, responseLeft: 0 }));
    onResolved();
  };

  const runSpine = () => {
    spineRun.current = { start: performance.now(), samples: [] };
    setSpine((sp) => ({ ...sp, progress: 0, message: "" }));
  };

  const testFlow = () => {
    monitorRef.current?.forcePrompt(performance.now());
  };

  const on = status === "on";
  const showModal = on && (vis.phase === "prompt" || vis.phase === "alert");
  const stillPct = Math.min(100, (vis.stillFor / config.stillSeconds) * 100);

  return (
    <>
      <aside className={`vision-dock vision-${on ? vis.phase : "off"}${large ? " vision-large" : ""}`} aria-label="Camera safety check">
        <div className="vision-head">
          <strong>Safety camera</strong>
          <span className={`vision-chip vision-chip-${on ? vis.phase : "off"}`}>
            {on ? PHASE_LABEL[vis.phase] : status === "starting" ? "Starting…" : "Off"}
          </span>
          {on && (
            <button className="link-button" onClick={() => setLarge(!large)} aria-pressed={large}>
              {large ? "Smaller" : "Enlarge"}
            </button>
          )}
          {on && (
            <button
              className="link-button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? "Hide camera preview" : "Show camera preview"}
            >
              {open ? "Hide" : "Show"}
            </button>
          )}
        </div>

        <div className={`vision-view${on && open ? "" : " vision-view-hidden"}`}>
          <video ref={videoRef} muted playsInline />
          <canvas ref={canvasRef} />
        </div>

        {on && (
          <>
            <div className="vision-meter" role="img" aria-label={`Still for ${Math.round(vis.stillFor)} seconds`}>
              <div style={{ width: `${stillPct}%` }} />
            </div>
            <p className="muted vision-line">
              Still for {Math.floor(vis.stillFor)} s of {config.stillSeconds} s before a check.
            </p>
            <div className="vision-seen" aria-live="off">
              <p>
                <strong>Body</strong> {seen.body} of 33 points · <strong>Face</strong> {seen.face} points ·{" "}
                <strong>Hands</strong> {seen.hands.length * 21} points
                {seen.fps > 0 && <span className="muted"> · {seen.fps} fps</span>}
              </p>
              {seen.hands.length === 0 ? (
                <p className="muted">Show a hand to the camera to track each finger.</p>
              ) : (
                seen.hands.map((h) => (
                  <p key={h.side} className="vision-hand">
                    <span>
                      {h.side} hand: <strong>{h.fingers}</strong> finger{h.fingers === 1 ? "" : "s"} open
                    </span>
                    <span className="vision-dots" aria-hidden="true">
                      {h.extended.map((e, i) => (
                        <i
                          key={FINGERS[i]}
                          title={FINGERS[i]}
                          style={{ background: e ? FINGER_COLORS[i] : "transparent", borderColor: FINGER_COLORS[i] }}
                        />
                      ))}
                    </span>
                  </p>
                ))
              )}
            </div>

            <div className="vision-spine">
              <p className="vision-spine-head">
                <strong>Spine check</strong>
                {spine.view && (
                  <span className={`vision-chip vision-level-${spine.level}`}>
                    {spine.view === "front" ? "Front view" : "Side view"} ·{" "}
                    {["Aligned", "Mild", "Marked"][spine.level]}
                  </span>
                )}
              </p>
              {spine.view === "front" && (
                <p className="vision-metrics">
                  Shoulders {Math.abs(spine.m.shoulderTilt ?? 0).toFixed(1)}° · Hips {Math.abs(spine.m.hipTilt ?? 0).toFixed(1)}° · Lean{" "}
                  {Math.abs(spine.m.lean ?? 0).toFixed(1)}°
                </p>
              )}
              {spine.view === "side" && (
                <p className="vision-metrics">
                  Head angle {(spine.m.headAngle ?? 0).toFixed(0)}° · Back curve {(spine.m.roundness ?? 0).toFixed(0)}°
                </p>
              )}
              {!spine.view && (
                <p className="muted">
                  Stand back so your head, shoulders, and hips are in view. Face the camera, or stand sideways.
                </p>
              )}
              <button className="btn btn-quiet" onClick={runSpine} disabled={!spine.view || spine.progress !== null}>
                {spine.progress === null ? `Run spine check (${SPINE_RUN_S} s)` : `Measuring… ${Math.round(spine.progress * 100)}%`}
              </button>
              {spine.message && <p className="vision-error">{spine.message}</p>}
              {spine.result && (
                <div className={`vision-result vision-level-${spine.result.result.level}`} role="status">
                  <strong>{spine.result.result.summary}</strong>
                  {spine.result.result.findings.length > 0 && (
                    <ul>
                      {spine.result.result.findings.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="muted">
                Screening cue only, not a diagnosis. The camera sees the surface of the body, so the spine line is
                estimated from the head, shoulders, and hips. Keep the camera level.
              </p>
            </div>
          </>
        )}

        {status === "error" && <p className="vision-error">{error}</p>}

        <div className="vision-actions">
          {on ? (
            <>
              <button className="btn btn-quiet" onClick={stop}>
                Turn off
              </button>
              <button className="btn btn-quiet" onClick={testFlow} title="Start the check now, without waiting">
                Test alert flow
              </button>
            </>
          ) : (
            <button className="btn" onClick={start} disabled={status === "starting"}>
              {status === "starting" ? "Starting…" : "Start safety camera"}
            </button>
          )}
        </div>

        {on && (
          <details className="vision-settings">
            <summary>Layers and timing</summary>
            <div className="vision-layers" role="group" aria-label="Show on the camera preview">
              {(["body", "hands", "face", "spine"] as const).map((k) => (
                <label key={k} className="check">
                  <input
                    type="checkbox"
                    checked={layers[k]}
                    onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })}
                  />{" "}
                  {k === "body" ? "Body skeleton" : k === "hands" ? "Hands and fingers" : k === "face" ? "Face mesh" : "Spine line"}
                </label>
              ))}
            </div>
            <label>
              Ask after {config.stillSeconds} s without movement
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={config.stillSeconds}
                onChange={(e) => onConfig({ ...config, stillSeconds: Number(e.target.value) })}
              />
            </label>
            <label>
              Raise an alert after {config.responseSeconds} s without an answer
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={config.responseSeconds}
                onChange={(e) => onConfig({ ...config, responseSeconds: Number(e.target.value) })}
              />
            </label>
          </details>
        )}

        <p className="muted vision-privacy">
          Video stays on this device. Nothing is recorded or sent. Only an alert is kept.
        </p>
      </aside>

      {showModal && (
        <div className="vision-modal" role="alertdialog" aria-modal="true" aria-labelledby="vision-title">
          <div className={`vision-card vision-card-${vis.phase}`}>
            {vis.phase === "prompt" ? (
              <>
                <h2 id="vision-title">Are you OK?</h2>
                <p>
                  No movement for {Math.floor(vis.stillFor)} seconds. Move, wave, or press the button. Your crew is
                  alerted in <strong>{Math.ceil(vis.responseLeft)}</strong> s.
                </p>
              </>
            ) : (
              <>
                <h2 id="vision-title">Emergency alert raised</h2>
                <p>
                  No response was detected. Your crew has been notified and a priority report is queued for the flight
                  surgeon. If you are fine, cancel the alert.
                </p>
              </>
            )}
            <button className="btn btn-big" onClick={imOk} autoFocus>
              {vis.phase === "prompt" ? "I'm OK" : "I'm OK, cancel the alert"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
