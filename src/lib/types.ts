// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".

export type Status = "green" | "yellow" | "red";

export type IndicatorId =
  | "hr"
  | "spo2"
  | "temp"
  | "bp"
  | "glucose"
  | "sleep"
  | "mood"
  | "radiation"
  | "mass";

export type Region = "head" | "heart" | "lungs" | "torso" | "limbs" | "body";

export type Range = [number, number];

export interface Bands {
  green: Range;
  yellow: Range;
}

export interface Guidance {
  what: string;
  why: string;
  how: string;
  yellow: string[];
  red: string[];
  escalate: string;
}

export interface IndicatorDef {
  id: IndicatorId;
  label: string;
  unit: string;
  source: string;
  hazard: string;
  region: Region;
  decimals: number;
  bands: Bands;
  guidance: Guidance;
}

export interface DayRecord {
  day: number;
  values: Record<IndicatorId, number>;
  exerciseMin: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  baselineMass: number;
  history: DayRecord[];
}

export interface MissionProfile {
  id: string;
  name: string;
  delayLabel: string;
  /** Illustrative daily radiation limit in mSv. Not a real mission limit. */
  radLimit: number;
}

export interface Assessment {
  indicator: IndicatorId;
  value: number;
  status: Status;
  reason: string;
  /** Consecutive days, counting back from today, that this indicator was not green. */
  daysNotGreen: number;
  bands: Bands;
}

export interface Alert {
  id: string;
  crewId: string;
  crewName: string;
  indicator: IndicatorId;
  status: Status;
  reason: string;
  day: number;
}

export type ScenarioId = "nominal" | "fever" | "sleep" | "cardiac" | "isolation" | "storm";
