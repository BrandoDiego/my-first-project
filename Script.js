/* ============================
STATE
============================ */

const STORAGE_KEY = "pomodoroApp.v1.1";

const RING_RADIUS = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

let workDuration = 25 * 60;
let breakDuration = 5 * 60;

let mode = "work";
let timeRemaining = workDuration;
let isRunning = false;
let intervalId = null;

let completedSessions = 0;
let sessions = [];

let settings = {
  theme: "dark",
  focusMode: false,
  notificationsEnabled: false,
  soundEnabled: false
};

let audioContext = null;

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

const themeToggle = document.getElementById("themeToggle");
const focusModeToggle = document.getElementById("focusModeToggle");
const notificationToggle = document.getElementById("notificationToggle");
const soundToggle = document.getElementById("soundToggle");

const todayCountEl = document.getElementById("todayCount");
const streakCountEl = document.getElementById("streakCount");
const totalCountEl = document.getElementById("totalCount");
const historyList = document.getElementById("historyList");

/* ============================
HELPERS
============================ */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDurationForMode(currentMode) {
  return currentMode === "work" ? workDuration : breakDuration;
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

/* ============================
PERSISTENCE
============================ */

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {
    const data = JSON.parse(saved);

    if (Number.isFinite(data.workDuration)) {
      workDuration = data.workDuration;
    }

    if (Number.isFinite(data.breakDuration)) {
      breakDuration = data.breakDuration;
    }

    if (Number.isFinite(data.completedSessions)) {
      completedSessions = data.completedSessions;
    }

    if (Array.isArray(data.sessions)) {
      sessions = data.sessions;
    }

    if (data.settings) {
      settings = {
        ...settings,
        ...data.settings
      };
    }
  } catch (error) {
    console.warn("Could not load saved state, using defaults.", error);
  }

  workDuration = clamp(workDuration, 60, 90 * 60);
  breakDuration = clamp(breakDuration, 60, 30 * 60);
}

function saveState() {
  const data = {
    workDuration,
    breakDuration,
    completedSessions,
    sessions,
    settings
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ============================
THEME / FOCUS / NOTIFICATIONS / SOUND
============================ */

function applyTheme() {
  document.body.dataset.theme = settings.theme;
  themeToggle.textContent = settings.theme === "dark" ? "🌙" : "☀️";
  themeToggle.classList.toggle("active", settings.theme === "light");
}

function toggleTheme() {
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveState();
}

function applyFocusMode() {
  document.body.classList.toggle("focus-mode", settings.focusMode);
  focusModeToggle.classList.toggle("active", settings.focusMode);
}

function toggleFocusMode() {
  settings.focusMode = !settings.focusMode;
  applyFocusMode();
  saveState();
}

function applyNotificationToggle() {
  notificationToggle.classList.toggle(
    "active",
    settings.notificationsEnabled
  );

  notificationToggle.textContent = settings.notificationsEnabled
    ? "🔔"
    : "🔕";
}

async function toggleNotifications() {
  if (!settings.notificationsEnabled) {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      settings.notificationsEnabled = true;
      showNotification(
        "Notifications enabled",
        "Pomodoro alerts are turned on."
      );
    } else {
      settings.notificationsEnabled = false;
    }
  } else {
    settings.notificationsEnabled = false;
  }

  applyNotificationToggle();
  saveState();
}

function showNotification(title, body) {
  if (
    settings.notificationsEnabled &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, { body });
  }
}

function applySoundToggle() {
  soundToggle.classList.toggle("active", settings.soundEnabled);
  soundToggle.textContent = settings.soundEnabled ? "🔊" : "🔇";
}

function toggleSound() {
  settings.soundEnabled = !settings.soundEnabled;

  if (settings.soundEnabled) {
    playBeep();
  }

  applySoundToggle();
  saveState();
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playBeep() {
  if (!settings.soundEnabled) {
    return;
  }

  try {
    const ctx = ensureAudioContext();

    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.55);
  } catch (error) {
    console.warn("Sound could not play.", error);
  }
}

/* ============================
SESSION LOGGING / STATS
============================ */

function logSession() {
  sessions.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    mode: "work",
    duration: workDuration
  });

  if (sessions.length > 100) {
    sessions = sessions.slice(-100);
  }
}

function getTodayCount() {
  const now = new Date();

  return sessions.filter((session) =>
    isSameDay(new Date(session.timestamp), now)
  ).length;
}

