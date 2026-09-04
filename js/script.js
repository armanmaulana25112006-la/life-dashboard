// =========================================
// Greeting Section — clock, date, greeting
// =========================================

const timeEl     = document.getElementById('current-time');
const dateEl     = document.getElementById('current-date');
const greetingEl = document.getElementById('greeting-text');

/**
 * Active user name — loaded from localStorage on start,
 * updated when the user saves a new name.
 * Empty string means "no name set".
 */
let userName = '';

/**
 * Returns a greeting string based on the current hour (0–23).
 * Ranges:
 *   04–10 → Selamat pagi
 *   11–14 → Selamat siang
 *   15–17 → Selamat sore
 *   18–03 → Selamat malam
 */
function getGreeting(hour) {
  if (hour >= 4 && hour <= 10) return 'Selamat pagi';
  if (hour >= 11 && hour <= 14) return 'Selamat siang';
  if (hour >= 15 && hour <= 17) return 'Selamat sore';
  return 'Selamat malam'; // 18–23 and 0–3
}

/**
 * Pads a number to 2 digits, e.g. 9 → "09".
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Builds and renders the time, date, and greeting from the current Date.
 * Called once immediately, then every second via setInterval.
 * Uses the module-level `userName` so the name is always current.
 */
function updateGreeting() {
  const now  = new Date();
  const hour = now.getHours();
  const min  = now.getMinutes();
  const sec  = now.getSeconds();

  // Real-time clock: HH:MM:SS
  timeEl.textContent = `${pad(hour)}:${pad(min)}:${pad(sec)}`;

  // Human-readable date in Bahasa Indonesia
  dateEl.textContent = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });

  // Greeting — append name when available, e.g. "Selamat pagi, Arman!"
  const base = getGreeting(hour);
  greetingEl.textContent = userName ? `${base}, ${userName}!` : `${base}!`;
}

// Run immediately so there's no blank flash on load
updateGreeting();

// Update every second
setInterval(updateGreeting, 1000);

// ---- Custom Name ----

const NAME_KEY     = 'lifeDashboardUserName';
const nameInput    = document.getElementById('name-input');
const saveNameBtn  = document.getElementById('save-name-btn');

/**
 * Persists and applies a new user name.
 * Updates the module-level `userName` so the already-running
 * setInterval picks it up on the very next tick.
 */
function saveName() {
  const name = nameInput.value.trim();
  if (!name) return;

  userName = name;
  localStorage.setItem(NAME_KEY, userName);
  nameInput.value       = '';
  nameInput.placeholder = userName; // reflect stored name as placeholder
  updateGreeting();                 // update immediately, don't wait 1 s
}

saveNameBtn.addEventListener('click', saveName);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveName();
});

// Restore saved name on page load
const storedName = localStorage.getItem(NAME_KEY);
if (storedName) {
  userName              = storedName;
  nameInput.placeholder = storedName; // show what's stored without filling input
  updateGreeting();
}

// =========================================
// Focus Timer Section
// =========================================

const DURATION_KEY     = 'lifeDashboardTimerDuration';
const TIMER_DEFAULT    = 25 * 60; // fallback: 1500 seconds

/**
 * Active default duration in seconds.
 * Loaded from localStorage on start; can be changed via "Atur Durasi".
 * resetTimer() always resets to this value, not the hardcoded constant.
 */
let timerDefault = TIMER_DEFAULT;

const timerDisplay       = document.getElementById('timer-display');
const startBtn           = document.getElementById('start-btn');
const stopBtn            = document.getElementById('stop-btn');
const resetBtn           = document.getElementById('reset-btn');
const customDurationInput = document.getElementById('custom-duration-input');
const setDurationBtn     = document.getElementById('set-duration-btn');

let remainingSeconds = timerDefault; // current countdown value
let timerInterval    = null;         // holds the setInterval reference

/**
 * Renders remainingSeconds to the display as MM:SS.
 */
function renderTimer() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  timerDisplay.textContent = `${pad(mins)}:${pad(secs)}`;
}

