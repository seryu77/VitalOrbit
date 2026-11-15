// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Insights built on top of the assessment engine: a 0 to 100 health score with its
// breakdown, an early warning from recent trends, possible causes with the on-board
// resources they need, a plain-language summary, and a report for the flight surgeon.
//
// Everything here is rule based and runs on the device. The engine's status is the
// source of truth: nothing in this file changes a status. All thresholds are
// illustrative, and possible causes are decision support, not a diagnosis.

import { INDICATOR_BY_ID } from "../data/rules/indicators";
import { formatValue, STATUS_LABEL } from "./engine";
import type { Alert, Assessment, CrewMember, IndicatorId, MissionProfile, Status } from "./types";

/* ---------- Health score ---------- */

export interface ScorePart {
  label: string;
  points: number;
  reason: string;
}

export interface HealthScore {
  score: number;
  band: Status;
  parts: ScorePart[];
}

const PENALTY: Record<Status, number> = { green: 0, yellow: 8, red: 22 };

/**
 * One number from 0 to 100. It always comes with the list of what lowered it,
 * so it is never a black box.
 */
export function healthScore(assessments: Assessment[], openCameraAlerts: Alert[] = []): HealthScore {
  const parts: ScorePart[] = [];
  for (const a of assessments) {
    const def = INDICATOR_BY_ID[a.indicator];
    if (a.status !== "green") {
      parts.push({ label: def.label, points: PENALTY[a.status], reason: a.reason });
    }
    if (a.status !== "green" && a.daysNotGreen > 3) {
      parts.push({
        label: `${def.label}, persistent`,
        points: 4,
        reason: `Outside the expected range for ${a.daysNotGreen} days.`,
      });
    }
  }
  for (const c of openCameraAlerts) {
    parts.push({
      label: c.indicator === "vision" ? "Camera safety check" : "Spine check",
      points: PENALTY[c.status],
      reason: c.reason,
    });
  }
  parts.sort((a, b) => b.points - a.points);
  const score = Math.max(0, 100 - parts.reduce((s, p) => s + p.points, 0));
  const band: Status = score >= 85 ? "green" : score >= 60 ? "yellow" : "red";
  return { score, band, parts };
}

/* ---------- Early warning ---------- */

export interface Forecast {
  indicator: IndicatorId;
  /** Days until the trend line leaves the normal range. */
  days: number;
  direction: "rising" | "falling";
  slope: number;
}

