# System Design: VitalOrbit

This document describes how the system behaves: where data comes from, how it is assessed, and how alerts are raised and escalated. For how the code is organized, see [architecture.md](architecture.md).

## 1. Overview

```
 +------------------+     +---------------------+     +----------------------+
 |  DATA SOURCES    |     |  ASSESSMENT ENGINE  |     |  OUTPUT              |
 |                  |     |                     |     |                      |
 |  Wearable        | --> |  1. Normalize       | --> |  Astronaut view      |
 |  Routine checkup | --> |  2. Apply rules     | --> |  Crew view           |
 |  Station camera  | --> |  3. Check trends    | --> |  Flight surgeon view |
 |  Dosimeter       | --> |  4. Map to hazard   |     |                      |
 |  Questionnaire   | --> |  5. Raise alerts    |     |                      |
 +------------------+     +---------------------+     +----------------------+
                                    |
                                    v
                          +---------------------+
                          |  LOCAL STORAGE      |
                          |  Readings, alerts,  |
                          |  sync queue         |
                          +---------------------+
                                    |
                                    v  (when a link to Earth exists)
                          +---------------------+
                          |  FLIGHT SURGEON     |
                          +---------------------+
```

Design principle: **everything the astronaut needs runs on board.** Earth is informed, not required.

## 2. Data sources

| Source | Readings | Frequency | In the prototype |
|---|---|---|---|
| Wearable | Heart rate, SpO2, body temperature, sleep | Continuous | Simulated stream |
| Routine checkup | Blood pressure, body mass, blood glucose | Scheduled | Simulated history, manual entry |
| Station camera | Movement, responsiveness | Continuous | Device webcam (stretch goal) |
| Dosimeter | Daily and cumulative radiation dose | Daily | Simulated |
| Questionnaire | Mood, stress, sleep quality | Daily | Manual entry |

## 3. Assessment engine

Each reading passes through five steps.

1. **Normalize.** Convert the reading to a common shape: indicator, value, unit, time, source.
2. **Apply rules.** Compare the value against the thresholds for that indicator and assign green, yellow, or red.
3. **Check trends.** Look at recent history for sustained changes that a single reading would miss.
4. **Map to hazard.** Attach the related spaceflight hazard and the affected body part.
5. **Raise alerts.** Create an alert when the status is yellow or red, and escalate if needed.

### 3.1 Status levels

| Status | Meaning | Who is informed |
|---|---|---|
| Green | Within the expected range | No one |
| Yellow | Needs attention | The astronaut |
| Red | Critical | The astronaut, the crew, and the flight surgeon |

The overall status of a crew member is the most serious status among their indicators.

### 3.2 Illustrative thresholds

These values are **for demonstration only**. They are based on general adult reference ranges, not on spaceflight medical standards. In a real mission, flight surgeons would set them for each crew member.

| Indicator | Green | Yellow | Red |
|---|---|---|---|
| Resting heart rate (bpm) | 50 to 100 | 40 to 49, or 101 to 120 | Below 40, or above 120 |
| SpO2 (%) | 95 or higher | 90 to 94 | Below 90 |
| Body temperature (°C) | 36.1 to 37.5 | 37.6 to 38.4, or 35.0 to 36.0 | 38.5 or higher, or below 35.0 |
| Systolic blood pressure (mmHg) | 90 to 129 | 130 to 179, or 80 to 89 | 180 or higher, or below 80 |
| Fasting blood glucose (mg/dL) | 70 to 99 | 54 to 69, or 100 to 125 | Below 54, or above 125 |
| Body mass (change from mission baseline) | Within 5% | 5% to 10% | More than 10% |
| Sleep (hours per night) | 7 or more | 6 to 6.9 | Below 6 |
| Mood score (1 to 5) | 4 to 5 | 3 | 1 to 2 |
| Radiation dose | Below the configured daily limit | Near the configured limit | Above the configured limit |

Radiation limits are a configuration value in the mission profile and are not fixed in this document.

### 3.3 Trend rules

A single reading can be misleading, so the engine also checks patterns over time.

