# Architecture: VitalOrbit

This document describes how the code is organized. For how the system behaves, see [system-design.md](system-design.md).

## 1. Approach

VitalOrbit is a **static, client-side web application**. It needs no backend. A small **optional local server** adds a real-time feed and shares alerts between windows, and the app falls back to its on-device simulator when the server is not running.

| Decision | Reason |
|---|---|
| Client-side first | Matches the offline-first requirement: everything runs on the device, and the server is optional |
| Optional real-time server | Gives a live wearable stream and lets the astronaut, crew, and surgeon views run on different devices during the demo |
| Static hosting | A public link with no login, as the hackathon requires |
| Simulated data layer | Real devices are out of scope for the prototype |
| Rules as data | Thresholds and hazard mapping live in data files, so they can be changed without touching the engine |

## 2. Technology

| Layer | Choice |
|---|---|
| Language | TypeScript |
| UI | React |
| Build tool | Vite |
| Charts | Recharts |
| Storage | Browser local storage |
| Computer vision | MediaPipe Pose, Hand, and Face Landmarker, running in the browser. The three models (about 20 MB) and the WebAssembly runtime are bundled in `public/` |
| Real-time server (optional) | Node.js, Fastify, WebSocket, and SQLite (`node:sqlite`) in `server/` |
| Hosting | GitHub Pages |

## 3. Layers

```
 +-----------------------------------------------------------+
 |  VIEWS (src/features/roles)                               |
 |  Astronaut view  |  Crew view  |  Flight surgeon view     |
 +-----------------------------------------------------------+
 |  FEATURES (src/features)                                  |
 |  body-map | vitals | checkup | radiation | mood | vision  |
 |  alerts | guidance | gamification                         |
 +-----------------------------------------------------------+
 |  CORE (src/lib)                                           |
 |  Assessment engine | Alert manager | Storage | Sync queue |
 +-----------------------------------------------------------+
 |  DATA (src/data)                                          |
 |  simulated/ readings      |  rules/ thresholds, hazards,  |
 |                           |  guidance content             |
 +-----------------------------------------------------------+
```

Dependencies point downward only. Features use the core. The core reads the data layer. The core does not depend on any UI code.

## 4. Folder structure

```
src/
├── app/               App shell, navigation, mission profile selection
├── components/        Shared UI: status badge, card, chart wrapper
├── features/
│   ├── body-map/      Clickable human figure and region detail
│   ├── vitals/        Wearable indicator cards and trend charts
│   ├── checkup/       Checkup history and manual entry
│   ├── radiation/     Daily and cumulative dose
│   ├── mood/          Daily questionnaire
│   ├── vision/        Camera safety check
│   ├── alerts/        Alert list, notifications, alert log
│   ├── guidance/      Explanations and next steps
│   ├── gamification/  Points and streaks
│   └── roles/         Astronaut, crew, and flight surgeon views
├── data/
│   ├── simulated/     Simulated crew, readings, and scenarios
│   └── rules/         Thresholds, trend rules, hazard map, guidance text
└── lib/               Assessment engine, alert log and sync queue, live server client

server/                Optional real-time server
scripts/               Copies the MediaPipe runtime into public/
```

## 5. Core modules

| Module | Responsibility |
|---|---|
| **Assessment engine** | Takes a reading and its history, returns a status, the related hazard, and the reason |
| **Alert manager** | Creates alerts from assessments, prevents duplicates, applies escalation |
| **Storage** | Reads and writes readings, alerts, and settings to local storage |
| **Sync queue** | Holds reports for the flight surgeon and releases them when the link is on |
| **Simulator** | Produces readings over time and can trigger scenarios such as a fever or poor sleep |

## 6. Data model

```
CrewMember
  id, name, role

Reading
  id, crewMemberId, indicator, value, unit, timestamp, source

Assessment
  readingId, status (green | yellow | red), hazard, bodyRegion, reason

Alert
  id, crewMemberId, indicator, status, reason, timestamp,
  acknowledged, escalatedTo (crew | surgeon)

Rule
  indicator, unit, green range, yellow ranges, red ranges

TrendRule
  indicator, condition, window, resulting status

Guidance
  indicator, whatItIs, whyItMatters, howToMeasure,
  stepsForYellow, stepsForRed

MissionProfile
  id, name, commDelaySeconds, radiationLimits

SyncItem
  id, payload, priority, createdAt, sentAt
```

## 7. Data flow

```
 Simulator or manual entry
        |
        v
   Reading  ------------------>  Storage
        |
        v
 Assessment engine  <----------  Rules, history
        |
        v
   Assessment  ---------------->  Indicator cards, body map, charts
        |
        v
  Alert manager  -------------->  Alerts, notifications
        |
        v
   Sync queue  ---------------->  Flight surgeon view (when the link is on)
```

## 8. Camera safety check

```
 Webcam frame --> Pose, Hand, and Face Landmarker (in browser) --> Landmark positions
                                                        |
                                                        v
                                    Movement over time below threshold?
                                                        |
                                              yes       v
                                    Prompt for response on screen
                                                        |
                                           no response  v
                                             Red alert via alert manager
```

Frames are processed in memory and discarded. Nothing is stored or uploaded.

## 9. Deployment

- The app is built into static files and published to GitHub Pages.
- The published link is public and needs no login.
- No environment secrets are required.
- The optional server is not deployed. It runs on the presenter's machine with `npm run server`. A page served over HTTPS can still reach it at `ws://localhost`, and without it the app uses its simulator.

## 10. Path to a real system

| Prototype | Real system |
|---|---|
| Simulator | Adapters for wearables and station sensors |
| Local storage | On-board database shared across crew devices |
| Simulated link toggle, local relay server | Delay-tolerant link to mission control |
| Illustrative rules | Thresholds set by flight surgeons, with personal baselines |
| Webcam | Station cameras with a model calibrated for microgravity |
