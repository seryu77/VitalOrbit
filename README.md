# VitalOrbit

**Your health copilot, even when Earth is out of reach.**

VitalOrbit is a health monitoring tool that helps astronauts assess their own health during long space missions, understand what the numbers mean, and act on them with the limited resources available on board.

> **Project status:** early prototype, built during the 2026 NASA Space Apps Challenge. This repository currently contains the project documentation and folder structure. The application code is in progress.

| | |
|---|---|
| **Event** | 2026 NASA Space Apps Challenge |
| **Challenge** | [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) |
| **Team** | TBD |
| **Team members** | TBD |
| **Live demo** | TBD |
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
- **Measurement reminders.** Scheduled prompts for routine measurements and the daily mood check.
- **Light gamification.** Points and streaks for exercise, sleep, and on-time measurements.
- **Mission profiles.** Space station, Moon, Mars, or rover, with a matching communication delay.
- **Offline first.** Data is stored on the device and synced to Earth when a link is available.
- **Camera safety check (stretch goal).** On-device computer vision that raises an alert when a crew member is motionless or unresponsive for too long. No video is stored.

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
| Simulated wearable, checkup, and radiation data | On-board sequencing for virus detection |
| Status rules and guidance | Integration with real IoT devices |
| Alerts and reminders | Calibration of the vision model for microgravity |
| Simple crew and flight surgeon views | Sync that adapts to the communication delay |
| Webcam vision demo (stretch goal) | |

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
| [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) | On-device pose estimation for the camera safety check |
| [PhysioNet](https://physionet.org/) | Reference for realistic wearable signal patterns |

### About the data in this prototype

All health readings shown in the prototype are **simulated**. They do not come from real astronauts or real devices. The thresholds used for the green, yellow, and red statuses are **illustrative values for demonstration only**. In a real mission they would be set by flight surgeons for each crew member.

VitalOrbit is a hackathon prototype. It is not a medical device and does not give medical advice.

## Use of AI tools

AI tools were used in this project, and we disclose that use here as required by the NASA Space Apps Challenge:

| Area | Tool | How it was used |
|---|---|---|
| Documentation | Claude (Anthropic) | Drafting and structuring the documents in this repository |
| Code | Claude (Anthropic) | Assisting with implementation. AI-assisted source files are marked with a header comment |

The project idea and its direction come from the team. No AI-generated images, video, or audio are used at this time. If any are added, they will carry a visible watermark. This project does not use NASA logos, flags, or mission identifiers.

## Repository structure

```
vitalorbit/
├── README.md              Project overview (this file)
├── DESIGN.md              Visual and interaction design
├── LICENSE
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

- [Product requirements](docs/PRD.md)
- [System design](docs/system-design.md)
- [Architecture](docs/architecture.md)
- [Design](DESIGN.md)

## Getting started

Setup instructions will be added with the application code.

## License

[MIT](LICENSE)