/** Least-squares slope per day over the last n values. */
function slope(values: number[]): number {
  const n = values.length;
  const mx = (n - 1) / 2;
  const my = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - mx) * (v - my);
    den += (i - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

/**
 * Projects the last 7 days forward and warns when an indicator that is still normal
 * would leave its normal range within the next 7 days.
 */
export function earlyWarnings(member: CrewMember, assessments: Assessment[], horizon = 7): Forecast[] {
  const out: Forecast[] = [];
  for (const a of assessments) {
    if (a.status !== "green" || a.indicator === "mood") continue;
    const values = member.history.slice(-7).map((d) => d.values[a.indicator]);
    if (values.length < 5) continue;
    const s = slope(values);
    const [lo, hi] = a.bands.green;
    const last = values[values.length - 1];
    let days = Infinity;
    if (s > 0 && hi < 900) days = (hi - last) / s;
    if (s < 0) days = (last - lo) / -s;
    if (days > 0 && days <= horizon) {
      out.push({ indicator: a.indicator, days: Math.max(1, Math.round(days)), direction: s > 0 ? "rising" : "falling", slope: s });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

/* ---------- Possible causes ---------- */

export interface KitItem {
  id: string;
  name: string;
}

/** Illustrative on-board medical kit. A real kit list would come from the mission's flight surgeons. */
export const MED_KIT: KitItem[] = [
  { id: "thermo", name: "Digital thermometer" },
  { id: "antipyretic", name: "Fever reducer (antipyretic)" },
  { id: "fluids", name: "Oral rehydration packets" },
  { id: "oximeter", name: "Pulse oximeter" },
  { id: "o2", name: "Supplemental oxygen mask" },
  { id: "bpcuff", name: "Blood pressure cuff" },
  { id: "ecg", name: "Portable ECG" },
  { id: "aspirin", name: "Aspirin" },
  { id: "glucometer", name: "Glucometer" },
  { id: "glucose-gel", name: "Fast glucose gel" },
  { id: "sleep-kit", name: "Eye mask and earplugs" },
  { id: "melatonin", name: "Sleep aid (as prescribed)" },
  { id: "shield", name: "Shielded crew quarters" },
  { id: "dosimeter", name: "Personal dosimeter" },
  { id: "scale", name: "Body mass measurement device" },
  { id: "resistive", name: "Resistive exercise device" },
];

const KIT = Object.fromEntries(MED_KIT.map((k) => [k.id, k])) as Record<string, KitItem>;

export interface PossibleCause {
  title: string;
  /** Why this was suggested: the readings that match. */
  because: string;
  steps: string[];
  kit: KitItem[];
  escalate: string;
  severity: Status;
}

type Rule = {
  when: (s: Record<IndicatorId, Status>, v: Record<IndicatorId, number>) => boolean;
  title: string;
  because: (v: Record<IndicatorId, number>) => string;
  steps: string[];
  kit: string[];
  escalate: string;
};

const fmt = (id: IndicatorId, v: Record<IndicatorId, number>) =>
  `${INDICATOR_BY_ID[id].label.toLowerCase()} ${formatValue(INDICATOR_BY_ID[id], v[id])} ${INDICATOR_BY_ID[id].unit}`;

const off = (s: Status) => s !== "green";

const RULES: Rule[] = [
  {
    when: (s, v) => off(s.temp) && v.temp > 37.5 && (off(s.hr) || v.hr > 90),
    title: "Infection or fever",
    because: (v) => `High ${fmt("temp", v)} together with a raised ${fmt("hr", v)}.`,
    steps: ["Measure temperature again in 30 minutes.", "Drink fluids and rest.", "Take the fever reducer as the kit card says.", "Keep a distance from crewmates if possible."],
    kit: ["thermo", "antipyretic", "fluids"],
    escalate: "Above 38.5 °C, or fever for more than 2 days: tell the crew and the flight surgeon.",
  },
  {
    when: (s) => off(s.hr) && (off(s.bp) || off(s.spo2)),
    title: "Cardiovascular strain",
    because: (v) => `${fmt("hr", v)} is out of range, with ${fmt("bp", v)} and ${fmt("spo2", v)}.`,
    steps: ["Stop exercise and rest in a fixed position.", "Record an ECG.", "Re-measure heart rate and blood pressure in 10 minutes."],
    kit: ["ecg", "bpcuff", "oximeter", "aspirin"],
    escalate: "Chest pain, fainting, or a heart rate above 120: red, tell the crew now.",
  },
  {
    when: (s) => off(s.spo2),
    title: "Low blood oxygen: cabin air or breathing",
    because: (v) => `${fmt("spo2", v)} is below the expected range.`,
    steps: ["Check the cabin CO2 and oxygen readings.", "Move to a well-ventilated module.", "Re-measure with the pulse oximeter on a warm finger."],
    kit: ["oximeter", "o2"],
    escalate: "Below 90 %, or short of breath: use supplemental oxygen and tell the crew.",
  },
  {
    when: (s) => off(s.sleep) && off(s.mood),
    title: "Fatigue and isolation stress",
    because: (v) => `Short ${fmt("sleep", v)} together with low mood (${v.mood} of 5).`,
    steps: ["Protect an 8-hour sleep window tonight.", "Plan a call with family or a crew activity.", "Lower screen light 1 hour before sleep."],
    kit: ["sleep-kit", "melatonin"],
    escalate: "Low mood for 3 days, or thoughts of self-harm: talk to the behavioral health team.",
  },
  {
    when: (s) => off(s.sleep) && !off(s.mood),
    title: "Sleep debt",
    because: (v) => `${fmt("sleep", v)} last night.`,
    steps: ["Keep the sleep station dark and cool.", "Avoid caffeine after midday.", "Shift demanding tasks to later in the day."],
    kit: ["sleep-kit"],
    escalate: "Less than 6 hours for 3 nights: the flight surgeon may adjust the schedule.",
  },
  {
    when: (s) => off(s.radiation),
    title: "Radiation exposure",
    because: (v) => `${fmt("radiation", v)} is near or above today's limit.`,
    steps: ["Move to the shielded crew quarters.", "Postpone any spacewalk.", "Check the personal dosimeter every hour."],
    kit: ["shield", "dosimeter"],
    escalate: "Above the mission limit: report the dose to the flight surgeon.",
  },
  {
    when: (s) => off(s.glucose),
    title: "Blood glucose out of range",
    because: (v) => `${fmt("glucose", v)}.`,
    steps: ["Re-measure with the glucometer.", "If low: take fast glucose gel and re-check in 15 minutes.", "If high: drink water and skip sugary food."],
    kit: ["glucometer", "glucose-gel"],
    escalate: "Below 54 or above 125 mg/dL twice: tell the flight surgeon.",
  },
  {
    when: (s) => off(s.mass),
    title: "Bone and muscle loss",
    because: (v) => `${fmt("mass", v)} has moved away from your mission baseline.`,
    steps: ["Complete the full daily exercise session.", "Log every meal for 3 days.", "Re-measure body mass on the next checkup day."],
    kit: ["scale", "resistive"],
    escalate: "More than 10 % change: the flight surgeon will review diet and exercise.",
  },
];

/**
 * Suggests what might be behind the readings, with steps that use only the
 * on-board kit. This is decision support, not a diagnosis.
 */
export function possibleCauses(assessments: Assessment[]): PossibleCause[] {
  const s = Object.fromEntries(assessments.map((a) => [a.indicator, a.status])) as Record<IndicatorId, Status>;
  const v = Object.fromEntries(assessments.map((a) => [a.indicator, a.value])) as Record<IndicatorId, number>;
  const rank: Record<Status, number> = { green: 0, yellow: 1, red: 2 };
  return RULES.filter((r) => r.when(s, v))
    .map((r) => {
      const ids = (Object.keys(s) as IndicatorId[]).filter((id) => r.because(v).toLowerCase().includes(INDICATOR_BY_ID[id].label.toLowerCase()));
      const severity = ids.reduce<Status>((w, id) => (rank[s[id]] > rank[w] ? s[id] : w), "yellow");
      return { title: r.title, because: r.because(v), steps: r.steps, kit: r.kit.map((k) => KIT[k]), escalate: r.escalate, severity };
    })
    .sort((a, b) => rank[b.severity] - rank[a.severity]);
}

/* ---------- Plain-language summary ---------- */

export function summary(member: CrewMember, assessments: Assessment[], score: HealthScore, forecasts: Forecast[]): string {
  const first = member.name.split(" ")[0];
  const bad = assessments.filter((a) => a.status !== "green");
  const red = bad.filter((a) => a.status === "red");
  const name = (a: Assessment | Forecast) => INDICATOR_BY_ID[a.indicator].label.toLowerCase();
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

  const parts: string[] = [];
  parts.push(`${first}, your health score today is ${score.score} out of 100.`);
  if (bad.length === 0) {
    parts.push("All nine indicators are in their expected range.");
  } else if (red.length > 0) {
    parts.push(`${list(red.map(name))} ${red.length === 1 ? "is" : "are"} critical, so act on the steps shown and tell your crew.`);
    const yellow = bad.filter((a) => a.status === "yellow");
    if (yellow.length) parts.push(`Also keep an eye on ${list(yellow.map(name))}.`);
  } else {
    parts.push(`${list(bad.map(name))} ${bad.length === 1 ? "needs" : "need"} your attention, but nothing is critical.`);
  }
  if (forecasts.length) {
    const f = forecasts[0];
    parts.push(`If the current trend continues, ${name(f)} may leave its normal range in about ${f.days} day${f.days === 1 ? "" : "s"}.`);
  }
  const persistent = bad.filter((a) => a.daysNotGreen > 3);
  if (persistent.length) parts.push(`${list(persistent.map(name))} has been out of range for several days, so contact the flight surgeon.`);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

/* ---------- Report for the flight surgeon ---------- */

export interface EarthReport {
  title: string;
  priority: "routine" | "priority";
  text: string;
}

export function earthReport(
  member: CrewMember,
  assessments: Assessment[],
  alerts: Alert[],
  profile: MissionProfile,
  score: HealthScore,
  causes: PossibleCause[],
  now = new Date(),
): EarthReport {
  const day = member.history[member.history.length - 1].day;
  const red = alerts.filter((a) => a.status === "red");
  const priority = red.length ? "priority" : "routine";
  const lines: string[] = [];
  lines.push(`VITALORBIT ${priority === "priority" ? "PRIORITY " : ""}HEALTH REPORT`);
  lines.push(`Crew member: ${member.name} (${member.role})`);
  lines.push(`Mission: ${profile.name}, day ${day}. Link to Earth: ${profile.delayLabel}.`);
  lines.push(`Generated on board: ${now.toISOString()}`);
  lines.push(`Health score: ${score.score}/100`);
  lines.push("");
  lines.push("READINGS");
  for (const a of assessments) {
    const def = INDICATOR_BY_ID[a.indicator];
    lines.push(`- ${def.label}: ${formatValue(def, a.value)} ${def.unit} [${STATUS_LABEL[a.status]}] ${a.status === "green" ? "" : a.reason}`.trimEnd());
  }
  lines.push("");
  lines.push("ACTIVE ALERTS");
  if (alerts.length === 0) lines.push("- None");
  for (const a of alerts) lines.push(`- [${STATUS_LABEL[a.status]}] ${a.indicator}: ${a.reason}`);
  lines.push("");
  lines.push("POSSIBLE CAUSES CONSIDERED ON BOARD (not a diagnosis)");
  if (causes.length === 0) lines.push("- None");
  for (const c of causes) lines.push(`- ${c.title}: ${c.because} Steps taken from the kit: ${c.kit.map((k) => k.name).join(", ")}.`);
  lines.push("");
  lines.push("All readings in this prototype are simulated. Thresholds are illustrative.");
  return {
    title: `${priority === "priority" ? "Priority" : "Routine"} report, ${member.name}, day ${day}`,
    priority,
    text: lines.join("\n"),
  };
}

/** Saves a text file on the device. Works with no link to Earth. */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
