/* ============================
   STATE
   The "single source of truth" for the app.
   Nothing else should be trusted for the current status
   except these variables.
   ============================ */
const WORK_DURATION = 25 * 60; // 25 minutes, in seconds

let timeRemaining = WORK_DURATION;
let isRunning = false;
let intervalId = null;

/* ============================
   DOM REFERENCES
   Grabbing elements once, up front, instead of re-querying
   the page every time we need them.
   ============================ */
const timeDisplay = document.getElementById("timeDisplay");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");

/* ============================
   LOGIC
   Functions that change STATE over time. These don't touch
   the DOM directly — they call the UI functions below once
   state has changed.
   ============================ */
function tick() {
  timeRemaining--;

  if (timeRemaining <= 0) {
    timeRemaining = 0;
    stopTimer();
  }

  updateDisplay();
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  intervalId = setInterval(tick, 1000);
  updateControls();
}

function stopTimer() {
  isRunning = false;
  clearInterval(intervalId);
  intervalId = null;
  updateControls();
}

function toggleTimer() {
  isRunning ? stopTimer() : startTimer();
}

function resetTimer() {
  stopTimer();
  timeRemaining = WORK_DURATION;
  updateDisplay();
}

/* ============================
   UI
   "Dumb" functions that only read state and update the page.
   They never decide anything — they just reflect what STATE
   already says.
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

/* ============================
   EVENT LISTENERS
   Wiring up user interaction to the logic layer.
   ============================ */
startPauseBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);

// Initial render, so the display matches state on page load
updateDisplay();