// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import type { CrewMember } from "../../lib/types";

export const EXERCISE_GOAL = 120;
const MOODS = ["Very low", "Low", "Okay", "Good", "Very good"];
const WATER_OPTIONS = [
  { min: 1, label: "1 min (demo)" },
  { min: 30, label: "30 min" },
  { min: 60, label: "1 hour" },
  { min: 120, label: "2 hours" },
];

interface Props {
  member: CrewMember;
  moodToday: number | null;
  onMood: (score: number) => void;
  checkupDone: boolean;
  onExercise: (minutes: number) => void;
  waterDue: boolean;
  waterInMin: number;
  waterEveryMin: number;
  onWater: () => void;
  onWaterEvery: (min: number) => void;
  notify: boolean;
  /** Browser notification permission, or "unsupported". */
  permission: string;
  onNotify: (on: boolean) => void;
}

/** Today's routine: reminders, the daily mood check, and points for healthy habits. */
export function TodayStrip(p: Props) {
  const h = p.member.history;
  const today = h[h.length - 1];

  // Streak: days in a row, counting back from today, with the full exercise session done.
  let streak = 0;
  for (let i = h.length - 1; i >= 0 && h[i].exerciseMin >= EXERCISE_GOAL; i--) streak++;

  // Points: 10 for full exercise, 10 for 7 or more hours of sleep, per day.
  const points = h.reduce(
    (sum, d) => sum + (d.exerciseMin >= EXERCISE_GOAL ? 10 : 0) + (d.values.sleep >= 7 ? 10 : 0),
    0,
  );
  const exerciseDone = today.exerciseMin >= EXERCISE_GOAL;

  return (
    <section className="panel today">
      <h2>Today</h2>
      <div className="today-grid">
        <div className="today-item">
          <h3>
            Mood check {p.moodToday === null ? <span className="due">DUE</span> : <span className="done">DONE</span>}
          </h3>
          <p className="muted">How do you feel today?</p>
          <div className="mood-buttons" role="group" aria-label="Mood score from 1 to 5">
            {MOODS.map((label, i) => (
              <button
                key={label}
                className={`mood-button${p.moodToday === i + 1 ? " mood-selected" : ""}`}
                onClick={() => p.onMood(i + 1)}
                aria-pressed={p.moodToday === i + 1}
                title={label}
              >
                {i + 1}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="today-item">
          <h3>Reminders</h3>
          <ul className="reminders">
            <li>
              {p.checkupDone ? <span className="done">DONE</span> : <span className="due">DUE</span>} Blood pressure
              and body mass checkup
              {!p.checkupDone && <span className="muted"> (log it in "Log a checkup")</span>}
            </li>
            <li>
              {exerciseDone ? <span className="done">DONE</span> : <span className="due">DUE</span>} Exercise:{" "}
              {today.exerciseMin} of {EXERCISE_GOAL} min{" "}
              {!exerciseDone && (
                <button className="link-button" onClick={() => p.onExercise(30)}>
                  +30 min
                </button>
              )}
            </li>
            <li>
              {p.waterDue ? <span className="due">DUE</span> : <span className="done">OK</span>}{" "}
              {p.waterDue ? "Drink water now" : `Drink water in ${p.waterInMin} min`}{" "}
              <button className="link-button" onClick={p.onWater}>
                I drank
              </button>
            </li>
          </ul>
          <div className="reminder-settings">
            <label className="check">
              <input type="checkbox" checked={p.notify} onChange={(e) => p.onNotify(e.target.checked)} /> Alert me when
              a reminder is due
            </label>
            <label className="inline">
              Water every
              <select value={p.waterEveryMin} onChange={(e) => p.onWaterEvery(Number(e.target.value))}>
                {WATER_OPTIONS.map((o) => (
                  <option key={o.min} value={o.min}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {p.notify && p.permission !== "granted" && (
              <p className="muted">
                {p.permission === "unsupported"
                  ? "This browser has no system notifications. Reminders show on screen."
                  : "System notifications are off. Reminders show on screen."}
              </p>
            )}
          </div>
        </div>

        <div className="today-item">
          <h3>Healthy habits</h3>
          <p className="score">
            <strong>{streak}</strong> day exercise streak
          </p>
          <p className="score">
            <strong>{points}</strong> points in the last 30 days
          </p>
          <p className="muted">10 points for a full exercise session, 10 for 7 or more hours of sleep.</p>
        </div>
      </div>
    </section>
  );
}
