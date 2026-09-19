import "./styles.css";
import appShell from "./app-shell.html?raw";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Tasky: #root no existe.");
}

root.innerHTML = appShell;

// =========================================================
// TASKY · VITE MIGRATION V1
//
// Esta sección conserva la lógica funcional de Tasky V72.
// En este primer paso solo cambia la arquitectura de entrada:
// HTML shell → app-shell.html
// CSS → styles.css
// JS → main.js
// =========================================================

"use strict";

    // =========================================================
    // TASKY · V46 · PREVIEW / STORAGE SAFETY
    // Evita que un sandbox (como la vista previa de ChatGPT) que
    // bloquee localStorage impida que toda la aplicación arranque.
    // =========================================================
    const memoryStorage = new Map();
    const safeStorage = {
      getItem(key) {
        try { return window.localStorage.getItem(key); }
        catch (error) { return memoryStorage.has(key) ? memoryStorage.get(key) : null; }
      },
      setItem(key, value) {
        try { window.localStorage.setItem(key, String(value)); }
        catch (error) { memoryStorage.set(key, String(value)); }
      },
      removeItem(key) {
        try { window.localStorage.removeItem(key); }
        catch (error) { memoryStorage.delete(key); }
      }
    };

    // =========================================================
    // TASKY V49
    // Objetivo de esta versión: placeholder de fases como hueco de destino y línea de inserción refinada.
    // Se mantienen los cambios de sincronización y renderizado incremental.
    // durante la sincronización para evitar que el campo desaparezca.
    // También conserva el renderizado incremental introducido en V30.
    // =========================================================

    /* =========================================================
       TASKY v46
       Arquitectura:
       - State -> render -> interactions -> state
       - Firestore solo sincroniza el state
       - DOM NO es la fuente de verdad
       ========================================================= */

    const APP_VERSION = 72;
    const APP_VERSION_LABEL = `V${APP_VERSION}`;
    // Version visible y persistencia compatibles con versiones anteriores.
    const STORAGE_KEY = "tasky_pro_v26";
    const THEME_KEY = "tasky_theme";
    const DEVICE_KEY = "tasky_device_id";

    const firebaseConfig = {
      apiKey: "AIzaSyBCiHv2iS76-q4y3WHgdrJ2zW5YrhvEcb8",
      authDomain: "tasky-7a30c.firebaseapp.com",
      projectId: "tasky-7a30c",
      storageBucket: "tasky-7a30c.firebasestorage.app",
      messagingSenderId: "505071526437",
      appId: "1:505071526437:web:6c9eb46dbb4fef296655cc"
    };

    const el = {
      loadingScreen: document.getElementById("loadingScreen"),
      loadingTitle: document.getElementById("loadingTitle"),
      loadingMessage: document.getElementById("loadingMessage"),
      board: document.getElementById("board"),
      emptyState: document.getElementById("emptyState"),
      emptyAddBtn: document.getElementById("emptyAddBtn"),
      searchInput: document.getElementById("searchInput"),
      overdueBtn: document.getElementById("overdueBtn"),
      overdueCount: document.getElementById("overdueCount"),
      overdueList: document.getElementById("overdueList"),
      productivityBtn: document.getElementById("productivityBtn"),
      dailyProductivityContent: document.getElementById("dailyProductivityContent"),
      statsReportContent: document.getElementById("statsReportContent"),
      syncStatus: document.getElementById("syncStatus"),
      todayText: document.getElementById("todayText"),
      dayPercent: document.getElementById("dayPercent"),
      dayCompleted: document.getElementById("dayCompleted"),
      dayTotal: document.getElementById("dayTotal"),
      dayProgressFill: document.getElementById("dayProgressFill"),
      metricCategories: document.getElementById("metricCategories"),
      metricPending: document.getElementById("metricPending"),
      metricCompleted: document.getElementById("metricCompleted"),
      fab: document.getElementById("fab"),
      fabMain: document.getElementById("fabMain"),
      fabTop: document.getElementById("fabTop"),
      themeBtn: document.getElementById("themeBtn"),
      menuBtn: document.getElementById("menuBtn"),
      importInput: document.getElementById("importInput"),
      toastStack: document.getElementById("toastStack")
    };

    let deviceId = "";

    let db = null;
    let taskyDoc = null;
    let unsubscribe = null;

    let state = defaultState();
    let initialized = false;
    let hydrating = false;
    let localDirty = false;
    let saveTimer = null;
    let lastSavedHash = "";
    let lastConfirmedRemoteHash = "";
    let lastConfirmedRemoteUpdatedBy = "";
    let lastLocalWriteHash = "";
    let lastBlockedRemoteHash = "";
    let lastBlockedRemoteAt = 0;
    let pendingRemoteState = null;
    let activeSearch = "";
    let saveInFlight = false;
    let queuedSaveReason = null;
    let sortableCategories = null;

    const sortableTasks = new Map();

    function defaultState() {
      return {
        version: APP_VERSION,
        categories: [],
        completed: []
      };
    }

    function getOrCreateDeviceId() {
      const existing = safeStorage.getItem(DEVICE_KEY);
      if (existing) return existing;
      const id = crypto?.randomUUID?.() || ("device-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8));
      safeStorage.setItem(DEVICE_KEY, id);
      return id;
    }

    function uid(prefix = "id") {
      return prefix + "-" + (crypto?.randomUUID?.() || (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,10)));
    }

    function today() {
      const d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    }

    function addDays(dateStr, days = 1) {
      const [y, m, d] = String(dateStr).split("-").map(Number);
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() + days);
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }

    function formatDateLong(dateStr) {
      const [y,m,d] = dateStr.split("-").map(Number);
      return new Intl.DateTimeFormat("es-PE", { weekday:"long", day:"numeric", month:"long" }).format(new Date(y, m-1, d));
    }

    function escapeHTML(value) {
      return String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    }

    function cssEscapeSafe(value) {
      return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }

    function serialize(obj) {
      return JSON.stringify(obj);
    }

    function hash(obj) {
      return serialize(obj);
    }

    function cloneState(obj) {
      return JSON.parse(JSON.stringify(obj));
    }

    function taskCountPending() {
      const now = today();

      return state.categories.reduce((sum, cat) => {
        return sum + cat.tasks.filter(task =>
          !task.draft &&
          String(task.text || "").trim() &&
          task.date &&
          task.date <= now &&
          !isRepeatCompletedToday(task)
        ).length;
      }, 0);
    }

    function taskCountCompleted() {
      return state.completed.length;
    }

    function overdueTasks() {
      const now = today();
      const result = [];
      for (const cat of state.categories) {
        for (const task of cat.tasks) {
          if (!task.draft && task.text.trim() && task.date && task.date < now) {
            result.push({ ...task, originCat: cat.id, originTitle: cat.title });
          }
        }
      }
      return result;
    }

    function completedDateFor(task) {
      if (task?.completedDate && /^\d{4}-\d{2}-\d{2}$/.test(task.completedDate)) return task.completedDate;
      if (task?.completedAt) {
        try { return new Intl.DateTimeFormat("en-CA").format(new Date(task.completedAt)); } catch (_) {}
      }
      return task?.date || "";
    }

    function isRepeatCompletedToday(task) {
      return Boolean(
        task?.repeat &&
        (
          task.lastCompletedDate === today() ||
          (
            task.lastCompletedAt &&
            completedDateFor({ completedAt: task.lastCompletedAt }) === today()
          )
        )
      );
    }

    function recurringCompletedTodayForCategory(categoryId) {
      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat) return 0;
      return cat.tasks.filter(task => !task.draft && isRepeatCompletedToday(task)).length;
    }

    function todayTaskStats() {
      const now = today();
      const completedRegular = state.completed.filter(t => completedDateFor(t) === now).length;
      // Las tareas repetitivas completadas hoy ya generan una entrada
      // en state.completed; no se cuentan de nuevo desde la serie.
      const completed = completedRegular;

      const pending = state.categories.reduce(
        (sum, cat) => sum + cat.tasks.filter(
          t => !t.draft &&
               t.date === now &&
               !isRepeatCompletedToday(t)
        ).length,
        0
      );

      const total = completed + pending;
      return {
        completed,
        pending,
        total,
        overdue: overdueTasks().length,
        completedRegular,
        completedRecurring: 0
      };
    }


    /* =========================================================
       TASKY V72 · MOTOR DE SONIDO
       Web Audio API, sin archivos externos.
       ========================================================= */
    const SOUND_STORAGE_KEY = "tasky_sound_enabled_v72";
    const SOUND_MASTER_GAIN = 0.045;

    let taskyAudioContext = null;
    let taskyMasterGain = null;

    function isSoundEnabled() {
      const saved = safeStorage.getItem(SOUND_STORAGE_KEY);
      return saved !== "false";
    }

    function setSoundEnabled(enabled) {
      safeStorage.setItem(
        SOUND_STORAGE_KEY,
        enabled ? "true" : "false"
      );

      updateSoundToggleUI();

      if (enabled) {
        playTaskySound("ui");
      }
    }

    function updateSoundToggleUI() {
      const button = document.getElementById("soundToggleBtn");
      const label = document.getElementById("soundToggleLabel");

      if (!button) return;

      const enabled = isSoundEnabled();

      button.setAttribute(
        "aria-pressed",
        enabled ? "true" : "false"
      );

      if (label) {
        label.textContent =
          enabled
            ? "Sonidos: Activados"
            : "Sonidos: Desactivados";
      }

      const icon = button.querySelector(
        "[data-lucide], svg"
      );

      if (icon && icon.setAttribute) {
        if (icon.hasAttribute("data-lucide")) {
          icon.setAttribute(
            "data-lucide",
            enabled ? "volume-2" : "volume-x"
          );
        }
      }

      refreshIcons();
    }

    function getTaskyAudioContext() {
      if (taskyAudioContext) {
        return taskyAudioContext;
      }

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        return null;
      }

      try {
        taskyAudioContext =
          new AudioContextClass();

        taskyMasterGain =
          taskyAudioContext.createGain();

        taskyMasterGain.gain.value =
          SOUND_MASTER_GAIN;

        taskyMasterGain.connect(
          taskyAudioContext.destination
        );

        return taskyAudioContext;
      } catch (error) {
        console.warn(
          "Tasky: no se pudo iniciar el audio.",
          error
        );
        return null;
      }
    }

    async function unlockTaskyAudio() {
      const ctx = getTaskyAudioContext();

      if (!ctx) {
        return false;
      }

      try {
        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        return ctx.state === "running";
      } catch (error) {
        return false;
      }
    }

    function createTaskyTone({
      frequency = 440,
      start = 0,
      duration = 0.08,
      type = "sine",
      peak = 0.7,
      detune = 0
    }) {
      const ctx =
        getTaskyAudioContext();

      if (
        !ctx ||
        !taskyMasterGain ||
        !isSoundEnabled()
      ) {
        return;
      }

      const oscillator =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      const now =
        ctx.currentTime +
        Math.max(0, start);

      const end =
        now +
        Math.max(0.025, duration);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(
        frequency,
        now
      );
      oscillator.detune.setValueAtTime(
        detune,
        now
      );

      gain.gain.setValueAtTime(
        0.0001,
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.01, peak),
        now + Math.min(0.018, duration * 0.22)
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        end
      );

      oscillator.connect(gain);
      gain.connect(taskyMasterGain);

      oscillator.start(now);
      oscillator.stop(end + 0.015);
    }

    let lastTaskySoundKey = "";
    let lastTaskySoundAt = 0;

    async function playTaskySound(kind = "ui") {
      if (!isSoundEnabled()) {
        return;
      }

      const soundKey = String(kind || "ui");
      const now = performance.now();

      if (
        lastTaskySoundKey === soundKey &&
        now - lastTaskySoundAt < 180
      ) {
        return;
      }

      lastTaskySoundKey = soundKey;
      lastTaskySoundAt = now;

      const ready =
        await unlockTaskyAudio();

      if (!ready) {
        return;
      }

      /*
       * Todos los sonidos son muy cortos y de baja ganancia.
       * La diferencia está en el patrón, no en el volumen.
       */
      switch (kind) {

        case "complete":
          createTaskyTone({
            frequency: 660,
            duration: 0.07,
            type: "sine",
            peak: 0.72
          });
          createTaskyTone({
            frequency: 880,
            start: 0.06,
            duration: 0.13,
            type: "sine",
            peak: 0.62
          });
          break;

        case "restore":
          createTaskyTone({
            frequency: 523.25,
            duration: 0.08,
            type: "triangle",
            peak: 0.62
          });
          createTaskyTone({
            frequency: 659.25,
            start: 0.055,
            duration: 0.12,
            type: "triangle",
            peak: 0.52
          });
          break;

        case "delete":
          createTaskyTone({
            frequency: 420,
            duration: 0.07,
            type: "sine",
            peak: 0.48
          });
          createTaskyTone({
            frequency: 260,
            start: 0.055,
            duration: 0.11,
            type: "sine",
            peak: 0.38
          });
          break;

        case "add":
          createTaskyTone({
            frequency: 560,
            duration: 0.055,
            type: "triangle",
            peak: 0.46
          });
          createTaskyTone({
            frequency: 740,
            start: 0.035,
            duration: 0.08,
            type: "triangle",
            peak: 0.34
          });
          break;

        case "move":
          createTaskyTone({
            frequency: 520,
            duration: 0.045,
            type: "sine",
            peak: 0.32
          });
          createTaskyTone({
            frequency: 620,
            start: 0.045,
            duration: 0.055,
            type: "sine",
            peak: 0.28
          });
          break;

        case "repeat":
          createTaskyTone({
            frequency: 480,
            duration: 0.055,
            type: "triangle",
            peak: 0.35
          });
          createTaskyTone({
            frequency: 640,
            start: 0.045,
            duration: 0.075,
            type: "triangle",
            peak: 0.30
          });
          break;

        case "error":
          createTaskyTone({
            frequency: 320,
            duration: 0.075,
            type: "sine",
            peak: 0.30
          });
          createTaskyTone({
            frequency: 240,
            start: 0.07,
            duration: 0.10,
            type: "sine",
            peak: 0.26
          });
          break;

        case "ui":
        default:
          createTaskyTone({
            frequency: 720,
            duration: 0.045,
            type: "sine",
            peak: 0.25
          });
          break;
      }
    }

    function soundForClickTarget(target) {
      const interactive =
        target?.closest?.(
          "button, [role='button'], label.soft-btn, .fab-action, .icon-btn, .soft-btn"
        );

      if (!interactive) {
        return null;
      }

      const action =
        interactive.dataset?.action ||
        interactive.dataset?.menuAction ||
        interactive.dataset?.overdueAction ||
        "";

      switch (action) {
        case "complete-task":
          return "complete";

        case "restore-task":
        case "recover":
        case "restore":
          return "restore";

        case "delete-task":
        case "delete-category":
        case "reset":
        case "delete":
          return "delete";

        case "add-task":
        case "add-category":
          return "add";

        case "move-category-up":
        case "move-category-down":
        case "today":
          return "move";

        case "toggle-repeat":
          return "repeat";

        case "toggle-sound":
          return "ui";

        default:
          return "ui";
      }
    }

    function setSyncStatus(kind, label) {
      el.syncStatus.innerHTML = '<span class="sync-dot ' + escapeHTML(kind) + '"></span> ' + escapeHTML(label);
    }

    function toast(message, icon = "check", type = "success") {
      const node = document.createElement("div");
      node.className = "toast " + (type || "");
      node.innerHTML = '<i data-lucide="' + escapeHTML(icon) + '"></i><span>' + escapeHTML(message) + '</span>';
      el.toastStack.appendChild(node);
      refreshIcons();

      if (type === "error") {
        playTaskySound("error");
      }

      setTimeout(() => node.remove(), 3600);
    }


    /* =========================================================
       V60 · Carga no bloqueante de dependencias
       ========================================================= */
    const DEPENDENCY_TIMEOUT_MS = 8000;

    function waitForGlobal(predicate, timeout = DEPENDENCY_TIMEOUT_MS, interval = 40) {
      return new Promise(resolve => {
        const startedAt = Date.now();

        const check = () => {
          let ready = false;
          try { ready = Boolean(predicate()); } catch (_) { ready = false; }

          if (ready) {
            resolve(true);
            return;
          }

          if (Date.now() - startedAt >= timeout) {
            resolve(false);
            return;
          }

          setTimeout(check, interval);
        };

        check();
      });
    }


    async function ensureFirebaseLoaded() {
      if (window.firebase?.firestore) return true;

      // V66: intentar que los <script defer> terminen primero.
      let ready = await waitForGlobal(() => window.firebase?.firestore, 5000, 50);
      if (ready) return true;

      const fallbackSources = [
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js",
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js",
        "https://cdn.jsdelivr.net/npm/firebase@10.12.5/compat/firebase-app.js",
        "https://cdn.jsdelivr.net/npm/firebase@10.12.5/compat/firebase-firestore.js"
      ];

      for (const src of fallbackSources) {
        try {
          const tag = document.createElement("script");
          tag.src = src;
          tag.async = true;

          await new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error("timeout")), 5500);
            tag.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            tag.onerror = () => {
              clearTimeout(timer);
              reject(new Error("load error"));
            };
            document.head.appendChild(tag);
          });

          ready = Boolean(window.firebase?.firestore);
          if (ready) return true;
        } catch (error) {
          console.warn("Firebase fallback:", src, error);
        }
      }

      return false;
    }

    /* =========================================================
       TASKY V66 · ICONOS LOCALES
       No dependen de Lucide/CDN. Cada icono se genera como SVG
       en el propio navegador, garantizando que botones y controles
       sigan visibles aunque una CDN externa falle.
       ========================================================= */
    const LOCAL_ICON_SVG = {
      "check": '<polyline points="20 6 9 17 4 12"></polyline>',
      "check-check": '<path d="m3 12 4 4L17 6"></path><path d="m9 12 4 4L21 8"></path>',
      "sun": '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
      "moon": '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"></path>',
      "ellipsis": '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"></circle><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"></circle>',
      "sparkles": '<path d="m12 3-1.3 4.3L6 9l4.7 1.7L12 15l1.3-4.3L18 9l-4.7-1.7L12 3Z"></path><path d="m19 14-.7 2.3L16 17l2.3.7L19 20l.7-2.3L22 17l-2.3-.7L19 14Z"></path>',
      "search": '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
      "gauge": '<path d="M4 14a8 8 0 1 1 16 0"></path><path d="M12 12l4-3"></path><path d="M6 18h12"></path>',
      "triangle-alert": '<path d="m10.3 3.4-7.6 13A2 2 0 0 0 4.4 19h15.2a2 2 0 0 0 1.7-3l-7.6-13a2 2 0 0 0-3.4 0Z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
      "layout-list": '<rect x="3" y="4" width="18" height="4" rx="1"></rect><rect x="3" y="10" width="18" height="4" rx="1"></rect><rect x="3" y="16" width="18" height="4" rx="1"></rect>',
      "plus": '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
      "chevron-up": '<path d="m6 15 6-6 6 6"></path>',
      "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
      "message-circle": '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.6 8.6 0 0 1-4-.9L3 21l1.4-4.4A8.4 8.4 0 0 1 3 11.5a9 9 0 1 1 18 0Z"></path>',
      "download": '<path d="M12 3v11"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path>',
      "layers-3": '<path d="m12 3 9 5-9 5-9-5 9-5Z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 16 9 5 9-5"></path>',
      "x": '<path d="M6 6l12 12"></path><path d="M18 6 6 18"></path>',
      "shield-check": '<path d="M12 3 20 6v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6l8-3Z"></path><path d="m9 12 2 2 4-4"></path>',
      "upload": '<path d="M12 21V8"></path><path d="m7 13 5-5 5 5"></path><path d="M5 3h14"></path>',
      "archive": '<path d="M4 7h16v13H4z"></path><path d="M3 4h18v3H3z"></path><path d="M9 12h6"></path>',
      "trash-2": '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 15H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
      "grip-vertical": '<circle cx="9" cy="5" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="15" cy="5" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="9" cy="19" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="15" cy="19" r="1.2" fill="currentColor" stroke="none"></circle>',
      "bar-chart-3": '<path d="M5 20V10"></path><path d="M12 20V4"></path><path d="M19 20v-7"></path>',
      "undo-2": '<path d="M9 7 4 12l5 5"></path><path d="M4 12h10a6 6 0 0 1 6 6"></path>',
      "repeat-2": '<path d="m17 1 4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="m7 23-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
      "circle-check": '<circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path>'
    };

    function refreshIcons() {
      const icons = [...document.querySelectorAll("i[data-lucide]")];

      for (const node of icons) {
        const name = node.getAttribute("data-lucide") || "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.classList.add("tasky-svg-icon");

        svg.innerHTML = LOCAL_ICON_SVG[name] || '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"></circle>';

        for (const attr of node.getAttributeNames()) {
          if (attr === "data-lucide" || attr === "class" || attr === "style") continue;
        }

        if (node.className) svg.classList.add(...String(node.className).split(/\s+/).filter(Boolean));
        if (node.getAttribute("style")) svg.setAttribute("style", node.getAttribute("style"));
        if (node.id) svg.id = node.id;

        node.replaceWith(svg);
      }
    }

    function hideLoading() {
      el.loadingScreen.classList.add("hidden");
      document.documentElement.classList.remove("tasky-booting");
      initialized = true;
      if (typeof TASKY_BOOT_WATCHDOG !== "undefined") {
        clearTimeout(TASKY_BOOT_WATCHDOG);
      }
    }

    function applyTheme(theme) {
      const resolved = theme === "system"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;

      document.documentElement.dataset.theme = resolved;
      el.themeBtn.innerHTML = '<i data-lucide="' + (resolved === "dark" ? "moon" : "sun") + '"></i>';
      refreshIcons();
      safeStorage.setItem(THEME_KEY, theme);
    }

    function toggleTheme() {
      const current = document.documentElement.dataset.theme || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    }

    function normalizeState(raw) {
      const source = raw && typeof raw === "object" ? raw : defaultState();
      const normalized = defaultState();

      const cats = Array.isArray(source.categories) ? source.categories : [];
      normalized.categories = cats.map((cat, index) => {
        const rawOrder = Number(cat.order);

        const category = {
          id: String(cat.id || uid("cat")),
          title: typeof cat.title === "string" ? cat.title : ("Fase " + (index + 1)),
          emoji: typeof cat.emoji === "string" ? cat.emoji.slice(0, 8) : "",
          tasks: Array.isArray(cat.tasks) ? cat.tasks : [],
          order: Number.isFinite(rawOrder) ? rawOrder : index
        };

        category.tasks = category.tasks
          .filter(Boolean)
          .map(task => {
            const text = typeof task.text === "string" ? task.text : "";
            return {
              id: String(task.id || uid("task")),
              text,
              date: /^\d{4}-\d{2}-\d{2}$/.test(task.date || "") ? task.date : today(),
              draft: Boolean(task.draft) || text.trim() === "",
              repeat: Boolean(task.repeat),
              repeatDays: Array.isArray(task.repeatDays) && task.repeatDays.length
                ? [...new Set(task.repeatDays.map(Number).filter(n => n >= 1 && n <= 7))].sort((a,b) => a-b)
                : (task.repeat ? [1,2,3,4,5,6,7] : []),
              repeatCount: Number.isFinite(Number(task.repeatCount)) ? Number(task.repeatCount) : 0,
              lastCompletedAt: task.lastCompletedAt || null,
              lastCompletedDate: /^\d{4}-\d{2}-\d{2}$/.test(task.lastCompletedDate || "") ? task.lastCompletedDate : null
            };
          });

        return category;
      });

      normalized.completed = Array.isArray(source.completed)
        ? source.completed.filter(Boolean).map(task => ({
            id: String(task.id || uid("task")),
            text: typeof task.text === "string" ? task.text : "",
            date: /^\d{4}-\d{2}-\d{2}$/.test(task.date || "") ? task.date : today(),
            originCat: String(task.originCat || ""),
            completedAt: task.completedAt || Date.now(),
            completedDate: /^\d{4}-\d{2}-\d{2}$/.test(task.completedDate || "") ? task.completedDate : completedDateFor(task),
            completedForDate: /^\d{4}-\d{2}-\d{2}$/.test(task.completedForDate || "") ? task.completedForDate : (
              /^\d{4}-\d{2}-\d{2}$/.test(task.completedDate || "") ? task.completedDate : completedDateFor(task)
            ),
            originIndex: Number.isInteger(task.originIndex) ? task.originIndex : 999999,
            repeat: Boolean(task.repeat),
            repeatDays: Array.isArray(task.repeatDays) ? [...new Set(task.repeatDays.map(Number).filter(n => n >= 1 && n <= 7))].sort((a,b) => a-b) : [],
            repeatSourceId: typeof task.repeatSourceId === "string" ? task.repeatSourceId : "",
            recurringOccurrence: Boolean(task.recurringOccurrence),
            nextOccurrenceDate: /^\d{4}-\d{2}-\d{2}$/.test(task.nextOccurrenceDate || "") ? task.nextOccurrenceDate : null
          })).filter(task => task.text.trim() !== "")
        : [];

      normalized.version = APP_VERSION;
      return normalized;
    }


    const SAFETY_BACKUP_KEY = 'tasky_safety_backup';
    const SAFETY_HISTORY_KEY = 'tasky_safety_history_v43';
    const SAFETY_HISTORY_LIMIT = 20;

    function stateStats(source = state) {
      const categories = Array.isArray(source?.categories) ? source.categories : [];
      const completed = Array.isArray(source?.completed) ? source.completed : [];
      const pendingTasks = categories.reduce((sum, cat) => sum + (Array.isArray(cat.tasks) ? cat.tasks.length : 0), 0);
      return {
        categories: categories.length,
        pending: pendingTasks,
        completed: completed.length,
        total: pendingTasks + completed.length
      };
    }

    function statePayload(source = state) {
      return {
        version: APP_VERSION,
        categories: Array.isArray(source?.categories) ? source.categories : [],
        completed: Array.isArray(source?.completed) ? source.completed : []
      };
    }

    function createSafetyRecord(reason = 'snapshot', source = state) {
      return {
        app: 'Tasky',
        version: APP_VERSION,
        reason,
        savedAt: new Date().toISOString(),
        stats: stateStats(source),
        data: cloneState(source)
      };
    }

    function saveSafetyBackup(reason = 'snapshot', source = state) {
      try {
        const record = createSafetyRecord(reason, source);
        safeStorage.setItem(SAFETY_BACKUP_KEY, JSON.stringify(record));

        let history = [];
        try {
          history = JSON.parse(safeStorage.getItem(SAFETY_HISTORY_KEY) || '[]');
          if (!Array.isArray(history)) history = [];
        } catch (_) {
          history = [];
        }

        const signature = hash(record.data);
        history = history.filter(item => hash(item?.data || {}) !== signature);
        history.unshift(record);
        history = history.slice(0, SAFETY_HISTORY_LIMIT);
        safeStorage.setItem(SAFETY_HISTORY_KEY, JSON.stringify(history));
      } catch (error) {
        console.warn('No se pudo crear respaldo de seguridad:', error);
      }
    }

    function loadSafetyBackup() {
      try {
        const raw = safeStorage.getItem(SAFETY_BACKUP_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return normalizeState(parsed.data || parsed);
      } catch (error) {
        console.warn('Respaldo de seguridad inválido:', error);
        return null;
      }
    }

    function loadSafetyHistory() {
      try {
        const raw = safeStorage.getItem(SAFETY_HISTORY_KEY);
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn('Historial de respaldos inválido:', error);
        return [];
      }
    }

    function looksLikeUnexpectedDataLoss(candidate, reference = loadSafetyBackup()) {
      if (!reference) return false;
      const good = stateStats(reference);
      const incoming = stateStats(candidate);
      if (good.total < 4) return false;
      if (incoming.total >= good.total) return false;
      return incoming.total <= Math.max(2, Math.floor(good.total * 0.50));
    }

    function looksLikeUnexpectedShrink(candidate, baseline = state) {
      const base = stateStats(baseline);
      const incoming = stateStats(candidate);
      if (base.total < 6) return false;
      if (incoming.total >= base.total) return false;
      return incoming.total <= Math.max(2, Math.floor(base.total * 0.50));
    }

    function getLatestBackupRecord() {
      const history = loadSafetyHistory();
      return history[0] || null;
    }

    function exportSafetyHistory() {
      const latest = getLatestBackupRecord();
      const history = loadSafetyHistory();
      const payload = {
        app: 'Tasky',
        exportVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        latest,
        history
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tasky-safety-history-' + today() + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Historial de respaldos exportado', 'archive');
    }

    function loadLocalState() {
      try {
        const raw = safeStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return normalizeState(JSON.parse(raw));
      } catch (error) {
        console.error("Local state inválido:", error);
        return null;
      }
    }

    function persistLocal() {
      safeStorage.setItem(STORAGE_KEY, serialize(state));
    }

    function updateSummaryUI() {
      const overdue = overdueTasks();
      const pending = taskCountPending();
      const completed = taskCountCompleted();
      const day = todayTaskStats();

      el.metricCategories.textContent = state.categories.length;
      el.metricPending.textContent = pending;
      el.metricCompleted.textContent = completed;

      el.overdueCount.textContent = overdue.length;
      el.overdueBtn.hidden = false;

      const pct = day.total ? Math.round((day.completed / day.total) * 100) : 0;
      el.dayPercent.textContent = pct + "%";
      el.dayCompleted.textContent = day.completed;
      el.dayTotal.textContent = day.total;
      el.dayProgressFill.style.width = pct + "%";

      const date = new Date();
      el.todayText.textContent = formatDateLong(today()).replace(/^\w/, c => c.toUpperCase());

      document.title = overdue.length
        ? "(" + overdue.length + ") Tasky"
        : "Tasky";
    }



    function categoryOrderValue(cat, fallback = 0) {
      const value = Number(cat?.order);
      return Number.isFinite(value) ? value : fallback;
    }

    function compareCategoryOrder(a, b) {
      return (
        categoryOrderValue(a) -
        categoryOrderValue(b)
      );
    }

    function normalizeCategoryOrder() {
      state.categories.forEach((cat, index) => {
        cat.order = index;
      });
    }

    function categoryHasOpenWorkToday(cat) {
      if (!cat || !Array.isArray(cat.tasks)) return false;

      const todayDate = today();

      return cat.tasks.some(task => {
        if (!task) return false;

        // Un borrador recién creado es trabajo activo aunque todavía no
        // tenga texto: queremos que la fase suba inmediatamente.
        if (task.draft) return true;

        if (!String(task.text || "").trim()) return false;

        // Una repetitiva ya completada hoy no cuenta como trabajo abierto.
        if (task.repeat && isRepeatCompletedToday(task)) return false;

        // Hoy y atrasadas son trabajo pendiente. Futuras, no.
        return Boolean(task.date) && task.date <= todayDate;
      });
    }

    function repositionCategoryInState(categoryId) {
      const currentIndex = state.categories.findIndex(c => c.id === categoryId);
      if (currentIndex === -1) return false;

      const category = state.categories[currentIndex];
      const remaining = state.categories.filter(c => c.id !== categoryId);
      const shouldBeFinished = !categoryHasOpenWorkToday(category);

      let insertIndex;

      if (shouldBeFinished) {
        // Las fases sin trabajo de hoy viven al final, después de todas
        // las fases activas. La fase recién terminada cae al final.
        insertIndex = remaining.length;
      } else {
        // Una fase que vuelve a tener trabajo se coloca al final del bloque
        // de fases activas, justo antes de la primera fase aparcada.
        const firstFinishedIndex = remaining.findIndex(
          c => !categoryHasOpenWorkToday(c)
        );
        insertIndex = firstFinishedIndex === -1
          ? remaining.length
          : firstFinishedIndex;
      }

      const changed = currentIndex !== insertIndex || remaining.length !== state.categories.length - 1;

      state.categories = [
        ...remaining.slice(0, insertIndex),
        category,
        ...remaining.slice(insertIndex)
      ];

      return changed;
    }

    function syncCategoryPlacement(categoryId) {
      const cat = state.categories.find(
        c => c.id === categoryId
      );

      if (!cat) return false;

      const card = document.querySelector(
        `.activity-card[data-category-id="${cssEscapeSafe(categoryId)}"]`
      );

      if (!card) return false;

      const completedCard =
        el.board.querySelector(".completed-card");

      const otherEntries = sectionCards()
        .filter(node => node !== card)
        .map(node => ({
          node,
          cat: state.categories.find(
            c => c.id === node.dataset.categoryId
          )
        }))
        .filter(entry => entry.cat);

      const manualOrder =
        categoryOrderValue(cat);

      const isFinished =
        !categoryHasOpenWorkToday(cat);

      if (isFinished) {
        const nextFinished = otherEntries
          .filter(entry =>
            !categoryHasOpenWorkToday(entry.cat)
          )
          .sort((a, b) =>
            compareCategoryOrder(
              a.cat,
              b.cat
            )
          )
          .find(entry =>
            categoryOrderValue(entry.cat) >
            manualOrder
          );

        if (nextFinished) {
          el.board.insertBefore(
            card,
            nextFinished.node
          );
        } else if (completedCard) {
          // Después de Completadas y después de todas las
          // fases terminadas que tengan menor orden manual.
          let insertAfter = completedCard;

          for (
            let node = completedCard.nextElementSibling;
            node && node.classList.contains("activity-card");
            node = node.nextElementSibling
          ) {
            const nodeCat = state.categories.find(
              c => c.id === node.dataset.categoryId
            );

            if (!nodeCat) break;

            if (
              !categoryHasOpenWorkToday(nodeCat) &&
              categoryOrderValue(nodeCat) < manualOrder
            ) {
              insertAfter = node;
              continue;
            }

            if (
              !categoryHasOpenWorkToday(nodeCat) &&
              categoryOrderValue(nodeCat) > manualOrder
            ) {
              break;
            }

            if (
              categoryHasOpenWorkToday(nodeCat)
            ) {
              break;
            }
          }

          el.board.insertBefore(
            card,
            insertAfter.nextSibling
          );
        } else {
          el.board.appendChild(card);
        }

      } else {
        const nextActive = otherEntries
          .filter(entry =>
            categoryHasOpenWorkToday(entry.cat)
          )
          .sort((a, b) =>
            compareCategoryOrder(
              a.cat,
              b.cat
            )
          )
          .find(entry =>
            categoryOrderValue(entry.cat) >
            manualOrder
          );

        if (nextActive) {
          el.board.insertBefore(
            card,
            nextActive.node
          );
        } else if (completedCard) {
          el.board.insertBefore(
            card,
            completedCard
          );
        } else {
          el.board.appendChild(card);
        }
      }

      card.classList.add("section-moved");

      window.setTimeout(
        () =>
          card.classList.remove(
            "section-moved"
          ),
        220
      );

      refreshSectionMoveControls();

      return true;
    }

    function render() {
      hydrating = true;

      // V37: las fases no dependen de una instancia SortableJS.
      sortableCategories = null;
      for (const instance of sortableTasks.values()) instance.destroy();
      sortableTasks.clear();

      el.board.innerHTML = "";

      const query = activeSearch.trim().toLowerCase();

      // V71:
      // 1. state.categories conserva SIEMPRE el orden manual.
      // 2. Las fases activas se dibujan antes de Completadas.
      // 3. Las fases terminadas se dibujan después de Completadas.
      // 4. Dentro de ambos bloques se conserva category.order.
      const orderedCategories = [...state.categories]
        .sort(compareCategoryOrder);

      const needsOrderRepair =
        orderedCategories.some(
          (cat, index) =>
            categoryOrderValue(cat, index) !== index
        );

      if (needsOrderRepair) {
        state.categories = orderedCategories;
        normalizeCategoryOrder();
        persistLocal();
        localDirty = true;
      } else {
        state.categories = orderedCategories;
      }

      const activeCategories =
        state.categories.filter(
          categoryHasOpenWorkToday
        );

      const finishedCategories =
        state.categories.filter(
          cat => !categoryHasOpenWorkToday(cat)
        );

      for (const cat of activeCategories) {
        const index =
          state.categories.findIndex(
            c => c.id === cat.id
          );

        el.board.appendChild(
          buildCategoryCard(
            cat,
            index,
            query
          )
        );
      }

      buildCompletedCard(query);

      for (const cat of finishedCategories) {
        const index =
          state.categories.findIndex(
            c => c.id === cat.id
          );

        el.board.appendChild(
          buildCategoryCard(
            cat,
            index,
            query
          )
        );
      }

      const visibleCategories = el.board.querySelectorAll(".activity-card:not(.completed-card)");
      el.emptyState.style.display = state.categories.length === 0 ? "block" : "none";

      if (state.categories.length > 0 && visibleCategories.length === 0) {
        el.emptyState.style.display = "block";
        el.emptyState.querySelector("h2").textContent = "No encontramos coincidencias";
        el.emptyState.querySelector("p").textContent = "Prueba con otra palabra o limpia el buscador.";
      } else {
        el.emptyState.querySelector("h2").textContent = "Tu tablero está limpio ✨";
        el.emptyState.querySelector("p").textContent = "Crea una fase para empezar. Puedes mover fases, reordenar tareas, pegar listas completas y copiar tu plan a WhatsApp.";
      }

      initSortables();
      refreshSectionMoveControls();

      hydrating = false;
      updateSummaryUI();
      refreshIcons();
      updateTaskHeights();
    }

    function buildCategoryCard(cat, index, query) {
      const visiblePending = cat.tasks.filter(t =>
        !(
          !t.draft &&
          t.text.trim() &&
          (
            t.date < today() ||
            (t.repeat && isRepeatCompletedToday(t)) ||
            (t.repeat && t.date > today())
          )
        )
      ).length;
      // Las ocurrencias repetitivas ya viven en state.completed,
      // por lo que no debemos sumarlas una segunda vez desde la tarea-serie.
      const completedToday =
        state.completed.filter(t => t.originCat === cat.id && completedDateFor(t) === today()).length;

      const todayPending = cat.tasks.filter(
        t => !t.draft &&
             t.text.trim() &&
             t.date === today() &&
             !isRepeatCompletedToday(t)
      ).length;
      const todayTotal = completedToday + todayPending;
      const pct = todayTotal ? Math.round((completedToday / todayTotal) * 100) : 0;

      const card = document.createElement("article");
      card.className = "activity-card" + (todayTotal > 0 && pct === 100 ? " is-complete" : "");
      card.dataset.categoryId = cat.id;
      card.dataset.categoryOrder = String(
        categoryOrderValue(cat, index)
      );

      card.innerHTML = `
        <div class="card-head">
          <div class="card-title-row">
            <button class="drag-card" type="button" title="Arrastrar para mover fase" aria-label="Arrastrar para mover fase">
              <i data-lucide="grip-vertical"></i>
            </button>
            <div class="section-order-controls" aria-label="Cambiar posición de fase">
              <button class="section-order-btn" type="button" data-action="move-category-up" title="Subir fase" aria-label="Subir fase">
                <i data-lucide="chevron-up"></i>
              </button>
              <button class="section-order-btn" type="button" data-action="move-category-down" title="Bajar fase" aria-label="Bajar fase">
                <i data-lucide="chevron-down"></i>
              </button>
            </div>
            <input class="activity-title" maxlength="80" value="${escapeHTML(cat.title)}" placeholder="Nombre de la fase…">
            <div class="card-actions">
              <button class="mini-btn" type="button" data-action="stats" title="Ver resumen" aria-label="Ver resumen">
                <i data-lucide="bar-chart-3"></i>
              </button>
              <button class="mini-btn danger" type="button" data-action="delete-category" title="Eliminar fase" aria-label="Eliminar fase">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>

          <div class="card-meta">
            <span class="pill neutral">${visiblePending} pendiente${visiblePending === 1 ? "" : "s"}</span>
            <span class="pill ${todayTotal > 0 && pct === 100 ? "success" : "primary"}">${todayTotal > 0 ? `${pct}% hoy` : "Sin tareas hoy"}</span>
          </div>

          <div class="card-progress">
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
            <span class="card-progress-value">${todayTotal > 0 ? `${completedToday}/${todayTotal} hoy` : '—'}</span>
          </div>
        </div>

        <div class="task-list" data-category-id="${escapeHTML(cat.id)}"></div>

        <button class="add-task" type="button" data-action="add-task">
          <i data-lucide="plus"></i> Añadir tarea
        </button>
      `;

      const list = card.querySelector(".task-list");

      for (const task of cat.tasks) {
        if (!task.draft && task.text.trim() && task.date < today()) continue;

        // Una repetitiva que ya se completó hoy queda archivada en
        // Completadas. Su tarea-serie no vuelve a mostrarse hasta su
        // siguiente fecha programada.
        if (!task.draft && task.text.trim() && task.repeat && isRepeatCompletedToday(task)) continue;
        if (!task.draft && task.text.trim() && task.repeat && task.date > today()) continue;

        const item = buildTaskItem(task, query, false);
        list.appendChild(item);
      }

      return card;
    }

    function buildTaskItem(task, query, completed) {
      const item = document.createElement("div");
      const isOverdue = !completed && task.date < today();
      item.className = "task-item" + (completed ? " completed-item" : "") + (isOverdue ? " overdue" : "");
      item.dataset.taskId = task.id;
      if (!completed) item.dataset.date = task.date;

      if (completed) {
        item.innerHTML = `
          <span class="check-btn" aria-hidden="true" style="background:var(--success);border-color:var(--success);color:#fff">
            <i data-lucide="check"></i>
          </span>
          <div class="task-input" role="text" aria-label="Tarea completada">
            ${escapeHTML(task.text)}
            ${task.recurringOccurrence ? '<span class="completed-repeat-note">Repetitiva · completada hoy</span>' : ''}
          </div>
          <button class="completed-restore-btn" type="button" data-action="restore-task" title="Restaurar en su fase" aria-label="Restaurar tarea en su fase">
            <i data-lucide="undo-2"></i>
            <span>Restaurar</span>
          </button>
          <button class="completed-delete-btn" type="button" data-action="delete-task" title="Eliminar tarea" aria-label="Eliminar tarea">
            <i data-lucide="x"></i>
          </button>
        `;
      } else {
        const dueLabel = isOverdue
          ? "Atrasada · " + formatDateLong(task.date)
          : "Para hoy · " + formatDateLong(task.date);
        const repeatActive = Boolean(task.repeat);
        const repeatDoneToday = isRepeatCompletedToday(task);

        item.classList.toggle("repeat-done-today", repeatDoneToday);

        item.innerHTML = `
          <button class="drag-task" type="button" title="Mantén pulsado para mover" aria-label="Mover tarea"><i data-lucide="grip-vertical"></i></button>
          <button
            class="check-btn${repeatDoneToday ? " repeat-done-today" : ""}"
            type="button"
            data-action="complete-task"
            aria-label="${repeatDoneToday ? "Completada hoy" : "Completar tarea"}"
            ${repeatDoneToday ? "disabled" : ""}
          >${repeatDoneToday ? '<i data-lucide="check"></i>' : ""}</button>
          <textarea class="task-input" rows="1" maxlength="500" placeholder="Añadir tarea…">${escapeHTML(task.text)}</textarea>
          <div class="task-item-actions">
            <button class="repeat-btn${repeatActive ? " active" : ""}" type="button" data-action="toggle-repeat" title="${repeatActive ? "Editar repetición" : "Configurar repetición"}" aria-label="${repeatActive ? "Editar repetición" : "Configurar repetición"}">
              <i data-lucide="repeat-2"></i>
            </button>
            <button class="delete-task-btn remove-task" type="button" data-action="delete-task" title="Eliminar tarea" aria-label="Eliminar tarea"><i data-lucide="x"></i></button>
          </div>
          ${repeatActive && repeatDoneToday
            ? `<span class="task-due-repeat-status"><i data-lucide="circle-check"></i>Completada hoy<span class="next-date">· Próxima ${escapeHTML(formatDateLong(task.date))}</span></span>`
            : (repeatActive
              ? `<span class="task-repeat-badge task-repeat-badge-standalone" title="${escapeHTML(repeatDaysToLabel(task.repeatDays))}"><i data-lucide="repeat-2"></i>${escapeHTML(repeatDaysToLabel(task.repeatDays))}</span>`
              : '')}
        `;
      }

      if (query) {
        const haystack = task.text.toLowerCase();
        if (!haystack.includes(query)) item.classList.add("search-hidden");
        else item.classList.add("search-match");
      }

      return item;
    }

    function buildCompletedCard(query) {
      const completed = state.completed;
      if (!completed.length) return;

      const card = document.createElement("article");
      card.className = "activity-card completed-card";
      card.dataset.completedCard = "true";

      const visible = completed.filter(task => {
        if (!query) return true;
        return task.text.toLowerCase().includes(query);
      });

      card.innerHTML = `
        <div class="card-head">
          <div class="card-title-row">
            <div style="width:30px"></div>
            <div class="activity-title" style="display:flex;align-items:center;gap:8px;">Completadas <span class="pill success">${completed.length}</span><span class="pill neutral">Historial</span></div>
          </div>
        </div>
        <div class="task-list" data-completed-list="true"></div>
      `;

      const list = card.querySelector(".task-list");
      for (const task of visible) list.appendChild(buildTaskItem(task, query, true));

      el.board.appendChild(card);
    }

    /* =========================================================
       V42 · Arrastre de fases
       - La tarjeta real nunca sale del DOM (estable en WebView/Median)
       - Ficha flotante + línea de inserción absoluta: cero reflow
       ========================================================= */

    let sectionPointerCleanup = null;
    let activeSectionDrag = null;

    const GRIP_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>';

    function sectionCards() {
      return [...el.board.querySelectorAll('.activity-card:not(.completed-card)')];
    }

    function isDragging() {
      return Boolean(activeSectionDrag || activeTaskDrag);
    }

    function initSectionPointerDrag() {
      if (typeof sectionPointerCleanup === 'function') sectionPointerCleanup();
      const listeners = [];

      document.querySelectorAll('#board .activity-card:not(.completed-card) .drag-card').forEach(handle => {
        const onPointerDown = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          if (activeSectionDrag) return;
          const card = handle.closest('.activity-card:not(.completed-card)');
          if (!card) return;
          event.preventDefault();
          event.stopPropagation();
          startSectionPointerDrag(event, card, handle);
        };
        const blockMenu = (event) => event.preventDefault();
        handle.addEventListener('pointerdown', onPointerDown, { passive: false });
        handle.addEventListener('contextmenu', blockMenu);
        listeners.push(() => {
          handle.removeEventListener('pointerdown', onPointerDown);
          handle.removeEventListener('contextmenu', blockMenu);
        });
      });

      sectionPointerCleanup = () => { listeners.forEach(fn => fn()); sectionPointerCleanup = null; };
    }

    function ensureSectionLine() {
      let line = el.board.querySelector('.section-insert-line');
      if (!line) {
        line = document.createElement('div');
        line.className = 'section-insert-line';
        line.setAttribute('aria-hidden', 'true');
        el.board.appendChild(line);
      }
      return line;
    }

    function buildSectionChip(card) {
      const chip = document.createElement('div');
      chip.className = 'section-drag-chip';
      const title = card.querySelector('.activity-title')?.value?.trim() || 'Fase sin nombre';
      const count = card.querySelector('.card-meta .pill')?.textContent?.trim() || '';
      chip.innerHTML =
        '<span class="chip-grip">' + GRIP_SVG + '</span>' +
        '<span class="chip-title">' + escapeHTML(title) + '</span>' +
        (count ? '<span class="chip-count">' + escapeHTML(count) + '</span>' : '');
      return chip;
    }

    function startSectionPointerDrag(event, card, handle) {
      const index = sectionCards().indexOf(card);
      if (index === -1 || activeSectionDrag) return;

      const chip = buildSectionChip(card);
      document.body.appendChild(chip);
      const chipRect = chip.getBoundingClientRect();

      activeSectionDrag = {
        card,
        chip,
        line: ensureSectionLine(),
        pointerId: event.pointerId,
        fromIndex: index,
        dropIndex: index,
        lastIndex: index,
        grabX: Math.min(chipRect.width / 2, 120),
        grabY: chipRect.height / 2,
        clientX: event.clientX,
        clientY: event.clientY,
        startY: event.clientY,
        moved: false,
        raf: 0
      };

      card.classList.add('section-drag-source');
      document.body.classList.add('is-section-pointer-dragging');

      positionSectionChip();
      requestAnimationFrame(() => chip.classList.add('is-ready'));
      softHaptic(14);

      try { handle.setPointerCapture?.(event.pointerId); } catch (_) {}

      document.addEventListener('pointermove', onSectionPointerMove, { passive: false });
      document.addEventListener('pointerup', onSectionPointerUp, { passive: false });
      document.addEventListener('pointercancel', onSectionPointerCancel, { passive: false });
      activeSectionDrag.raf = requestAnimationFrame(sectionDragLoop);
    }

    function onSectionPointerMove(event) {
      const drag = activeSectionDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      drag.clientX = event.clientX;
      drag.clientY = event.clientY;
      if (!drag.moved && Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
    }

    function positionSectionChip() {
      const drag = activeSectionDrag;
      if (!drag) return;
      const x = drag.clientX - drag.grabX;
      const y = drag.clientY - drag.grabY;
      drag.chip.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(-1.1deg)';
    }

    function autoScrollSection() {
      const drag = activeSectionDrag;
      if (!drag) return;
      const edge = 96;
      const over = drag.clientY - edge;
      const under = drag.clientY - (window.innerHeight - edge);
      if (over < 0) window.scrollBy(0, Math.max(-28, Math.round(over / 4)));
      else if (under > 0) window.scrollBy(0, Math.min(28, Math.round(under / 4)));
    }

    function updateSectionDropTarget() {
      const drag = activeSectionDrag;
      if (!drag) return;

      const cards = sectionCards();
      const boardTop = el.board.getBoundingClientRect().top;
      let slot = cards.length;

      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (drag.clientY < rect.top + rect.height / 2) {
          slot = i;
          break;
        }
      }

      let y = boardTop;
      if (cards.length) {
        if (slot === 0) y = cards[0].getBoundingClientRect().top - 8;
        else if (slot >= cards.length) y = cards[cards.length - 1].getBoundingClientRect().bottom + 8;
        else y = (cards[slot - 1].getBoundingClientRect().bottom + cards[slot].getBoundingClientRect().top) / 2;
      }

      const targetIndex = slot > drag.fromIndex ? slot - 1 : slot;
      drag.dropIndex = targetIndex;

      drag.line.style.top = (y - boardTop) + 'px';
      drag.line.classList.toggle('is-visible', drag.moved && targetIndex !== drag.fromIndex);

      if (targetIndex !== drag.lastIndex) {
        drag.lastIndex = targetIndex;
        softHaptic(8);
      }
    }

    function sectionDragLoop() {
      const drag = activeSectionDrag;
      if (!drag) return;
      drag.raf = requestAnimationFrame(sectionDragLoop);
      positionSectionChip();
      autoScrollSection();
      updateSectionDropTarget();
    }

    function placeSectionCardAtIndex(card, index) {
      const others = sectionCards().filter(node => node !== card);
      const reference = others[index] || el.board.querySelector('.completed-card') || null;
      el.board.insertBefore(card, reference);
    }

    function flipSectionReorder(mutate, focusCard) {
      const cards = sectionCards();
      const before = new Map(cards.map(node => [node, node.getBoundingClientRect().top]));
      mutate();
      const moved = [];

      for (const node of cards) {
        const delta = before.get(node) - node.getBoundingClientRect().top;
        if (!delta) continue;
        node.style.transition = 'none';
        node.style.transform = 'translate3d(0,' + delta + 'px,0)';
        moved.push(node);
      }

      requestAnimationFrame(() => {
        for (const node of moved) {
          node.style.transition = 'transform .3s cubic-bezier(.22,1,.36,1)';
          node.style.transform = '';
        }
        setTimeout(() => {
          for (const node of moved) { node.style.transition = ''; node.style.transform = ''; }
        }, 340);
      });
    }

    function landSectionChip(chip, rect) {
      if (!rect) { chip.remove(); return; }
      chip.style.transition = 'transform .24s cubic-bezier(.22,1,.36,1), opacity .22s ease';
      chip.style.transform = 'translate3d(' + (rect.left + 16) + 'px,' + (rect.top + 16) + 'px,0) scale(.94)';
      chip.style.opacity = '0';
      setTimeout(() => chip.remove(), 260);
    }

    function finishSectionPointerDrag(commit) {
      const drag = activeSectionDrag;
      if (!drag) return;
      activeSectionDrag = null;

      cancelAnimationFrame(drag.raf);
      document.removeEventListener('pointermove', onSectionPointerMove);
      document.removeEventListener('pointerup', onSectionPointerUp);
      document.removeEventListener('pointercancel', onSectionPointerCancel);

      drag.line.classList.remove('is-visible');
      document.body.classList.remove('is-section-pointer-dragging');
      drag.card.classList.remove('section-drag-source');

      const shouldMove = commit && drag.moved && drag.dropIndex !== drag.fromIndex;
      const landing = drag.card.getBoundingClientRect();

      if (shouldMove) {
        flipSectionReorder(() => {
          const [category] =
            state.categories.splice(
              drag.fromIndex,
              1
            );

          state.categories.splice(
            drag.dropIndex,
            0,
            category
          );

          normalizeCategoryOrder();

          placeSectionCardAtIndex(
            drag.card,
            drag.dropIndex
          );
        }, drag.card);
      }

      landSectionChip(drag.chip, landing);
      drag.card.classList.add('section-landed');
      setTimeout(() => drag.card.classList.remove('section-landed'), 480);

      if (shouldMove) {
        persistLocal();
        localDirty = true;
        refreshSectionMoveControls();
        updateSummaryUI();
        scheduleSave('reordenar fases');
        softHaptic(18);
      }

      flushPendingRemote();
    }

    function onSectionPointerUp(event) {
      const drag = activeSectionDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      finishSectionPointerDrag(true);
    }

    function onSectionPointerCancel() {
      // Si Chromium/Android WebView cancela el pointer pero ya tenemos un destino válido,
      // respetamos ese destino en lugar de borrar/reubicar la tarjeta de forma arbitraria.
      finishSectionPointerDrag(true);
    }

    let taskPointerCleanup = null;
    let activeTaskDrag = null;

    function initSortables() {
      // Fases: Pointer Events. Tareas: Pointer Events sin reflow,
      // para conservar la línea de inserción y permitir movimientos
      // entre listas en Median/WebView.
      initSectionPointerDrag();
      initTaskPointerDrag();
    }

    function initTaskPointerDrag() {
      if (typeof taskPointerCleanup === "function") taskPointerCleanup();

      const listeners = [];

      document
        .querySelectorAll(".task-item:not(.completed-item) .drag-task")
        .forEach(handle => {
          const onPointerDown = event => {
            if (activeTaskDrag) return;
            if (event.button !== undefined && event.button !== 0) return;

            const item = handle.closest(".task-item:not(.completed-item)");
            if (!item) return;

            const taskId = item.dataset.taskId;
            const sourceCategoryId =
              item.closest(".task-list")?.dataset.categoryId || "";

            if (!taskId || !sourceCategoryId) return;

            event.preventDefault();
            event.stopPropagation();

            try {
              handle.setPointerCapture?.(event.pointerId);
            } catch (_) {}

            startTaskPointerDrag(event, item, handle, taskId, sourceCategoryId);
          };

          const onContextMenu = event => event.preventDefault();

          handle.addEventListener("pointerdown", onPointerDown, { passive: false });
          handle.addEventListener("contextmenu", onContextMenu);

          listeners.push(() => {
            handle.removeEventListener("pointerdown", onPointerDown);
            handle.removeEventListener("contextmenu", onContextMenu);
          });
        });

      taskPointerCleanup = () => {
        listeners.forEach(cleanup => cleanup());
        taskPointerCleanup = null;
      };
    }

    function startTaskPointerDrag(event, item, handle, taskId, sourceCategoryId) {
      const text = item.querySelector(".task-input")?.value?.trim() || "Tarea sin nombre";
      const rect = item.getBoundingClientRect();

      const chip = document.createElement("div");
      chip.className = "task-drag-chip";
      chip.innerHTML = `
        <span class="task-drag-chip-grip">
          <i data-lucide="grip-vertical"></i>
        </span>
        <span class="task-drag-chip-text">${escapeHTML(text)}</span>
      `;
      document.body.appendChild(chip);
      refreshIcons();

      const line = document.createElement("div");
      line.className = "task-drop-line";
      line.setAttribute("aria-hidden", "true");

      activeTaskDrag = {
        item,
        handle,
        chip,
        line,
        taskId,
        sourceCategoryId,
        targetCategoryId: sourceCategoryId,
        targetList: item.closest(".task-list"),
        beforeTaskId: null,
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        grabX: Math.min(rect.width * .32, 180),
        grabY: Math.min(34, Math.max(20, rect.height / 2)),
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        raf: 0
      };

      item.classList.add("task-drag-source");
      document.body.classList.add("task-pointer-dragging");

      positionTaskChip();
      requestAnimationFrame(() => {
        chip.classList.add("is-ready");
        updateTaskDropTarget();
      });

      document.addEventListener("pointermove", onTaskPointerMove, { passive: false });
      document.addEventListener("pointerup", onTaskPointerUp, { passive: false });
      document.addEventListener("pointercancel", onTaskPointerCancel, { passive: false });

      activeTaskDrag.raf = requestAnimationFrame(taskDragLoop);
      softHaptic(12);
    }

    function positionTaskChip() {
      const drag = activeTaskDrag;
      if (!drag) return;

      const x = drag.clientX - drag.grabX;
      const y = drag.clientY - drag.grabY;
      drag.chip.style.transform =
        `translate3d(${x}px, ${y}px, 0) rotate(-.45deg)`;
    }

    function findTaskDropList(clientX, clientY) {
      const elements = document.elementsFromPoint?.(clientX, clientY) || [];
      let list = elements.find(node => node?.matches?.(".task-list"));
      if (list) return list;

      const card = elements.find(node => node?.closest?.(".activity-card"));
      if (card) return card.closest(".activity-card")?.querySelector(".task-list") || null;

      // Fallback: nearest category card by vertical distance.
      const cards = [...document.querySelectorAll(".activity-card:not(.completed-card)")];
      let best = null;
      let bestDistance = Infinity;

      for (const cardNode of cards) {
        const taskList = cardNode.querySelector(".task-list");
        if (!taskList) continue;
        const r = cardNode.getBoundingClientRect();
        const distance = clientY < r.top
          ? r.top - clientY
          : clientY > r.bottom
            ? clientY - r.bottom
            : 0;

        if (distance < bestDistance && distance < 170) {
          bestDistance = distance;
          best = taskList;
        }
      }

      return best;
    }

    function updateTaskDropTarget() {
      const drag = activeTaskDrag;
      if (!drag) return;

      const list = findTaskDropList(drag.clientX, drag.clientY);
      if (!list) return;

      drag.targetList = list;
      drag.targetCategoryId = list.dataset.categoryId || drag.targetCategoryId;

      const items = [...list.querySelectorAll(".task-item:not(.completed-item)")]
        .filter(node => node !== drag.item && !node.classList.contains("search-hidden"));

      let beforeNode = null;

      for (const node of items) {
        const r = node.getBoundingClientRect();
        const middle = r.top + (r.height / 2);

        if (drag.clientY < middle) {
          beforeNode = node;
          break;
        }
      }

      if (beforeNode) {
        list.insertBefore(drag.line, beforeNode);
        drag.beforeTaskId = beforeNode.dataset.taskId || null;
      } else {
        list.appendChild(drag.line);
        drag.beforeTaskId = null;
      }

      drag.line.classList.add("is-visible");

      if (
        drag.targetCategoryId !== drag.sourceCategoryId ||
        drag.beforeTaskId !== drag.lastBeforeTaskId
      ) {
        softHaptic(7);
        drag.lastBeforeTaskId = drag.beforeTaskId;
      }
    }

    function autoScrollTaskPointer() {
      const drag = activeTaskDrag;
      if (!drag) return;

      const edge = 86;
      if (drag.clientY < edge) {
        const amount = Math.max(-22, Math.round((drag.clientY - edge) / 3));
        window.scrollBy(0, amount);
      } else if (drag.clientY > window.innerHeight - edge) {
        const amount = Math.min(22, Math.round((drag.clientY - (window.innerHeight - edge)) / 3));
        window.scrollBy(0, amount);
      }
    }

    function taskDragLoop() {
      const drag = activeTaskDrag;
      if (!drag) return;

      drag.raf = requestAnimationFrame(taskDragLoop);
      positionTaskChip();
      autoScrollTaskPointer();

      if (drag.moved) {
        updateTaskDropTarget();
      }
    }

    function onTaskPointerMove(event) {
      const drag = activeTaskDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;

      event.preventDefault();

      drag.clientX = event.clientX;
      drag.clientY = event.clientY;

      if (
        !drag.moved &&
        (
          Math.abs(event.clientX - drag.startX) > 4 ||
          Math.abs(event.clientY - drag.startY) > 4
        )
      ) {
        drag.moved = true;
        updateTaskDropTarget();
      }
    }

    function finishTaskPointerDrag(commit) {
      const drag = activeTaskDrag;
      if (!drag) return;

      activeTaskDrag = null;

      cancelAnimationFrame(drag.raf);
      document.removeEventListener("pointermove", onTaskPointerMove);
      document.removeEventListener("pointerup", onTaskPointerUp);
      document.removeEventListener("pointercancel", onTaskPointerCancel);

      drag.line.classList.remove("is-visible");
      drag.line.remove();
      drag.item.classList.remove("task-drag-source");
      document.body.classList.remove("task-pointer-dragging");

      const moved = commit && drag.moved && drag.targetList;
      const targetCategoryId = drag.targetCategoryId;

      if (!moved) {
        drag.chip.classList.remove("is-ready");
        drag.chip.remove();
        return;
      }

      const reference = drag.beforeTaskId
        ? drag.targetList.querySelector(
            `.task-item[data-task-id="${cssEscapeSafe(drag.beforeTaskId)}"]`
          )
        : null;

      // Mover el nodo real: no hay render completo.
      if (reference && reference !== drag.item) {
        drag.targetList.insertBefore(drag.item, reference);
      } else {
        drag.targetList.appendChild(drag.item);
      }

      // La fuente se conserva en el DOM hasta que el movimiento termina.
      syncTasksFromDOM();

      persistLocal();
      localDirty = true;

      updateCategoryUI(drag.sourceCategoryId);
      if (targetCategoryId && targetCategoryId !== drag.sourceCategoryId) {
        updateCategoryUI(targetCategoryId);
      }

      updateSummaryUI();
      scheduleSave("mover tarea");

      drag.item.classList.add("task-landed");
      setTimeout(() => drag.item.classList.remove("task-landed"), 340);

      softHaptic(20);

      setTimeout(() => {
        if (drag.chip?.isConnected) drag.chip.remove();
      }, 100);
    }

    function onTaskPointerUp(event) {
      const drag = activeTaskDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      finishTaskPointerDrag(true);
    }

    function onTaskPointerCancel() {
      const drag = activeTaskDrag;
      if (!drag) return;

      // Si Android/WebView cancela después de que ya existe un destino,
      // lo tratamos como un drop válido para no perder el movimiento.
      finishTaskPointerDrag(Boolean(drag.moved && drag.targetList));
    }

    function syncCategoryOrderFromDOM() {
      const ids = [...el.board.querySelectorAll(".activity-card:not(.completed-card)")].map(card => card.dataset.categoryId);
      const map = new Map(state.categories.map(cat => [cat.id, cat]));
      state.categories = ids.map(id => map.get(id)).filter(Boolean);
    }

    function syncTasksFromDOM() {
      const currentById = new Map();
      for (const cat of state.categories) {
        for (const task of cat.tasks) currentById.set(task.id, { task, catId: cat.id });
      }

      const next = new Map();
      document.querySelectorAll(".task-list[data-category-id]").forEach(list => {
        const catId = list.dataset.categoryId;
        const arr = [];
        [...list.querySelectorAll(".task-item[data-task-id]")].forEach(item => {
          const found = currentById.get(item.dataset.taskId);
          if (!found) return;
          arr.push(found.task);
          next.set(found.task.id, catId);
        });
        next.set(catId, arr);
      });

      for (const cat of state.categories) {
        cat.tasks = (next.get(cat.id) || []).map(task => ({ ...task }));
      }

      for (const cat of state.categories) {
        for (const task of cat.tasks) task.date = task.date || today();
      }
    }

    function openDailyProductivityReport() {
      if (!el.dailyProductivityContent) return;
      const stats = todayTaskStats();
      const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
      const activeCategories = state.categories.filter(cat =>
        cat.tasks.some(t => !t.draft && t.date === today()) ||
        state.completed.some(t => t.originCat === cat.id && completedDateFor(t) === today())
      ).length;

      let message = 'Empieza por una tarea concreta y construye el ritmo.';
      if (stats.total === 0) message = 'Tu agenda de hoy está limpia. Puedes dedicar el tiempo a lo que quieras priorizar.';
      else if (pct === 100) message = '¡Día completado! Todo lo programado para hoy está listo. ✨';
      else if (pct >= 75) message = '¡Gran ritmo! Ya cerraste la mayor parte de lo que te propusiste hoy.';
      else if (pct >= 50) message = 'Vas por la mitad o más. Mantén el foco en la siguiente tarea.';
      else if (stats.overdue > 0) message = 'Tienes algunas tareas pendientes de días anteriores. Atiende primero la más importante.';

      el.dailyProductivityContent.innerHTML = `
        <div class="report-hero">
          <div class="report-ring" style="--report-pct:${pct}%">
            <div class="report-ring-value"><strong>${pct}%</strong><span>cumplimiento</span></div>
          </div>
          <div class="report-copy"><h3>Así va tu día</h3><p>${stats.completed} completadas de ${stats.total} tareas programadas para hoy.</p></div>
        </div>
        <div class="daily-highlight">
          <div class="daily-highlight-card"><small>Completadas hoy</small><strong>${stats.completed}</strong></div>
          <div class="daily-highlight-card"><small>Pendientes hoy</small><strong>${stats.pending}</strong></div>
          <div class="daily-highlight-card"><small>Atrasadas</small><strong>${stats.overdue}</strong></div>
        </div>
        <div class="report-grid">
          <div class="report-stat"><small>Fases activas</small><strong>${activeCategories}</strong></div>
          <div class="report-stat"><small>Total programado</small><strong>${stats.total}</strong></div>
          <div class="report-stat"><small>Ritmo</small><strong>${pct >= 75 ? 'Alto' : pct >= 50 ? 'Medio' : 'En marcha'}</strong></div>
        </div>
        <div class="report-message">${escapeHTML(message)}</div>
        <div class="daily-footer-note">Las tareas completadas de días anteriores no cuentan como completadas de hoy. Tu progreso diario refleja únicamente lo que has cerrado durante esta jornada.</div>
      `;
      openModal('dailyProductivityModal');
      refreshIcons();
    }

    function openCategoryReport(categoryId) {
      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat || !el.statsReportContent) return;

      const completed = state.completed.filter(
        t => t.originCat === categoryId && completedDateFor(t) === today()
      ).length;

      const pending = cat.tasks.filter(
        t => !t.draft &&
             t.text.trim() &&
             t.date === today() &&
             !isRepeatCompletedToday(t)
      ).length;
      const total = pending + completed;
      const pct = total ? Math.round((completed / total) * 100) : 0;
      const overdue = cat.tasks.filter(t => !t.draft && t.text.trim() && t.date < today()).length;
      const recurring = cat.tasks.filter(t => Boolean(t.repeat) && !t.draft).length;
      const todayPending = pending;

      let message = "Aún no hay tareas suficientes para medir el ritmo.";
      if (total === 0) {
        message = "Añade algunas tareas para comenzar a construir el progreso de esta fase.";
      } else if (pct === 100) {
        message = "Fase completada. Todo lo registrado en esta fase está listo. 🎉";
      } else if (overdue > 0) {
        message = `Tienes ${overdue} tarea${overdue === 1 ? "" : "s"} atrasada${overdue === 1 ? "" : "s"}. Puedes revisarlas desde el botón Atrasadas.`;
      } else if (pct >= 70) {
        message = "Vas bastante avanzado. Queda una parte pequeña del trabajo por cerrar. 🚀";
      } else if (pct >= 40) {
        message = "Buen avance. Mantén el ritmo y continúa con las pendientes de hoy.";
      } else {
        message = "Esta fase recién está comenzando. Enfócate en la siguiente tarea accionable.";
      }

      const pendingPct = total ? Math.round((pending / total) * 100) : 0;
      const completedPct = total ? 100 - pendingPct : 0;

      el.statsReportContent.innerHTML = `
        <div class="report-hero">
          <div class="report-ring" style="--report-pct:${pct}%">
            <div class="report-ring-value">
              <strong>${pct}%</strong>
              <span>avance</span>
            </div>
          </div>

          <div class="report-copy">
            <h3>${escapeHTML(cat.title || "Fase sin nombre")}</h3>
            <p>${total === 0 ? "No hay tareas registradas." : `${completed} de ${total} tarea${total === 1 ? "" : "s"} completada${completed === 1 ? "" : "s"}.`}</p>
          </div>
        </div>

        <div class="report-grid">
          <div class="report-stat">
            <small>Pendientes</small>
            <strong>${pending}</strong>
          </div>
          <div class="report-stat">
            <small>Completadas</small>
            <strong>${completed}</strong>
          </div>
          <div class="report-stat">
            <small>Atrasadas</small>
            <strong>${overdue}</strong>
          </div>
        </div>

        <div class="report-breakdown">
          <div class="report-breakdown-head">
            <span>Distribución</span>
            <span>${pendingPct}% pendientes · ${completedPct}% listas</span>
          </div>
          <div class="report-bar" aria-label="Distribución de tareas">
            <span class="bar-pending" style="width:${pendingPct}%"></span>
            <span class="bar-completed" style="width:${completedPct}%"></span>
          </div>
        </div>

        <div class="report-grid">
          <div class="report-stat">
            <small>Para hoy</small>
            <strong>${todayPending}</strong>
          </div>
          <div class="report-stat">
            <small>Repetitivas</small>
            <strong>${recurring}</strong>
          </div>
          <div class="report-stat">
            <small>Total</small>
            <strong>${total}</strong>
          </div>
        </div>

        <div class="report-message">${escapeHTML(message)}</div>
      `;

      openModal("statsModal");
      refreshIcons();
    }

    function updateCategoryUI(categoryId) {
      const card = document.querySelector(`[data-category-id="${cssEscapeSafe(categoryId)}"]`);
      if (!card) return;

      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat) return;

      const visiblePending = cat.tasks.filter(t =>
        !(
          !t.draft &&
          t.text.trim() &&
          (
            t.date < today() ||
            (t.repeat && isRepeatCompletedToday(t)) ||
            (t.repeat && t.date > today())
          )
        )
      ).length;
      const completedToday =
        state.completed.filter(t => t.originCat === categoryId && completedDateFor(t) === today()).length;

      const todayPending = cat.tasks.filter(
        t => !t.draft &&
             t.text.trim() &&
             t.date === today() &&
             !isRepeatCompletedToday(t)
      ).length;
      const todayTotal = completedToday + todayPending;
      const pct = todayTotal ? Math.round((completedToday / todayTotal) * 100) : 0;

      const pendingPill = card.querySelector('.card-meta .pill:first-child');
      const percentPill = card.querySelector('.card-meta .pill:nth-child(2)');
      const fill = card.querySelector('.card-progress .progress-fill');
      const fraction = card.querySelector('.card-progress-value');

      if (pendingPill) pendingPill.textContent = `${visiblePending} pendiente${visiblePending === 1 ? '' : 's'}`;
      if (percentPill) {
        percentPill.textContent = `${pct}% hoy`;
        percentPill.className = `pill ${pct === 100 && todayTotal > 0 ? 'success' : 'primary'}`;
      }
      if (fill) fill.style.width = `${pct}%`;
      if (fraction) fraction.textContent = todayTotal > 0 ? `${completedToday}/${todayTotal} hoy` : '—';

      card.classList.toggle('is-complete', todayTotal > 0 && pct === 100);
    }

    function updateCompletedCardUI() {
      let card = document.querySelector('.completed-card');

      if (!state.completed.length) {
        if (card) card.remove();
        updateSummaryUI();
        return;
      }

      const query = activeSearch.trim().toLowerCase();

      if (!card) {
        buildCompletedCard(query);
        refreshIcons();
        updateSummaryUI();
        return;
      }

      const list = card.querySelector('[data-completed-list="true"]');
      if (!list) {
        card.remove();
        buildCompletedCard(query);
        refreshIcons();
        updateSummaryUI();
        return;
      }

      const visibleIds = new Set();

      for (const task of state.completed) {
        if (query && !String(task.text || "").toLowerCase().includes(query)) continue;
        visibleIds.add(task.id);

        let item = list.querySelector(
          `.task-item[data-task-id="${cssEscapeSafe(task.id)}"]`
        );

        if (!item) {
          item = buildTaskItem(task, query, true);
          item.classList.add('task-enter');
          list.prepend(item);
        }
      }

      // Elimina del DOM únicamente los elementos que ya no existen en el estado.
      list.querySelectorAll('.task-item[data-task-id]').forEach(item => {
        if (!visibleIds.has(item.dataset.taskId)) item.remove();
      });

      const countPill = card.querySelector('.pill.success');
      if (countPill) countPill.textContent = state.completed.length;

      refreshIcons();
      updateTaskHeights();
    }

    function animateTaskRemoval(item, callback) {
      if (!item) {
        callback?.();
        return;
      }
      item.classList.add('task-exit');
      setTimeout(() => {
        item.remove();
        callback?.();
      }, 180);
    }


    function addCategory() {
      const maxOrder =
        state.categories.reduce(
          (max, cat) =>
            Math.max(
              max,
              categoryOrderValue(
                cat,
                -1
              )
            ),
          -1
        );

      const category = {
        id: uid("cat"),
        title: "Nueva fase",
        emoji: "",
        tasks: [],
        order: maxOrder + 1
      };
      state.categories.push(category);
      persistLocal();
      localDirty = true;

      const card = buildCategoryCard(category, state.categories.length - 1, activeSearch.trim().toLowerCase());
      card.classList.add("task-enter");
      const completedCard = el.board.querySelector(".completed-card");
      if (completedCard) el.board.insertBefore(card, completedCard);
      else el.board.appendChild(card);

      initSortables();

      refreshIcons();
      refreshSectionMoveControls();
      const title = card.querySelector(".activity-title");
      const focusNewCategoryTitle = () => {
        if (!title) return;
        try { title.focus({ preventScroll: true }); } catch (_) { title.focus(); }
        title.select();
      };

      requestAnimationFrame(focusNewCategoryTitle);
      window.setTimeout(focusNewCategoryTitle, 60);

      updateSummaryUI();
      scheduleSave("nueva fase");
    }

    function addTask(categoryId) {
      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat) return null;

      const task = { id: uid("task"), text: "", date: today(), draft: true, repeat: false, repeatDays: [], repeatCount: 0, lastCompletedAt: null };
      cat.tasks.push(task);

      const list = document.querySelector(`.task-list[data-category-id="${cssEscapeSafe(categoryId)}"]`);
      if (!list) {
        render();
      } else {
        const item = buildTaskItem(task, activeSearch.trim().toLowerCase(), false);
        item.classList.add('task-enter');
list.appendChild(item);
refreshIcons();

// Registrar el drag de la tarea recién creada.
initTaskPointerDrag();

requestAnimationFrame(() => updateTaskHeights());
      }

      persistLocal();
      localDirty = true;

      // Crear una tarea puede devolver una fase terminada al bloque activo,
      // pero NO debe cambiar su orden manual.
      syncCategoryPlacement(categoryId);

      persistLocal();
      updateCategoryUI(categoryId);
      updateSummaryUI();
      refreshIcons();
      scheduleSave("nueva tarea");

      requestAnimationFrame(() => {
        const node = document.querySelector(`[data-task-id="${cssEscapeSafe(task.id)}"] .task-input`);
        if (node) {
          resizeSingleTextarea(node);
          node.focus({ preventScroll: true });
        }
      });
      softHaptic(15);
      playTaskySound("add");

      return task;
    }

    function moveCategoryBy(categoryId, delta) {
      const index = state.categories.findIndex(cat => cat.id === categoryId);
      if (index === -1) return;

      const targetIndex = index + delta;
      if (targetIndex < 0 || targetIndex >= state.categories.length) {
        softHaptic(10);
        return;
      }

      const [category] =
        state.categories.splice(
          index,
          1
        );

      state.categories.splice(
        targetIndex,
        0,
        category
      );

      normalizeCategoryOrder();

      const card = document.querySelector(`.activity-card[data-category-id="${cssEscapeSafe(categoryId)}"]`);
      const cards = [...el.board.querySelectorAll('.activity-card:not(.completed-card)')];
      const reference = cards[targetIndex];

      if (card) {
        if (delta < 0 && reference && reference !== card) {
          el.board.insertBefore(card, reference);
        } else if (delta > 0) {
          const next = cards[targetIndex + 1];
          if (next) el.board.insertBefore(card, next);
          else {
            const completedCard = el.board.querySelector('.completed-card');
            if (completedCard) el.board.insertBefore(card, completedCard);
            else el.board.appendChild(card);
          }
        }
        card.classList.add('section-moved');
        setTimeout(() => card.classList.remove('section-moved'), 240);
      }

      persistLocal();
      localDirty = true;
      updateSummaryUI();
      refreshSectionMoveControls();
      scheduleSave(delta < 0 ? 'subir fase' : 'bajar fase');
      softHaptic(16);
      playTaskySound("move");
    }

    function refreshSectionMoveControls() {
      const cards = [...el.board.querySelectorAll('.activity-card:not(.completed-card)')];
      cards.forEach((card, index) => {
        const up = card.querySelector('[data-action="move-category-up"]');
        const down = card.querySelector('[data-action="move-category-down"]');
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === cards.length - 1;
      });
    }

    function deleteCategory(categoryId) {
      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat) return;

      if (cat.tasks.length && !confirm(`¿Eliminar "${cat.title || "esta fase"}" y sus ${cat.tasks.length} tareas pendientes?`)) return;

      state.categories =
        state.categories.filter(
          c => c.id !== categoryId
        );

      normalizeCategoryOrder();

      state.completed =
        state.completed.filter(
          t => t.originCat !== categoryId
        );

      const card = document.querySelector(`.activity-card[data-category-id="${cssEscapeSafe(categoryId)}"]`);
      if (card) {
        card.style.transition = 'opacity .18s ease, transform .18s ease, max-height .22s ease, margin .22s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(.985)';
        setTimeout(() => card.remove(), 180);
      }

      persistLocal();
      localDirty = true;
      updateCompletedCardUI();
      updateSummaryUI();
      scheduleSave("eliminar fase");
      playTaskySound("delete");
      toast("Fase eliminada", "trash-2");
    }

    function deleteTask(taskId) {
      let changed = false;
      let originCat = null;

      for (const cat of state.categories) {
        const before = cat.tasks.length;
        if (cat.tasks.some(t => t.id === taskId)) originCat = cat.id;
        cat.tasks = cat.tasks.filter(t => t.id !== taskId);
        changed ||= before !== cat.tasks.length;
      }

      const beforeCompleted = state.completed.length;
      state.completed = state.completed.filter(t => t.id !== taskId);
      changed ||= beforeCompleted !== state.completed.length;

      if (!changed) return;

      const item = document.querySelector(`.task-item[data-task-id="${cssEscapeSafe(taskId)}"]`);
      animateTaskRemoval(item);

      persistLocal();
      localDirty = true;
      if (originCat) updateCategoryUI(originCat);
      updateCompletedCardUI();
      updateSummaryUI();
      scheduleSave("eliminar tarea");
      playTaskySound("delete");
      toast("Tarea eliminada", "trash-2");
    }

    function getRepeatTask(taskId) {
      for (const cat of state.categories) {
        const task = cat.tasks.find(t => t.id === taskId);
        if (task) return { task, cat };
      }
      return null;
    }

    const REPEAT_DAY_LABELS = [
      [1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [7, 'D']
    ];

    function repeatDaysToLabel(days) {
      const set = new Set((days || []).map(Number));
      if ([1,2,3,4,5,6,7].every(d => set.has(d))) return 'Todos los días';
      return REPEAT_DAY_LABELS.filter(([d]) => set.has(d)).map(([,label]) => label).join(' · ') || 'Sin días';
    }

    function nextRepeatDate(fromDateStr, days) {
      const selected = new Set((days || []).map(Number));
      if (!selected.size) return fromDateStr;
      const parts = fromDateStr.split('-').map(Number);
      const base = new Date(parts[0], parts[1]-1, parts[2]);
      for (let i = 1; i <= 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const isoDay = d.getDay() === 0 ? 7 : d.getDay();
        if (selected.has(isoDay)) {
          return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        }
      }
      return fromDateStr;
    }

    function openRepeatEditor(taskId) {
      const found = getRepeatTask(taskId);
      if (!found) return;
      const task = found.task;
      const modal = document.getElementById('repeatModal');
      const title = document.getElementById('repeatTaskName');
      const hiddenId = document.getElementById('repeatTaskId');
      const summary = document.getElementById('repeatSummary');
      if (!modal) return;

      hiddenId.value = taskId;
      title.textContent = task.text?.trim() || 'Tarea sin nombre';
      const activeDays = task.repeatDays?.length ? task.repeatDays : [1,2,3,4,5,6,7];
      modal.querySelectorAll('input[name="repeat-day"]').forEach(input => {
        input.checked = activeDays.includes(Number(input.value));
      });
      summary.textContent = `Se repetirá: ${repeatDaysToLabel(activeDays)}.`;
      openModal('repeatModal');
    }

    function saveRepeatSchedule() {
      const modal = document.getElementById('repeatModal');
      const taskId = document.getElementById('repeatTaskId')?.value;
      const found = getRepeatTask(taskId);
      if (!modal || !found) return;

      const days = [...modal.querySelectorAll('input[name="repeat-day"]:checked')].map(input => Number(input.value)).sort((a,b) => a-b);
      const task = found.task;
      if (!days.length) {
        task.repeat = false;
        task.repeatDays = [];
      } else {
        task.repeat = true;
        task.repeatDays = days;
      }

      const item = document.querySelector(`.task-item[data-task-id="${cssEscapeSafe(taskId)}"]`);
      const button = item?.querySelector('[data-action="toggle-repeat"]');
      if (button) {
        button.classList.toggle('active', task.repeat);
        button.title = task.repeat ? 'Editar repetición' : 'Configurar repetición';
        button.setAttribute('aria-label', button.title);
      }
      const due = item?.querySelector('.task-due');
      if (due) {
        if (task.repeat) {
          due.innerHTML = `<span class="task-repeat-badge"><i data-lucide="repeat-2"></i>${escapeHTML(repeatDaysToLabel(task.repeatDays))}</span>`;
        } else {
          due.innerHTML = '';
        }
      }
      persistLocal();
      localDirty = true;
      scheduleSave(task.repeat ? 'configurar repetición' : 'desactivar repetición');
      closeModal('repeatModal');
      refreshIcons();
      updateSummaryUI();
      playTaskySound("repeat");
      toast(task.repeat ? `Repetición: ${repeatDaysToLabel(task.repeatDays)}` : 'Repetición desactivada', task.repeat ? 'repeat-2' : 'repeat');
    }

    function toggleRepeatTask(taskId) {
      openRepeatEditor(taskId);
    }

    function completeTask(taskId) {
      for (const cat of state.categories) {
        const idx = cat.tasks.findIndex(t => t.id === taskId);
        if (idx === -1) continue;

        const task = cat.tasks[idx];

        // Las tareas repetitivas funcionan por OCURRENCIAS:
        // hoy se archiva la ocurrencia completada y la tarea-serie
        // queda programada para su siguiente fecha.
        if (task.repeat) {
          if (!Array.isArray(task.repeatDays) || !task.repeatDays.length) {
            task.repeatDays = [1,2,3,4,5,6,7];
          }

          const completedOn = today();
          const nextDate = nextRepeatDate(completedOn, task.repeatDays);
          const completedAt = Date.now();
          const originalIndex = idx;
          const sourceTaskId = task.id;

          state.completed.unshift({
            ...JSON.parse(JSON.stringify(task)),
            id: uid("completed"),
            repeatSourceId: sourceTaskId,
            recurringOccurrence: true,
            originCat: cat.id,
            originIndex: originalIndex,
            completedAt,
            completedDate: completedOn,
            completedForDate: completedOn,
            nextOccurrenceDate: nextDate
          });

          // Marcar la serie como completada durante HOY.
          // La tarea seguirá existiendo en datos, pero no se mostrará
          // en la lista activa de hoy hasta llegar a la próxima fecha.
          task.repeatCount = Number(task.repeatCount || 0) + 1;
          task.lastCompletedAt = completedAt;
          task.lastCompletedDate = completedOn;
          task.date = nextDate;

          const item = document.querySelector(
            `.task-item[data-task-id="${cssEscapeSafe(sourceTaskId)}"]`
          );

          // Quitar inmediatamente la tarea de la vista de hoy.
          // No renderizamos toda la página para evitar parpadeos.
          animateTaskRemoval(item, () => {
            item?.remove();

            updateCompletedCardUI();
            updateCategoryUI(cat.id);
            updateSummaryUI();
            updateTaskHeights();
            refreshIcons();
          });

          persistLocal();
          localDirty = true;

          // Si la fase ya no tiene trabajo para hoy, se envía al final,
          // igual que una fase cuyas tareas normales fueron completadas.
          const movedToBottom = moveCompletedCategoryToBottom(cat.id);

          updateCompletedCardUI();
          updateCategoryUI(cat.id);
          updateSummaryUI();
          updateTaskHeights();
          refreshIcons();

          scheduleSave(
            movedToBottom
              ? "completar tarea repetida y reordenar fase"
              : "completar tarea repetida"
          );

          softHaptic(28);
          playTaskySound("complete");

          toast(
            movedToBottom
              ? `Completada hoy ✓ · Próxima ${formatDateLong(nextDate)}`
              : `Completada hoy ✓ · Próxima ${formatDateLong(nextDate)}`,
            "repeat-2"
          );
          return;
        }

        const [completedTask] = cat.tasks.splice(idx, 1);
        state.completed.unshift({
          ...completedTask,
          originCat: cat.id,
          originIndex: idx,
          completedAt: Date.now(),
          completedDate: today()
        });

        const item = document.querySelector(`.task-item[data-task-id="${cssEscapeSafe(taskId)}"]`);
        animateTaskRemoval(item, () => {
          let completedCard = document.querySelector('.completed-card');
          if (!completedCard) {
            buildCompletedCard(activeSearch.trim().toLowerCase());
          } else {
            const list = completedCard.querySelector('[data-completed-list="true"]');
            const completedItem = buildTaskItem(state.completed[0], activeSearch.trim().toLowerCase(), true);
            completedItem.classList.add('task-enter');
            list?.prepend(completedItem);
          }
          refreshIcons();
          updateCompletedCardUI();
          updateTaskHeights();
        });

        persistLocal();
        localDirty = true;
        updateCategoryUI(cat.id);

        const movedToBottom = moveCompletedCategoryToBottom(cat.id);
        updateSummaryUI();
        scheduleSave(movedToBottom ? "completar tarea y reordenar fase" : "completar tarea");

        softHaptic(28);
        playTaskySound("complete");
        toast(
          movedToBottom
            ? "Tarea completada · Fase movida al final"
            : "Tarea completada ✓",
          movedToBottom ? "arrow-down-to-line" : "circle-check"
        );
        return;
      }
    }


    function moveCompletedCategoryToBottom(categoryId) {
      const changed = syncCategoryPlacement(categoryId);
      if (changed) {
        persistLocal();
        localDirty = true;
      }
      return !categoryHasOpenWorkToday(
        state.categories.find(c => c.id === categoryId)
      );
    }

    function restoreTask(taskId) {
      const idx = state.completed.findIndex(t => t.id === taskId);
      if (idx === -1) return;

      const [task] = state.completed.splice(idx, 1);

      // Ocurrencia de una tarea repetitiva:
      // recuperamos la misma tarea-serie y la dejamos pendiente hoy.
      if (task.recurringOccurrence && task.repeatSourceId) {
        const targetCat = state.categories.find(c => c.id === task.originCat);
        const seriesTask = targetCat?.tasks.find(t => t.id === task.repeatSourceId);

        if (seriesTask) {
          seriesTask.date = today();
          seriesTask.lastCompletedAt = null;
          seriesTask.lastCompletedDate = null;
          seriesTask.repeat = true;
          seriesTask.repeatDays = Array.isArray(task.repeatDays)
            ? [...task.repeatDays]
            : [...(seriesTask.repeatDays || [])];
        }

        // La entrada histórica ya fue retirada arriba. La serie vuelve
        // a ser visible hoy sin crear una segunda tarea.
        persistLocal();
        localDirty = true;
        render();
        refreshIcons();
        updateSummaryUI();
        updateTaskHeights();
        scheduleSave("restaurar ocurrencia repetitiva");
        playTaskySound("restore");
        toast("Tarea repetitiva restaurada para hoy", "rotate-ccw");
        return;
      }

      const target = state.categories.find(c => c.id === task.originCat) || state.categories[0];

      const restoredTask = {
        id: task.id,
        text: task.text,
        date: task.date || today(),
        draft: false,
        repeat: Boolean(task.repeat),
        repeatDays: Array.isArray(task.repeatDays) ? [...task.repeatDays] : [],
        repeatCount: Number(task.repeatCount || 0),
        lastCompletedAt: task.lastCompletedAt || null,
        lastCompletedDate: task.lastCompletedDate || null
      };

      if (target) {
        const insertAt = Number.isInteger(task.originIndex) && task.originIndex >= 0
          ? Math.min(task.originIndex, target.tasks.length)
          : target.tasks.length;
        target.tasks.splice(insertAt, 0, restoredTask);
      } else {
        const maxOrder =
          state.categories.reduce(
            (max, cat) =>
              Math.max(
                max,
                categoryOrderValue(
                  cat,
                  -1
                )
              ),
            -1
          );

        state.categories.push({
          id: task.originCat || uid('cat'),
          title: 'Recuperadas',
          tasks: [restoredTask],
          order: maxOrder + 1
        });
      }

      const completedItem = document.querySelector(
        `.task-item[data-task-id="${cssEscapeSafe(taskId)}"]`
      );

      animateTaskRemoval(completedItem, () => {
        const targetList = target
          ? document.querySelector(`.task-list[data-category-id="${cssEscapeSafe(target.id)}"]`)
          : null;

        if (targetList) {
          const newItem = buildTaskItem(restoredTask, activeSearch.trim().toLowerCase(), false);
          newItem.classList.add('task-enter');
          targetList.appendChild(newItem);
          refreshIcons();
        } else {
          render();
        }

        updateCategoryUI(target?.id);
        updateCompletedCardUI();
        updateSummaryUI();
        updateTaskHeights();
      });

      persistLocal();
      localDirty = true;
      scheduleSave("restaurar tarea");
      playTaskySound("restore");
      toast("Tarea restaurada", "rotate-ccw");
    }

    function updateTitle(categoryId, title) {
      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat) return;
      cat.title = title;
      localDirty = true;
      persistLocal();
      scheduleSave("editar fase", 700);
    }

    function updateTask(taskId, text) {
      if (!taskId) return;
      for (const cat of state.categories) {
        const task = cat.tasks.find(t => t.id === taskId);
        if (!task) continue;
        task.text = text;
        task.draft = text.trim() === "";
        localDirty = true;
        persistLocal();
        scheduleSave("editar tarea", 700);
        return;
      }
    }

    function handlePaste(event, textarea) {
      const text = (event.clipboardData || window.clipboardData)?.getData("text") || "";
      if (!text.includes("\n")) return;

      event.preventDefault();

      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (!lines.length) return;

      const item = textarea.closest(".task-item");
      const list = item?.closest(".task-list");
      const catId = list?.dataset.categoryId;
      const cat = state.categories.find(c => c.id === catId);
      if (!cat) return;

      const originalTaskId = item.dataset.taskId;
      const originalIndex = cat.tasks.findIndex(t => t.id === originalTaskId);

      if (originalIndex === -1) return;

      const inserted = lines.map(line => ({ id: uid("task"), text: line, date: today(), draft: false, repeat: false, repeatDays: [], repeatCount: 0, lastCompletedAt: null, lastCompletedDate: null }));
      const current = cat.tasks[originalIndex];
      current.text = lines[0];
      current.draft = false;
      cat.tasks.splice(originalIndex + 1, 0, ...inserted.slice(1));

      persistLocal();
      localDirty = true;
      render();
      scheduleSave("pegar lista");
      requestAnimationFrame(() => {
        const last = inserted.at(-1);
        document.querySelector(`[data-task-id="${cssEscapeSafe(last.id)}"] .task-input`)?.focus();
      });
    }

    function handleTaskKeydown(event, textarea) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const item = textarea.closest(".task-item");
        const list = item?.closest(".task-list");
        const catId = list?.dataset.categoryId;
        if (catId) addTask(catId);
      } else if (event.key === "Escape") {
        textarea.blur();
      }
    }

    function applySearchFilter() {
      const query = activeSearch.trim().toLowerCase();
      const categoryCards = [...document.querySelectorAll("#board .activity-card:not(.completed-card)")];
      let visibleCategories = 0;

      categoryCards.forEach(card => {
        const title = card.querySelector(".activity-title")?.value?.toLowerCase() || "";
        const items = [...card.querySelectorAll(".task-item[data-task-id]")];
        let categoryHasMatch = !query || title.includes(query);

        items.forEach(item => {
          const input = item.querySelector(".task-input");
          const text = input?.value?.toLowerCase() || "";
          const match = !query || title.includes(query) || text.includes(query);
          item.classList.toggle("search-hidden", !match);
          item.classList.toggle("search-match", !!query && match && text.includes(query));
          if (match) categoryHasMatch = true;
        });

        card.style.display = categoryHasMatch ? "" : "none";
        if (categoryHasMatch) visibleCategories++;
      });

      const completedCard = document.querySelector(".completed-card");
      if (completedCard) {
        const completedItems = [...completedCard.querySelectorAll(".task-item[data-task-id]")];
        let completedVisible = 0;
        completedItems.forEach(item => {
          const text = item.querySelector(".task-input")?.value?.toLowerCase() || "";
          const match = !query || text.includes(query);
          item.classList.toggle("search-hidden", !match);
          item.classList.toggle("search-match", !!query && match);
          if (match) completedVisible++;
        });
        completedCard.style.display = completedVisible || !query ? "" : "none";
      }

      if (!state.categories.length) {
        el.emptyState.style.display = "block";
        return;
      }

      if (query && visibleCategories === 0 && !document.querySelector(".completed-card:not([style*='display: none']) .task-item:not(.search-hidden)")) {
        el.emptyState.style.display = "block";
        el.emptyState.querySelector("h2").textContent = "No encontramos coincidencias";
        el.emptyState.querySelector("p").textContent = "Prueba con otra palabra o limpia el buscador.";
      } else {
        el.emptyState.style.display = "none";
        el.emptyState.querySelector("h2").textContent = "Tu tablero está limpio ✨";
        el.emptyState.querySelector("p").textContent = "Crea una fase para empezar. Puedes mover fases, reordenar tareas, pegar listas completas y copiar tu plan a WhatsApp.";
      }
    }


    function isTouchDevice() {
      return navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
    }

    function softHaptic(duration = 18) {
      try {
        if (isTouchDevice() && typeof navigator.vibrate === 'function') {
          navigator.vibrate(duration);
        }
      } catch (_) {
        // Haptics is optional; ignore unsupported WebViews/devices.
      }
    }

    function resizeSingleTextarea(node) {
      if (!node || !node.matches?.('.task-input')) return;
      node.style.height = 'auto';
      node.style.height = Math.max(node.scrollHeight, 30) + 'px';
    }

    function updateTaskHeights() {
      document.querySelectorAll('.task-input').forEach(resizeSingleTextarea);
    }

    function openModal(id) {
      document.getElementById(id)?.classList.add("open");
    }

    function closeModal(id) {
      document.getElementById(id)?.classList.remove("open");
    }

    function renderOverdueModal() {
      const tasks = overdueTasks();
      el.overdueList.innerHTML = "";

      if (!tasks.length) {
        el.overdueList.innerHTML = '<div class="pill success" style="justify-content:center;padding:12px">No tienes tareas atrasadas 🎉</div>';
        return;
      }

      for (const task of tasks) {
        const row = document.createElement("div");
        row.className = "overdue-row";
        row.innerHTML = `
          <div>
            <div class="overdue-title">${escapeHTML(task.text)}</div>
            <div class="overdue-meta">${escapeHTML(task.originTitle || "Fase")} · ${escapeHTML(task.date)}</div>
          </div>
          <div class="overdue-actions">
            <button class="soft-btn" type="button" data-overdue-action="today" data-task-id="${escapeHTML(task.id)}">Hoy</button>
            <button class="icon-btn" type="button" data-overdue-action="delete" data-task-id="${escapeHTML(task.id)}" aria-label="Eliminar"><i data-lucide="trash-2"></i></button>
          </div>
        `;
        el.overdueList.appendChild(row);
      }
      refreshIcons();
    }

    function moveOverdueToToday(taskId) {
      for (const cat of state.categories) {
        const task = cat.tasks.find(t => t.id === taskId);
        if (task) {
          task.date = today();
          persistLocal();
          localDirty = true;
          render();
          updateSummaryUI();
          renderOverdueModal();
          scheduleSave("mover atrasada a hoy");
          toast("Tarea movida a hoy", "calendar-check");
          return;
        }
      }
    }

    function copyToWhatsApp() {
      let text = "";

      for (const cat of state.categories) {
        const tasks = cat.tasks.filter(t => t.text.trim());
        if (!cat.title.trim() && !tasks.length) continue;
        if (cat.title.trim()) text += "*" + cat.title.trim() + "*\n";
        for (const task of tasks) {
          text += "- " + task.text.trim();
          if (task.date && task.date < today()) text += " ⚠️";
          text += "\n";
        }
        text += "\n";
      }

      if (!text.trim()) {
        toast("No hay tareas pendientes para copiar", "info");
        return;
      }

      navigator.clipboard?.writeText(text.trim())
        .then(() => toast("Plan copiado para WhatsApp ✅", "message-circle"))
        .catch(() => {
          const area = document.createElement("textarea");
          area.value = text.trim();
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
          toast("Plan copiado ✅", "message-circle");
        });
    }

    function exportJSON() {
      const payload = {
        app: "Tasky",
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        data: state
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tasky-backup-" + today() + ".json";
      a.click();
      URL.revokeObjectURL(url);
      toast("Respaldo exportado", "download");
    }

    function importJSON(file) {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const imported = normalizeState(parsed.data || parsed);

          if (!confirm("Esto reemplazará el tablero actual por el respaldo seleccionado. ¿Continuar?")) return;

          state = imported;
          persistLocal();
          localDirty = true;
          render();
          scheduleSave("importar respaldo");
          toast("Respaldo importado", "upload");
        } catch (error) {
          console.error(error);
          toast("El archivo no es un respaldo válido", "circle-alert", "error");
        }
      };

      reader.readAsText(file);
    }


    function recoverSafetyBackup() {
      const backup = loadSafetyBackup();
      if (!backup) {
        toast('No hay un respaldo de seguridad disponible.', 'info', 'error');
        return;
      }
      const current = stateStats(state);
      const safe = stateStats(backup);
      if (!confirm(`Se restaurará el último estado seguro (${safe.total} elementos). Tu estado actual tiene ${current.total}. ¿Continuar?`)) return;

      // Conserva el estado actual por si la restauración fue equivocada.
      saveSafetyBackup('antes de restaurar respaldo seguro', state);
      state = normalizeState(backup);
      persistLocal();
      localDirty = true;
      render();
      scheduleSave('recuperar respaldo seguro', 0);
      toast('Respaldo seguro restaurado', 'shield-check');
      closeModal('menuModal');
    }

    function resetBoard() {
      if (!confirm("¿Seguro que quieres vaciar todo el tablero? Esta acción reemplaza las fases y las tareas actuales.")) return;

      saveSafetyBackup('antes de vaciar tablero', state);
      state = defaultState();
      persistLocal();
      localDirty = true;
      render();
      scheduleSave("vaciar tablero");
      toast("Tablero vacío", "trash-2");
      closeModal("menuModal");
    }

    function scheduleSave(reason = "cambio", delay = 450) {
      if (!initialized || hydrating) return;

      persistLocal();
      localDirty = true;
      clearTimeout(saveTimer);

      if (saveInFlight) {
        queuedSaveReason = reason;
        return;
      }

      saveTimer = setTimeout(() => saveCloud(reason), delay);
    }

    async function saveCloud(reason) {
      if (saveInFlight) {
        queuedSaveReason = reason;
        return;
      }

      if (!taskyDoc || !navigator.onLine) {
        setSyncStatus('offline', 'Guardado local');
        return;
      }

      const allowDestructive = /delete|eliminar|vaciar|reset|importar|recuperar/i.test(reason || '');
      const currentStats = stateStats(state);
      const safetyBackup = loadSafetyBackup();

      if (!allowDestructive && safetyBackup && looksLikeUnexpectedDataLoss(state, safetyBackup)) {
        console.error('Guardado bloqueado: posible pérdida masiva de datos.', {
          reason,
          current: currentStats,
          safety: stateStats(safetyBackup)
        });
        state = safetyBackup;
        persistLocal();
        localDirty = false;
        pendingRemoteState = null;
        lastBlockedRemoteHash = hash({ categories: state.categories, completed: state.completed });
        lastBlockedRemoteAt = Date.now();
        render();
        setSyncStatus('error', 'Guardado protegido');
        toast('Protección activada: se evitó sobrescribir tus tareas.', 'shield-alert', 'error');
        return;
      }

      const currentHash = hash({ categories: state.categories, completed: state.completed });

      // Si ya confirmamos este mismo estado desde Firestore, no hay nada que hacer.
      if (!localDirty && currentHash === lastConfirmedRemoteHash) {
        lastSavedHash = currentHash;
        return;
      }

      saveInFlight = true;
      queuedSaveReason = null;

      try {
        setSyncStatus('online', 'Verificando…');

        const liveSnapshot = await taskyDoc.get();
        const liveData = liveSnapshot.exists ? (liveSnapshot.data() || {}) : {};
        const liveRemote = normalizeState({
          version: liveData.version || APP_VERSION,
          categories: liveData.categories || [],
          completed: liveData.completed || []
        });
        const liveHash = hash({ categories: liveRemote.categories, completed: liveRemote.completed });
        const liveUpdatedBy = String(liveData.updatedBy || '');

        // El listener de Firestore puede entregar una versión local pendiente.
        // Si esa versión ya coincide con nuestro estado, no es un conflicto.
        if (liveHash === currentHash) {
          lastSavedHash = currentHash;
          lastConfirmedRemoteHash = currentHash;
          lastConfirmedRemoteUpdatedBy = liveUpdatedBy || deviceId;
          lastLocalWriteHash = currentHash;
          lastBlockedRemoteHash = "";
          lastBlockedRemoteAt = 0;
          localDirty = false;
          pendingRemoteState = null;
          setSyncStatus('online', 'Sincronizado');
          saveSafetyBackup('estado confirmado', state);
          return;
        }

        const baselineHash = lastConfirmedRemoteHash || lastSavedHash || liveHash;
        const remoteChangedSinceBaseline =
          Boolean(baselineHash) && liveHash !== baselineHash;

        // Solo consideramos conflicto real cuando el estado remoto cambió
        // y no proviene de este mismo dispositivo.
        if (
          remoteChangedSinceBaseline &&
          liveHash !== currentHash &&
          liveUpdatedBy &&
          liveUpdatedBy !== deviceId
        ) {
          pendingRemoteState = liveRemote;
          saveSafetyBackup('conflicto remoto detectado', state);
          localDirty = true;
          setSyncStatus('error', 'Conflicto protegido');
          toast('Hay cambios remotos pendientes. Se conservaron tus cambios locales.', 'shield-alert', 'error');
          return;
        }

        if (!allowDestructive && looksLikeUnexpectedShrink(liveRemote, state) && liveUpdatedBy !== deviceId) {
          pendingRemoteState = liveRemote;
          warnProtectedRemote(
            liveHash,
            'Se rechazó un estado remoto que parece haber perdido datos.'
          );
          return;
        }

        // Snapshot ANTES de escribir para poder recuperar el último estado bueno.
        saveSafetyBackup('antes de guardar: ' + reason, state);

        const payload = {
          version: APP_VERSION,
          categories: state.categories,
          completed: state.completed,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: deviceId
        };

        setSyncStatus('online', 'Guardando…');
        await taskyDoc.set(payload, { merge: false });

        // Firestore confirmó la escritura. No hacemos un GET inmediato:
        // el listener onSnapshot será la fuente de confirmación y evitamos
        // falsos errores por lecturas stale/caché del WebView.
        lastSavedHash = currentHash;
        lastConfirmedRemoteHash = currentHash;
        lastConfirmedRemoteUpdatedBy = deviceId;
        lastLocalWriteHash = currentHash;
        lastBlockedRemoteHash = "";
        lastBlockedRemoteAt = 0;
        localDirty = false;
        pendingRemoteState = null;

        // El servidor aceptó la escritura; la próxima instantánea de
        // onSnapshot cerrará la confirmación definitiva.
        saveSafetyBackup('guardado confirmado', state);
        setSyncStatus('online', 'Sincronizado');

      } catch (error) {
        console.error('Error guardando en Firestore:', error);
        setSyncStatus('error', 'Solo local');
        toast('No se pudo sincronizar; tus cambios locales siguen protegidos.', 'cloud-off', 'error');
      } finally {
        saveInFlight = false;

        if (queuedSaveReason) {
          const nextReason = queuedSaveReason;
          queuedSaveReason = null;
          clearTimeout(saveTimer);
          saveTimer = setTimeout(() => saveCloud(nextReason), 0);
        }
      }
    }

    async function startFirebase() {
      try {
        const loaded = await ensureFirebaseLoaded();

        if (!loaded || !window.firebase?.firestore) {
          setSyncStatus("offline", "Modo local");
          return;
        }

        if (!firebase.apps?.length) {
          firebase.initializeApp(firebaseConfig);
        }

        db = firebase.firestore();
        taskyDoc = db.collection("workspace").doc("main_board");

        try {
          await db.enablePersistence({ synchronizeTabs: true });
        } catch (error) {
          if (
            error.code !== "failed-precondition" &&
            error.code !== "unimplemented"
          ) {
            console.warn("Persistencia Firestore:", error);
          }
        }

        unsubscribe = taskyDoc.onSnapshot(
          snapshot => handleCloudSnapshot(snapshot),
          error => {
            console.error("Snapshot Firestore:", error);
            setSyncStatus("error", "Sin conexión a nube");

            // No destruimos el estado local solo porque falle Firestore.
            const local = loadLocalState();
            if (local && (!state.categories.length && !state.completed.length)) {
              state = local;
              render();
              refreshIcons();
            }

            hideLoading();
          }
        );

        window.addEventListener("online", () => {
          setSyncStatus("online", "Conectado");
          if (localDirty) saveCloud("reconexión");
        });

        window.addEventListener("offline", () => {
          setSyncStatus("offline", "Modo local");
        });

        // Si hay cambios locales esperando, intenta sincronizar una vez
        // Firestore haya quedado disponible.
        if (localDirty) {
          window.setTimeout(() => saveCloud("sincronización inicial"), 180);
        }

      } catch (error) {
        console.error("Firebase no pudo inicializarse:", error);
        setSyncStatus("error", "Modo local");

        const local = loadLocalState();
        if (local) {
          state = local;
          render();
          refreshIcons();
        }

        hideLoading();
      }
    }


    function warnProtectedRemote(remoteHash, message = 'Se evitó reemplazar tu tablero con un estado que parece haber perdido datos.') {
      const now = Date.now();
      const sameHash = remoteHash && remoteHash === lastBlockedRemoteHash;
      const withinCooldown = now - lastBlockedRemoteAt < 12000;

      setSyncStatus('error', 'Cambio remoto protegido');
      pendingRemoteState = pendingRemoteState || null;

      // La protección permanece activa, pero no llenamos la pantalla
      // con toasts idénticos por cada snapshot de Firestore.
      if (sameHash && withinCooldown) return;

      lastBlockedRemoteHash = remoteHash || '';
      lastBlockedRemoteAt = now;
      toast(message, 'shield-alert', 'error');
    }

    function handleCloudSnapshot(snapshot) {
      const local = loadLocalState();

      if (!snapshot.exists) {
        if (local && (local.categories.length || local.completed.length)) {
          state = local;
          render();
          hideLoading();
          setTimeout(() => saveCloud("migración inicial"), 120);
          return;
        }

        state = defaultState();
        render();
        hideLoading();
        setTimeout(() => saveCloud("crear tablero"), 120);
        return;
      }

      const data = snapshot.data() || {};
      const remote = normalizeState({
        version: data.version || APP_VERSION,
        categories: data.categories || [],
        completed: data.completed || []
      });

      const remoteHash = hash({ categories: remote.categories, completed: remote.completed });
      const localHash = hash({ categories: state.categories, completed: state.completed });
      const hasPendingWrites = Boolean(snapshot.metadata?.hasPendingWrites);
      const remoteUpdatedBy = String(data.updatedBy || '');

      // Firestore puede entregar un snapshot atrasado de la caché local
      // después de que nuestro propio write ya fue aceptado. Si pertenece
      // al mismo dispositivo y NO coincide con el último estado que acabamos
      // de escribir, es un eco antiguo: no debemos considerarlo una pérdida.
      if (
        !hasPendingWrites &&
        !localDirty &&
        remoteUpdatedBy === deviceId &&
        lastLocalWriteHash &&
        remoteHash !== lastLocalWriteHash
      ) {
        setSyncStatus("online", "Sincronizado");
        hideLoading();
        return;
      }

      // Snapshot local pendiente de nuestra propia escritura:
      // no debe producir un falso "cambio remoto".
      if (hasPendingWrites && remoteUpdatedBy === deviceId) {
        lastSavedHash = remoteHash;
        lastConfirmedRemoteHash = remoteHash;
        lastConfirmedRemoteUpdatedBy = deviceId;
        hideLoading();
        return;
      }

      if (remoteHash === localHash) {
        lastSavedHash = remoteHash;
        lastConfirmedRemoteHash = remoteHash;
        lastConfirmedRemoteUpdatedBy = remoteUpdatedBy;
        if (!hasPendingWrites) localDirty = false;
        pendingRemoteState = null;
        lastBlockedRemoteHash = "";
        lastBlockedRemoteAt = 0;
        setSyncStatus("online", "Sincronizado");
        hideLoading();
        return;
      }

      if (isDragging()) {
        if (!looksLikeUnexpectedDataLoss(remote)) {
          pendingRemoteState = remote;
          setSyncStatus("online", "Sincronizando…");
        } else {
          pendingRemoteState = remote;
          warnProtectedRemote(
            remoteHash,
            'Se bloqueó una sincronización remota que parecía eliminar datos.'
          );
        }
        hideLoading();
        return;
      }

      // Si el remoto que llega sigue siendo exactamente nuestro último
      // estado confirmado, no hay conflicto: simplemente ignoramos el snapshot.
      if (lastConfirmedRemoteHash && remoteHash === lastConfirmedRemoteHash) {
        hideLoading();
        return;
      }

      if (localDirty) {
        // Si el snapshot pertenece a este mismo dispositivo, es nuestro
        // propio ciclo de escritura (o una confirmación atrasada). No lo
        // mostramos como conflicto y nunca sustituimos el estado local.
        if (remoteUpdatedBy === deviceId) {
          lastSavedHash = remoteHash;
          lastConfirmedRemoteHash = remoteHash;
          lastConfirmedRemoteUpdatedBy = deviceId;
          hideLoading();
          return;
        }

        // Si realmente proviene de otro cliente, lo retenemos sin
        // sobrescribir los cambios locales.
        pendingRemoteState = remote;
        setSyncStatus("online", "Cambios remotos pendientes");
        hideLoading();
        return;
      }

      if (looksLikeUnexpectedDataLoss(remote) || looksLikeUnexpectedShrink(remote, state)) {
        pendingRemoteState = remote;
        warnProtectedRemote(remoteHash);
        hideLoading();
        return;
      }

      state = remote;
      persistLocal();
      saveSafetyBackup('sincronización remota aceptada');
      lastSavedHash = remoteHash;
      lastConfirmedRemoteHash = remoteHash;
      lastConfirmedRemoteUpdatedBy = remoteUpdatedBy;
      pendingRemoteState = null;
      render();
      setSyncStatus("online", "Sincronizado");
      hideLoading();
    }

    function flushPendingRemote() {
      if (!pendingRemoteState || localDirty) return;

      if (
        looksLikeUnexpectedDataLoss(pendingRemoteState) &&
        stateStats(state).total > stateStats(pendingRemoteState).total
      ) {
        setSyncStatus('error', 'Cambio remoto protegido');
        pendingRemoteState = null;
        return;
      }

      const remote = pendingRemoteState;
      const remoteHash = hash({ categories: remote.categories, completed: remote.completed });

      state = remote;
      pendingRemoteState = null;
      persistLocal();
      saveSafetyBackup('sincronización diferida aceptada');
      lastSavedHash = remoteHash;
      lastConfirmedRemoteHash = remoteHash;
      render();
    }


    function scrollToTopTasky() {
      const root = document.scrollingElement || document.documentElement;

      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (_) {
        try { window.scrollTo(0, 0); } catch (_) {}
      }

      window.setTimeout(() => {
        const top = Math.max(
          window.scrollY || 0,
          root?.scrollTop || 0,
          document.documentElement?.scrollTop || 0,
          document.body?.scrollTop || 0
        );

        if (top > 8) {
          try { window.scrollTo(0, 0); } catch (_) {}
          try { root.scrollTop = 0; } catch (_) {}
          try { document.documentElement.scrollTop = 0; } catch (_) {}
          try { document.body.scrollTop = 0; } catch (_) {}
        }
      }, 300);
    }

    function bindEvents() {

      if (el.fabTop) {
        let fabTopTicking = false;

        const updateFabTop = () => {
          if (!el.fabTop) return;
          const currentTop = Math.max(
            window.scrollY || 0,
            document.scrollingElement?.scrollTop || 0,
            document.documentElement?.scrollTop || 0,
            document.body?.scrollTop || 0
          );
          const shouldShow = currentTop > 320;
          el.fabTop.classList.toggle("visible", shouldShow);
          el.fabTop.setAttribute("aria-hidden", String(!shouldShow));
        };

        const onScroll = () => {
          if (fabTopTicking) return;
          fabTopTicking = true;
          requestAnimationFrame(() => {
            updateFabTop();
            fabTopTicking = false;
          });
        };

        let topJumpAt = 0;

        const goTop = event => {
          event.preventDefault();
          event.stopPropagation();

          const now = Date.now();
          if (now - topJumpAt < 180) return;
          topJumpAt = now;

          el.fab?.classList.remove("open");
          el.fabMain?.setAttribute("aria-expanded", "false");
          scrollToTopTasky();
        };

        el.fabTop.addEventListener("pointerdown", goTop, { passive: false });
        el.fabTop.addEventListener("click", goTop);

        window.addEventListener("scroll", onScroll, { passive: true });
        updateFabTop();
      }

      document.addEventListener("input", event => {
        const target = event.target;

        if (target.matches(".task-input")) {
          resizeSingleTextarea(target);
          const item = target.closest(".task-item");
          updateTask(item?.dataset.taskId, target.value);
          return;
        }

        if (target.matches(".activity-title")) {
          const card = target.closest("[data-category-id]");
          if (card) updateTitle(card.dataset.categoryId, target.value);
        }
      });

      document.addEventListener("change", event => {
        const target = event.target;
        if (target.matches(".activity-title")) {
          const card = target.closest("[data-category-id]");
          if (card) updateTitle(card.dataset.categoryId, target.value);
        }
      });

      document.addEventListener("keydown", event => {
        if (event.target.matches(".task-input")) handleTaskKeydown(event, event.target);

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
          event.preventDefault();
          el.searchInput.focus();
          el.searchInput.select();
          return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          el.searchInput.focus();
          el.searchInput.select();
        }

        if (event.key === "Escape") {
          const openModal = document.querySelector(".modal-backdrop.open");
          if (openModal) {
            event.preventDefault();
            closeModal(openModal.id);
            return;
          }

          if (document.activeElement === el.searchInput) {
            event.preventDefault();
            el.searchInput.blur();
            document.body.focus();
            return;
          }
        }

        if (event.key === "/" && !/input|textarea/i.test(event.target.tagName)) {
          event.preventDefault();
          el.searchInput.focus();
        }
      });

      document.addEventListener("paste", event => {
        if (event.target.matches(".task-input")) handlePaste(event, event.target);
      });

      document.getElementById('saveRepeatBtn')?.addEventListener('click', saveRepeatSchedule);

      document.getElementById('repeatModal')?.addEventListener('change', (event) => {
        if (!event.target.matches('input[name="repeat-day"]')) return;
        const days = [...document.querySelectorAll('#repeatModal input[name="repeat-day"]:checked')].map(i => Number(i.value));
        const summary = document.getElementById('repeatSummary');
        if (summary) summary.textContent = `Se repetirá: ${repeatDaysToLabel(days)}.`;
      });

      document.addEventListener("click", event => {
        const soundKind = soundForClickTarget(event.target);
        if (soundKind) {
          playTaskySound(soundKind);
        }

        const action = event.target.closest("[data-action]")?.dataset.action;

        if (action === "move-category-up") {
          const card = event.target.closest("[data-category-id]");
          moveCategoryBy(card?.dataset.categoryId, -1);
          return;
        }

        if (action === "move-category-down") {
          const card = event.target.closest("[data-category-id]");
          moveCategoryBy(card?.dataset.categoryId, 1);
          return;
        }

        if (action === "toggle-repeat") {
          const item = event.target.closest("[data-task-id]");
          toggleRepeatTask(item?.dataset.taskId);
          return;
        }

        if (action === "add-task") {
          const card = event.target.closest("[data-category-id]");
          addTask(card?.dataset.categoryId);
          return;
        }

        if (action === "complete-task") {
          const item = event.target.closest("[data-task-id]");
          if (item?.classList.contains("repeat-done-today")) return;
          completeTask(item?.dataset.taskId);
          return;
        }

        if (action === "restore-task") {
          const item = event.target.closest("[data-task-id]");
          restoreTask(item?.dataset.taskId);
          return;
        }

        if (action === "delete-task") {
          const item = event.target.closest("[data-task-id]");
          deleteTask(item?.dataset.taskId);
          return;
        }

        if (action === "delete-category") {
          const card = event.target.closest("[data-category-id]");
          deleteCategory(card?.dataset.categoryId);
          return;
        }

        if (action === "stats") {
          const card = event.target.closest("[data-category-id]");
          const categoryId = card?.dataset.categoryId;
          if (categoryId) openCategoryReport(categoryId);
          return;
        }

        if (event.target.closest("#emptyAddBtn")) {
          addCategory();
          return;
        }

        if (event.target.closest("#productivityBtn")) {
          openDailyProductivityReport();
          return;
        }

        if (event.target.closest("#overdueBtn")) {
          renderOverdueModal();
          openModal("overdueModal");
          return;
        }

        if (event.target.closest("#fabMain")) {
          el.fab.classList.toggle("open");
          el.fabMain.setAttribute("aria-expanded", el.fab.classList.contains("open"));
          return;
        }

        const fabAction = event.target.closest(".fab-action")?.dataset.action;
        if (fabAction === "add-category") {
          addCategory();
          el.fab.classList.remove("open");
          return;
        }
        if (fabAction === "whatsapp") {
          copyToWhatsApp();
          el.fab.classList.remove("open");
          return;
        }
        if (fabAction === "export") {
          exportJSON();
          el.fab.classList.remove("open");
          return;
        }

        const overdueAction = event.target.closest("[data-overdue-action]")?.dataset.overdueAction;
        const overdueTaskId = event.target.closest("[data-overdue-action]")?.dataset.taskId;

        if (overdueAction === "today") moveOverdueToToday(overdueTaskId);
        if (overdueAction === "delete") deleteTask(overdueTaskId);

        const closeId = event.target.closest("[data-close-modal]")?.dataset.closeModal;
        if (closeId) closeModal(closeId);

        const menuAction = event.target.closest("[data-menu-action]")?.dataset.menuAction;
        if (menuAction === "export") {
          exportJSON();
          closeModal("menuModal");
        }

        if (menuAction === "toggle-sound") {
          setSoundEnabled(!isSoundEnabled());
          return;
        }

        if (menuAction === "recover") recoverSafetyBackup();
        if (menuAction === "export-safety") { exportSafetyHistory(); closeModal('menuModal'); }
        if (menuAction === "reset") resetBoard();
      });

      document.addEventListener("click", event => {
        const insideFab = event.target.closest("#fab");
        if (!insideFab) {
          el.fab.classList.remove("open");
          el.fabMain.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("focusout", event => {
        if (event.target.matches(".task-input")) {
          const item = event.target.closest(".task-item");
          const taskId = item?.dataset.taskId;
          if (!event.target.value.trim() && taskId) {
            let removed = false;
            for (const cat of state.categories) {
              const before = cat.tasks.length;
              cat.tasks = cat.tasks.filter(t => t.id !== taskId);
              removed ||= before !== cat.tasks.length;
            }
            if (removed) {
              const item = event.target.closest(".task-item");
              animateTaskRemoval(item);
              persistLocal();
              localDirty = true;
              updateCategoryUI(taskId ? (item?.closest(".task-list")?.dataset.categoryId || "") : "");
              updateSummaryUI();
              scheduleSave("eliminar tarea vacía");
            }
          } else {
            persistLocal();
            saveCloud("blur");
          }
        } else if (event.target.matches(".activity-title")) {
          persistLocal();
          saveCloud("blur");
        }

        flushPendingRemote();
      });

      el.searchInput.addEventListener("input", () => {
        activeSearch = el.searchInput.value;
        applySearchFilter();
      });

      el.themeBtn.addEventListener("click", toggleTheme);

      el.menuBtn.addEventListener("click", () => {
        updateSoundToggleUI();
        openModal("menuModal");
      });

      el.importInput.addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (file) importJSON(file);
        event.target.value = "";
      });

      document.addEventListener("click", event => {
        if (event.target.classList.contains("modal-backdrop")) {
          event.target.classList.remove("open");
        }
      });

      window.addEventListener("beforeunload", () => {
        clearTimeout(saveTimer);
        persistLocal();
      });
    }


    /* =========================================================
       TASKY V69 · BIBLIOTECA DE FRASES
       quotes.json permanece fuera del HTML.
       ========================================================= */
    let MOTIVATIONAL_QUOTES = [];

    const QUOTE_SOURCE = "quotes.json";
    const QUOTE_CACHE_KEY = "tasky_quotes_cache_v69";
    const QUOTE_HISTORY_KEY = "tasky_quote_history_v69";
    const QUOTE_INTERVAL_MS = 60 * 1000;
    const QUOTE_HISTORY_DAYS = 2;
    const QUOTE_LOAD_TIMEOUT = 6500;

    let quoteRotationSeed = 0;
    let quoteCurrentIndex = -1;
    let quoteTimer = null;
    let quoteLibraryReady = false;

    function getQuoteURLs() {
      const urls = [];

      try {
        const page = new URL(window.location.href);
        page.search = "";
        page.hash = "";

        const basePath = page.pathname.endsWith("/")
          ? page.pathname
          : page.pathname.replace(/\/[^/]*$/, "/");

        urls.push(new URL(
          "quotes.json",
          `${page.origin}${basePath}`
        ).href);
      } catch (_) {}

      try {
        urls.push(new URL(
          "./quotes.json",
          document.baseURI
        ).href);
      } catch (_) {}

      urls.push("https://somerito.github.io/Tasky-App/quotes.json");
      urls.push("https://raw.githubusercontent.com/SOMERITO/Tasky-App/main/quotes.json");

      return [...new Set(urls)];
    }

    function normalizeQuoteList(input) {
      const source = Array.isArray(input)
        ? input
        : input?.quotes;

      if (!Array.isArray(source)) return [];

      const unique = [];
      const seen = new Set();

      for (const entry of source) {
        const text = String(entry?.text || "").trim();
        const author = String(entry?.author || "").trim();

        if (!text || !author) continue;

        const key = `${text}\u0000${author}`;

        if (seen.has(key)) continue;

        seen.add(key);
        unique.push({ text, author });
      }

      return unique;
    }

    function saveQuotesLocal(quotes) {
      try {
        safeStorage.setItem(
          QUOTE_CACHE_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            quotes
          })
        );
      } catch (_) {}
    }

    function readQuotesLocal() {
      try {
        const raw = safeStorage.getItem(
          QUOTE_CACHE_KEY
        );

        if (!raw) return [];

        const parsed = JSON.parse(raw);

        return normalizeQuoteList(
          parsed?.quotes
        );
      } catch (_) {
        return [];
      }
    }

    async function readQuotesFromCacheStorage() {
      if (!("caches" in window)) return [];

      try {
        for (const url of getQuoteURLs()) {
          const response = await caches.match(
            url,
            { ignoreSearch: true }
          );

          if (!response) continue;

          const payload =
            await response.clone().json();

          const quotes =
            normalizeQuoteList(payload);

          if (quotes.length) {
            return quotes;
          }
        }
      } catch (error) {
        console.warn(
          "No se pudo leer quotes.json desde Cache Storage.",
          error
        );
      }

      return [];
    }

    function fetchWithXHR(
      url,
      timeout = QUOTE_LOAD_TIMEOUT
    ) {
      return new Promise(resolve => {
        if (typeof XMLHttpRequest === "undefined") {
          resolve([]);
          return;
        }

        const xhr = new XMLHttpRequest();

        xhr.open("GET", url, true);
        xhr.timeout = timeout;
        xhr.responseType = "text";

        xhr.onload = () => {
          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {
            resolve([]);
            return;
          }

          try {
            const payload =
              JSON.parse(xhr.responseText);

            resolve(
              normalizeQuoteList(payload)
            );
          } catch (_) {
            resolve([]);
          }
        };

        xhr.onerror = () => resolve([]);
        xhr.ontimeout = () => resolve([]);

        try {
          xhr.send();
        } catch (_) {
          resolve([]);
        }
      });
    }

    async function fetchQuotesFromNetwork() {
      const urls = getQuoteURLs();

      for (const baseURL of urls) {
        const requestURLs = [
          `${baseURL}${baseURL.includes("?") ? "&" : "?"}v=${APP_VERSION}`,
          baseURL
        ];

        for (const requestURL of requestURLs) {
          try {
            const controller =
              typeof AbortController !== "undefined"
                ? new AbortController()
                : null;

            const timer = controller
              ? window.setTimeout(
                  () => controller.abort(),
                  QUOTE_LOAD_TIMEOUT
                )
              : null;

            const response =
              await fetch(requestURL, {
                method: "GET",
                cache: "no-store",
                credentials:
                  new URL(requestURL).origin ===
                  location.origin
                    ? "same-origin"
                    : "omit",
                signal: controller?.signal
              });

            if (timer) {
              clearTimeout(timer);
            }

            if (!response.ok) {
              continue;
            }

            const payload =
              await response.json();

            const quotes =
              normalizeQuoteList(payload);

            if (quotes.length) {
              return quotes;
            }

          } catch (error) {
            console.warn(
              "Fetch de quotes.json falló:",
              requestURL,
              error
            );
          }

          const xhrQuotes =
            await fetchWithXHR(requestURL);

          if (xhrQuotes.length) {
            return xhrQuotes;
          }
        }
      }

      return [];
    }

    function createQuoteSeed() {
      const base =
        Date.now() ^
        Math.floor(
          performance.now() * 1000
        );

      try {
        const array =
          new Uint32Array(2);

        crypto.getRandomValues(array);

        return (
          array[0] ^
          array[1] ^
          base
        ) >>> 0;

      } catch (_) {
        return (
          Math.floor(
            Math.random() *
            0xFFFFFFFF
          )
        ) >>> 0;
      }
    }

    function quoteRandom() {
      quoteRotationSeed =
        (
          Math.imul(
            quoteRotationSeed,
            1664525
          ) +
          1013904223
        ) >>> 0;

      return (
        quoteRotationSeed /
        4294967296
      );
    }

    function loadQuoteHistory() {
      try {
        const raw =
          safeStorage.getItem(
            QUOTE_HISTORY_KEY
          );

        const parsed =
          raw ? JSON.parse(raw) : null;

        if (
          !parsed ||
          !Array.isArray(
            parsed.items
          ) ||
          !Number.isFinite(
            parsed.startedAt
          ) ||
          Date.now() -
            parsed.startedAt >=
            QUOTE_HISTORY_DAYS *
            24 *
            60 *
            60 *
            1000
        ) {
          return {
            startedAt: Date.now(),
            items: []
          };
        }

        return {
          startedAt: parsed.startedAt,
          items: [
            ...new Set(
              parsed.items
                .map(Number)
                .filter(
                  index =>
                    index >= 0 &&
                    index <
                      MOTIVATIONAL_QUOTES.length
                )
            )
          ]
        };

      } catch (_) {
        return {
          startedAt: Date.now(),
          items: []
        };
      }
    }

    function saveQuoteHistory(history) {
      try {
        safeStorage.setItem(
          QUOTE_HISTORY_KEY,
          JSON.stringify(history)
        );
      } catch (_) {}
    }

    function pickNextQuoteIndex() {
      if (
        !MOTIVATIONAL_QUOTES.length
      ) {
        return -1;
      }

      const history =
        loadQuoteHistory();

      const used =
        new Set(history.items);

      if (
        used.size >=
        MOTIVATIONAL_QUOTES.length
      ) {
        history.startedAt = Date.now();
        history.items = [];
        used.clear();
      }

      const available = [];

      for (
        let index = 0;
        index <
          MOTIVATIONAL_QUOTES.length;
        index++
      ) {
        if (
          !used.has(index) &&
          index !== quoteCurrentIndex
        ) {
          available.push(index);
        }
      }

      if (!available.length) {
        return quoteCurrentIndex >= 0
          ? quoteCurrentIndex
          : 0;
      }

      const index =
        available[
          Math.floor(
            quoteRandom() *
            available.length
          )
        ];

      history.items.push(index);
      saveQuoteHistory(history);

      quoteCurrentIndex = index;

      return index;
    }

    function paintQuote(quote) {
      const node =
        document.getElementById(
          "heroSubtitle"
        );

      const authorNode =
        document.getElementById(
          "heroQuoteAuthor"
        );

      if (
        !node ||
        !authorNode ||
        !quote
      ) {
        return false;
      }

      // Frase y autor se actualizan juntos.
      node.textContent = quote.text;
      authorNode.textContent =
        quote.author;

      node.classList.remove(
        "is-loading",
        "is-error"
      );

      authorNode.classList.remove(
        "is-changing"
      );

      return true;
    }

    function updateMotivationalQuote(
      force = false
    ) {
      if (
        !quoteLibraryReady ||
        !MOTIVATIONAL_QUOTES.length
      ) {
        return;
      }

      if (!quoteRotationSeed) {
        quoteRotationSeed =
          createQuoteSeed();
      }

      const index =
        pickNextQuoteIndex();

      if (index < 0) return;

      const quote =
        MOTIVATIONAL_QUOTES[index];

      const node =
        document.getElementById(
          "heroSubtitle"
        );

      const authorNode =
        document.getElementById(
          "heroQuoteAuthor"
        );

      if (
        !node ||
        !authorNode
      ) {
        return;
      }

      if (
        !force &&
        node.textContent ===
          quote.text &&
        authorNode.textContent ===
          quote.author
      ) {
        return;
      }

      node.classList.add(
        "is-changing"
      );

      authorNode.classList.add(
        "is-changing"
      );

      requestAnimationFrame(() => {
        paintQuote(quote);

        requestAnimationFrame(() => {
          node.classList.remove(
            "is-changing"
          );

          authorNode.classList.remove(
            "is-changing"
          );
        });
      });
    }

    function startQuoteRotation() {
      clearInterval(quoteTimer);

      if (
        !quoteLibraryReady ||
        !MOTIVATIONAL_QUOTES.length
      ) {
        return;
      }

      quoteTimer =
        setInterval(
          () =>
            updateMotivationalQuote(false),
          QUOTE_INTERVAL_MS
        );
    }

    async function loadQuotesLibrary() {
      const node =
        document.getElementById(
          "heroSubtitle"
        );

      const authorNode =
        document.getElementById(
          "heroQuoteAuthor"
        );

      if (node) {
        node.classList.add(
          "is-loading"
        );
      }

      if (authorNode) {
        authorNode.textContent = "";
      }

      // Nivel 1: Cache Storage.
      let quotes =
        await readQuotesFromCacheStorage();

      // Nivel 2: localStorage.
      if (!quotes.length) {
        quotes =
          readQuotesLocal();
      }

      // Pintar cache inmediatamente.
      if (quotes.length) {
        MOTIVATIONAL_QUOTES =
          quotes;

        quoteLibraryReady = true;
        quoteRotationSeed =
          createQuoteSeed();
        quoteCurrentIndex = -1;

        updateMotivationalQuote(true);
        startQuoteRotation();
      }

      // Nivel 3: red.
      const networkQuotes =
        await fetchQuotesFromNetwork();

      if (networkQuotes.length) {
        MOTIVATIONAL_QUOTES =
          networkQuotes;

        quoteLibraryReady = true;

        saveQuotesLocal(
          networkQuotes
        );

        quoteRotationSeed =
          createQuoteSeed();
        quoteCurrentIndex = -1;

        updateMotivationalQuote(true);
        startQuoteRotation();

        return true;
      }

      if (quotes.length) {
        return true;
      }

      if (node) {
        node.textContent =
          "No se pudo cargar la biblioteca de frases.";
        node.classList.remove(
          "is-loading"
        );
        node.classList.add(
          "is-error"
        );
      }

      if (authorNode) {
        authorNode.textContent = "";
      }

      return false;
    }

    function init() {
      try {
        deviceId = getOrCreateDeviceId();
        document.documentElement.classList.toggle('touch-device', isTouchDevice());
        const savedTheme = safeStorage.getItem(THEME_KEY) || "system";
        applyTheme(savedTheme);

        if (!getLatestBackupRecord()) {
          const legacy = loadSafetyBackup();
          if (legacy) saveSafetyBackup('migración de respaldo V42', legacy);
        }

        const local = loadLocalState();
        if (local) {
          state = local;
          render();
          if (!loadSafetyBackup() && stateStats(state).total > 0) saveSafetyBackup('inicio');
          setSyncStatus("offline", "Cargando copia local");
        }

        bindEvents();
        // V65: la biblioteca se carga en segundo plano; la UI no espera.
        loadQuotesLibrary();

        // Primer render terminado: Tasky queda interactiva YA.
        hideLoading();

        // Los iconos y Firebase son secundarios y van en segundo plano.
        refreshIcons();
        updateSoundToggleUI();

        // Un segundo frame asegura que las métricas y alturas queden
        // sincronizadas incluso cuando el WebView pinta durante una
        // transición de arranque.
        requestAnimationFrame(() => {
          try {
            updateSummaryUI();
            updateTaskHeights();
          } catch (error) {
            console.warn("Refresco inicial:", error);
          }
        });

        startFirebase();
      } catch (error) {
        console.error("Error de inicialización:", error);
        setSyncStatus("error", "Modo local");
        render();
        hideLoading();
      }
    }

    // V60: nunca dejamos una pantalla de carga permanente.
    const TASKY_BOOT_WATCHDOG = window.setTimeout(() => {
      const loading = document.getElementById("loadingScreen");

      if (
        loading &&
        !loading.classList.contains("hidden")
      ) {
        console.warn("Watchdog de arranque: se fuerza Modo local.");
        loading.classList.add("boot-fallback", "hidden");
        document.documentElement.classList.remove("tasky-booting");
        initialized = true;

        try {
          setSyncStatus("offline", "Modo local");
          const local = loadLocalState();
          if (local) {
            state = local;
            render();
          }
          refreshIcons();
        } catch (error) {
          console.error("Watchdog de arranque:", error);
        }
      }
    }, 3500);

    init();