function getStreak() {
  const sessionDays = new Set(
    sessions.map((session) => new Date(session.timestamp).toDateString())
  );

  let streak = 0;
  const checkDate = new Date();

  if (!sessionDays.has(checkDate.toDateString())) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (sessionDays.has(checkDate.toDateString())) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function updateStats() {
  todayCountEl.textContent = getTodayCount();
  streakCountEl.textContent = getStreak();
  totalCountEl.textContent = Math.max(sessions.length, completedSessions);
}

function renderHistory() {
  historyList.innerHTML = "";

  const recentSessions = sessions.slice(-8).reverse();

  if (recentSessions.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "history-item history-empty";
    emptyItem.textContent = "No completed sessions yet.";
    historyList.appendChild(emptyItem);
    return;
  }

  recentSessions.forEach((session) => {
    const date = new Date(session.timestamp);

    const listItem = document.createElement("li");
    listItem.className = "history-item";
    listItem.textContent = `${date.toLocaleDateString()} • ${date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )} • ${Math.round(session.duration / 60)} min focus`;

    historyList.appendChild(listItem);
  });
}

/* ============================
TIMER LOGIC
============================ */

function switchMode() {
  if (mode === "work") {
    completedSessions += 1;
    logSession();

    showNotification(
      "Focus session complete",
      "Good work. Time for a break."
    );

    playBeep();

    mode = "break";
  } else {
    showNotification(
      "Break complete",
      "Ready for the next focus session?"
    );

    playBeep();

    mode = "work";
  }

  timeRemaining = getDurationForMode(mode);

  updateModeUI();
  updateSessionCount();
  updateStats();
  renderHistory();
  saveState();
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
  saveState();
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
  settingsPanel.hidden = !settingsPanel.hidden;

  settingsToggle.setAttribute(
    "aria-expanded",
    String(!settingsPanel.hidden)
  );

  settingsToggle.textContent = settingsPanel.hidden
    ? "Settings"
    : "Hide settings";
}

/* ============================
EVENT LISTENERS
============================ */

startPauseBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);
settingsToggle.addEventListener("click", toggleSettingsPanel);
workInput.addEventListener("change", applySettingsFromInputs);
breakInput.addEventListener("change", applySettingsFromInputs);

themeToggle.addEventListener("click", toggleTheme);
focusModeToggle.addEventListener("click", toggleFocusMode);
notificationToggle.addEventListener("click", toggleNotifications);
soundToggle.addEventListener("click", toggleSound);

document.addEventListener("keydown", (event) => {
  const target = event.target;

  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  ) {
    return;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    toggleTimer();
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "r") {
    resetTimer();
  }

  if (key === "s") {
    toggleSettingsPanel();
  }

  if (key === "f") {
    toggleFocusMode();
  }

  if (key === "d") {
    toggleTheme();
  }

  if (key === "n") {
    toggleNotifications();
  }
});

/* ============================
INITIAL LOAD
============================ */

loadState();

timeRemaining = getDurationForMode(mode);

ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;

workInput.value = workDuration / 60;
breakInput.value = breakDuration / 60;

applyTheme();
applyFocusMode();
applyNotificationToggle();
applySoundToggle();

updateDisplay();
updateModeUI();
updateSessionCount();
updateRing();
updateControls();
updateSettingsAvailability();
updateStats();
renderHistory();

/* ============================
TASK LIST — v1.2.1
============================ */

(function initTaskList() {
  const TASKS_STORAGE_KEY = "pomodoroTasks.v1.2.1";

  let tasks = [];

  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const taskList = document.getElementById("taskList");
  const taskCount = document.getElementById("taskCount");
  const taskEmptyState = document.getElementById("taskEmptyState");

  // If the task list HTML is not present, do nothing.
  if (!taskForm || !taskInput || !taskList || !taskCount || !taskEmptyState) {
    return;
  }

  /* ----------------------------
  HELPERS
  ---------------------------- */

  function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /* ----------------------------
  PERSISTENCE
  ---------------------------- */

  function loadTasks() {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        tasks = parsed;
      }
    } catch (error) {
      console.warn("Could not load saved tasks, using defaults.", error);
    }
  }

  function saveTasks() {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }

  /* ----------------------------
  LOGIC
  ---------------------------- */

  function addTask(text) {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    tasks.unshift({
      id: createTaskId(),
      text: trimmedText,
      completed: false,
      createdAt: new Date().toISOString()
    });

    saveTasks();
    renderTasks();
  }

  function toggleTask(id) {
    tasks = tasks.map((task) => {
      if (task.id === id) {
        return {
          ...task,
          completed: !task.completed
        };
      }

      return task;
    });

    saveTasks();
    renderTasks();
  }

  function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);

    saveTasks();
    renderTasks();
  }

  /* ----------------------------
  UI
  ---------------------------- */

  function updateTaskCount() {
    const openTasks = tasks.filter((task) => !task.completed).length;
    const totalTasks = tasks.length;

    taskCount.textContent = `${openTasks} open • ${totalTasks} total`;
  }

  function renderTasks() {
    taskList.innerHTML = "";

    updateTaskCount();

    taskEmptyState.hidden = tasks.length > 0;

    tasks.forEach((task) => {
      const listItem = document.createElement("li");
      listItem.className = task.completed
        ? "task-item completed"
        : "task-item";

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "task-toggle";
      toggleButton.dataset.id = task.id;
      toggleButton.setAttribute(
        "aria-label",
        task.completed
          ? "Mark task as not completed"
          : "Mark task as completed"
      );
      toggleButton.textContent = task.completed ? "✓" : "";

      const taskText = document.createElement("span");
      taskText.className = "task-text";
      taskText.textContent = task.text;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "task-delete";
      deleteButton.dataset.id = task.id;
      deleteButton.setAttribute("aria-label", "Delete task");
      deleteButton.textContent = "✕";

      listItem.append(toggleButton, taskText, deleteButton);
      taskList.appendChild(listItem);
    });
  }

  /* ----------------------------
  EVENT LISTENERS
  ---------------------------- */

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    addTask(taskInput.value);

    taskInput.value = "";
    taskInput.focus();
  });

  taskList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");

    if (!button) {
      return;
    }

    const id = button.dataset.id;

    if (button.classList.contains("task-toggle")) {
      toggleTask(id);
    }

    if (button.classList.contains("task-delete")) {
      deleteTask(id);
    }
  });

  /* ----------------------------
  INITIAL LOAD
  ---------------------------- */

  loadTasks();
  renderTasks();
})();