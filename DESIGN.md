# Design: VitalOrbit

This document describes the visual and interaction design of VitalOrbit.

## 1. Design principles

1. **Status first.** The answer to "Am I okay?" is visible before anything else.
2. **Plain language.** Astronauts are not doctors. Every number comes with a meaning.
3. **Always a next step.** A warning without an action is not shown.
4. **Calm by default.** Color and motion are reserved for things that need attention.
5. **Readable under stress.** Large text, high contrast, large touch targets.

## 2. Users and their main question

| User | Main question | Answered by |
|---|---|---|
| Astronaut | "Am I okay, and what should I do?" | Overall status, body map, guidance |
| Crew | "Does anyone need help?" | Crew status list, alerts |
| Flight surgeon | "What happened, and how did it develop?" | History, trends, alert log |

## 3. Screens

### 3.1 Astronaut dashboard (main screen)

```
+------------------------------------------------------------------+
|  VitalOrbit      Mission: Mars    Day 142    Link: 12 min delay  |
+------------------------------------------------------------------+
|  OVERALL STATUS:  ATTENTION                    [ Alerts (2) ]    |
+----------------------+-------------------------------------------+
|                      |  Heart rate      72 bpm        GREEN      |
|      BODY MAP        |  SpO2            97 %          GREEN      |
|                      |  Temperature     37.8 °C       YELLOW     |
|    (clickable        |  Blood pressure  124 mmHg      GREEN      |
|     human figure)    |  Sleep           5.5 h         YELLOW     |
|                      |  Radiation       within limit  GREEN      |
|                      |  Mood            4 / 5         GREEN      |
+----------------------+-------------------------------------------+
|  TODAY:  Mood check due   |   Exercise 0 / 2 h   |   Streak: 6   |
+------------------------------------------------------------------+
```

### 3.2 Indicator detail

Opens when an indicator card or a body region is selected.

| Section | Content |
|---|---|
| Current value | Value, unit, status, time of the last reading |
| Trend chart | Values across mission days, with the green, yellow, and red ranges shown as bands |
| What it is | One or two plain sentences |
| Why it matters in space | The related hazard and its effect |
| How to measure it | Short instructions |
| What to do now | Numbered steps for the current status |
| When to escalate | When to involve the crew or the flight surgeon |

### 3.3 Alerts

A list of alerts, newest first. Each shows the status, the indicator, the cause, the time, and who was informed.

### 3.4 Crew view

One row per crew member with their overall status. Detailed readings are not shown here.

### 3.5 Flight surgeon view

Crew member selection, full indicator history, trend charts, alert log, and sync state.

## 4. Body map

- A simple, neutral human figure with selectable regions: head, heart, lungs, torso, bones and muscles.
- Each region takes the color of its most serious indicator.
- Selecting a region lists its indicators and opens the indicator detail.
- The figure is abstract and does not depict a real person.

| Region | Indicators |
|---|---|
| Head | Mood, stress, sleep |
| Heart | Heart rate, blood pressure |
| Lungs | SpO2 |
| Torso | Temperature, blood glucose |
| Bones and muscles | Body mass, exercise |
| Whole body | Radiation dose |

## 5. Color

Status is never shown by color alone. Each status also has a text label and an icon, so it stays readable for people with color vision deficiency.

| Status | Color | Label | Icon |
|---|---|---|---|
| Normal | Green `#2E9E5B` | NORMAL | Check mark |
| Attention | Amber `#E0A100` | ATTENTION | Exclamation mark |
| Critical | Red `#D64045` | CRITICAL | Warning triangle |
| No data | Gray `#8A94A6` | NO DATA | Dash |

Interface colors:

| Use | Color |
|---|---|
| Background | `#0B1020` |
| Surface (cards) | `#151B2E` |
| Border | `#27304A` |
| Primary text | `#F2F5FA` |
| Secondary text | `#A9B3C7` |
| Accent | `#4C8DFF` |

A dark theme is used to reduce glare in a dim cabin. Text and background combinations target a contrast ratio of at least 4.5 to 1.

## 6. Typography

| Use | Size | Weight |
|---|---|---|
| Overall status | 28 px | Bold |
| Indicator value | 24 px | Semibold |
| Section heading | 18 px | Semibold |
| Body text | 16 px | Regular |
| Caption, units | 14 px | Regular |

Font: Inter, with a system sans-serif fallback. Numbers use tabular figures so values do not shift as they update.

## 7. Components

| Component | Description |
|---|---|
| Status badge | Color, icon, and label together |
| Indicator card | Name, value, unit, status badge, small trend line |
| Trend chart | Line chart with status range bands |
| Body map | Clickable figure with colored regions |
| Guidance panel | Explanation and numbered steps |
| Alert item | Status, cause, time, escalation |
| Reminder chip | Task name and due state |
| Link indicator | Communication delay and sync state |

## 8. Interaction

- Every indicator is reachable in one tap from the dashboard.
- Touch targets are at least 44 by 44 px.
- A red alert opens as a banner that stays until it is acknowledged.
- A yellow alert appears in the alert list without interrupting.
- Charts show the exact value on hover or tap.
- All interactive elements are reachable by keyboard and have visible focus.

## 9. Motion

- Motion is used only to draw attention to a change in status.
- A red status pulses slowly until acknowledged.
- All motion is disabled when the user prefers reduced motion.

## 10. Tone of voice

| Do | Do not |
|---|---|
| "Your temperature is slightly high." | "Hyperthermia detected." |
| "Rest and drink water. Measure again in 1 hour." | "Monitor condition." |
| "Tell your crew and contact the flight surgeon." | "Seek medical attention." |

Sentences are short. Instructions start with a verb. Medical terms are explained when they are used.

## 11. Responsive layout

| Width | Layout |
|---|---|
| 1024 px and wider | Body map and indicator cards side by side |
| 600 to 1023 px | Body map above the indicator cards |
| Below 600 px | Single column, body map collapsed by default |

## 12. Content rules

- No NASA logos, flags, or mission identifiers.
- No images or likeness of real people.
- Simulated data is labeled as simulated in the interface.
- Any AI-generated image or video carries a visible watermark.
