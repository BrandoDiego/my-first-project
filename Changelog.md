# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] – Progress ring, custom durations, persistent settings
### Added
- Circular SVG progress ring around the countdown, filling/depleting as time passes
- Settings panel to customize work and break durations
- `localStorage` persistence for durations and completed session count, so a
  page refresh doesn't lose progress
- Settings inputs are disabled while the timer is running, to avoid changing
  duration mid-countdown

## [0.2.0] – Work/break cycle
### Added
- Auto-switching between work and break periods when the countdown hits 0
- Session counter that increments each time a work period completes
- Mode-based accent color (tomato for work, moss green for break)

## [0.1.0] – Initial release
### Added
- 25-minute countdown timer
- Start / Pause / Reset controls
- Basic layout and styling