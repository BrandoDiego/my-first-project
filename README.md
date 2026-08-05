# my-first-project
# Planning: Pomodoro Timer

## 1. Problem & Purpose
A simple web app that helps me (a student) manage study sessions using the Pomodoro
technique: work in focused intervals, then rest, then repeat.

**Who is it for?** Me, primarily — for studying and doing school/coding work.

**What does "done" look like for v1?** A working countdown timer with start, pause,
and reset that cycles between a work period and a break period.

## 2. Architecture (Layers, not features)

| Layer | Responsibility | Example |
|---|---|---|
| **State** | What data the app tracks | `timeRemaining`, `mode` ("work"/"break"), `isRunning`, `sessionCount` |
| **Logic** | How state changes over time | countdown tick, switching mode when timer hits 0 |
| **UI** | Reflects state, contains no logic | renders time left, changes button text/color based on state |
| **Persistence** (later) | Saves data across refreshes | `localStorage` for settings & session count |

Rule of thumb: UI code should never *decide* anything — it should only *display*
what state/logic already decided.

## 3. Versioned Roadmap

- **v0.1 — MVP**
  25-minute countdown. Start / Pause / Reset buttons. No breaks yet.

- **v0.2 — Work/Break Cycle**
  After work period ends, auto-switch to a short break, then back to work.

- **v0.3 — Visual Polish**
  Progress bar or circular timer. Different colors for work vs. break mode.

- **v0.4 — Persistence**
  Remember custom durations and session count using `localStorage`.

- **v0.5+ — Stretch Goals**
  Browser notifications, sound alert on session end, session history/stats,
  linked task list.

## 4. Commit Strategy
Commit at the end of each version above (or smaller logical chunks within a
version). Use messages like:
```
feat: add basic countdown logic (v0.1)
feat: add work/break auto-switch (v0.2)
style: add progress bar and mode colors (v0.3)
```

## 5. Tech Stack
- HTML / CSS / Vanilla JavaScript (no framework needed for this scope)
- `localStorage` for persistence (v0.4+)
