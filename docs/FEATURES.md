# Features: VitalOrbit

This document lists every feature in the current prototype, and what is not built yet. All health readings are simulated, and all thresholds are illustrative. See [PRD.md](PRD.md) for the requirements and [system-design.md](system-design.md) for the rules.

## 1. App shell

| Feature | Description |
|---|---|
| Three views | Tabs for Astronaut, Crew, and Flight surgeon |
| Mission profile | Choose Space station, Moon, Mars, or Rover. Each shows its communication delay and sets the radiation limit |
| Mission day | The current mission day is shown in the header |
| Earth link toggle | Simulates the link to Earth going up or down. The label shows the delay when the link is up, or "working offline" when it is down |
| Demo scenarios | Seven buttons that change the astronaut's recent readings: Normal day, Fever, Sleep debt, Cardiac event, Low mood, Solar storm, Slow drift |
| Simulated data tag | A visible "SIMULATED DATA" tag on every screen |
| Saved settings | Mission, scenario, link state, and the mood answer are saved in the browser, so they survive a reload. No server is used |
| Disclaimer footer | States that data is simulated, thresholds are illustrative, the tool is not a medical device, and AI assistance was used |

## 2. Astronaut view

### Overall status
- A banner shows the most serious status among all indicators: Normal, Attention, or Critical.
- A plain sentence explains what the status means and what to do.
- The Critical banner pulses slowly. The pulse is turned off if the user prefers reduced motion.

### Body map
- A human figure with the skeleton, muscles, organs, and brain: skull, spine, ribcage, pelvis, arm and leg bones, lungs and airway, heart and aorta, liver, stomach, and intestines. It is a generic figure and does not depict a real person.
- Six clickable regions: head, heart, lungs, torso, bones and muscles, and whole body (radiation ring). Each takes the color of its most serious indicator.
- **From a distance:** every region has a label with its name, a status icon, and a status word, joined to the figure by a line. The state of the whole body can be read without selecting anything.
- **Up close:** selecting a region zooms in with a smooth animation, dims the other regions, names the parts (for example brain, skull, jaw, neck), and reveals finer detail such as brain folds, heart chambers, bronchial branches, muscle fibers, and the kneecap. Text keeps the same size at every zoom level.
- A detail card under the figure explains the region and lists its indicators with value and status. Selecting an indicator there opens its full detail.
- "Zoom out", Escape, or selecting the region again returns to the whole body. Reduced-motion settings turn the animation off.
- Selecting a region also highlights its indicators and dims the others. "Show all" clears the filter.
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

## 6. Camera safety check

- Turned on by the user with "Start safety camera". The browser asks for camera permission, and the check can be turned off at any time.
- Three MediaPipe models run in the browser on every frame: Pose Landmarker (33 body points), Hand Landmarker (21 points per hand, up to two hands), and Face Landmarker (478 points, including the irises). The models and runtime are bundled with the app, so the check works offline.
- The camera preview shows what was found: a face mesh with the eyes, brows, lips, face outline, and irises in separate colors; the body skeleton; and every joint of each hand, with the thumb, index, middle, ring, and little finger in their own colors and a larger dot on each fingertip.
- A readout under the preview lists how many points were found for the body, face, and hands, and the frame rate. For each hand it shows how many fingers are open and which ones, so an open hand reads as five fingers.
- "Enlarge" makes the preview bigger for more detail. The body, hands, and face layers can each be turned off.
- The check follows movement of the body, each hand, and the face, so it still works when the person is close to the camera and only the face or hands are in view. A moving finger counts as movement. Small jitter is ignored. After the set time without movement (15 seconds by default) a full-screen "Are you OK?" prompt appears with a countdown and a beep.
- The person answers by pressing "I'm OK", or by moving or waving.
- With no answer after the set time (8 seconds by default), a red alert is raised. It shows in the astronaut alerts, the crew emergency list, the alert log, and the sync queue, and the overall status turns Critical.
- The alert stays open until the person cancels it with "I'm OK, cancel the alert", or acknowledges it in the alert list.
- Both times can be changed with sliders. "Test alert flow" starts the check at once, for demos.
- A person who leaves the view cancels the check, because absence alone is not evidence of an emergency.
- Video is never stored or sent. Only the alert is kept. The safety check does not judge posture. Posture is covered by the separate spine check below.
- The face and hand models are used for tracking only. The app does not identify people, read expressions, or keep any face data.

### Spine check (screening cue)

A line is drawn down the middle of the body on the camera preview, with a mark for each of the 24 vertebrae (7 neck in blue, 12 chest in white, 5 lower back in orange), labeled C7 and Sacrum, and a dashed vertical reference line.

- **What it can see.** The camera sees only the surface of the body. The spine line is estimated from three measured points: the head (ears), the shoulders, and the hips. The curve between them is not measured, and the vertebra marks are placed along the line by proportion. It cannot show the real shape of the spine.
- **Facing the camera** it measures the tilt of the shoulder line and the hip line, the lean of the trunk from vertical, the bend of the axis at the shoulders, and the sideways offset of the head. Shoulders and hips tilting in opposite directions, with a lean or bend, is reported as a pattern consistent with a lateral curve (scoliosis-like).
- **Standing sideways** it measures the head angle (how far forward the head sits) and how far the ear, shoulder, and hip are from a straight line. A forward head or a rounded upper back is reported as a pattern consistent with kyphosis-like posture.
- The view is chosen automatically from the proportions of the body. Part way between the two views gives no reading.
- A live readout and a color on the spine line (green aligned, yellow mild, red marked) update as the person moves.
- **Run spine check (8 s)** takes the middle value of every measurement over eight seconds, so noise in single frames does not decide. The result shows a summary and the specific findings.
- A mild or marked result is added to the alert log and the alert list as an **Attention** alert for the astronaut. It does not notify the crew or queue a report, because posture is not an emergency. A marked result advises contacting the flight surgeon if it persists.
- The thresholds are illustrative: 3° and 6° for tilts and lean, 4° and 8° for bend, 50° and 40° for the head angle, 15° and 25° for back rounding.
- **Limits.** It is a screening cue, not a diagnosis. A curve of the spine is confirmed only by a clinical exam and an X-ray. The camera must be level, because a tilted camera tilts every angle. In microgravity the spine lengthens and the neutral posture changes, so a real system would need calibration against the person's own baseline.

