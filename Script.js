/* ============================
   STATE
   The single source of truth.
============================ */

const WORK_DURATION = 25 * 60;

let timeRemaining = WORK_DURATION;
let isRunning = false;
let intervalId = null;

/* ============================
   DOM REFERENCES
   Grab elements once.
============================ */

const timeDisplay = document.getElementById("timeDisplay");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");

/* ============================
   UI FUNCTIONS
   These only update what the user sees.
============================ */

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return `${paddedMinutes}:${paddedSeconds}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(timeRemaining);
}

function updateControls() {
  startPauseBtn.textContent = isRunning ? "Pause" : "Start";
}

function updateDocumentTitle() {
  document.title = `${formatTime(timeRemaining)} • Pomodoro Timer`;
}

function render() {
  updateDisplay();
  updateControls();
  updateDocumentTitle();
}

/* ============================
   TIMER LOGIC
   These functions change the state.
============================ */

function tick() {
  timeRemaining = Math.max(0, timeRemaining - 1);

  if (timeRemaining === 0) {
    stopTimer();
  }

  render();
}

function startTimer() {
  if (isRunning) {
    return;
  }

  if (timeRemaining === 0) {
    timeRemaining = WORK_DURATION;
  }

  isRunning = true;
  intervalId = setInterval(tick, 1000);

  render();
}

function stopTimer() {
  isRunning = false;

  clearInterval(intervalId);
  intervalId = null;

  render();
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

  timeRemaining = WORK_DURATION;

  render();
}

/* ============================
   EVENT LISTENERS
============================ */

startPauseBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);

/* ============================
   INITIAL RENDER
============================ */

render();