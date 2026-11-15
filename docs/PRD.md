# Product Requirements: VitalOrbit

## 1. Summary

VitalOrbit is a visual health monitoring tool for astronauts on long space missions. It gathers health indicators, shows their status at a glance, explains what they mean, and gives guidance on what to do next. It is designed to work without a connection to Earth.

This document covers the hackathon prototype for the 2026 NASA Space Apps Challenge, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

## 2. Problem

NASA's Human Research Program identifies five hazards of human spaceflight: space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments. These contribute to problems such as immune changes, bone density loss, cardiovascular events, inadequate nutrition, and behavioral health conditions.

On long missions, astronauts must assess their own health. Flight surgeons on Earth may be minutes away by radio, and medical supplies are limited. Astronauts are not doctors, so raw numbers alone are not enough.

## 3. Goals

1. An astronaut can tell their health status in a few seconds.
2. An astronaut understands why an indicator matters and how spaceflight affects it.
3. An astronaut knows what to do next using only on-board resources.
4. Serious conditions reach the crew and the flight surgeon without relying on a live link to Earth.

## 4. Non-goals for the prototype

- Diagnosis. VitalOrbit flags and guides, it does not diagnose.
- Real device integration. Readings are simulated.
- Real medical thresholds. Values are illustrative.
- Microscope and sequencing analysis. These are described as future work.
- Accounts, authentication, and a backend server.

## 5. Users

| User | Role | Needs |
|---|---|---|
| **Astronaut** (primary) | Monitors their own health | Clear status, plain explanations, concrete steps, reminders |
| **Crew** | Fellow mission members | To know quickly when someone needs help |
| **Flight surgeon** (secondary) | Doctor on Earth | Full history, trends, and an event log, delivered when a link exists |

## 6. Health indicators

| Indicator | Source | Related hazard |
|---|---|---|
| Heart rate | Wearable | Gravity fields, hostile closed environments |
| Blood oxygen (SpO2) | Wearable | Hostile closed environments |
| Body temperature | Wearable | Hostile closed environments |
| Sleep duration | Wearable, questionnaire | Isolation and confinement |
| Blood pressure | Routine checkup | Gravity fields |
| Body mass | Routine checkup | Gravity fields |
| Blood glucose | Routine checkup | Hostile closed environments |
| Radiation dose (daily and cumulative) | Dosimeter | Space radiation |
| Mood and stress | Daily questionnaire | Isolation and confinement, distance from Earth |
| Movement and responsiveness | Station camera | All (emergency detection) |

## 7. Requirements

Priority: **P0** is required for submission, **P1** is wanted, **P2** is a stretch goal.

### Astronaut view

| ID | Requirement | Priority |
|---|---|---|
| A1 | Show each indicator as a card with its value, unit, and a green, yellow, or red status | P0 |
| A2 | Show a clickable body map. Selecting a body part shows its status, the related hazard, and a short explanation | P0 |
| A3 | Show a trend chart for each indicator across mission days | P0 |
| A4 | For each yellow or red status, show concrete next steps that use on-board resources | P0 |
| A5 | Explain each indicator in plain language: what it is, why it matters, how to measure it | P0 |
| A6 | Show an overall status that reflects the most serious indicator | P0 |
| A7 | Show scheduled reminders for measurements and the daily mood check | P1 |
| A8 | Let the astronaut enter checkup values and the mood questionnaire manually | P1 |
| A9 | Award points and streaks for exercise, sleep, and on-time measurements | P2 |

### Alerts and escalation

| ID | Requirement | Priority |
|---|---|---|
| E1 | Yellow status notifies the astronaut only | P0 |
| E2 | Red status notifies the crew and queues a priority report for the flight surgeon | P0 |
| E3 | State clearly when a result needs attention from the crew or the flight surgeon | P0 |
| E4 | Keep a log of all alerts with time and cause | P1 |

### Crew and flight surgeon views

| ID | Requirement | Priority |
|---|---|---|
| C1 | Crew view lists every crew member with their overall status | P1 |
| C2 | Flight surgeon view shows history, trends, and the alert log for a crew member | P1 |
| C3 | Show the sync state: what has been sent to Earth and what is waiting | P2 |

### Mission context

| ID | Requirement | Priority |
|---|---|---|
| M1 | Let the user choose a mission profile: space station, Moon, Mars, or rover | P1 |
| M2 | Show the one-way communication delay for the chosen profile | P1 |
| M3 | Work fully offline with data stored on the device | P0 |

### Camera safety check

| ID | Requirement | Priority |
|---|---|---|
| V1 | Use the device camera to detect a person who is motionless for longer than a set time, and raise a red alert | P2 |
| V2 | Process video on the device only. Do not store or transmit video | P2 |

### Submission compliance

| ID | Requirement | Priority |
|---|---|---|
| S1 | All content in English | P0 |
| S2 | Publicly accessible links with no login | P0 |
| S3 | Use at least one NASA data source or resource and state how it is used | P0 |
| S4 | Label simulated data and AI-assisted work clearly | P0 |
| S5 | No images, video, audio, or likeness of persons under 18 | P0 |
| S6 | No NASA logos, flags, or mission identifiers | P0 |

## 8. Success criteria for the prototype

- A first-time viewer understands the astronaut's status within 10 seconds of opening the dashboard.
- Every yellow or red indicator shows an explanation and at least one concrete step.
- A simulated critical event produces a visible alert in both the astronaut and crew views.
- The app loads and works from a public link with no login.

## 9. Assumptions and risks

| Item | Note |
|---|---|
| Thresholds are illustrative | Real thresholds would be set per crew member by flight surgeons |
| Data is simulated | The prototype shows the concept, not validated measurements |
| Vision models are trained on Earth data | Body posture differs in microgravity, so models would need calibration |
| Camera monitoring raises privacy concerns | Processing stays on the device, and only alerts are shared |

## 10. Future work

- Microscope image analysis for blood cells and bacteria in blood and saliva samples.
- On-board sequencing for virus detection.
- Integration with real wearable and IoT devices.
- Sync that adapts to communication delay and link windows.
- Personal baselines learned from each crew member's own history.