## 7. More astronaut tools

| Feature | Description |
|---|---|
| Log a checkup | Enter systolic blood pressure, body mass, and blood glucose. Values are range-checked, the assessment updates at once, and recent entries are listed. Values stay until the scenario changes or the demo is reset |
| Alert log | Every alert is kept on the device with its time, source, status, cause, delivery, and acknowledgment. It can be filtered by status. The same log is shown to the flight surgeon for each crew member |
| Acknowledge | Each alert has an Acknowledge button. A camera alert is cancelled with "I'm OK" |
| Sync queue | Red alerts are queued for the flight surgeon. When the Earth link is on, they are sent one at a time, with the send time recorded. The panel shows how many were sent and how many are waiting |
| Reminders | Checkup, mood check, exercise, and water. Water is due every 30 minutes by default, or every 1 minute, 1 hour, or 2 hours. A toast appears on screen and, if permitted, a browser notification |
| Exercise | "+30 min" adds exercise minutes to today, which updates the streak and points |
| Reset demo | Clears the alert log and today's entries |

## 8. Insights

All insights are rule based and run on the device. They never change a status: the assessment engine stays the source of truth.

| Feature | Description |
|---|---|
| Health score 0 to 100 | Shown in the overall status panel as a ring. Each yellow indicator removes 8 points, each red one 22, a finding that persists for more than 3 days 4 more, and an open camera finding counts too. "Why this score?" lists every deduction with its reason. Green from 85, yellow from 60 |
| Live heart rate graph | A rolling 60-second graph with the normal range shaded and today's resting value as a dashed line. It shows the current, minimum, and maximum value. The stream is simulated around the day's reading, or uses the local real-time server when it runs |
| Summary | A short paragraph in plain language that names the critical and attention items, the nearest early warning, and anything that has persisted for days. It is written by rules. An on-board language model is planned |
| Early warning | Fits a trend line to the last 7 days of each normal indicator and warns when it would leave the normal range within 7 days. The "Slow drift" scenario shows it |
| Possible causes | Eight rules match combinations of readings (for example fever with a raised heart rate) to a possible cause, with steps, the items from an illustrative on-board medical kit, and when to escalate. Marked as decision support, not a diagnosis |
| Report to Earth | A report is built automatically from the readings, alerts, score, and possible causes. It is marked priority when anything is critical, and the panel says whether it waits on board or was sent. It can be previewed and downloaded as a text file with no link |
| Flight surgeon | The flight surgeon view shows each crew member's score, early warnings, and the same downloadable report |

## 9. Optional local real-time server

| Feature | Description |
|---|---|
| Wearable stream | The server sends heart rate and blood oxygen offsets every second, and the cards show them |
| Shared alerts | Alerts and acknowledgments are relayed to every open window, and saved in a local SQLite file. A window that joins later receives the recent alerts |
| Offline fallback | The header shows whether the server is connected. When it is not, the app uses its on-device simulator. Alerts raised offline are sent when the server returns |

Start it with `npm run server`.

## 10. Accessibility and design

- Status is always shown with color, an icon, and a text label together.
- Dark theme with high-contrast text.
- Touch targets of at least 44 px on the main controls.
- Keyboard access, visible focus, and ARIA labels on the body map, tabs, and toggles.
- Responsive layout: side by side on wide screens, a single column below 1024 px.

## 11. Not built yet

| Feature | Status |
|---|---|
| Microscope analysis of blood and saliva | Planned |
| On-board sequencing for virus detection | Planned |
| Real wearable and IoT integration | Planned. The prototype uses simulated data |
| Hosted real-time server | The optional server runs locally only. It is not deployed |
| Reminders when the app is closed | Reminders and notifications work while the app is open in a tab |
| Delay-aware sync | Planned |
| On-board language model for the summary | Planned. The summary is written by rules today |

## 12. Status against the PRD

| ID | Requirement | Status |
|---|---|---|
| A1 | Indicator cards with status | Done |
| A2 | Clickable body map | Done |
| A3 | Trend chart per indicator | Done |
| A4 | Next steps for yellow and red | Done |
| A5 | Plain-language explanations | Done |
| A6 | Overall status | Done |
| A7 | Reminders | Done (on screen and browser notifications while the app is open) |
| A8 | Manual entry | Done (checkup values and mood check) |
| A9 | Points and streaks | Done |
| E1 | Yellow notifies the astronaut only | Done |
| E2 | Red notifies the crew and queues a flight surgeon report | Done (simulated) |
| E3 | Clear escalation guidance | Done |
| E4 | Alert log | Done |
| C1 | Crew view | Done |
| C2 | Flight surgeon view | Done |
| C3 | Sync state | Done (simulated link, queue with sent and waiting reports) |
| M1 | Mission profiles | Done |
| M2 | Communication delay | Done |
| M3 | Works offline | Done (no server, settings saved on the device) |
| V1, V2 | Camera safety check | Done (on-device, no video stored) |