| Pattern | Result |
|---|---|
| Sleep below 6 hours for 3 nights in a row | Red, with advice to contact the flight surgeon |
| Mood score of 2 or lower for 3 days in a row | Red (behavioral health follow-up) |
| Resting heart rate rising for 5 days in a row | Yellow, even if today's value is in range |
| Any indicator outside the green range for more than 3 days | Recommendation to contact the flight surgeon |

### 3.4 Hazard mapping

| Hazard | Indicators | Body map region |
|---|---|---|
| Space radiation | Radiation dose | Whole body |
| Isolation and confinement | Mood, stress, sleep | Head |
| Distance from Earth | Mood, sync state | Head |
| Gravity fields | Blood pressure, body mass, heart rate | Heart, bones, muscles |
| Hostile closed environments | Temperature, SpO2, blood glucose | Lungs, torso |

## 4. Alerts and escalation

```
 Reading assessed
       |
       +-- Green  --> no alert
       |
       +-- Yellow --> notify astronaut
       |              show explanation and self-care steps
       |              log the alert
       |
       +-- Red    --> notify astronaut and crew
                      show on-board response steps
                      queue priority report for the flight surgeon
                      log the alert
```

Rules:

- A yellow alert that persists for more than 3 days becomes a recommendation to contact the flight surgeon.
- An alert is not repeated while its cause is unchanged.
- Every alert records its time, indicator, value, status, and cause.

## 5. Guidance

Each indicator has guidance content with four parts:

| Part | Content |
|---|---|
| What it is | One or two sentences in plain language |
| Why it matters in space | The related hazard and its effect |
| How to measure it | Short instructions |
| What to do | Steps for yellow and for red, using only on-board resources |

Guidance always states when a result needs attention from the crew or from flight surgeons. It does not replace them.

## 6. Reminders

The system prompts the astronaut as part of the mission routine.

| Reminder | Schedule |
|---|---|
| Blood pressure and body mass | Scheduled checkup days |
| Mood questionnaire | Daily |
| Exercise session | Daily |
| Hydration | Several times a day |

A missed reminder is shown as overdue. It does not raise an alert on its own.

## 7. Camera safety check

Purpose: detect an emergency when the astronaut cannot report it.

1. The camera feed is processed on the device with a pose estimation model.
2. If a person is detected but their body landmarks stay nearly still for longer than a set time, the system asks for a response on screen.
3. If there is no response, a red alert is raised.

Constraints:

- Video is never stored or transmitted. Only the alert is recorded.
- Pose models are trained on Earth data. In microgravity the body rests in a different neutral posture, so posture-based judgments are out of scope. The check is limited to movement and responsiveness.
- The check can be turned off by the crew member.

## 8. Mission profiles

The mission profile sets the context for the system.

| Profile | One-way communication delay (approximate) |
|---|---|
| Space station (low Earth orbit) | Near real time |
| Moon | Just over 1 second |
| Mars | About 4 to 24 minutes, depending on planetary positions |
| Rover | Same as its host location |

The profile affects how the sync state is shown and how strongly the system favors on-board action over waiting for Earth.

## 9. Offline behavior and sync

- All readings, alerts, and settings are stored on the device.
- Reports for the flight surgeon are placed in a queue.
- When a link is available, queued reports are sent, with red alerts first.
- The astronaut can always see what has been sent and what is waiting.

In the prototype, the link is simulated with a toggle.

## 10. Privacy and safety

- Health data stays on the device unless it is sent to the flight surgeon.
- The crew view shows the overall status of each member, not their detailed readings.
- Camera processing is local, and no video leaves the device.
- VitalOrbit supports decisions. It does not diagnose, and it is not a medical device.

## 11. Future extensions

| Extension | Description |
|---|---|
| Microscope analysis | Classify blood cells and detect bacteria in blood and saliva samples |
| On-board sequencing | Identify viruses, which are too small for light microscopy |
| Real devices | Read wearables and station sensors directly |
| Personal baselines | Thresholds learned from each crew member's history |
| Delay-aware sync | Plan transmissions around link windows |
