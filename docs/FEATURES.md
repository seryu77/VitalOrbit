# Features: VitalOrbit

This document lists every feature in the current prototype, and what is not built yet. All health readings are simulated, and all thresholds are illustrative. See [PRD.md](PRD.md) for the requirements and [system-design.md](system-design.md) for the rules.

## 1. App shell

| Feature | Description |
|---|---|
| Three views | Tabs for Astronaut, Crew, and Flight surgeon |
| Mission profile | Choose Space station, Moon, Mars, or Rover. Each shows its communication delay and sets the radiation limit |
| Mission day | The current mission day is shown in the header |
| Earth link toggle | Simulates the link to Earth going up or down. The label shows the delay when the link is up, or "working offline" when it is down |
| Demo scenarios | Six buttons that change the astronaut's recent readings: Normal day, Fever, Sleep debt, Cardiac event, Low mood, Solar storm |
| Simulated data tag | A visible "SIMULATED DATA" tag on every screen |
| Saved settings | Mission, scenario, link state, and the mood answer are saved in the browser, so they survive a reload. No server is used |
| Disclaimer footer | States that data is simulated, thresholds are illustrative, the tool is not a medical device, and AI assistance was used |

## 2. Astronaut view

### Overall status
- A banner shows the most serious status among all indicators: Normal, Attention, or Critical.
- A plain sentence explains what the status means and what to do.
- The Critical banner pulses slowly. The pulse is turned off if the user prefers reduced motion.

### Body map
- An abstract human figure with six clickable regions: head, heart, lungs, torso, bones and muscles, and whole body.
- Each region takes the color of its most serious indicator.
- Selecting a region highlights its indicators and dims the others. "Show all" clears the filter.
- A text legend gives the same selection without using the figure, and works with a keyboard.

### Health indicators (9)

| Indicator | Source shown | Hazard | Body region |
|---|---|---|---|
| Heart rate | Wearable | Gravity fields | Heart |
| Blood oxygen | Wearable | Hostile closed environments | Lungs |
| Body temperature | Wearable | Hostile closed environments | Torso |
| Blood pressure | Routine checkup | Gravity fields | Heart |
| Blood glucose | Routine checkup | Hostile closed environments | Torso |
| Sleep | Wearable | Isolation and confinement | Head |
| Mood | Daily questionnaire | Isolation and confinement | Head |
| Radiation dose | Dosimeter | Space radiation | Whole body |
| Body mass | Routine checkup | Gravity fields | Bones and muscles |

- Each indicator is a card with its value, unit, a status badge, and its source.
- Heart rate and blood oxygen carry a **LIVE** tag. Their displayed value moves slightly every 2 seconds to simulate a real-time wearable stream. The status is calculated from the stored reading, not from the moving display value.

### Indicator detail
Opens when a card, a body region, or an alert is selected. By default it shows the most serious indicator, so a next step is always on screen.
- Current value, unit, status, source, and related hazard.
- A one-line reason for the status.
- A 30-day trend chart with the normal, attention, and critical ranges shown as colored bands, and the exact value on hover or tap.
- **What to do now:** numbered steps for the current status, using on-board resources. A normal status says nothing is needed.
- **When to escalate:** when to involve the crew or the flight surgeon.
- **What it is, why it matters in space, how to measure it:** plain-language explanations for every indicator.

### Alerts
- A list of the astronaut's alerts, most serious first.
- A yellow alert is shown to the astronaut only.
- A red alert states that the crew was notified, and whether the flight surgeon report was sent or is queued on board, depending on the Earth link.
- "See what to do" opens the indicator detail.

### Today
- **Mood check:** a 1 to 5 scale. The answer replaces today's simulated mood value and the assessment updates immediately.
- **Reminders:** blood pressure and body mass checkup, exercise progress against the 120-minute daily goal, and a hydration reminder. Done and Due labels are shown.
- **Healthy habits:** an exercise streak in days, and points (10 for a full exercise session, 10 for 7 or more hours of sleep) over the last 30 days.

## 3. Crew view

- A list of every crew member with their overall status and a short note.
- Only the overall status is shown. Detailed readings stay private to each crew member and the flight surgeon.
- An emergency alerts list with the critical alerts of the whole crew, each with its delivery state.
- Three fictional crew members are simulated. The demo scenarios affect the first one.

## 4. Flight surgeon view

- A link panel for the chosen mission. It shows "link is up" with the delay, or "link is down" with the number of priority reports waiting on board.
- Tabs to switch between crew members, each with their overall status.
- A table of all indicators with the latest value, status, source, hazard, and a note for anything outside the normal range.
- The same trend chart as the astronaut view for the selected indicator, without the self-care guidance.
- An alert log for the selected crew member.

## 5. Assessment engine

| Feature | Description |
|---|---|
| Status per indicator | Each reading is classified green, yellow, or red against its bands |
| Personal baseline for body mass | Bands are 5% and 10% around the crew member's starting mass |
| Mission-based radiation limit | Yellow starts at 80% of the limit for the chosen mission, and red is above it |
| Sleep trend rule | Below 6 hours for 3 nights in a row becomes red |
| Mood trend rule | A score of 2 or lower for 3 days in a row becomes red, with a behavioral health follow-up |
| Heart rate trend rule | A resting heart rate that rises for 5 days in a row becomes yellow, even if today's value is in range |
| Persistence note | An indicator outside the normal range for more than 3 days adds a recommendation to contact the flight surgeon |
| Overall status | The most serious status among all indicators |
| Alert creation | Every yellow or red status creates an alert, most serious first |

## 6. Accessibility and design

- Status is always shown with color, an icon, and a text label together.
- Dark theme with high-contrast text.
- Touch targets of at least 44 px on the main controls.
- Keyboard access, visible focus, and ARIA labels on the body map, tabs, and toggles.
- Responsive layout: side by side on wide screens, a single column below 1024 px.

## 7. Not built yet

| Feature | Status |
|---|---|
| Camera safety check (computer vision) | Planned. Not in the prototype |
| Microscope analysis of blood and saliva | Planned |
| On-board sequencing for virus detection | Planned |
| Real wearable and IoT integration | Planned. The prototype uses simulated data |
| Manual entry of checkup values | Not built. Only the mood check accepts input |
| Real sync queue | Not built. The Earth link is a toggle that changes what the screens say |
| Alert acknowledgment and full history | Not built. Alerts reflect the latest day only |
| Scheduled reminders with notifications | Not built. Reminders are shown on screen only |
| Delay-aware sync | Planned |

## 8. Status against the PRD

| ID | Requirement | Status |
|---|---|---|
| A1 | Indicator cards with status | Done |
| A2 | Clickable body map | Done |
| A3 | Trend chart per indicator | Done |
| A4 | Next steps for yellow and red | Done |
| A5 | Plain-language explanations | Done |
| A6 | Overall status | Done |
| A7 | Reminders | Partial (shown on screen, not scheduled) |
| A8 | Manual entry | Partial (mood check only) |
| A9 | Points and streaks | Done |
| E1 | Yellow notifies the astronaut only | Done |
| E2 | Red notifies the crew and queues a flight surgeon report | Done (simulated) |
| E3 | Clear escalation guidance | Done |
| E4 | Alert log | Partial (latest day only) |
| C1 | Crew view | Done |
| C2 | Flight surgeon view | Done |
| C3 | Sync state | Partial (link toggle and waiting count) |
| M1 | Mission profiles | Done |
| M2 | Communication delay | Done |
| M3 | Works offline | Done (no server, settings saved on the device) |
| V1, V2 | Camera safety check | Not built |
