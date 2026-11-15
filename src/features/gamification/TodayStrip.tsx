// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import type { CrewMember } from "../../lib/types";

interface Props {
  member: CrewMember;
  moodToday: number | null;
  onMood: (score: number) => void;
}

const EXERCISE_GOAL = 120;
const MOODS = ["Very low", "Low", "Okay", "Good", "Very good"];

/** Today's routine: reminders, the daily mood check, and points for healthy habits. */
export function TodayStrip({ member, moodToday, onMood }: Props) {
  const h = member.history;
  const today = h[h.length - 1];

  // Streak: days in a row, counting back from today, with the full exercise session done.
  let streak = 0;
  for (let i = h.length - 1; i >= 0 && h[i].exerciseMin >= EXERCISE_GOAL; i--) streak++;

  // Points: 10 for full exercise, 10 for 7 or more hours of sleep, per day.
  const points = h.reduce(
    (sum, d) => sum + (d.exerciseMin >= EXERCISE_GOAL ? 10 : 0) + (d.values.sleep >= 7 ? 10 : 0),
    0,
  );

  return (
    <section className="block today">
      <header className="block-head">
        <h2>
          <span className="idx mono">05</span> Today
        </h2>
        <span className="label mono">Mission day {today.day}</span>
      </header>
      <div className="today-grid">
        <div className="today-item">
          <h3>Mood check {moodToday === null ? <span className="due">DUE</span> : <span className="done">DONE</span>}</h3>
          <p className="muted">How do you feel today?</p>
          <div className="mood-buttons" role="group" aria-label="Mood score from 1 to 5">
            {MOODS.map((label, i) => (
              <button
                key={label}
                className={`mood-button${moodToday === i + 1 ? " mood-selected" : ""}`}
                onClick={() => onMood(i + 1)}
                aria-pressed={moodToday === i + 1}
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
              <span className="done">DONE</span> Blood pressure and body mass checkup
            </li>
            <li>
              {today.exerciseMin >= EXERCISE_GOAL ? <span className="done">DONE</span> : <span className="due">DUE</span>}{" "}
              Exercise: {today.exerciseMin} of {EXERCISE_GOAL} min
              <span
                className="progress"
                role="progressbar"
                aria-label="Exercise today"
                aria-valuemin={0}
                aria-valuemax={EXERCISE_GOAL}
                aria-valuenow={today.exerciseMin}
              >
                <span style={{ width: `${Math.min(100, (today.exerciseMin / EXERCISE_GOAL) * 100)}%` }} />
              </span>
            </li>
            <li>
              <span className="due">DUE</span> Drink water (next reminder in 40 min)
            </li>
          </ul>
        </div>

        <div className="today-item">
          <h3>Healthy habits</h3>
          <div className="scores">
            <p className="score">
              <strong>{streak}</strong>
              <span>day exercise streak</span>
            </p>
            <p className="score">
              <strong>{points}</strong>
              <span>points, last 30 days</span>
            </p>
          </div>
          <p className="muted">10 points for a full exercise session, 10 for 7 or more hours of sleep.</p>
        </div>
      </div>
    </section>
  );
}
