/* ============================
STATE
============================ */

const STORAGE_KEY = "pomodoroSettings";

const RING_RADIUS = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

let workDuration = 25 * 60;
let breakDuration = 5 * 60;

let mode = "work";
let timeRemaining = workDuration;
let isRunning = false;
let intervalId = null;
let completedSessions = 0;

/* ============================
DOM REFERENCES
============================ */

const modeLabel = document.getElementById("modeLabel");
const timeDisplay = document.getElementById("timeDisplay");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const sessionCountEl = document.getElementById("sessionCount");
const ringProgress = document.getElementById("ringProgress");
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const workInput = document.getElementById("workInput");
const breakInput = document.getElementById("breakInput");

/* ============================
HELPERS
============================ */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDurationForMode(currentMode) {
  return currentMode === "work" ? workDuration : breakDuration;
}

/* ============================
PERSISTENCE
============================ */

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {
    const data = JSON.parse(saved);

    if (Number.isFinite(data.workDuration)) {
      workDuration = clamp(data.workDuration, 60, 90 * 60);
    }

    if (Number.isFinite(data.breakDuration)) {
      breakDuration = clamp(data.breakDuration, 60, 30 * 60);
    }

    if (Number.isFinite(data.completedSessions)) {
      completedSessions = Math.max(0, Math.floor(data.completedSessions));
    }
  } catch (error) {
    console.warn("Could not load saved settings, using defaults.", error);
  }
}

function saveSettings() {
  const data = {
    workDuration,
    breakDuration,
    completedSessions
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ============================
LOGIC
============================ */

function switchMode() {
  if (mode === "work") {
    completedSessions++;
    mode = "break";
  } else {
    mode = "work";
  }

  timeRemaining = getDurationForMode(mode);

  updateModeUI();
  updateSessionCount();
  saveSettings();
}

function tick() {
  timeRemaining = Math.max(0, timeRemaining - 1);

  if (timeRemaining === 0) {
    switchMode();
  }

  updateDisplay();
  updateRing();
}

function startTimer() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  intervalId = setInterval(tick, 1000);

  updateControls();
  updateSettingsAvailability();
}

function stopTimer() {
  isRunning = false;

  clearInterval(intervalId);
  intervalId = null;

  updateControls();
  updateSettingsAvailability();
}

function toggleTimer() {
  if (isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  stopTimer();

  timeRemaining = getDurationForMode(mode);

  updateDisplay();
  updateRing();
}

function applySettingsFromInputs() {
  if (isRunning) {
    return;
  }

  const newWorkMinutes = clamp(parseInt(workInput.value, 10) || 25, 1, 90);
  const newBreakMinutes = clamp(parseInt(breakInput.value, 10) || 5, 1, 30);

  workDuration = newWorkMinutes * 60;
  breakDuration = newBreakMinutes * 60;

  workInput.value = newWorkMinutes;
  breakInput.value = newBreakMinutes;

  timeRemaining = getDurationForMode(mode);

  updateDisplay();
  updateRing();
  saveSettings();
}

/* ============================
UI
============================ */

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(timeRemaining);
  updateDocumentTitle();
}

function updateDocumentTitle() {
  document.title = `${formatTime(timeRemaining)} • ${
    mode === "work" ? "Focus" : "Break"
  }`;
}

function updateControls() {
  startPauseBtn.textContent = isRunning ? "Pause" : "Start";
}

function updateModeUI() {
  modeLabel.textContent = mode === "work" ? "Focus Session" : "Break Time";
  document.body.dataset.mode = mode;
}

function updateSessionCount() {
  sessionCountEl.textContent = `Sessions completed: ${completedSessions}`;
}

function updateSettingsAvailability() {
  workInput.disabled = isRunning;
  breakInput.disabled = isRunning;
}

function updateRing() {
  const total = getDurationForMode(mode);
  const fraction = total > 0 ? timeRemaining / total : 0;
  const offset = RING_CIRCUMFERENCE * (1 - fraction);

  ringProgress.style.strokeDashoffset = offset;
}

function toggleSettingsPanel() {
  const isHidden = settingsPanel.hidden;

  if (isHidden) {
    settingsPanel.hidden = false;
    settingsToggle.setAttribute("aria-expanded", "true");
    settingsToggle.textContent = "Hide settings";
  } else {
    settingsPanel.hidden = true;
    settingsToggle.setAttribute("aria-expanded", "false");
    settingsToggle.textContent = "Settings";
  }
}

/* ============================
EVENT LISTENERS
============================ */

startPauseBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);
settingsToggle.addEventListener("click", toggleSettingsPanel);
workInput.addEventListener("change", applySettingsFromInputs);
breakInput.addEventListener("change", applySettingsFromInputs);

/* ============================
INITIAL LOAD
============================ */

loadSettings();

timeRemaining = getDurationForMode(mode);

ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;

workInput.value = workDuration / 60;
breakInput.value = breakDuration / 60;

updateDisplay();
updateModeUI();
updateSessionCount();
updateRing();
updateControls();
updateSettingsAvailability();