/**
 * Starts the countdown.
 * Guard: if timerInterval is already set, do nothing — prevents
 * double-interval when Start is clicked multiple times in a row.
 */
function startTimer() {
  if (timerInterval !== null) return; // already running

  timerInterval = setInterval(() => {
    remainingSeconds--;
    renderTimer();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }, 1000);
}

/**
 * Pauses the countdown without resetting remainingSeconds,
 * so Start can resume from the same point.
 */
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

/**
 * Stops the countdown and restores the timer to the current timerDefault.
 * Always reflects the latest custom duration, not the hardcoded constant.
 */
function resetTimer() {
  stopTimer();
  remainingSeconds = timerDefault;
  renderTimer();
}

/**
 * Reads custom-duration-input, validates, then updates timerDefault,
 * resets the timer, and persists the new duration to localStorage.
 */
function setDuration() {
  const raw     = customDurationInput.value;
  const minutes = parseInt(raw, 10);

  if (!raw || isNaN(minutes) || minutes < 1 || minutes > 180) {
    alert('Masukkan durasi antara 1 hingga 180 menit.');
    return;
  }

  timerDefault = minutes * 60;
  localStorage.setItem(DURATION_KEY, timerDefault); // store in seconds
  customDurationInput.value = '';
  resetTimer(); // stop if running, display new duration
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);
setDurationBtn.addEventListener('click', setDuration);
customDurationInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') setDuration();
});

// Restore saved duration on page load
const savedDuration = localStorage.getItem(DURATION_KEY);
if (savedDuration) {
  timerDefault     = parseInt(savedDuration, 10);
  remainingSeconds = timerDefault;
  renderTimer();
}

// =========================================
// To-Do List Section
// =========================================

/**
 * In-memory task store.
 * Each task is an object:
 *   {
 *     id:   number   — unique identifier (Date.now())
 *     text: string   — task label
 *     done: boolean  — completion status
 *   }
 *
 * Persisted to localStorage under the key "lifeDashboardTasks"
 * as a JSON-serialised array, e.g.:
 *   [{"id":1720000000000,"text":"Belajar CSS","done":false}, ...]
 */
let tasks = [];

const STORAGE_KEY = 'lifeDashboardTasks';

const taskInput  = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList   = document.getElementById('task-list');

// ---- Persistence ----

/**
 * Serialises the tasks array to JSON and writes it to localStorage.
 * Called after every mutation (add, edit, toggle, delete).
 */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Reads and deserialises tasks from localStorage.
 * If the key is absent or the value is invalid, falls back to an empty array.
 * Called once on page load.
 */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch {
    tasks = []; // corrupt data — start fresh
  }
  renderTasks();
}

// ---- Rendering ----

/**
 * Re-renders the full task list from the tasks array.
 * Each <li> contains:
 *   checkbox | task text span | Edit button | Delete button
 */
function renderTasks() {
  taskList.innerHTML = '';

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.dataset.id = task.id;

    // Checkbox — toggles done status
    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggleDone(task.id));

    // Task text span
    const span = document.createElement('span');
    span.textContent = task.text;
    if (task.done) span.style.textDecoration = 'line-through';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(task.id, span));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Hapus';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, span, editBtn, deleteBtn);
    taskList.appendChild(li);
  });
}

// ---- Actions ----

/**
 * Adds a new task from the input field.
 * Ignores empty or whitespace-only strings.
 */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  tasks.push({ id: Date.now(), text, done: false });
  taskInput.value = '';
  saveTasks();
  renderTasks();
}

/**
 * Toggles the done property of a task and re-renders.
 */
function toggleDone(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }
}

/**
 * Removes a task from the array by id and re-renders.
 */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

/**
 * Replaces the task's text <span> with an <input> for inline editing.
 * Saves on Enter key or blur (clicking outside).
 */
