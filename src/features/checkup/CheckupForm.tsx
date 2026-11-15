// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useState } from "react";
import { INDICATOR_BY_ID } from "../../data/rules/indicators";
import { fmtTime } from "../../lib/log";
import type { CheckupEntry, CheckupId } from "../../lib/types";

interface Props {
  entries: CheckupEntry[];
  onSubmit: (values: Partial<Record<CheckupId, number>>) => void;
}

const FIELDS: { id: CheckupId; label: string; unit: string; min: number; max: number; step: number }[] = [
  { id: "bp", label: "Systolic blood pressure", unit: "mmHg", min: 50, max: 260, step: 1 },
  { id: "mass", label: "Body mass", unit: "kg", min: 30, max: 200, step: 0.1 },
  { id: "glucose", label: "Fasting blood glucose", unit: "mg/dL", min: 20, max: 600, step: 1 },
];

/** Manual entry of routine checkup values. The assessment updates as soon as they are saved. */
export function CheckupForm({ entries, onSubmit }: Props) {
  const [raw, setRaw] = useState<Record<CheckupId, string>>({ bp: "", mass: "", glucose: "" });
  const [errors, setErrors] = useState<Partial<Record<CheckupId | "form", string>>>({});
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const values: Partial<Record<CheckupId, number>> = {};
    for (const f of FIELDS) {
      const text = raw[f.id].trim();
      if (!text) continue;
      const v = Number(text);
      if (!Number.isFinite(v) || v < f.min || v > f.max) {
        errs[f.id] = `Enter a value from ${f.min} to ${f.max} ${f.unit}.`;
      } else {
        values[f.id] = v;
      }
    }
    if (Object.keys(values).length === 0 && Object.keys(errs).length === 0) {
      errs.form = "Enter at least one value.";
    }
    setErrors(errs);
    setSaved(false);
    if (Object.keys(errs).length > 0) return;
    onSubmit(values);
    setRaw({ bp: "", mass: "", glucose: "" });
    setSaved(true);
  };

  return (
    <section className="panel" aria-labelledby="checkup-title">
      <h2 id="checkup-title">Log a checkup</h2>
      <p className="muted">Enter the values from your routine measurement. Leave a field empty to skip it.</p>
      <form className="checkup-form" onSubmit={submit} noValidate>
        {FIELDS.map((f) => (
          <label key={f.id}>
            <span>
              {f.label} <span className="muted">({f.unit})</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={f.step}
              value={raw[f.id]}
              onChange={(e) => setRaw({ ...raw, [f.id]: e.target.value })}
              aria-invalid={Boolean(errors[f.id])}
              aria-describedby={errors[f.id] ? `err-${f.id}` : undefined}
            />
            {errors[f.id] && (
              <span id={`err-${f.id}`} className="field-error">
                {errors[f.id]}
              </span>
            )}
          </label>
        ))}
        {errors.form && <p className="field-error">{errors.form}</p>}
        <button className="btn" type="submit">
          Save checkup
        </button>
        {saved && (
          <p className="done" role="status">
            Saved. Your indicators were updated.
          </p>
        )}
      </form>

      {entries.length > 0 && (
        <>
          <h3>Recent entries</h3>
          <ul className="entries">
            {entries
              .slice(-4)
              .reverse()
              .map((e) => (
                <li key={e.id}>
                  <span className="muted">{fmtTime(e.at)}</span>{" "}
                  {FIELDS.filter((f) => e.values[f.id] !== undefined)
                    .map((f) => `${INDICATOR_BY_ID[f.id].label} ${e.values[f.id]} ${f.unit}`)
                    .join(", ")}
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
