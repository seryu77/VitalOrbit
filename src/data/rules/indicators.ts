// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// Thresholds here are ILLUSTRATIVE values for demonstration only. They are based
// on general adult reference ranges, not on spaceflight medical standards. In a
// real mission, flight surgeons would set them for each crew member.
//
// Hazard names follow NASA's Human Research Program, "5 Hazards of Human
// Spaceflight": https://www.nasa.gov/hrp/hazards/

import type { IndicatorDef, IndicatorId, MissionProfile, Region } from "../../lib/types";

export const INDICATORS: IndicatorDef[] = [
  {
    id: "hr",
    label: "Heart rate",
    unit: "bpm",
    source: "Wearable",
    hazard: "Gravity fields",
    region: "heart",
    decimals: 0,
    bands: { green: [50, 100], yellow: [40, 120] },
    guidance: {
      what: "How many times your heart beats in one minute while you are at rest.",
      why: "Without gravity, body fluids shift toward the head and the heart works differently. Over time the heart and blood vessels can lose conditioning.",
      how: "Sit still for 5 minutes with your wearable on. Read the resting value.",
      yellow: [
        "Rest for 10 minutes and measure again.",
        "Drink water. Dehydration raises heart rate.",
        "Note any chest discomfort, dizziness, or shortness of breath.",
      ],
      red: [
        "Stop all activity and rest in a secured position.",
        "Tell a crew member now. Do not stay alone.",
        "Measure blood pressure and blood oxygen.",
        "Prepare the on-board medical kit and follow the cardiac checklist.",
      ],
      escalate: "Red, or yellow with chest pain or fainting: tell the crew and contact the flight surgeon.",
    },
  },
  {
    id: "spo2",
    label: "Blood oxygen",
    unit: "%",
    source: "Wearable",
    hazard: "Hostile closed environments",
    region: "lungs",
    decimals: 0,
    bands: { green: [95, 100], yellow: [90, 100] },
    guidance: {
      what: "The share of your red blood cells that are carrying oxygen.",
      why: "You live in a sealed cabin. Air quality depends on life support systems, and carbon dioxide can build up in pockets where air does not move.",
      how: "Keep your hand still and warm. Wait for a steady reading from the wearable sensor.",
      yellow: [
        "Move to an area with good airflow.",
        "Take slow, deep breaths for 2 minutes and measure again.",
        "Check the cabin air quality readings.",
      ],
      red: [
        "Tell a crew member now.",
        "Use supplemental oxygen from the medical kit if it is available.",
        "Check cabin air quality and carbon dioxide levels.",
      ],
      escalate: "Red, or yellow that does not improve in 15 minutes: tell the crew and contact the flight surgeon.",
    },
  },
  {
    id: "temp",
    label: "Body temperature",
    unit: "°C",
    source: "Wearable",
    hazard: "Hostile closed environments",
    region: "torso",
    decimals: 1,
    bands: { green: [36.1, 37.5], yellow: [35.0, 38.4] },
    guidance: {
      what: "How warm your body is. A raised temperature often means your body is fighting an infection.",
      why: "Spaceflight changes the immune system, and microbes spread easily in a closed cabin shared by the whole crew.",
      how: "Use the wearable reading, or the thermometer in the medical kit for a second check.",
      yellow: [
        "Rest and drink water.",
        "Measure again in 1 hour.",
        "Note other symptoms: sore throat, cough, aches, rash.",
        "Limit close contact with crew members until you know the cause.",
      ],
      red: [
        "Tell a crew member now.",
        "Rest and drink water.",
        "Take fever medication from the medical kit as directed by its label.",
        "Measure again every 30 minutes and log each reading.",
      ],
      escalate: "Red, or yellow for more than 2 days: tell the crew and contact the flight surgeon.",
    },
  },
  {
    id: "bp",
    label: "Blood pressure",
    unit: "mmHg",
    source: "Routine checkup",
    hazard: "Gravity fields",
    region: "heart",
    decimals: 0,
    bands: { green: [90, 129], yellow: [80, 179] },
    guidance: {
      what: "The force of blood against your artery walls when the heart beats (the upper number, systolic).",
      why: "Fluid shifts in microgravity change how blood pressure is regulated. This matters most when you return to gravity.",
      how: "Rest for 5 minutes. Place the cuff on your upper arm at heart level and keep still.",
      yellow: [
        "Rest for 10 minutes and measure again.",
        "Reduce salt in your next meals.",
        "Keep to your exercise schedule.",
      ],
      red: [
        "Stop all activity and rest.",
        "Tell a crew member now.",
        "Measure again after 5 minutes to confirm.",
        "Watch for severe headache, vision changes, or chest pain.",
      ],
      escalate: "Red, or yellow on 3 checkups in a row: tell the crew and contact the flight surgeon.",
    },
  },
  {
    id: "glucose",
    label: "Blood glucose",
    unit: "mg/dL",
    source: "Routine checkup",
    hazard: "Hostile closed environments",
    region: "torso",
    decimals: 0,
    bands: { green: [70, 99], yellow: [54, 125] },
    guidance: {
      what: "The amount of sugar in your blood before eating. It shows how well your body is fueled.",
      why: "Food choices are limited on a mission, appetite can drop, and nutrition directly affects energy, mood, and recovery.",
      how: "Measure before breakfast with the glucose meter in the medical kit.",
      yellow: [
        "If low: eat a snack with carbohydrates and measure again in 15 minutes.",
        "If high: drink water and avoid sugary food at your next meal.",
        "Check that you are eating your full meal plan.",
      ],
      red: [
        "Tell a crew member now.",
        "If low: take fast sugar (juice or glucose tablets) right away.",
        "Measure again in 15 minutes.",
      ],
      escalate: "Red, or repeated yellow readings: tell the crew and contact the flight surgeon.",
    },
  },
  {
    id: "sleep",
    label: "Sleep",
    unit: "h",
    source: "Wearable",
    hazard: "Isolation and confinement",
    region: "head",
    decimals: 1,
    bands: { green: [7, 24], yellow: [6, 24] },
    guidance: {
      what: "How many hours you slept last night.",
      why: "There is no natural day and night on a mission. Noise, light, and workload disturb sleep, and poor sleep leads to mistakes.",
      how: "Wear your wearable while sleeping. It records your sleep time.",
      yellow: [
        "Dim the lights and avoid screens 1 hour before sleep.",
        "Keep the same sleep and wake time every day.",
        "Avoid caffeine in the 6 hours before sleep.",
      ],
      red: [
        "Tell your crew that you are short on sleep before any critical task.",
        "Ask to move demanding tasks to a later time.",
        "Schedule a recovery sleep period today.",
      ],
      escalate: "Less than 6 hours for 3 nights in a row: contact the flight surgeon.",
    },
  },
  {
    id: "mood",
    label: "Mood",
    unit: "/ 5",
    source: "Daily questionnaire",
    hazard: "Isolation and confinement",
    region: "head",
    decimals: 0,
    bands: { green: [4, 5], yellow: [3, 5] },
    guidance: {
      what: "Your own rating of how you feel today, from 1 (very low) to 5 (very good).",
      why: "You are far from home, in a small space, with the same few people for a long time. This affects mood and how the crew works together.",
      how: "Answer the daily mood check honestly. It takes a few seconds.",
      yellow: [
        "Take a short break and do something you enjoy.",
        "Talk with a crew member.",
        "Exercise. It helps mood as well as the body.",
      ],
      red: [
        "Talk to a crew member you trust today.",
        "Record a message for family or friends.",
        "Ask for a private session with the flight surgeon or behavioral health team.",
      ],
      escalate: "A score of 2 or lower for 3 days in a row: contact the flight surgeon.",
    },
  },
  {
    id: "radiation",
    label: "Radiation dose",
    unit: "mSv/day",
    source: "Dosimeter",
    hazard: "Space radiation",
    region: "body",
    decimals: 2,
    // Replaced at run time by the limit of the mission profile.
    bands: { green: [0, 0.8], yellow: [0, 1] },
    guidance: {
      what: "The amount of space radiation your body absorbed today, measured by your personal dosimeter.",
      why: "Outside Earth's protective magnetic field and atmosphere, radiation exposure is higher. It raises long-term health risks, and a solar storm can raise it quickly.",
      how: "Keep your personal dosimeter on you at all times. It records the dose automatically.",
      yellow: [
        "Spend more time in the better-shielded areas of the vehicle.",
        "Check the space weather forecast.",
        "Postpone activities outside the vehicle if possible.",
      ],
      red: [
        "Move to the radiation shelter now and tell the crew.",
        "Stay there until the dose rate falls.",
        "Log your dosimeter reading every hour.",
      ],
      escalate: "Any red reading: tell the crew and send the dose log to the flight surgeon.",
    },
  },
  {
    id: "mass",
    label: "Body mass",
    unit: "kg",
    source: "Routine checkup",
    hazard: "Gravity fields",
    region: "limbs",
    decimals: 1,
    // Replaced at run time by a range around the crew member's baseline.
    bands: { green: [0, 0], yellow: [0, 0] },
    guidance: {
      what: "Your body mass compared with your mass at the start of the mission.",
      why: "Without gravity, muscles and bones do less work and weaken. Losing mass can be a sign of muscle loss or of not eating enough.",
      how: "Use the body mass measurement device on scheduled checkup days.",
      yellow: [
        "Complete your full daily exercise session, including resistance exercise.",
        "Check that you are eating your full meal plan.",
        "Measure again at the next checkup.",
      ],
      red: [
        "Review your food intake for the past week with a crew member.",
        "Do not skip exercise sessions.",
        "Send your mass and nutrition log to the flight surgeon.",
      ],
      escalate: "A change of more than 5% from baseline: contact the flight surgeon.",
    },
  },
];

export const INDICATOR_BY_ID = Object.fromEntries(INDICATORS.map((d) => [d.id, d])) as Record<
  IndicatorId,
  IndicatorDef
>;

export const REGIONS: { id: Region; label: string }[] = [
  { id: "head", label: "Head" },
  { id: "heart", label: "Heart" },
  { id: "lungs", label: "Lungs" },
  { id: "torso", label: "Torso" },
  { id: "limbs", label: "Bones and muscles" },
  { id: "body", label: "Whole body" },
];

// Communication delays are approximate. Radiation limits are illustrative
// configuration values for the demo, not real mission limits.
export const PROFILES: MissionProfile[] = [
  { id: "station", name: "Space station", delayLabel: "near real time", radLimit: 1.0 },
  { id: "moon", name: "Moon", delayLabel: "about 1 s delay", radLimit: 1.5 },
  { id: "mars", name: "Mars", delayLabel: "4 to 24 min delay", radLimit: 2.0 },
  { id: "rover", name: "Rover (Mars surface)", delayLabel: "4 to 24 min delay", radLimit: 2.0 },
];
