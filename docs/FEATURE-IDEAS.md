# Feature ideas: VitalOrbit

This document collects the team's feature ideas and develops each one. It is a roadmap, not a list of what is built. For what exists today, see [FEATURES.md](FEATURES.md).

Each idea has a size: **S** (hours), **M** (days), **L** (weeks or more, needs hardware or a trained model).

## 1. The team's ideas, developed

| # | Idea | How it works | Size | Notes |
|---|---|---|---|---|
| 1 | Heart rate from a wrist and suit IoT sensor | A wrist band and suit sensors stream heart rate, SpO2, and skin temperature over Bluetooth Low Energy to the on-board device. Suit sensors add respiration rate and heart rate variability (HRV). | L | The prototype simulates the stream. Real devices are the next step. |
| 2 | Computer vision for astronaut movement | A pose model runs on the device and checks movement and responsiveness. No video is stored. | L | Posture is out of scope, because neutral posture in microgravity differs from Earth training data. |
| 3 | Calculation of all features, then analysis with an LLM | The rule engine stays the source of truth for status. A small on-board language model then writes a plain-language summary of the numbers and trends. | M | The LLM explains. It never sets the status. It must work offline, so a small local model is needed. |
| 4 | Crew monitor dashboard | One screen for the whole crew with overall score, alerts, and link state. | S | Exists as the Crew view. Can grow with a timeline and a mission-wide trend. |
| 5 | Notifier when the astronaut shows a sickness or problem | Yellow notifies the astronaut. Red notifies the crew with sound, vibration, and a screen takeover. | M | Notification logic exists on screen. Real push and sound are not built. |
| 6 | Routine checkup notifier and upload to Earth | Scheduled prompts, guided measurement, and a queue that uploads to the Earth database when a link exists. | M | Reminders exist on screen. A real queue and upload are not built. |
| 7 | Automatic contact with Earth when critical | A red status builds a priority report and sends it first when a link is available. The report holds the readings, trends, and the on-board steps already taken. | M | Simulated today with the Earth link toggle. |
| 8 | Human structure check with computer vision | Estimates body landmarks to spot asymmetry, limited movement, or swelling over time, compared with the astronaut's own baseline. | L | Compare against the person's own history, not a standard body. Microgravity calibration is needed. |
| 9 | Real-time heart rate graph | A rolling 60 second graph with a resting baseline line and shaded normal range. | S | Heart rate already has a LIVE tag. A rolling graph is the missing piece. |
| 10 | Overall health score 0 to 100 | One number built from the indicator statuses and trends, with the reasons that lower it. | S | Must show its breakdown so the number is never a black box. |
| 11 | Suggestion for a sickness based on resources | Suggests possible causes and the next steps that use only what is in the on-board medical kit. | M | Decision support, not diagnosis. Always states when to escalate. |

## 2. New ideas by area

### Sensing and data
| Idea | Description | Size |
|---|---|---|
| Heart rate variability | A stress and recovery signal that is more sensitive than resting heart rate | M |
| Respiration rate | From the suit or from the camera, to catch early breathing problems | M |
| Sleep stages | Light, deep, and REM from the wearable, with a circadian rhythm view | M |
| Cabin air | CO2, humidity, and temperature feed into the same assessment, since a hostile closed environment is a NASA hazard | M |
| Hydration and nutrition log | Fluid and calorie intake with a quick entry screen | S |
| Voice stress check | Pitch and speech rate changes during routine calls, run on the device | L |
| Cognitive test | A 2 minute reaction time test each day to track fatigue and cognition | M |
| Vision check | Simple on-screen eye chart for spaceflight vision changes | M |

### Assessment and intelligence
| Idea | Description | Size |
|---|---|---|
| Personal baselines | Thresholds learned from each person's own history instead of fixed ranges | M |
| Anomaly detection | Flags unusual combinations, such as high heart rate with normal activity | M |
| Early warning trend | Projects a trend forward and warns before a threshold is crossed | M |
| Explanation of the score | A "why did my score drop" panel, in plain language | S |
| Confidence and data quality | Marks a reading as unreliable when a sensor is loose or missing | M |
| Ask the copilot | A chat box where the astronaut asks about their own data, answered from the stored readings and the guidance library | M |

### Response and escalation
| Idea | Description | Size |
|---|---|---|
| Resource-aware guidance | Steps change with what is in the medical kit, and show what is missing | M |
| Emergency checklist mode | Large, step by step screen with a timer for red events, usable with gloves | M |
| Medical kit inventory | Tracks supplies, expiry, and what each suggestion would use up | M |
| Alert acknowledgment | A crew member confirms they saw a red alert, and the alert escalates if nobody does | S |
| Delay-aware messaging | Shows expected reply time for the mission, and what to do while waiting | S |
| Handover report | One page summary for the flight surgeon with the key trend charts | S |
| Telemedicine pre-brief | Packs the readings so a call with Earth starts with the data already in view | M |

### Crew wellbeing
| Idea | Description | Size |
|---|---|---|
| Mood journal | A short daily note with a private option | S |
| Isolation support | Prompts to call family, a mission-time reminder of messages from Earth, and group activity suggestions | S |
| Exercise coach | Daily exercise plan against bone and muscle loss, with form checks from the camera | L |
| Recovery mode | After a red event, a gentler plan and follow-up checks for several days | M |
| Crew conflict signal | Aggregated and anonymous team stress indicator, shown to the crew only | L |

### Mission operations
| Idea | Description | Size |
|---|---|---|
| Radiation forecast | Combines the dosimeter with a solar storm alert and suggests moving to shielded areas | M |
| EVA readiness | A pre-spacewalk check using sleep, heart rate, and hydration | M |
| Mission timeline | Plots health against mission events such as docking or a spacewalk | M |
| Multi-mission compare | Compares indicators across station, Moon, and Mars profiles | S |
| Data export | Exports a report as a file for the flight surgeon, even with no link | S |

### Platform
| Idea | Description | Size |
|---|---|---|
| Installable offline app | Works as an installed app, with a service worker cache | S |
| Local encryption | Stores health data encrypted on the device | M |
| Role permissions | Astronaut, crew, and surgeon see different detail levels | M |
| Audit log | Records who saw or changed what | M |
| Language options | Multiple languages for international crews | M |

## 3. Suggested priority

### Built in the prototype
1. Overall health score 0 to 100 with a breakdown (#10)
2. Real-time heart rate rolling graph (#9)
3. Resource-based suggestion for possible causes (#11), rule based
4. Automatic Earth report builder for red status (#7), simulated
5. Alert acknowledgment (S)
6. Plain-language summary, rule based (first step toward #3)
7. Early warning trend
8. Data export (report as a text file)
9. Camera safety check and spine screening cue (first step toward #2 and #8)

### Next phase (days)
- LLM summary of the numbers (#3), local model
- Personal baselines, anomaly detection, early warning trend
- Real notification, sound, and a sync queue (#5, #6)
- Medical kit inventory and resource-aware guidance

### Vision (needs hardware or trained models)
- IoT wrist and suit sensors (#1)
- Computer vision for movement and body structure (#2, #8)
- Voice stress, cognitive test, exercise coach with form checks

## 4. Safety and honesty rules for every idea

- VitalOrbit supports decisions. It does not diagnose and is not a medical device.
- The rule engine sets the status. An LLM may explain it, but never changes it.
- Every suggestion states when to involve the crew or the flight surgeon.
- Computer vision runs on the device, stores no video, and can be turned off by the crew member.
- Vision models trained on Earth need calibration for microgravity before any claim is made.
- The health score always shows what lowered it.
- Anything not built is labeled "planned" in the README and the demo.