function startEdit(id, span) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const input = document.createElement('input');
  input.type  = 'text';
  input.value = task.text;

  function saveEdit() {
    const newText = input.value.trim();
    if (newText) task.text = newText;
    saveTasks();
    renderTasks(); // restore normal view
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
  });
  input.addEventListener('blur', saveEdit);

  span.replaceWith(input);
  input.focus();
}

// ---- Event listeners ----

addTaskBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

// Load persisted tasks on page start
loadTasks();

// =========================================
// Quick Links Section
// =========================================

/**
 * In-memory links store.
 * Each link is an object: { id: number, name: string, url: string }
 * Persisted to localStorage under "lifeDashboardLinks".
 */
let links = [];

const LINKS_KEY      = 'lifeDashboardLinks';

const linkNameInput  = document.getElementById('link-name-input');
const linkUrlInput   = document.getElementById('link-url-input');
const addLinkBtn     = document.getElementById('add-link-btn');
const linksList      = document.getElementById('links-list');

// ---- Persistence ----

function saveLinks() {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function loadLinks() {
  try {
    const stored = localStorage.getItem(LINKS_KEY);
    links = stored ? JSON.parse(stored) : [];
  } catch {
    links = [];
  }
  renderLinks();
}

// ---- Rendering ----

/**
 * Re-renders all quick link items from the links array.
 *
 * Each item is a <div> containing:
 *   - an <a> tag that opens the URL in a new tab
 *   - a "Hapus" <button> that stops event propagation so it never
 *     triggers the parent's click handler
 *
 * Separation of "open link" vs "delete" clicks:
 *   The open-link action lives on the <a> element (native href + target="_blank").
 *   The delete button calls e.stopPropagation() before running deleteLink(),
 *   which prevents the click from bubbling up to any parent listener.
 *   Because the <a> handles navigation via its own href, there is no shared
 *   parent click handler that could be accidentally triggered — the two actions
 *   are structurally independent.
 */
function renderLinks() {
  linksList.innerHTML = '';

  links.forEach((link) => {
    const item = document.createElement('div');
    item.className = 'link-item';

    // Anchor — opens URL in a new tab
    const anchor = document.createElement('a');
    anchor.href        = link.url;
    anchor.textContent = link.name;
    anchor.target      = '_blank';
    anchor.rel         = 'noopener noreferrer'; // security best practice

    // Delete button — stopPropagation prevents bubbling to anchor/parent
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Hapus';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLink(link.id);
    });

    item.append(anchor, deleteBtn);
    linksList.appendChild(item);
  });
}

// ---- Actions ----

/**
 * Normalises the URL: prepends "https://" if no protocol is present.
 */
function normaliseUrl(url) {
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return 'https://' + trimmed;
}

/**
 * Reads the two inputs, validates, normalises the URL, then adds a new link.
 */
function addLink() {
  const name = linkNameInput.value.trim();
  const rawUrl = linkUrlInput.value.trim();

  if (!name || !rawUrl) {
    alert('Nama dan URL tidak boleh kosong.');
    return;
  }

  const url = normaliseUrl(rawUrl);

  links.push({ id: Date.now(), name, url });
  saveLinks();
  renderLinks();

  linkNameInput.value = '';
  linkUrlInput.value  = '';
}

/**
 * Removes a link by id, persists, and re-renders.
 */
function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
}

// ---- Event listeners ----

addLinkBtn.addEventListener('click', addLink);

// Load persisted links on page start
loadLinks();

// =========================================
// Light / Dark Mode
// =========================================

const THEME_KEY      = 'lifeDashboardTheme';
const themeToggleBtn = document.getElementById('theme-toggle-btn');

/**
 * Applies the given theme ('dark' | 'light') to the document:
 *   - toggles the 'dark-mode' class on <body>
 *   - updates the button label
 *   - persists the choice to localStorage
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️ Light Mode';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleBtn.textContent = '🌙 Dark Mode';
  }
  localStorage.setItem(THEME_KEY, theme);
}

// Toggle between dark and light on each click
themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  applyTheme(isDark ? 'light' : 'dark');
});

// Restore saved theme on page load (no flash, no extra click needed)
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) applyTheme(savedTheme);
