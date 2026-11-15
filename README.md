# VitalOrbit

**Your health copilot, even when Earth is out of reach.**

VitalOrbit is a health monitoring tool that helps astronauts assess their own health during long space missions, understand what the numbers mean, and act on them with the limited resources available on board.

> **Project status:** working prototype, built during the 2026 NASA Space Apps Challenge. All health readings are simulated.

| | |
|---|---|
| **Event** | 2026 NASA Space Apps Challenge |
| **Challenge** | [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) |
| **Team** | Semangat Kuliah |
| **Team members** | Faiz (Tech Lead), Caka (Product Manager), Al Fachrezi (Software Engineer), Rafiandhi (Solution Architect) |
| **Live demo** | [seryu77.github.io/VitalOrbit](https://seryu77.github.io/VitalOrbit/) |
| **Project demo (slides or video)** | TBD |

## The problem

Long missions expose astronauts to the five hazards of human spaceflight identified by NASA's Human Research Program: space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments. As missions move farther from Earth, communication with flight surgeons becomes slower (a one-way message to Mars can take many minutes), so astronauts carry much of the responsibility for spotting health changes in themselves.

## The solution

VitalOrbit collects health indicators from several sources, turns them into a status that can be read at a glance, and tells the astronaut what to do next. It keeps working with no connection to Earth.

```
 DATA SOURCES                 ASSESSMENT ENGINE                OUTPUT
 Wearable (real time)  --+                                 +-> Astronaut: color status,
 Routine checkups      --+    Compare against history      |   plain explanation, next steps
 Station camera (CV)   --+--> and thresholds, then map  ---+-> Crew: emergency alerts
 Radiation dosimeter   --+    each finding to a NASA       |
 Mood questionnaire    --+    spaceflight hazard           +-> Flight surgeon on Earth:
                                                               summary, sent when a link exists
```

## Key features

- **Clickable body map.** Select a body part to see its status, the hazard that affects it, and a short explanation.
- **Color-coded indicators.** Green (normal), yellow (attention), red (critical) for each health indicator.
- **Trend charts.** See how each indicator changes over the mission.
- **Alerts and escalation.** Yellow stays with the astronaut. Red notifies the crew and queues a priority report for the flight surgeon.
- **Guidance with limited resources.** Each yellow or red status comes with concrete steps that use only what is in the on-board medical kit.
- **Spine posture check (screening cue).** Draws an estimated spine line, with all 24 vertebrae marked, on the camera preview. From the head, shoulder, and hip positions it flags uneven shoulders or hips, a leaning trunk, a forward head, or a rounded upper back. It is a posture cue, not a diagnosis.
- **Manual checkup entry.** Enter blood pressure, body mass, and blood glucose, and the assessment updates at once.
- **Measurement reminders.** On-screen and browser notifications for the checkup, the mood check, exercise, and water.
- **Alert log and sync queue.** Every alert is logged with its time and cause, can be acknowledged, and red reports wait on board until the Earth link is up.
- **Light gamification.** Points and streaks for exercise, sleep, and on-time measurements.
- **Mission profiles.** Space station, Moon, Mars, or rover, with a matching communication delay.
- **Offline first.** Data is stored on the device and synced to Earth when a link is available.
- **Camera safety check.** Uses the device camera and on-device tracking of the body, face (478 points), and both hands (21 points each, every finger) to detect a crew member who is motionless for too long, asks them to respond, and raises a red alert if they do not. No video is stored or sent.

## Three users, one system

| User | What they see |
|---|---|
| **Astronaut** (primary) | Body map, indicator cards, trends, reminders, guidance |
| **Crew** | Summary status of every crew member, emergency alerts |
| **Flight surgeon on Earth** (secondary) | Full history, trends, event log |

## What is built and what is planned

| In the prototype | Planned next |
|---|---|
| Astronaut dashboard: body map, indicator cards, trend charts | Microscope image analysis for blood cells and bacteria |
| Simulated wearable, checkup, and radiation data, plus manual checkup entry | On-board sequencing for virus detection |
| Status rules, trend rules, and guidance | Integration with real IoT devices |
| Alerts with log, acknowledgment, and a sync queue for the flight surgeon | Calibration of the vision model for microgravity |
| Reminders with notifications, mood check, points and streaks | Sync that adapts to the communication delay |
| Camera safety check with on-device body, face, and finger tracking | Hosted real-time server (the prototype server runs locally) |
| Crew and flight surgeon views, mission profiles, simulated Earth link | |
| Optional local real-time server (WebSocket) | |

## Data and resources

### NASA data and resources

| Resource | How it is used |
|---|---|
| [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) (NASA Human Research Program) | Basis for mapping each health indicator to a hazard |
| [Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) (NASA Human Research Program) | Basis for choosing indicators and escalation rules |
| [Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Background for the guidance content |
| [NASA Open Science Data Repository](https://osdr.nasa.gov/) | Reference for the kinds of biomedical measurements taken on spaceflight crews |

### Space agency partner resources

| Resource | How it is used |
|---|---|
| [Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) (Canadian Space Agency) | Basis for the radiation indicator |
| [Why Do We Conduct Science Experiments in Space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) (Canadian Space Agency) | Background on health research in orbit |

### Other tools and references

| Resource | How it is used |
|---|---|
| [React](https://react.dev/), [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/) | Application framework and build tools |
| [Recharts](https://recharts.org/) | Trend charts |
| [MediaPipe Pose, Hand, and Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) | Body, finger, and face tracking for the camera safety check, run in the browser. The model files are bundled with the app |
| [Fastify](https://fastify.dev/) and WebSocket | Optional local real-time server for the demo |

### About the data in this prototype

All health readings shown in the prototype are **simulated**. They do not come from real astronauts or real devices. The thresholds used for the green, yellow, and red statuses are **illustrative values for demonstration only**. In a real mission they would be set by flight surgeons for each crew member.

VitalOrbit is a hackathon prototype. It is not a medical device and does not give medical advice.

## Use of AI tools

AI tools were used in this project, and we disclose that use here as required by the NASA Space Apps Challenge:

| Area | Tool | How it was used |
|---|---|---|
| Documentation | Claude (Anthropic) | Drafting and structuring the documents in this repository |
| Code | Claude (Anthropic) | Writing the application code under the team's direction. Every AI-assisted source file is marked with a header comment, and the page metadata and footer state it as well |
| Simulated data | Claude (Anthropic) | Writing the code that generates the simulated readings |
| Pitch deck | Claude (Anthropic) | Drafting slide text and layout in Canva. All photos in the deck are real NASA images, not AI-generated |

The project idea and its direction come from the team. No AI-generated images, video, or audio are used at this time. If any are added, they will carry a visible watermark. Apart from the official NASA Space Apps Challenge logo on the pitch deck cover, which identifies the event, this project does not use NASA logos, flags, or mission identifiers.

## Image credits

The pitch deck uses public-domain photos from NASA and NASA/JPL-Caltech (including NASA/JPL-Caltech/MSSS). Each image, its source page, and its credit are listed in [docs/PHOTO_CREDITS.md](docs/PHOTO_CREDITS.md).

## Repository structure

```
vitalorbit/
├── README.md              Project overview (this file)
├── DESIGN.md              Visual and interaction design
├── LICENSE
├── server/                Optional local real-time server (Fastify, WebSocket, SQLite)
├── scripts/               Build helper that copies the MediaPipe runtime
├── docs/
│   ├── PRD.md             Product requirements
│   ├── system-design.md   How the system behaves: data flow, rules, alerts
│   └── architecture.md    How the code is organized
├── demo/                  Project demo material (slides or video link)
├── public/
│   └── assets/            Static assets
└── src/
    ├── app/               App shell, routing, mission profile
    ├── components/        Shared UI components
    ├── features/
    │   ├── body-map/      Clickable human figure
    │   ├── vitals/        Wearable readings and trend charts
    │   ├── checkup/       Routine checkup history
    │   ├── radiation/     Dosimeter readings
    │   ├── mood/          Daily mood and sleep questionnaire
    │   ├── vision/        Camera safety check
    │   ├── alerts/        Notifications and escalation
    │   ├── guidance/      Explanations and next steps
    │   ├── gamification/  Points and streaks
    │   └── roles/         Astronaut, crew, and flight surgeon views
    ├── data/
    │   ├── simulated/     Simulated readings
    │   └── rules/         Thresholds and hazard mapping
    └── lib/               Assessment engine, storage, sync queue
```

## Documentation

- [Features](docs/FEATURES.md)
- [Feature ideas and roadmap](docs/FEATURE-IDEAS.md)
- [Product requirements](docs/PRD.md)
- [System design](docs/system-design.md)
- [Architecture](docs/architecture.md)
- [Design](DESIGN.md)

## Getting started

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the address shown in the terminal (by default `http://localhost:5173`). The app works on its own, with simulated data and no server.

**Optional real-time server.** In a second terminal, run `npm run server`. The header then shows "Live server: connected", the wearable values stream from the server, and alerts are shared between every open window, for example the astronaut on one device and the flight surgeon on another. Stop the server and the app falls back to its on-device simulator.

**Camera safety check.** The browser asks for camera permission when you press "Start safety camera". Camera access works on `localhost` and on HTTPS pages. Video is processed in the browser and is never stored or sent.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Build the static site into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run typecheck` | Check TypeScript types |
| `npm run server` | Start the optional local real-time server on port 8787 |
| `npm run deploy` | Build and publish `dist/` to the `gh-pages` branch for GitHub Pages |

## How to try the demo

1. Use the **Demo scenario** buttons (Fever, Sleep debt, Cardiac event, Low mood, Solar storm, Slow drift) to simulate a health event for the astronaut.
2. Watch the overall status, the body map, and the indicator cards change color.
3. Select an indicator or a body part to see its trend, a plain explanation, and what to do now.
4. Answer the **Mood check** to see how your own input changes the assessment.
5. Switch to the **Crew** and **Flight surgeon** views to see who else is informed.
6. Toggle **Earth link** to see how reports are queued on board when there is no connection.
7. Change the **Mission** to see the communication delay and radiation limit change.
8. Enter a value in **Log a checkup** (for example systolic pressure 190) and watch the status turn critical.
9. Press **Start safety camera**, then stay still. After the set time you are asked "Are you OK?". Do not answer, and a red alert reaches the Crew view and the sync queue. Use **Test alert flow** to skip the wait.
10. Open the **Alert log** to see each alert with its time, delivery state, and acknowledgment. Turn the Earth link on to watch queued reports being sent.
11. Look at the **Health score** in the status panel and select **Why this score?** to see every deduction.
12. Open **Insights** for the summary, the early warning (try **Slow drift**), and possible causes with the items from the medical kit.
13. In **Report to Earth**, preview or download the report that was built automatically.

## License

[MIT](LICENSE)
