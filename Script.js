/* ============================
   STATE
   The "single source of truth" for the app.
   ============================ */
const STORAGE_KEY = "pomodoroSettings";
const RING_RADIUS = 90; // must match the r="90" on the SVG circles in index.html
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

let workDuration = 25 * 60; // seconds — may get overwritten by loadSettings()
let breakDuration = 5 * 60; // seconds
let mode = "work"; // "work" | "break"
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
   PERSISTENCE
   Reads/writes the parts of STATE that should survive a page
   refresh. Kept separate from LOGIC so it's obvious what's
   "real app behavior" vs. "saving/loading a snapshot of it."
   ============================ */
function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return; // nothing saved yet — defaults above are fine

  try {
    const data = JSON.parse(saved);
    if (typeof data.workDuration === "number") workDuration = data.workDuration;
    if (typeof data.breakDuration === "number") breakDuration = data.breakDuration;
    if (typeof data.completedSessions === "number") {
      completedSessions = data.completedSessions;
    }
  } catch (err) {
    // Corrupt or unreadable saved data shouldn't crash the app —
    // just fall back to the defaults already set above.
    console.warn("Could not load saved settings, using defaults.", err);
  }
}

function saveSettings() {
  const data = { workDuration, breakDuration, completedSessions };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ============================
   LOGIC
   ============================ */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDurationForMode(currentMode) {
  return currentMode === "work" ? workDuration : breakDuration;
}

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
  timeRemaining--;

  if (timeRemaining <= 0) {
    switchMode(); // moves straight into the next period; timer keeps running
  }

  updateDisplay();
  updateRing();
}

function startTimer() {
  if (isRunning) return;
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
  isRunning ? stopTimer() : startTimer();
}

function resetTimer() {
  stopTimer();
  timeRemaining = getDurationForMode(mode);
  updateDisplay();
  updateRing();
}

// Reads the two number inputs, validates/clamps them, and applies
// them to the running app. Only allowed while paused, so we never
// yank the duration out from under an active countdown.
function applySettingsFromInputs() {
  if (isRunning) return;

  const newWork = clamp(parseInt(workInput.value, 10) || 25, 1, 90) * 60;
  const newBreak = clamp(parseInt(breakInput.value, 10) || 5, 1, 30) * 60;

  workDuration = newWork;
  breakDuration = newBreak;

  // Reflect back any clamping (e.g. someone typed 999) into the inputs
  workInput.value = newWork / 60;
  breakInput.value = newBreak / 60;

  timeRemaining = getDurationForMode(mode);
  updateDisplay();
  updateRing();
  saveSettings();
}

/* ============================
   UI
   "Dumb" functions that only read state and update the page.
   ============================ */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(timeRemaining);
}

function updateControls() {
  startPauseBtn.textContent = isRunning ? "Pause" : "Start";
}

function updateModeUI() {
  modeLabel.textContent = mode === "work" ? "Focus Session" : "Break Time";
  document.body.dataset.mode = mode; // lets CSS react to the current mode
}

function updateSessionCount() {
  sessionCountEl.textContent = `Sessions completed: ${completedSessions}`;
}

function updateSettingsAvailability() {
  workInput.disabled = isRunning;
  breakInput.disabled = isRunning;
}

// Maps "fraction of time left" onto how much of the ring is drawn.
// A full ring = timeRemaining equals the full duration for this mode.
// An empty ring = timeRemaining is 0.
function updateRing() {
  const total = getDurationForMode(mode);
  const fraction = timeRemaining / total;
  const offset = RING_CIRCUMFERENCE * (1 - fraction);
  ringProgress.style.strokeDashoffset = offset;
}

function toggleSettingsPanel() {
  const isHidden = settingsPanel.hasAttribute("hidden");
  if (isHidden) {
    settingsPanel.removeAttribute("hidden");
    settingsToggle.setAttribute("aria-expanded", "true");
    settingsToggle.textContent = "Hide settings";
  } else {
    settingsPanel.setAttribute("hidden", "");
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
   Order matters here: load saved data BEFORE using it to render
   anything, so the very first paint already reflects saved state.
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
updateSettingsAvailability();