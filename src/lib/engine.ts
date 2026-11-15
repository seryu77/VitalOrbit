// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Assessment engine. Takes readings and rules, returns a status for each
// indicator. It has no dependency on UI code.

import { INDICATORS } from "../data/rules/indicators";
import type {
  Alert,
  Assessment,
  Bands,
  CrewMember,
  IndicatorDef,
  IndicatorId,
  MissionProfile,
  Status,
} from "./types";

const RANK: Record<Status, number> = { green: 0, yellow: 1, red: 2 };

export function worst(statuses: Status[]): Status {
  return statuses.reduce<Status>((a, b) => (RANK[b] > RANK[a] ? b : a), "green");
}

/** Bands for one indicator, adjusted for the crew member and the mission profile. */
export function bandsFor(def: IndicatorDef, member: CrewMember, profile: MissionProfile): Bands {
  if (def.id === "mass") {
    const b = member.baselineMass;
    return { green: [b * 0.95, b * 1.05], yellow: [b * 0.9, b * 1.1] };
  }
  if (def.id === "radiation") {
    return { green: [0, profile.radLimit * 0.8], yellow: [0, profile.radLimit] };
  }
  return def.bands;
}

function inRange(v: number, [lo, hi]: [number, number]): boolean {
  return v >= lo && v <= hi;
}

export function baseStatus(value: number, bands: Bands): Status {
  if (inRange(value, bands.green)) return "green";
  if (inRange(value, bands.yellow)) return "yellow";
  return "red";
}

function baseReason(def: IndicatorDef, value: number, bands: Bands, status: Status): string {
  if (status === "green") return "Within the expected range.";
  const side = value < bands.green[0] ? "below" : "above";
  const level = status === "red" ? "Far " + side : "Slightly " + side;
  return `${level} the expected range.`;
}

function lastValues(member: CrewMember, id: IndicatorId, n: number): number[] {
  return member.history.slice(-n).map((d) => d.values[id]);
}

/** Assess every indicator for the latest day of one crew member. */
export function assessMember(member: CrewMember, profile: MissionProfile): Assessment[] {
  const latest = member.history[member.history.length - 1];

  return INDICATORS.map((def) => {
    const bands = bandsFor(def, member, profile);
    const value = latest.values[def.id];
    let status = baseStatus(value, bands);
    let reason = baseReason(def, value, bands, status);

    // Trend rules: patterns that a single reading would miss.
    if (def.id === "sleep") {
      const nights = lastValues(member, "sleep", 3);
      if (nights.length === 3 && nights.every((h) => h < 6)) {
        status = "red";
        reason = "Less than 6 hours of sleep for 3 nights in a row.";
      }
    }
    if (def.id === "mood") {
      const days = lastValues(member, "mood", 3);
      if (days.length === 3 && days.every((m) => m <= 2)) {
        status = "red";
        reason = "Low mood for 3 days in a row. Behavioral health follow-up is recommended.";
      }
    }
    if (def.id === "hr" && status === "green") {
      const v = lastValues(member, "hr", 6);
      const rising = v.length === 6 && v.every((x, i) => i === 0 || x > v[i - 1]);
      if (rising && v[5] - v[0] >= 8) {
        status = "yellow";
        reason = "Resting heart rate has been rising for 5 days in a row.";
      }
    }

    // How long has this indicator been outside the green range?
    let daysNotGreen = 0;
    for (let i = member.history.length - 1; i >= 0; i--) {
      if (baseStatus(member.history[i].values[def.id], bands) === "green") break;
      daysNotGreen++;
    }
    if (status === "yellow" && daysNotGreen > 3) {
      reason += ` Outside the expected range for ${daysNotGreen} days: contact the flight surgeon.`;
    }

    return { indicator: def.id, value, status, reason, daysNotGreen, bands };
  });
}

export function overallStatus(assessments: Assessment[]): Status {
  return worst(assessments.map((a) => a.status));
}

/** Alerts for the latest day. Green produces no alert. */
export function alertsFor(member: CrewMember, assessments: Assessment[]): Alert[] {
  const day = member.history[member.history.length - 1].day;
  return assessments
    .filter((a) => a.status !== "green")
    .sort((a, b) => RANK[b.status] - RANK[a.status])
    .map((a) => ({
      id: `${member.id}-${a.indicator}-${day}-${a.status}`,
      crewId: member.id,
      crewName: member.name,
      indicator: a.indicator,
      status: a.status,
      reason: a.reason,
      day,
    }));
}

export function formatValue(def: IndicatorDef, value: number): string {
  return value.toFixed(def.decimals);
}

export const STATUS_LABEL: Record<Status, string> = {
  green: "NORMAL",
  yellow: "ATTENTION",
  red: "CRITICAL",
};

export const STATUS_ICON: Record<Status, string> = {
  green: "✓",
  yellow: "!",
  red: "▲",
};
