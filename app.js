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

    const APP_VERSION = 109;
    const APP_VERSION_LABEL = `V${APP_VERSION}`;
    const APP_VOLUME_LABEL = `Vol. ${APP_VERSION}`;
    // Registro central de versión: usar APP_VOLUME_LABEL para identificar
    // inequívocamente cada modificación funcional de Tasky en el código.
    // Version visible y persistencia compatibles con versiones anteriores.
    const STORAGE_KEY = "tasky_pro_v26";
    const THEME_KEY = "tasky_theme";
    const DEVICE_KEY = "tasky_device_id";
    const COMPLETED_COLLAPSED_KEY = "tasky_completed_collapsed";
    const RESCHEDULED_COLLAPSED_KEY = "tasky_rescheduled_collapsed";

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
      rescheduledBtn: document.getElementById("rescheduledBtn"),
      rescheduledCount: document.getElementById("rescheduledCount"),
      rescheduledList: document.getElementById("rescheduledList"),
      productivityBtn: document.getElementById("productivityBtn"),
      dailyProductivityContent: document.getElementById("dailyProductivityContent"),
      statsReportContent: document.getElementById("statsReportContent"),
      syncStatus: document.getElementById("syncStatus"),
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
    let activeTaskView = "all"; // all | today | completed
    let completedCollapsed = false;
    let rescheduledCollapsed = false;
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
      const parts = new Intl.DateTimeFormat("es-PE", { weekday:"long", day:"numeric", month:"long" }).formatToParts(new Date(y, m-1, d));
      const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
      const month = map.month === 'septiembre' ? 'setiembre' : map.month;
      return `${String(map.weekday || '').replace(/^./, c => c.toUpperCase())}, ${map.day} de ${month}`;
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
      return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
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

    function currentMonthKey(date = new Date()) {
      return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0");
    }

    function currentMonthLabel() {
      return new Intl.DateTimeFormat("es-PE", {
        month: "long",
        year: "numeric"
      }).format(new Date()).replace(/^./, char => char.toUpperCase());
    }

    function taskCountCompleted() {
      const monthKey = currentMonthKey();
      return state.completed.filter(task => {
        const date = completedDateFor(task);
        return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
          date.slice(0, 7) === monthKey;
      }).length;
    }

    function monthlyCompletionHistory() {
      const buckets = new Map();

      state.completed.forEach(task => {
        const date = completedDateFor(task);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

        const key = date.slice(0, 7);
        const bucket = buckets.get(key) || { key, completed: 0 };
        bucket.completed += 1;
        buckets.set(key, bucket);
      });

      const currentKey = currentMonthKey();
      if (!buckets.has(currentKey)) {
        buckets.set(currentKey, { key: currentKey, completed: 0 });
      }

      return [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key));
    }

    function renderMonthlyProgressHistory() {
      const history = monthlyCompletionHistory();
      const max = Math.max(1, ...history.map(item => item.completed));

      return history.map((item, index) => {
        const [year, month] = item.key.split("-").map(Number);
        const label = new Intl.DateTimeFormat("es-PE", {
          month: "long",
          year: "numeric"
        }).format(new Date(year, month - 1, 1)).replace(/^./, char => char.toUpperCase());

        const isCurrent = item.key === currentMonthKey();
        const width = item.completed === 0 ? 0 : Math.max(5, Math.round((item.completed / max) * 100));

        return `
          <article class="monthly-history-row ${isCurrent ? "is-current" : ""}" style="--month-delay:${Math.min(index, 12) * 42}ms">
            <div class="monthly-history-label">
              <strong>${escapeHTML(label)}</strong>
              <span>${isCurrent ? "Mes actual" : "Registro histórico"}</span>
            </div>
            <div class="monthly-history-track" aria-hidden="true">
              <span style="width:${width}%"></span>
            </div>
            <div class="monthly-history-count">
              <strong>${item.completed}</strong>
              <span>${item.completed === 1 ? "tarea" : "tareas"}</span>
            </div>
          </article>
        `;
      }).join("");
    }

    function overdueTasks() {
      const now = today();
      const result = [];
      for (const cat of state.categories) {
        for (const task of cat.tasks) {
          if (!task.draft && task.text.trim() && task.date && task.date < now && !(task.rescheduled && task.date === now)) {
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

    function isRescheduledFromToday(task, referenceDate = today()) {
      return Boolean(
        task &&
        !task.draft &&
        String(task.text || '').trim() &&
        task.rescheduled &&
        task.rescheduledFrom === referenceDate &&
        task.date &&
        task.date > referenceDate
      );
    }

    function isRescheduledForToday(task, referenceDate = today()) {
      return Boolean(
        task &&
        !task.draft &&
        String(task.text || '').trim() &&
        task.rescheduled &&
        task.date === referenceDate
      );
    }

    function todayTaskStats() {
      const now = today();
      const completedRegular = state.completed.filter(t => completedDateFor(t) === now).length;
      const completed = completedRegular;

      let pending = 0;
      let deferred = 0;

      for (const cat of state.categories) {
        for (const t of cat.tasks || []) {
          if (!t || t.draft || !String(t.text || '').trim()) continue;

          if (t.date === now && !isRepeatCompletedToday(t)) {
            pending++;
          }

          // Una tarea aplazada desde hoy sigue perteneciendo al trabajo que
          // habíamos planificado hoy, aunque ahora viva en una fecha futura.
          if (isRescheduledFromToday(t, now)) {
            deferred++;
          }
        }
      }

      const total = completed + pending + deferred;
      return {
        completed,
        pending,
        deferred,
        pendingIncludingDeferred: pending + deferred,
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
    const SOUND_MASTER_GAIN = 1.000;

    let taskyAudioContext = null;
    let taskyMasterGain = null;
    let taskyAudioKeepAlive = null;

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

        // Mantiene el AudioContext "caliente" después de períodos de
        // inactividad. La ganancia es prácticamente inaudible y evita
        // que el navegador suspenda el contexto entre clics.
        try {
          const keepAliveOsc = taskyAudioContext.createOscillator();
          const keepAliveGain = taskyAudioContext.createGain();
          keepAliveGain.gain.value = 0.000001;
          keepAliveOsc.frequency.value = 18;
          keepAliveOsc.connect(keepAliveGain);
          keepAliveGain.connect(taskyAudioContext.destination);
          keepAliveOsc.start();
          taskyAudioKeepAlive = { oscillator: keepAliveOsc, gain: keepAliveGain };
        } catch (_) {}

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

    // Precalienta el motor de audio en el mismo gesto del usuario.
    // Así los sonidos de clic no quedan esperando a una llamada async tardía.
    function primeTaskyAudio() {
      if (!isSoundEnabled()) return;
      const ctx = getTaskyAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
      }
    }

    document.addEventListener("pointerdown", primeTaskyAudio, { capture: true, passive: true });
    document.addEventListener("keydown", primeTaskyAudio, { capture: true, passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !isSoundEnabled()) return;
      const ctx = getTaskyAudioContext();
      if (ctx?.state === "suspended") {
        void ctx.resume().catch(() => {});
      }
    });

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

    function playTaskySound(kind = "ui") {
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

      const ctx = getTaskyAudioContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
      }

      // Cuando el navegador acaba de despertar el contexto, no esperamos a
      // la promesa de resume: el gesto del usuario ya inició el desbloqueo.
      // El keep-alive evita que esta rama ocurra normalmente tras inactividad.
      if (ctx.state !== "running") return;

      /*
       * Sonidos cortos, suaves y con más presencia.
       * Los patrones cambian según la acción para conservar una sensación nativa y elegante.
       */
      switch (kind) {

        case "milestone":
          createTaskyTone({ frequency: 659.25, duration: 0.07, type: "sine", peak: 0.36 });
          createTaskyTone({ frequency: 830.61, start: 0.055, duration: 0.09, type: "sine", peak: 0.31 });
          createTaskyTone({ frequency: 1046.5, start: 0.12, duration: 0.10, type: "sine", peak: 0.28 });
          createTaskyTone({ frequency: 1318.51, start: 0.18, duration: 0.13, type: "triangle", peak: 0.22 });
          break;

        case "complete":
          createTaskyTone({ frequency: 783.99, duration: 0.055, type: "sine", peak: 0.55 });
          createTaskyTone({ frequency: 1046.5, start: 0.045, duration: 0.11, type: "sine", peak: 0.42 });
          createTaskyTone({ frequency: 1318.51, start: 0.09, duration: 0.08, type: "sine", peak: 0.26 });
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
          createTaskyTone({ frequency: 392, duration: 0.045, type: "sine", peak: 0.30 });
          createTaskyTone({ frequency: 293.66, start: 0.045, duration: 0.08, type: "sine", peak: 0.23 });
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

        case "close":
          createTaskyTone({ frequency: 523.25, duration: 0.045, type: "sine", peak: 0.22 });
          createTaskyTone({ frequency: 392, start: 0.032, duration: 0.07, type: "sine", peak: 0.16 });
          break;

        case "confirm-delete":
          createTaskyTone({ frequency: 329.63, duration: 0.055, type: "triangle", peak: 0.34 });
          createTaskyTone({ frequency: 246.94, start: 0.045, duration: 0.105, type: "triangle", peak: 0.28 });
          break;

        case "reschedule":
          createTaskyTone({ frequency: 698.46, duration: 0.05, type: "triangle", peak: 0.34 });
          createTaskyTone({ frequency: 880, start: 0.04, duration: 0.085, type: "triangle", peak: 0.28 });
          break;

        case "open-delete":
          createTaskyTone({ frequency: 587.33, duration: 0.042, type: "triangle", peak: 0.24 });
          createTaskyTone({ frequency: 784, start: 0.035, duration: 0.055, type: "triangle", peak: 0.17 });
          break;

        case "open":
          createTaskyTone({ frequency: 659.25, duration: 0.035, type: "sine", peak: 0.20 });
          createTaskyTone({ frequency: 880, start: 0.028, duration: 0.055, type: "sine", peak: 0.16 });
          break;

        case "toggle":
          createTaskyTone({ frequency: 587.33, duration: 0.035, type: "triangle", peak: 0.19 });
          createTaskyTone({ frequency: 783.99, start: 0.03, duration: 0.05, type: "triangle", peak: 0.15 });
          break;

        case "ui":
        default:
          createTaskyTone({
            frequency: 784,
            duration: 0.032,
            type: "sine",
            peak: 0.18
          });
          createTaskyTone({
            frequency: 988,
            start: 0.025,
            duration: 0.045,
            type: "sine",
            peak: 0.12
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

      if (interactive.dataset?.closeModal) return "close";

      switch (action) {
        case "complete-task":
          return "complete";

        case "restore-task":
        case "recover":
        case "restore":
          return "restore";

        case "delete-task":
        case "reset":
        case "delete":
          return "delete";

        case "delete-category":
          return "open-delete";

        case "confirm-delete-category":
          return "confirm-delete";

        case "cancel-delete-category":
          return "close";

        case "reschedule-tomorrow":
        case "reschedule-date":
        case "save-reschedule-date":
          return "reschedule";

        case "close-milestone":
          return "close";

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
          return "toggle";

        default:
          if (interactive.id === "themeBtn" || interactive.id === "menuBtn") {
            return "open";
          }
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
      "info": '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v6"></path><path d="M12 7h.01"></path>',
      "list-checks": '<path d="M3 6h2"></path><path d="M9 6h12"></path><path d="M3 12h2"></path><path d="M9 12h12"></path><path d="M3 18h2"></path><path d="M9 18h12"></path><path d="m3 6 .8.8L5.3 5.3"></path><path d="m3 12 .8.8 1.5-1.5"></path><path d="m3 18 .8.8 1.5-1.5"></path>',
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
      "circle-check": '<circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path>',
      "calendar-days": '<rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path>',
      "timer": '<circle cx="12" cy="13" r="8"></circle><path d="M9 2h6"></path><path d="M12 5V3"></path><path d="m17.5 7.5 1.5-1.5"></path><path d="M12 9v4l2.5 1.5"></path>',
      "play": '<path d="m9 7 8 5-8 5V7Z"></path>',
      "pause": '<rect x="7" y="6" width="3" height="12" rx="1"></rect><rect x="14" y="6" width="3" height="12" rx="1"></rect>',
      "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path>',
      "flame": '<path d="M12 21c4 0 7-3 7-7 0-3.6-2-6.1-5-9-1 2.6-2.1 3.7-3.4 4.4.2-2.1-.8-4.2-2.2-5.4C8 6.2 5 9.1 5 13c0 4.7 3.1 8 7 8Z"></path>',
      "grid-2x2": '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
      "bell-ring": '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>',
      "trending-up": '<path d="m3 17 6-6 4 4 7-8"></path><path d="M14 7h6v6"></path>',
      "volume-2": '<path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="M15 9.5a4 4 0 0 1 0 5"></path><path d="M18 7a7.5 7.5 0 0 1 0 10"></path>',
      "calendar-check": '<rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="m8 15 2.3 2.3L15 12.5"></path>',
      "calendar-check-2": '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M3 10h18"></path><path d="m8 15 2.2 2.2L15 12.5"></path>',
      "check-circle-2": '<path d="M21 11.5a9 9 0 1 1-5.4-8.2"></path><path d="m9 12 2 2 5-5"></path>',
      "clock-3": '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
      "inbox": '<path d="M4 4h16l1 9v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l1-9Z"></path><path d="M3 13h5l2 3h4l2-3h5"></path>',
      "activity": '<path d="M3 12h4l3-8 4 16 3-8h4"></path>',
      "calendar-plus": '<rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="M12 13v5"></path><path d="M9.5 15.5h5"></path>',
      "calendar-alert": '<rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="M12 13v3"></path><path d="M12 18h.01"></path>',
      "trophy": '<path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"></path><path d="M8 6H5a2 2 0 0 0 2 2h1"></path><path d="M16 6h3a2 2 0 0 1-2 2h-1"></path><path d="M12 12v4"></path><path d="M8 20h8"></path><path d="M9 16h6"></path>',
      "circle-help": '<circle cx="12" cy="12" r="9"></circle><path d="M9.7 9a2.5 2.5 0 1 1 4.6 1.4c-.9 1.2-2.3 1.6-2.3 3.1"></path><path d="M12 17h.01"></path>'
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

        svg.innerHTML = LOCAL_ICON_SVG[name] || LOCAL_ICON_SVG['circle-help'];

        for (const attr of node.getAttributeNames()) {
          if (attr === "data-lucide" || attr === "class" || attr === "style") continue;
        }

        if (node.className) svg.classList.add(...String(node.className).split(/\s+/).filter(Boolean));
        if (node.getAttribute("style")) svg.setAttribute("style", node.getAttribute("style"));
        if (node.id) svg.id = node.id;

        node.replaceWith(svg);
      }

      document.querySelectorAll('[title]').forEach(node => {
        const title = node.getAttribute('title');
        if (title && !node.dataset.tooltip) node.dataset.tooltip = title;
        if (node.hasAttribute('title')) node.removeAttribute('title');
      });
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
          order: Number.isFinite(rawOrder) ? rawOrder : index,
          collapsed: Boolean(cat.collapsed)
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
              lastCompletedDate: /^\d{4}-\d{2}-\d{2}$/.test(task.lastCompletedDate || "") ? task.lastCompletedDate : null,
              // V104: estos campos deben sobrevivir a F5, al recargar desde localStorage
              // y a la normalización de Firestore. Antes se perdían y la tarea regresaba a hoy.
              rescheduled: Boolean(task.rescheduled),
              rescheduledFrom: /^\d{4}-\d{2}-\d{2}$/.test(task.rescheduledFrom || "") ? task.rescheduledFrom : null,
              rescheduledAt: task.rescheduledAt || null
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

    function getBestRecoveryState() {
      const candidates = [];

      const local = loadLocalState();
      if (local && stateStats(local).total > 0) {
        candidates.push({ source: "LocalStorage", state: local });
      }

      const backup = loadSafetyBackup();
      if (backup && stateStats(backup).total > 0) {
        candidates.push({ source: "respaldo de seguridad", state: backup });
      }

      const history = loadSafetyHistory();
      history.forEach((record, index) => {
        try {
          const candidate = record?.data;
          const normalized = candidate ? normalizeState(candidate) : null;
          if (normalized && stateStats(normalized).total > 0) {
            candidates.push({
              source: index === 0 ? "historial reciente" : "historial de seguridad",
              state: normalized
            });
          }
        } catch (_) {}
      });

      candidates.sort((a, b) => {
        const aStats = stateStats(a.state);
        const bStats = stateStats(b.state);
        if (bStats.total !== aStats.total) return bStats.total - aStats.total;
        if (bStats.completed !== aStats.completed) return bStats.completed - aStats.completed;
        return bStats.categories - aStats.categories;
      });

      return candidates[0] || null;
    }

    function restoreBestRecoveryState(reason = "recuperación automática") {
      const recovered = getBestRecoveryState();
      if (!recovered) return null;

      state = cloneState(recovered.state);
      persistLocal();
      localDirty = true;
      saveSafetyBackup(reason + " · " + recovered.source, state);
      return recovered;
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

    function syncProfessionalUI() {
      try {
        const cards = [...document.querySelectorAll('#board .activity-card:not(.completed-card):not(.rescheduled-card)')];

        const pct = Math.max(0, Math.min(100, parseInt(document.getElementById('dayPercent')?.textContent || '0', 10) || 0));
        const ring = document.getElementById('proDayRing');
        if (ring) ring.setAttribute('stroke-dasharray', `${pct},100`);
        const sidebarPct = document.getElementById('sidebarDayPercent');
        if (sidebarPct) sidebarPct.textContent = `${pct}%`;
        const sidebarProgress = document.getElementById('sidebarDayProgress');
        if (sidebarProgress) sidebarProgress.style.width = `${pct}%`;
        const dateEl = document.getElementById('proDateText');
        if (dateEl) dateEl.textContent = formatDateLong(today());
        const overdueText = document.getElementById('overdueCount')?.textContent || '0';
        const sideOverdue = document.getElementById('sidebarOverdueCount');
        if (sideOverdue) sideOverdue.textContent = overdueText;
        const completed = parseInt(document.getElementById('metricCompleted')?.textContent || '0', 10) || 0;
              } catch (error) {
        console.warn('UI profesional:', error);
      }
    }

    function setProfessionalNav() {
      return;
    }

    function updateTaskViewTabs() {
      const map = { all: 'allTaskTab', today: 'todayTaskTab', completed: 'completedTaskTab' };
      Object.entries(map).forEach(([view, id]) => {
        const button = document.getElementById(id);
        if (button) button.classList.toggle('active', activeTaskView === view);
      });
    }

    function setTaskView(view) {
      const allowed = new Set(['all', 'today', 'completed']);
      activeTaskView = allowed.has(view) ? view : 'all';
      updateTaskViewTabs();
      setProfessionalNav(activeTaskView === 'completed' ? 'analysis' : activeTaskView === 'today' ? 'home' : 'phases');
      render();
    }

    function setupTooltips() {
      let timer = null;
      let active = null;
      let tooltip = null;

      const remove = () => {
        clearTimeout(timer);
        if (tooltip) tooltip.remove();
        tooltip = null;
        active = null;
      };

      document.addEventListener('pointerover', event => {
        const target = event.target.closest?.('[data-tooltip]');
        if (!target || active === target) return;
        const text = target.dataset.tooltip;
        if (!text || target.matches(':disabled')) return;
        target.dataset.tooltip = text;
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!target.isConnected) return;
          const node = document.createElement('div');
          node.className = 'tasky-tooltip';
          node.textContent = text;
          document.body.appendChild(node);
          const rect = target.getBoundingClientRect();
          const x = Math.min(Math.max(8, rect.left + rect.width / 2 - node.offsetWidth / 2), window.innerWidth - node.offsetWidth - 8);
          const y = rect.top - node.offsetHeight - 10;
          node.style.left = `${x}px`;
          node.style.top = `${Math.max(8, y)}px`;
          tooltip = node;
          active = target;
        }, 700);
      });
      document.addEventListener('pointerout', event => {
        const target = event.target.closest?.('[data-tooltip]');
        if (!target) return;
        const related = event.relatedTarget;
        if (related && target.contains(related)) return;
        remove();
      });
      window.addEventListener('scroll', remove, { passive: true });
      window.addEventListener('resize', remove);
    }

    function updateSummaryUI() {
      const overdue = overdueTasks();
      const pending = taskCountPending();
      const completed = taskCountCompleted();
      const day = todayTaskStats();

      el.metricCategories.textContent = state.categories.filter(categoryHasOpenWorkToday).length;
      el.metricPending.textContent = pending;
      el.metricCompleted.textContent = completed;

      el.overdueCount.textContent = overdue.length;
      el.overdueBtn.hidden = false;
      updateRescheduledUI();

      const pct = day.total ? Math.round((day.completed / day.total) * 100) : 0;
      el.dayPercent.textContent = pct + "%";
      el.dayCompleted.textContent = day.completed;
      el.dayTotal.textContent = day.total;
      el.dayProgressFill.style.width = pct + "%";

      const date = new Date();

      document.title = overdue.length
        ? "(" + overdue.length + ") Tasky"
        : "Tasky";

      syncProfessionalUI();
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

    // La animación de entrada progresiva se reserva exclusivamente para Mi productividad.
    function animateTaskySurface() {}

    function render() {
      const repeatChangedOnRender = syncRepeatingTasksForToday();
      if (repeatChangedOnRender) {
        persistLocal();
        localDirty = true;
      }

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

      const reprogrammedCategoryIds = new Set(
        state.categories
          .filter(isFullyRescheduledCategory)
          .map(cat => cat.id)
      );

      const activeCategories =
        state.categories.filter(
          cat => !reprogrammedCategoryIds.has(cat.id) && categoryHasOpenWorkToday(cat)
        );

      const finishedCategories =
        state.categories.filter(
          cat => !reprogrammedCategoryIds.has(cat.id) && !categoryHasOpenWorkToday(cat)
        );

      if (activeTaskView !== 'completed') {
        for (const cat of activeCategories) {
          const index = state.categories.findIndex(c => c.id === cat.id);
          el.board.appendChild(buildCategoryCard(cat, index, query));
        }

        if (activeTaskView === 'all') {
          buildCompletedCard(query);
          buildRescheduledCard();
        }
      } else {
        buildCompletedCard(query);
      }

      for (const cat of finishedCategories) {
        if (activeTaskView === 'completed' || activeTaskView === 'today') continue;
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

      const visibleCategories = el.board.querySelectorAll(".activity-card:not(.completed-card):not(.rescheduled-card)");
      const completedCard = el.board.querySelector(".completed-card");
      const rescheduledCard = el.board.querySelector(".rescheduled-card");
      const completedVisibleCount = completedCard
        ? completedCard.querySelectorAll(".task-item:not(.search-hidden)").length
        : 0;
      const rescheduledVisibleCount = rescheduledCard
        ? rescheduledCard.querySelectorAll(".rescheduled-task-item:not(.search-hidden)").length
        : 0;
      const hasVisibleSpecialCard = completedVisibleCount > 0 || rescheduledVisibleCount > 0;

      if (activeTaskView === "completed") {
        // Filtrar por Completadas no equivale a hacer una búsqueda.
        // Solo mostramos “No encontramos coincidencias” cuando el usuario
        // escribió realmente un término en el buscador y ese término no existe.
        if (completedCard && completedVisibleCount > 0) {
          el.emptyState.style.display = "none";
        } else if (query) {
          el.emptyState.style.display = "block";
          el.emptyState.querySelector("h2").textContent = "No encontramos coincidencias";
          el.emptyState.querySelector("p").textContent = "Prueba con otra palabra o limpia el buscador.";
        } else {
          el.emptyState.style.display = "block";
          el.emptyState.querySelector("h2").textContent = "Todavía no hay tareas completadas ✨";
          el.emptyState.querySelector("p").textContent = "Cuando completes una tarea, aparecerá aquí.";
        }
      } else {
        el.emptyState.style.display = state.categories.length === 0 ? "block" : "none";

        if (state.categories.length > 0 && visibleCategories.length === 0 && !hasVisibleSpecialCard) {
          el.emptyState.style.display = "block";
          el.emptyState.querySelector("h2").textContent = "No encontramos coincidencias";
          el.emptyState.querySelector("p").textContent = "Prueba con otra palabra o limpia el buscador.";
        } else {
          el.emptyState.querySelector("h2").textContent = "Tu tablero está limpio ✨";
          el.emptyState.querySelector("p").textContent = "Crea una fase para empezar. Puedes mover fases, reordenar tareas, pegar listas completas y copiar tu plan a WhatsApp.";
        }
      }

      initSortables();
      refreshSectionMoveControls();

      hydrating = false;
      updateSummaryUI();
      refreshIcons();
      updateTaskHeights();
      updateTaskViewTabs();
      syncProfessionalUI();

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
      const deferredToday = cat.tasks.filter(t => isRescheduledFromToday(t, today())).length;
      const todayTotal = completedToday + todayPending + deferredToday;
      const pct = todayTotal ? Math.round((completedToday / todayTotal) * 100) : 0;

      const card = document.createElement("article");
      card.className = "activity-card" + (todayTotal > 0 && pct === 100 ? " is-complete" : "") + (cat.collapsed ? " is-collapsed" : "");
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
              <button class="mini-btn category-toggle-btn" type="button" data-action="toggle-category" title="${cat.collapsed ? "Expandir fase" : "Contraer fase"}" aria-label="${cat.collapsed ? "Expandir fase" : "Contraer fase"}" aria-expanded="${cat.collapsed ? "false" : "true"}">${cat.collapsed ? "▼" : "▲"}</button>
              <span class="category-pending-count" title="${visiblePending} tarea${visiblePending === 1 ? "" : "s"} pendiente${visiblePending === 1 ? "" : "s"}" aria-label="${visiblePending} tareas pendientes" aria-hidden="true">${visiblePending}</span>
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
            ${deferredToday ? `<span class="pill rescheduled-pill"><i data-lucide="sun"></i>${deferredToday} reprogramada${deferredToday === 1 ? "" : "s"}</span>` : ""}
            <span class="pill ${todayTotal > 0 && pct === 100 ? "success" : "primary"}">${todayTotal > 0 ? `${pct}% hoy` : "Sin tareas hoy"}</span>
          </div>

          <div class="card-progress">
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
            <span class="card-progress-value">${todayTotal > 0 ? `${completedToday}/${todayTotal} hoy` : '—'}</span>
          </div>
        </div>

        <div class="task-list" data-category-id="${escapeHTML(cat.id)}"></div>
        <button class="add-task" type="button" data-action="add-task" data-category-id="${escapeHTML(cat.id)}" aria-label="Añadir tarea a ${escapeHTML(cat.title || 'esta fase')}">
          <i data-lucide="plus"></i>
          <span>Añadir tarea</span>
        </button>

      `;

      const list = card.querySelector(".task-list");

      for (const task of cat.tasks) {
        if (!task.draft && task.text.trim() && task.date < today()) continue;

        // Una tarea reprogramada para una fecha futura deja de pertenecer
        // al tablero de hoy. Permanece en "Tareas reprogramadas" hasta que
        // llegue su nueva fecha.
        if (!task.draft && task.text.trim() && task.rescheduled && task.date > today()) continue;

        // Una repetitiva que ya se completó hoy queda archivada en
        // Completadas. Su tarea-serie no vuelve a mostrarse hasta su
        // siguiente fecha programada.
        if (!task.draft && task.text.trim() && task.repeat && isRepeatCompletedToday(task)) continue;
        if (!task.draft && task.text.trim() && task.repeat && task.date > today()) continue;
        if (activeTaskView === 'today' && !task.draft && task.text.trim() && task.date !== today()) continue;

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
          <div class="task-input completed-task-text" role="text" aria-label="Tarea completada">
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
          <button class="drag-task" type="button" data-tooltip="Mantén pulsado para mover" aria-label="Mover tarea"><i data-lucide="grip-vertical"></i></button>
          <button
            class="check-btn${repeatDoneToday ? " repeat-done-today" : ""}"
            type="button"
            data-action="complete-task"
            aria-label="${repeatDoneToday ? "Completada hoy" : "Completar tarea"}"
            ${repeatDoneToday ? "disabled" : ""}
          >${repeatDoneToday ? '<i data-lucide="check"></i>' : ""}</button>
          <textarea class="task-input" rows="1" maxlength="500" placeholder="Añadir tarea…">${escapeHTML(task.text)}</textarea>
          <div class="task-item-actions">
            <button class="reschedule-btn" type="button" data-action="reschedule-tomorrow" data-tooltip="Reprogramar para mañana" aria-label="Reprogramar para mañana">
              <i data-lucide="sun"></i>
            </button>
            <button class="reschedule-date-btn" type="button" data-action="reschedule-date" data-tooltip="Elegir otra fecha" aria-label="Elegir otra fecha">
              <i data-lucide="calendar-plus"></i>
            </button>
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

      if (query && !task.draft) {
        const haystack = String(task.text || "").toLowerCase();
        if (!haystack.includes(query)) item.classList.add("search-hidden");
        else item.classList.add("search-match");
      }

      return item;
    }

    function buildCompletedCard(query) {
      const completedToday = state.completed.filter(task => completedDateFor(task) === today());
      if (!completedToday.length) return;

      const card = document.createElement("article");
      card.className = "activity-card completed-card" + (completedCollapsed ? " is-collapsed" : "");
      card.dataset.completedCard = "true";

      const visible = completedToday.filter(task => {
        if (!query) return true;
        return String(task.text || '').toLowerCase().includes(query);
      });

      card.innerHTML = `
        <div class="card-head">
          <div class="card-title-row">
            <div class="completed-card-spacer" aria-hidden="true"></div>
            <div class="activity-title completed-card-title" role="heading" aria-level="2">Completadas <span class="pill success">${completedToday.length}</span><span class="pill neutral">Hoy</span></div>
            <div class="card-actions">
              <button class="mini-btn category-toggle-btn completed-toggle-btn" type="button" data-action="toggle-completed" title="${completedCollapsed ? "Expandir completadas" : "Contraer completadas"}" aria-label="${completedCollapsed ? "Expandir completadas" : "Contraer completadas"}" aria-expanded="${completedCollapsed ? "false" : "true"}">${completedCollapsed ? "▼" : "▲"}</button>
              <span class="category-pending-count completed-count" title="${completedToday.length} tarea${completedToday.length === 1 ? "" : "s"} completada${completedToday.length === 1 ? "" : "s"}" aria-label="${completedToday.length} tareas completadas" aria-hidden="true">${completedToday.length}</span>
            </div>
          </div>
        </div>
        <div class="task-list" data-completed-list="true" style="${completedCollapsed ? 'display:none' : ''}"></div>
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
      return [...el.board.querySelectorAll('.activity-card:not(.completed-card):not(.rescheduled-card)')];
    }

    function isDragging() {
      return Boolean(activeSectionDrag || activeTaskDrag);
    }

    function initSectionPointerDrag() {
      if (typeof sectionPointerCleanup === 'function') sectionPointerCleanup();
      const listeners = [];

      document.querySelectorAll('#board .activity-card:not(.completed-card):not(.rescheduled-card) .drag-card').forEach(handle => {
        const onPointerDown = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          if (activeSectionDrag) return;
          const card = handle.closest('.activity-card:not(.completed-card):not(.rescheduled-card)');
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
      const LONG_PRESS_ROW_MS = 430;
      const LONG_PRESS_HANDLE_MS = 220;
      const MOVE_CANCEL_PX = 8;

      document.querySelectorAll(".task-item:not(.completed-item)").forEach(item => {
        let pressTimer = null;
        let pressPointerId = null;
        let pressStartX = 0;
        let pressStartY = 0;
        let pressStarted = false;
        let pressType = "row";
        let pressPointerType = "mouse";

        const getContext = () => ({
          taskId: item.dataset.taskId || "",
          sourceCategoryId: item.closest(".task-list")?.dataset.categoryId || "",
          handle: item.querySelector(".drag-task") || item
        });

        const clearPress = () => {
          if (pressTimer !== null) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
          item.classList.remove("task-press-arming", "task-long-press-ready");
          pressPointerId = null;
          pressStarted = false;
          pressType = "row";
          pressPointerType = "mouse";
        };

        const beginDrag = () => {
          if (activeTaskDrag || pressPointerId === null) return;

          const pointerId = pressPointerId;
          const { taskId, sourceCategoryId, handle } = getContext();
          if (!taskId || !sourceCategoryId) {
            clearPress();
            return;
          }

          pressStarted = true;
          if (pressTimer !== null) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }

          item.classList.remove("task-press-arming");
          item.classList.add("task-long-press-ready");

          if (document.activeElement === item.querySelector(".task-input")) {
            document.activeElement.blur();
          }
          try { window.getSelection?.()?.removeAllRanges?.(); } catch (_) {}

          try { item.setPointerCapture?.(pointerId); } catch (_) {}

          const dragEvent = {
            pointerId,
            pointerType: pressPointerType,
            clientX: pressStartX,
            clientY: pressStartY,
            button: 0,
            preventDefault() {},
            stopPropagation() {}
          };

          startTaskPointerDrag(dragEvent, item, handle, taskId, sourceCategoryId);
          if (activeTaskDrag) {
            activeTaskDrag.pointerType = pressPointerType;
          }

          softHaptic(12);
        };

        const arm = (event, type) => {
          if (activeTaskDrag) return;
          if (event.isPrimary === false) return;
          if (event.button !== undefined && event.button !== 0) return;

          const target = event.target instanceof Element ? event.target : null;
          const interactive = target?.closest("button, a, select");
          if (interactive && !interactive.classList.contains("drag-task")) return;

          const { taskId, sourceCategoryId } = getContext();
          if (!taskId || !sourceCategoryId) return;

          clearPress();
          pressPointerId = event.pointerId;
          pressStartX = event.clientX;
          pressStartY = event.clientY;
          pressType = type;
          pressPointerType = event.pointerType || "mouse";
          item.classList.add("task-press-arming");

          /*
           * El navegador puede cancelar un gesto táctil para hacer scroll.
           * Solo anulamos el comportamiento por defecto cuando el gesto ya
           * está dirigido al asa o cuando estamos usando mouse/pen. En el
           * texto editable dejamos que el foco normal ocurra.
           */
          const onEditableText = Boolean(target?.closest(".task-input"));
          if (!onEditableText || pressType === "handle") {
            try { event.preventDefault(); } catch (_) {}
          }

          // No capturamos el puntero mientras el usuario edita o selecciona texto.
          // El pointer capture comienza solo cuando realmente arranca el arrastre.
          pressTimer = window.setTimeout(
            beginDrag,
            type === "handle" ? LONG_PRESS_HANDLE_MS : LONG_PRESS_ROW_MS
          );
        };

        const onPointerDown = event => {
          const target = event.target instanceof Element ? event.target : null;
          const onHandle = Boolean(target?.closest(".drag-task"));

          // El clic sobre el texto es edición, no inicio de arrastre.
          if (target?.closest(".task-input") && !onHandle) return;

          arm(event, onHandle ? "handle" : "row");
        };

        const onPointerMove = event => {
          if (activeTaskDrag) {
            if (event.pointerId === activeTaskDrag.pointerId) {
              onTaskPointerMove(event);
            }
            return;
          }

          if (event.pointerId !== pressPointerId || pressStarted) return;

          const distance = Math.hypot(
            event.clientX - pressStartX,
            event.clientY - pressStartY
          );

          if (distance > MOVE_CANCEL_PX) {
            clearPress();
          }
        };

        const onPointerUp = event => {
          if (activeTaskDrag && event.pointerId === activeTaskDrag.pointerId) {
            event.preventDefault();
            finishTaskPointerDrag(true);
            try { item.releasePointerCapture?.(event.pointerId); } catch (_) {}
            return;
          }
          if (event.pointerId === pressPointerId) {
            try { item.releasePointerCapture?.(event.pointerId); } catch (_) {}
            clearPress();
          }
        };

        const onPointerCancel = event => {
          if (activeTaskDrag && event.pointerId === activeTaskDrag.pointerId) {
            finishTaskPointerDrag(Boolean(activeTaskDrag.moved && activeTaskDrag.targetList));
            try { item.releasePointerCapture?.(event.pointerId); } catch (_) {}
            return;
          }
          if (event.pointerId === pressPointerId) clearPress();
        };

        const onContextMenu = event => {
          if (pressStarted || item.classList.contains("task-long-press-ready")) {
            event.preventDefault();
          }
        };

        const onDragStart = event => event.preventDefault();

        item.addEventListener("pointerdown", onPointerDown, { passive:false });
        item.addEventListener("pointermove", onPointerMove, { passive:false });
        item.addEventListener("pointerup", onPointerUp, { passive:false });
        item.addEventListener("pointercancel", onPointerCancel, { passive:false });
        item.addEventListener("contextmenu", onContextMenu);
        item.addEventListener("dragstart", onDragStart);

        listeners.push(() => {
          clearPress();
          item.removeEventListener("pointerdown", onPointerDown);
          item.removeEventListener("pointermove", onPointerMove);
          item.removeEventListener("pointerup", onPointerUp);
          item.removeEventListener("pointercancel", onPointerCancel);
          item.removeEventListener("contextmenu", onContextMenu);
          item.removeEventListener("dragstart", onDragStart);
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

      const sourceTitle = item.closest(".activity-card")?.querySelector(".activity-title")?.value?.trim() || "Fase";
      const chip = item.cloneNode(true);
      chip.classList.remove("task-drag-source");
      chip.classList.add("task-drag-preview");
      chip.removeAttribute("data-task-id");
      chip.querySelectorAll("[data-action]").forEach(node => node.removeAttribute("data-action"));
      chip.querySelectorAll("[title]").forEach(node => node.removeAttribute("title"));
      const previewInput = chip.querySelector(".task-input");
      if (previewInput) {
        previewInput.value = text;
        previewInput.readOnly = true;
      }
      document.body.appendChild(chip);

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
        lastBeforeTaskId: null,
        clientX: event.clientX,
        clientY: event.clientY,
        grabX: Math.min(rect.width * .20, 150),
        grabY: Math.min(34, Math.max(20, rect.height / 2)),
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        raf: 0
      };

      item.classList.add("task-drag-source");
      item.closest(".activity-card")?.classList.add("task-drag-active");
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
        `translate3d(${x}px, ${y}px, 0) rotate(-.18deg) scale(.995)`;
    }

    function findTaskDropList(clientX, clientY) {
      const elements = document.elementsFromPoint?.(clientX, clientY) || [];
      let list = elements.find(node => node?.matches?.(".task-list"));
      if (list) return list;

      const card = elements.find(node => node?.closest?.(".activity-card"));
      if (card) return card.closest(".activity-card")?.querySelector(".task-list") || null;

      // Fallback: nearest category card by vertical distance.
      const cards = [...document.querySelectorAll(".activity-card:not(.completed-card):not(.rescheduled-card)")];
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

      if (drag.targetList && drag.targetList !== list) {
        drag.targetList.classList.remove("task-drop-target");
        drag.targetList.closest('.activity-card')?.classList.remove('task-drop-target');
      }
      drag.targetList = list;
      drag.targetList.classList.add("task-drop-target");
      drag.targetList.closest('.activity-card')?.classList.add('task-drop-target');
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
      drag.targetList?.classList.remove("task-drop-target");
      drag.targetList?.closest('.activity-card')?.classList.remove('task-drop-target');
      drag.item.closest(".activity-card")?.classList.remove("task-drag-active");
      drag.item.classList.remove("task-drag-source", "task-long-press-ready", "task-press-arming");
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
      const ids = [...el.board.querySelectorAll(".activity-card:not(.completed-card):not(.rescheduled-card)")].map(card => card.dataset.categoryId);
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

    function calculateProductivityStreak() {
      const completedDates = new Set(
        state.completed
          .map(item => completedDateFor(item))
          .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
      );

      if (!completedDates.has(today())) return 0;

      let streak = 0;
      let cursor = today();
      for (let i = 0; i < 366; i++) {
        if (!completedDates.has(cursor)) break;
        streak++;
        const [y, m, d] = cursor.split('-').map(Number);
        const next = new Date(y, m - 1, d);
        next.setDate(next.getDate() - 1);
        cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      }
      return streak;
    }

    function openDailyProductivityReport() {
      if (!el.dailyProductivityContent) return;

      const stats = todayTaskStats();
      const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
      const streak = calculateProductivityStreak();
      const completedPct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
      const pendingPct = stats.total ? 100 - completedPct : 0;
      const activeCategories = state.categories.filter(cat =>
        cat.tasks.some(t => !t.draft && t.date === today()) ||
        state.completed.some(t => t.originCat === cat.id && completedDateFor(t) === today())
      ).length;

      const phaseRows = state.categories
        .map(cat => {
          const completed = state.completed.filter(t => t.originCat === cat.id && completedDateFor(t) === today()).length;
          const pending = cat.tasks.filter(t => !t.draft && t.text.trim() && t.date === today() && !isRepeatCompletedToday(t)).length;
          const deferred = cat.tasks.filter(t => isRescheduledFromToday(t, today())).length;
          const total = completed + pending + deferred;
          const phasePct = total ? Math.round((completed / total) * 100) : 0;
          return { cat, completed, pending, deferred, total, phasePct };
        })
        .filter(row => row.total > 0);

      const status = pct === 100 && stats.total > 0
        ? { label: 'Día completado', icon: 'check-circle-2', className: 'is-complete' }
        : pct >= 70
          ? { label: 'Buen avance', icon: 'trending-up', className: 'is-strong' }
          : pct >= 40
            ? { label: 'En progreso', icon: 'activity', className: 'is-progress' }
            : { label: 'En marcha', icon: 'sparkles', className: 'is-start' };

      let message = 'Empieza por una tarea concreta y convierte el siguiente paso en tu prioridad.';
      if (stats.total === 0) {
        message = 'Todavía no hay tareas programadas para hoy. Tu tablero está listo para organizar la jornada.';
      } else if (pct === 100) {
        message = 'Has completado todo lo programado para hoy. El cierre de la jornada está en tus manos. ✨';
      } else if (stats.overdue > 0) {
        message = `Hay ${stats.overdue} tarea${stats.overdue === 1 ? '' : 's'} atrasada${stats.overdue === 1 ? '' : 's'} que puede requerir una decisión desde Atrasadas.`;
      } else if (pct >= 70) {
        message = 'La mayor parte de tu trabajo de hoy ya está cerrada. Mantén el foco en el tramo final.';
      } else if (pct >= 40) {
        message = 'Ya existe avance real en la jornada. Continúa con una tarea a la vez para sostener el ritmo.';
      }

      el.dailyProductivityContent.innerHTML = `
        <div class="daily-report-shell">
          <section class="daily-report-hero ${status.className}">
            <div class="daily-report-orbit" style="--daily-pct:${pct}%">
              <div class="daily-report-ring"></div>
              <div class="daily-report-ring-core">
                <strong>${pct}%</strong>
                <span>cumplimiento</span>
              </div>
            </div>
            <div class="daily-report-hero-copy">
              <div class="daily-report-kicker"><i data-lucide="calendar-check-2"></i> ANÁLISIS DE HOY</div>
              <h3>Tu jornada, en perspectiva</h3>
              <p>${stats.completed} completadas de ${stats.total} tareas programadas para hoy.</p>
              <div class="daily-report-status ${status.className}"><i data-lucide="${status.icon}"></i><span>${status.label}</span></div>
              <div class="daily-report-mini-meta"><span>${escapeHTML(formatDateLong(today()))}</span><span>${activeCategories} fase${activeCategories === 1 ? '' : 's'} activa${activeCategories === 1 ? '' : 's'}</span></div>
            </div>
          </section>

          <section class="daily-report-metrics" aria-label="Indicadores de productividad">
            <article class="daily-report-metric metric-blue" style="--report-delay:.08s">
              <div class="daily-report-metric-icon"><i data-lucide="check-circle-2"></i></div>
              <div><small>Completadas</small><strong>${stats.completed}</strong><span>cerradas hoy</span></div>
            </article>
            <article class="daily-report-metric metric-orange" style="--report-delay:.15s">
              <div class="daily-report-metric-icon"><i data-lucide="clock-3"></i></div>
              <div><small>Pendientes</small><strong>${stats.pendingIncludingDeferred}</strong><span>${stats.deferred ? `${stats.deferred} reprogramada${stats.deferred === 1 ? '' : 's'}` : 'por cerrar'}</span></div>
            </article>
            <article class="daily-report-metric metric-red" style="--report-delay:.22s">
              <div class="daily-report-metric-icon"><i data-lucide="triangle-alert"></i></div>
              <div><small>Atrasadas</small><strong>${stats.overdue}</strong><span>de días anteriores</span></div>
            </article>
            <article class="daily-report-metric metric-purple" style="--report-delay:.29s">
              <div class="daily-report-metric-icon"><i data-lucide="flame"></i></div>
              <div><small>Racha</small><strong>${streak}</strong><span>${streak === 1 ? 'día activo' : 'días activos'}</span></div>
            </article>
          </section>

          <section class="daily-report-section daily-distribution" style="--report-delay:.35s">
            <div class="daily-section-head">
              <div><small>LECTURA DEL DÍA</small><h3>Distribución del trabajo</h3></div>
              <span>${stats.total} programadas</span>
            </div>
            <div class="daily-distribution-track" aria-label="Distribución de tareas completadas y pendientes">
              <span class="completed" style="width:${completedPct}%"></span>
              <span class="pending" style="width:${pendingPct}%"></span>
            </div>
            <div class="daily-distribution-legend">
              <span><i class="legend-dot completed"></i> Completadas <strong>${completedPct}%</strong></span>
              <span><i class="legend-dot pending"></i> Pendientes <strong>${pendingPct}%</strong></span>
            </div>
          </section>

          <section class="daily-report-section" style="--report-delay:.42s">
            <div class="daily-section-head">
              <div><small>DESGLOSE</small><h3>Progreso por fases</h3></div>
              <span>${phaseRows.length} con actividad</span>
            </div>
            <div class="daily-phase-list">
              ${phaseRows.length ? phaseRows.map(({cat, completed, pending, deferred, total, phasePct}, index) => `
                <div class="daily-phase-row" style="--phase-delay:${index * 55}ms">
                  <div class="daily-phase-row-head">
                    <div><span class="daily-phase-dot"></span><strong>${escapeHTML(cat.title || 'Sin nombre')}</strong></div>
                    <span>${phasePct}%</span>
                  </div>
                  <div class="daily-phase-track"><span style="width:${phasePct}%"></span></div>
                  <div class="daily-phase-meta"><span>${completed} completadas</span><span>${pending + deferred} pendientes${deferred ? ` · ${deferred} reprogramada${deferred === 1 ? '' : 's'}` : ''} · ${total} total</span></div>
                </div>`).join('') : '<div class="daily-report-empty"><i data-lucide="inbox"></i><span>No hay fases con trabajo programado para hoy.</span></div>'}
            </div>
          </section>

          <section class="daily-report-bottom daily-constancy-bottom" style="--report-delay:.49s">
            <article class="daily-insight-card daily-constancy-card">
              <div class="daily-streak-visual"><i data-lucide="flame"></i></div>
              <div>
                <small>CONSTANCIA</small>
                <strong>${streak} ${streak === 1 ? 'día' : 'días'}</strong>
                <p>${streak ? 'Tu racha está activa. Mantén el ritmo y protege el hábito de volver mañana.' : 'Tu constancia comienza con una tarea cerrada hoy. Da el primer paso y construye la racha.'}</p>
              </div>
            </article>
          </section>

          <section class="monthly-history-section">
            <div class="monthly-history-head">
              <div>
                <small>HISTORIAL</small>
                <h4>Progreso mes por mes</h4>
              </div>
              <div class="monthly-history-current">
                <strong>${escapeHTML(currentMonthLabel())}</strong>
                <span>${taskCountCompleted()} completadas</span>
              </div>
            </div>
            <div class="monthly-history-list">
              ${renderMonthlyProgressHistory()}
            </div>
          </section>

          <div class="daily-report-footer-note"><i data-lucide="info"></i> El análisis diario refleja hoy. El historial registra todas las tareas completadas por mes.</div>
        </div>
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
        t => !t.draft && t.text.trim() && t.date === today() && !isRepeatCompletedToday(t)
      ).length;

      const deferred = cat.tasks.filter(t => isRescheduledFromToday(t, today())).length;

      const overdue = cat.tasks.filter(
        t => !t.draft && t.text.trim() && t.date < today()
      ).length;

      const total = pending + completed + deferred;
      const pct = total ? Math.round((completed / total) * 100) : 0;

      let message = 'Esta fase todavía no tiene tareas para hoy.';
      if (total === 0 && overdue > 0) {
        message = `Hay ${overdue} tarea${overdue === 1 ? '' : 's'} atrasada${overdue === 1 ? '' : 's'} para revisar.`;
      } else if (total === 0) {
        message = 'Añade una tarea y comienza a avanzar.';
      } else if (pct === 100) {
        message = 'Todo lo programado para hoy está completado. 🎉';
      } else if (pct >= 70) {
        message = 'Vas muy bien. Queda poco para cerrar esta fase hoy.';
      } else if (pct >= 40) {
        message = 'Buen avance. Continúa con la siguiente tarea.';
      } else {
        message = 'Continúa con la siguiente tarea y mantén el avance.';
      }

      const pendingPct = total ? Math.round((pending / total) * 100) : 0;

      el.statsReportContent.innerHTML = `
        <div class="compact-report-shell" style="--compact-delay:0ms">
          <section class="compact-report-hero" style="--compact-delay:40ms">
            <div class="compact-report-ring" style="--compact-pct:${pct}%">
              <div class="compact-report-ring-core">
                <strong>${pct}%</strong>
                <span>hoy</span>
              </div>
            </div>
            <div class="compact-report-copy">
              <small>RESUMEN DE FASE</small>
              <h3>${escapeHTML(cat.title || 'Fase sin nombre')}</h3>
              <p>${completed} completadas · ${pending} pendientes${deferred ? ` · ${deferred} reprogramada${deferred === 1 ? '' : 's'}` : ''}${overdue ? ` · ${overdue} atrasada${overdue === 1 ? '' : 's'}` : ''}</p>
            </div>
          </section>

          <section class="compact-report-stats" aria-label="Resumen de tareas">
            <article class="compact-report-stat" style="--compact-delay:120ms"><span>Completadas</span><strong>${completed}</strong></article>
            <article class="compact-report-stat" style="--compact-delay:170ms"><span>Pendientes</span><strong>${pending + deferred}</strong></article>
            <article class="compact-report-stat" style="--compact-delay:220ms"><span>Atrasadas</span><strong>${overdue}</strong></article>
          </section>

          <section class="compact-report-progress" style="--compact-delay:270ms">
            <div class="compact-report-progress-head"><span>Progreso de hoy</span><strong>${pct}%</strong></div>
            <div class="compact-report-progress-track"><span style="--compact-target:${pct}%"></span></div>
          </section>

          <div class="compact-report-message" style="--compact-delay:340ms">${escapeHTML(message)}</div>
        </div>
      `;

      openModal('statsModal');
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
      const deferredToday = cat.tasks.filter(t => isRescheduledFromToday(t, today())).length;
      const todayTotal = completedToday + todayPending + deferredToday;
      const pct = todayTotal ? Math.round((completedToday / todayTotal) * 100) : 0;

      const pendingPill = card.querySelector('.card-meta .pill:first-child');
      const meta = card.querySelector('.card-meta');
      let rescheduledPill = card.querySelector('.rescheduled-pill');
      const percentPill = card.querySelector('.card-meta .pill:last-child');
      const fill = card.querySelector('.card-progress .progress-fill');
      const fraction = card.querySelector('.card-progress-value');

      if (pendingPill) pendingPill.textContent = `${visiblePending} pendiente${visiblePending === 1 ? '' : 's'}`;
      if (deferredToday && !rescheduledPill && meta) {
        rescheduledPill = document.createElement('span');
        rescheduledPill.className = 'pill rescheduled-pill';
        rescheduledPill.innerHTML = '<i data-lucide="sun"></i><span></span>';
        const ref = meta.querySelector('.pill.primary,.pill.success');
        meta.insertBefore(rescheduledPill, ref || null);
        refreshIcons();
      }
      if (rescheduledPill) {
        if (deferredToday) {
          rescheduledPill.querySelector('span').textContent = `${deferredToday} reprogramada${deferredToday === 1 ? '' : 's'}`;
          rescheduledPill.hidden = false;
        } else {
          rescheduledPill.hidden = true;
        }
      }
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

      const completedToday = state.completed.filter(task => completedDateFor(task) === today());

      if (!completedToday.length || activeTaskView === 'today') {
        if (card) card.remove();
        updateSummaryUI();
        return;
      }

      if (activeTaskView === 'completed' && !card) {
        buildCompletedCard(activeSearch.trim().toLowerCase());
        refreshIcons();
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

      for (const task of completedToday) {
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
      if (countPill) countPill.textContent = completedToday.length;

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
        // La tarea nueva entra directamente al DOM, así que debemos conectar
        // su asa de arrastre sin esperar a un render completo.
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
      const cards = [...el.board.querySelectorAll('.activity-card:not(.completed-card):not(.rescheduled-card)')];
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
      const cards = [...el.board.querySelectorAll('.activity-card:not(.completed-card):not(.rescheduled-card)')];
      cards.forEach((card, index) => {
        const up = card.querySelector('[data-action="move-category-up"]');
        const down = card.querySelector('[data-action="move-category-down"]');
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === cards.length - 1;
      });
    }

    function rescheduledTasks() {
      const now = today();
      const result = [];
      for (const cat of state.categories) {
        for (const task of cat.tasks || []) {
          if (!task || task.draft || !String(task.text || '').trim()) continue;
          if (task.rescheduled && task.date && task.date > now) {
            result.push({ ...task, originCat: cat.id, originTitle: cat.title });
          }
        }
      }
      return result.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.text).localeCompare(String(b.text), 'es'));
    }

    function isFullyRescheduledCategory(cat) {
      if (!cat || !Array.isArray(cat.tasks)) return false;
      const meaningful = cat.tasks.filter(task => !task?.draft && String(task?.text || '').trim());
      if (!meaningful.length) return false;
      const now = today();
      return meaningful.every(task =>
        Boolean(task.rescheduled) && Boolean(task.date) && task.date > now
      );
    }

    function buildRescheduledCard() {
      const tasks = rescheduledTasks();
      if (!tasks.length) return null;

      const card = document.createElement("article");
      card.className = "activity-card rescheduled-card" + (rescheduledCollapsed ? " is-collapsed" : "");
      card.dataset.rescheduledCard = "true";
      card.innerHTML =
        '<div class="card-head">' +
          '<div class="card-title-row">' +
            '<div class="rescheduled-card-icon" aria-hidden="true"><i data-lucide="calendar-clock"></i></div>' +
            '<div class="rescheduled-card-title"><strong>Tareas reprogramadas</strong><span>Reservadas para una fecha futura</span></div>' +
            '<div class="card-actions">' +
              '<button class="mini-btn category-toggle-btn rescheduled-toggle-btn" type="button" data-action="toggle-rescheduled" aria-expanded="' +
                (rescheduledCollapsed ? "false" : "true") +
                '" aria-label="' +
                (rescheduledCollapsed ? "Expandir tareas reprogramadas" : "Contraer tareas reprogramadas") +
                '" data-tooltip="' +
                (rescheduledCollapsed ? "Expandir tareas reprogramadas" : "Contraer tareas reprogramadas") +
                '">' + (rescheduledCollapsed ? "▼" : "▲") + '</button>' +
              '<span class="category-pending-count rescheduled-count" aria-hidden="true">' + tasks.length + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="card-meta"><span class="pill rescheduled-pill"><i data-lucide="calendar-clock"></i>' +
            tasks.length + ' programada' + (tasks.length === 1 ? "" : "s") +
          '</span><span class="pill neutral">Fuera de hoy</span></div>' +
        '</div>' +
        '<div class="task-list rescheduled-task-list" data-rescheduled-list="true" style="' +
          (rescheduledCollapsed ? "display:none" : "") + '"></div>';

      const list = card.querySelector("[data-rescheduled-list]");
      const fragment = document.createDocumentFragment();

      tasks.forEach((task, index) => {
        const row = document.createElement("div");
        row.className = "task-item rescheduled-task-item task-enter";
        row.dataset.taskId = task.id;
        row.style.setProperty("--rescheduled-delay", (index * 42) + "ms");
        row.innerHTML =
          '<div class="rescheduled-task-marker" aria-hidden="true"><i data-lucide="calendar-days"></i></div>' +
          '<textarea class="task-input" rows="1" maxlength="500" aria-label="Editar tarea reprogramada">' +
            escapeHTML(task.text) +
          '</textarea>' +
          '<div class="rescheduled-task-meta"><span>' +
            escapeHTML(task.originTitle || "Fase") +
            '</span><span>·</span><strong>Para ' +
            escapeHTML(formatDateLong(task.date)) +
          '</strong></div>' +
          '<div class="task-item-actions rescheduled-task-actions">' +
            '<button class="rescheduled-return-btn" type="button" data-rescheduled-action="today" data-task-id="' +
              escapeHTML(task.id) +
              '" data-tooltip="Volver a hoy" aria-label="Volver a hoy"><i data-lucide="calendar-check"></i></button>' +
            '<button class="delete-task-btn" type="button" data-action="delete-task" data-task-id="' +
              escapeHTML(task.id) +
              '" data-tooltip="Eliminar tarea" aria-label="Eliminar tarea"><i data-lucide="x"></i></button>' +
          '</div>';
        fragment.appendChild(row);
      });

      list.appendChild(fragment);
      return card;
    }

    function updateRescheduledCardUI() {
      const tasks = rescheduledTasks();
      const card = document.querySelector(".rescheduled-card");

      if (!tasks.length) {
        card?.remove();
        return;
      }

      if (!card) {
        if (activeTaskView !== "all") return;
        const completedCard = document.querySelector(".completed-card");
        const newCard = buildRescheduledCard();
        if (!newCard) return;
        if (completedCard) el.board.insertBefore(newCard, completedCard.nextSibling);
        else el.board.appendChild(newCard);
        refreshIcons();
        updateTaskHeights();
        applySearchFilter();
        return;
      }

      const list = card.querySelector("[data-rescheduled-list]");
      if (list) {
        const validIds = new Set(tasks.map(task => task.id));
        list.querySelectorAll(".rescheduled-task-item[data-task-id]").forEach(item => {
          if (!validIds.has(item.dataset.taskId)) item.remove();
        });
      }

      const count = card.querySelector(".rescheduled-count");
      if (count) count.textContent = String(tasks.length);

      const pill = card.querySelector(".rescheduled-pill");
      if (pill) pill.innerHTML =
        '<i data-lucide="calendar-clock"></i>' +
        tasks.length + ' programada' + (tasks.length === 1 ? "" : "s");

      refreshIcons();
      updateTaskHeights();
      applySearchFilter();
    }

    function updateRescheduledUI() {
      const tasks = rescheduledTasks();
      if (el.rescheduledCount) el.rescheduledCount.textContent = String(tasks.length);
      if (el.rescheduledBtn) {
        el.rescheduledBtn.setAttribute('aria-label', `Tareas reprogramadas: ${tasks.length}`);
        el.rescheduledBtn.dataset.tooltip = tasks.length
          ? `${tasks.length} tarea${tasks.length === 1 ? '' : 's'} reprogramada${tasks.length === 1 ? '' : 's'}`
          : 'Ver tareas reprogramadas';
        el.rescheduledBtn.removeAttribute('title');
      }
    }

    function renderRescheduledModal() {
      const tasks = rescheduledTasks();
      if (!el.rescheduledList) return;
      el.rescheduledList.innerHTML = '';

      if (!tasks.length) {
        el.rescheduledList.innerHTML = `
          <div class="rescheduled-empty-state" role="status" aria-live="polite">
            <div class="rescheduled-empty-icon"><i data-lucide="sun"></i></div>
            <strong>Aún no tienes tareas reprogramadas ✨</strong>
            <span>Cuando necesites mover una tarea para mañana, aparecerá aquí.</span>
          </div>
        `;
        refreshIcons();
        return;
      }

      const fragment = document.createDocumentFragment();
      tasks.forEach((task, index) => {
        const row = document.createElement('div');
        row.className = 'rescheduled-row';
        row.style.setProperty('--rescheduled-delay', `${index * 48}ms`);
        row.dataset.taskId = task.id;
        row.innerHTML = `
          <div class="rescheduled-row-icon"><i data-lucide="sun"></i></div>
          <div class="rescheduled-row-copy">
            <strong>${escapeHTML(task.text)}</strong>
            <span>${escapeHTML(task.originTitle || 'Fase')} · Para ${escapeHTML(formatDateLong(task.date))}</span>
          </div>
          <button class="rescheduled-row-action" type="button" data-rescheduled-action="today" data-task-id="${escapeHTML(task.id)}" title="Volver a hoy" aria-label="Volver a hoy">
            <i data-lucide="calendar-check"></i>
          </button>
        `;
        fragment.appendChild(row);
      });
      el.rescheduledList.appendChild(fragment);
      refreshIcons();
    }

    function rescheduleTaskToTomorrow(taskId) {
      if (!taskId) return;
      let task = null;
      let category = null;

      for (const cat of state.categories) {
        const match = (cat.tasks || []).find(t => t.id === taskId);
        if (match) { task = match; category = cat; break; }
      }
      if (!task || !category || task.draft) return;

      // Las tareas repetitivas conservan su calendario; no se altera la serie por un aplazamiento manual.
      if (task.repeat) {
        toast('Esta tarea usa una programación repetitiva. Edita sus días desde el botón de repetición.', 'repeat-2', 'info');
        return;
      }

      const originalDate = task.date || today();
      const tomorrow = addDays(today(), 1);
      task.rescheduled = true;
      task.rescheduledFrom = originalDate;
      task.rescheduledAt = new Date().toISOString();
      task.date = tomorrow;

      // Retirada inmediata de la fila visible: la tarea ya no pertenece al día actual.
      const visibleItem = document.querySelector(`.task-item[data-task-id="${cssEscapeSafe(task.id)}"]`);
      visibleItem?.remove();

      persistLocal();
      localDirty = true;
      syncCategoryPlacement(category.id);
      render();
      updateSummaryUI();
      scheduleSave('reprogramar tarea para mañana');
      softHaptic(18);
      playTaskySound('reschedule');
      toast(`Reprogramada para ${formatDateLong(task.date)}`, 'calendar-clock');
    }

    function restoreRescheduledTaskToToday(taskId) {
      if (!taskId) return;
      for (const cat of state.categories) {
        const task = (cat.tasks || []).find(t => t.id === taskId);
        if (!task) continue;
        task.date = today();
        task.rescheduled = false;
        task.rescheduledFrom = null;
        task.rescheduledAt = null;
        persistLocal();
        localDirty = true;
        render();
        updateSummaryUI();
        scheduleSave('volver tarea reprogramada a hoy');
        softHaptic(16);
        playTaskySound('restore');
        renderRescheduledModal();
        return;
      }
    }

    let pendingDeleteCategoryId = null;

    function requestDeleteCategory(categoryId) {
      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat) return;
      pendingDeleteCategoryId = categoryId;
      const title = document.getElementById('deleteCategoryTitle');
      const message = document.getElementById('deleteCategoryMessage');
      if (title) title.textContent = `¿Eliminar “${cat.title || 'esta fase'}”?`;
      if (message) {
        const count = cat.tasks.filter(t => !t.draft && String(t.text || '').trim()).length;
        message.textContent = count
          ? `Se eliminará la fase junto con ${count} tarea${count === 1 ? '' : 's'} asociada${count === 1 ? '' : 's'}. Esta acción no se puede deshacer.`
          : 'La fase no tiene tareas con contenido. Esta acción no se puede deshacer.';
      }
      openModal('deleteCategoryModal');
      refreshIcons();
    }

    function cancelDeleteCategory() {
      pendingDeleteCategoryId = null;
      closeModal('deleteCategoryModal');
    }

    function confirmDeleteCategory() {
      const categoryId = pendingDeleteCategoryId;
      pendingDeleteCategoryId = null;
      if (!categoryId) return;
      closeModal('deleteCategoryModal');
      deleteCategory(categoryId);
    }

    function deleteCategory(categoryId) {
      const cat = state.categories.find(c => c.id === categoryId);
      if (!cat) return;


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
      updateRescheduledCardUI();
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

    function nextRepeatDateOnOrAfter(fromDateStr, days) {
      const selected = new Set((days || []).map(Number));
      if (!selected.size) return fromDateStr;
      const parts = String(fromDateStr).split('-').map(Number);
      const base = new Date(parts[0], parts[1] - 1, parts[2]);
      for (let i = 0; i <= 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const isoDay = d.getDay() === 0 ? 7 : d.getDay();
        if (selected.has(isoDay)) {
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
      }
      return fromDateStr;
    }

    function isoWeekday(dateStr) {
      const parts = String(dateStr || '').split('-').map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const day = d.getDay();
      return day === 0 ? 7 : day;
    }

    function syncRepeatingTasksForToday() {
      const current = today();
      let changed = false;

      for (const category of state.categories) {
        for (const task of category.tasks || []) {
          if (!task?.repeat || task.draft || !String(task.text || '').trim()) continue;

          const normalizedDays = [...new Set(
            (Array.isArray(task.repeatDays) && task.repeatDays.length ? task.repeatDays : [1,2,3,4,5,6,7])
              .map(Number)
              .filter(n => n >= 1 && n <= 7)
          )].sort((a,b) => a-b);

          if (!normalizedDays.length) continue;
          if (JSON.stringify(task.repeatDays || []) !== JSON.stringify(normalizedDays)) {
            task.repeatDays = normalizedDays;
            changed = true;
          }

          const completedToday = Boolean(
            task.lastCompletedDate === current ||
            (task.lastCompletedAt && completedDateFor({ completedAt: task.lastCompletedAt }) === current)
          );

          // Una serie completada hoy debe quedarse apuntando a la próxima
          // ocurrencia. Nunca la hacemos reaparecer en la misma jornada.
          if (completedToday) {
            const scheduledDate = task.date;
            const validScheduled = /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate || '') && scheduledDate > current && normalizedDays.includes(isoWeekday(scheduledDate));
            if (!validScheduled) {
              const next = nextRepeatDate(current, normalizedDays);
              if (task.date !== next) {
                task.date = next;
                changed = true;
              }
            }
            continue;
          }

          const validDate = /^\d{4}-\d{2}-\d{2}$/.test(task.date || '');
          const dateIsSelectedDay = validDate && normalizedDays.includes(isoWeekday(task.date));
          const dateIsToday = task.date === current;
          const dateIsFuture = validDate && task.date > current;

          // La fecha almacenada es la próxima ocurrencia. Si quedó atrás,
          // si no pertenece al patrón o no existe, la reconstruimos desde
          // la fecha actual. Esto hace que lunes-viernes reaparezca también
          // al abrir Tasky el miércoles, aunque no se haya completado el lunes.
          if (!validDate || task.date < current || (dateIsToday && !dateIsSelectedDay) || (dateIsFuture && !dateIsSelectedDay)) {
            const next = nextRepeatDateOnOrAfter(current, normalizedDays);
            if (task.date !== next) {
              task.date = next;
              changed = true;
            }
          }
        }
      }

      return changed;
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

        // Al guardar una repetición, la serie siempre debe apuntar a una
        // fecha que realmente pertenezca a los días elegidos. Si la tarea
        // estaba atrasada, recuperamos el siguiente día válido desde hoy.
        const current = today();
        const validFutureDate = /^\d{4}-\d{2}-\d{2}$/.test(task.date || '') && task.date >= current
          ? task.date
          : current;
        task.date = nextRepeatDateOnOrAfter(validFutureDate, days);
        task.lastCompletedAt = null;
        task.lastCompletedDate = null;
      }

      const item = document.querySelector(`.task-item[data-task-id="${cssEscapeSafe(taskId)}"]`);
      const button = item?.querySelector('[data-action="toggle-repeat"]');
      if (button) {
        button.classList.toggle('active', task.repeat);
        const repeatTooltip = task.repeat ? 'Editar repetición' : 'Configurar repetición';
        button.dataset.tooltip = repeatTooltip;
        button.removeAttribute('title');
        button.setAttribute('aria-label', repeatTooltip);
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

    function todayCompletedCount() {
      return state.completed.filter(task => completedDateFor(task) === today()).length;
    }

    function maybeCelebrateCompletionMilestone() {
      const count = todayCompletedCount();
      if (!count || count % 5 !== 0) return;

      const key = `tasky_milestone_${today()}`;
      const shown = Number(safeStorage.getItem(key) || 0);
      if (shown >= count) return;

      safeStorage.setItem(key, String(count));
      window.setTimeout(() => {
        const modal = document.getElementById('milestoneModal');
        const countNode = document.getElementById('milestoneCount');
        const titleNode = document.getElementById('milestoneTitle');
        const textNode = document.getElementById('milestoneText');
        if (!modal) return;

        if (countNode) countNode.textContent = String(count);
        if (titleNode) titleNode.textContent = count === 5 ? '¡Primer logro del día!' : '¡Sigues imparable!';
        if (textNode) textNode.textContent = count === 5
          ? 'Ya completaste 5 tareas. Cada bloque cerrado hace que tu día avance de verdad.'
          : `Ya llevas ${count} tareas completadas hoy. Mantén el impulso y sigue con tu siguiente bloque.`;

        openModal('milestoneModal');
        refreshIcons();
        playTaskySound('milestone');
        softHaptic(36);
      }, 180);
    }

    function closeMilestoneModal() {
      closeModal('milestoneModal');
    }


    let planningCalendarSelected = "";
    let planningCalendarCursor = null;

    function isoDateLocal(date) {
      return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
    }

    function parseISODateLocal(iso) {
      const parts = String(iso || "").split("-").map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function nextWeekdayDate(fromDateStr, targetWeekday) {
      const current = isoWeekday(fromDateStr);
      if (!current) return addDays(fromDateStr, 1);
      let delta = (targetWeekday - current + 7) % 7;
      if (delta === 0) delta = 7;
      return addDays(fromDateStr, delta);
    }

    function updatePlanningSelectionUI() {
      const input = document.getElementById("rescheduleDateInput");
      const label = document.getElementById("planningSelectionLabel");
      const hint = document.getElementById("rescheduleDateHint");

      if (input) input.value = planningCalendarSelected || "";

      const formatted = planningCalendarSelected
        ? formatDateLong(planningCalendarSelected)
        : "Selecciona una fecha";

      if (label) label.textContent = formatted;
      if (hint) {
        hint.textContent = planningCalendarSelected
          ? "Se programará para " + formatted + "."
          : "Selecciona una fecha futura.";
      }
    }

    function renderPlanningCalendar() {
      const grid = document.getElementById("planningCalendarGrid");
      const monthLabel = document.getElementById("planningMonthLabel");
      const prevButton = document.querySelector('[data-action="planning-prev-month"]');
      if (!grid || !monthLabel) return;

      const minimumIso = addDays(today(), 1);
      const minimumDate = parseISODateLocal(minimumIso);
      if (!minimumDate) return;

      const cursor = planningCalendarCursor instanceof Date
        ? new Date(planningCalendarCursor.getFullYear(), planningCalendarCursor.getMonth(), 1)
        : new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1);

      planningCalendarCursor = cursor;

      const monthText = new Intl.DateTimeFormat("es-PE", {
        month: "long",
        year: "numeric"
      }).format(cursor);

      monthLabel.textContent = monthText.replace(/^./, function(char) {
        return char.toUpperCase();
      });

      const minimumMonth = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1);
      if (prevButton) {
        prevButton.disabled = cursor <= minimumMonth;
      }

      grid.innerHTML = "";

      const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const offset = (firstDay.getDay() + 6) % 7;
      const fragment = document.createDocumentFragment();

      for (let index = 0; index < 42; index++) {
        const date = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          1 - offset + index
        );

        const iso = isoDateLocal(date);
        const outsideMonth = date.getMonth() !== cursor.getMonth();
        const disabled = iso <= today() || outsideMonth;
        const selected = iso === planningCalendarSelected;

        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "planning-day" +
          (outsideMonth ? " is-outside" : "") +
          (disabled ? " is-disabled" : "") +
          (selected ? " is-selected" : "") +
          (iso === today() ? " is-today" : "");

        button.dataset.planningDate = iso;
        button.textContent = String(date.getDate());
        button.setAttribute("aria-label", formatDateLong(iso));

        if (disabled) {
          button.disabled = true;
        }

        if (selected) {
          button.setAttribute("aria-current", "date");
        }

        fragment.appendChild(button);
      }

      grid.appendChild(fragment);
      updatePlanningSelectionUI();
      refreshIcons();
    }

    function shiftPlanningCalendarMonth(delta) {
      const base = planningCalendarCursor instanceof Date
        ? new Date(planningCalendarCursor)
        : new Date();

      base.setMonth(base.getMonth() + Number(delta || 0), 1);

      const minimum = parseISODateLocal(addDays(today(), 1));
      if (!minimum) return;

      const minimumMonth = new Date(minimum.getFullYear(), minimum.getMonth(), 1);
      if (base < minimumMonth) return;

      planningCalendarCursor = base;
      renderPlanningCalendar();
      playTaskySound("click");
    }

    function selectPlanningDate(dateStr) {
      if (!dateStr) return;

      const current = today();
      if (dateStr <= current) {
        toast("Elige una fecha futura para reprogramar la tarea.", "calendar-alert", "error");
        return;
      }

      const date = parseISODateLocal(dateStr);
      if (!date) return;

      planningCalendarSelected = dateStr;
      planningCalendarCursor = new Date(date.getFullYear(), date.getMonth(), 1);

      renderPlanningCalendar();

      const selectedButton = document.querySelector(
        '[data-planning-date="' + cssEscapeSafe(dateStr) + '"]'
      );

      try {
        selectedButton?.focus({ preventScroll: true });
      } catch (_) {}

      playTaskySound("click");
    }

    function openRescheduleDateEditor(taskId) {
      if (!taskId) return;

      const found = state.categories
        .map(cat => ({ cat, task: (cat.tasks || []).find(t => t.id === taskId) }))
        .find(item => item.task);

      const task = found?.task;
      if (!task || task.draft) return;

      if (task.repeat) {
        toast("Esta tarea usa una programación repetitiva. Edita sus días desde el botón de repetición.", "repeat-2", "info");
        return;
      }

      const input = document.getElementById("rescheduleDateInput");
      const name = document.getElementById("rescheduleDateTaskName");
      const hidden = document.getElementById("rescheduleDateTaskId");
      if (!input || !name || !hidden) return;

      const minimum = addDays(today(), 1);
      const selected = task.date && task.date > today() ? task.date : minimum;

      hidden.value = taskId;
      input.min = minimum;
      input.value = selected;
      name.textContent = task.text?.trim() || "Tarea sin nombre";

      planningCalendarSelected = selected;
      const date = parseISODateLocal(selected);
      planningCalendarCursor = date
        ? new Date(date.getFullYear(), date.getMonth(), 1)
        : null;

      openModal("rescheduleDateModal");
      renderPlanningCalendar();
    }

    function saveRescheduleDate() {
      const hidden = document.getElementById("rescheduleDateTaskId");
      const input = document.getElementById("rescheduleDateInput");
      if (!hidden || !input) return;

      const taskId = hidden.value;
      const targetDate = planningCalendarSelected || input.value;

      if (!taskId || !targetDate || targetDate <= today()) {
        toast("Elige una fecha futura para reprogramar la tarea.", "calendar-alert", "error");
        return;
      }

      let task = null;
      let category = null;

      for (const cat of state.categories) {
        const match = (cat.tasks || []).find(t => t.id === taskId);
        if (match) {
          task = match;
          category = cat;
          break;
        }
      }

      if (!task || !category || task.draft) return;

      if (task.repeat) {
        closeModal("rescheduleDateModal");
        toast("Las tareas repetitivas se gestionan desde el botón de repetición.", "repeat-2", "info");
        return;
      }

      const originalDate = task.rescheduledFrom || task.date || today();

      task.rescheduled = true;
      task.rescheduledFrom = originalDate;
      task.rescheduledAt = new Date().toISOString();
      task.date = targetDate;

      closeModal("rescheduleDateModal");
      persistLocal();
      localDirty = true;
      syncCategoryPlacement(category.id);
      render();
      updateSummaryUI();
      updateRescheduledCardUI();
      scheduleSave("reprogramar tarea para otra fecha");

      softHaptic(18);
      playTaskySound("reschedule");
      toast("Reprogramada para " + formatDateLong(targetDate), "calendar-check");
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
          maybeCelebrateCompletionMilestone();
          return;
        }

        const [completedTask] = cat.tasks.splice(idx, 1);
        const archivedCompletedTask = {
          ...completedTask,
          rescheduled: false,
          rescheduledFrom: null,
          rescheduledAt: null,
          originCat: cat.id,
          originIndex: idx,
          completedAt: Date.now(),
          completedDate: today()
        };
        state.completed.unshift(archivedCompletedTask);

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
        maybeCelebrateCompletionMilestone();
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

    function discardEmptyDraftTask(taskId, { renderAfter = true, reason = "cancelar tarea vacía" } = {}) {
      if (!taskId) return false;

      for (const cat of state.categories) {
        const index = cat.tasks.findIndex(t => t.id === taskId);
        if (index === -1) continue;

        const task = cat.tasks[index];
        if (!task.draft || String(task.text || "").trim()) return false;

        cat.tasks.splice(index, 1);
        persistLocal();
        localDirty = true;
        updateSummaryUI();

        if (renderAfter) {
          render();
          refreshIcons();
          updateTaskHeights();
        }

        scheduleSave(reason, 0);
        playTaskySound("close");
        return true;
      }

      return false;
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
        event.preventDefault();
        const item = textarea.closest(".task-item");
        const taskId = item?.dataset.taskId;
        const value = String(textarea.value || "").trim();

        if (!value && taskId) {
          discardEmptyDraftTask(taskId, {
            renderAfter: true,
            reason: "cancelar nueva tarea vacía"
          });
          return;
        }

        textarea.blur();
      }
    }

    function applySearchFilter() {
      const query = activeSearch.trim().toLowerCase();
      const categoryCards = [
        ...document.querySelectorAll(
          "#board .activity-card:not(.completed-card):not(.rescheduled-card)"
        )
      ];
      let visibleCategories = 0;

      categoryCards.forEach(card => {
        const title =
          card.querySelector(".activity-title")?.value?.toLowerCase() || "";
        const items = [
          ...card.querySelectorAll(".task-item[data-task-id]")
        ];
        let categoryHasMatch = !query || title.includes(query);

        items.forEach(item => {
          const input = item.querySelector(".task-input");
          const text =
            String(input?.value ?? input?.textContent ?? "")
              .trim()
              .toLowerCase();
          const match =
            !query || title.includes(query) || text.includes(query);

          item.classList.toggle("search-hidden", !match);
          item.classList.toggle(
            "search-match",
            !!query && match && text.includes(query)
          );

          if (match) categoryHasMatch = true;
        });

        card.style.display = categoryHasMatch ? "" : "none";
        if (categoryHasMatch) visibleCategories++;
      });

      const completedCard =
        document.querySelector("#board .completed-card");
      let completedVisible = 0;

      if (completedCard) {
        const completedItems = [
          ...completedCard.querySelectorAll(".task-item[data-task-id]")
        ];

        completedItems.forEach(item => {
          const input = item.querySelector(".task-input");
          const text =
            String(input?.value ?? input?.textContent ?? "")
              .trim()
              .toLowerCase();
          const match = !query || text.includes(query);

          item.classList.toggle("search-hidden", !match);
          item.classList.toggle("search-match", !!query && match);

          if (match) completedVisible++;
        });

        completedCard.style.display =
          completedVisible > 0 || !query ? "" : "none";
      }

      const title = el.emptyState.querySelector("h2");
      const message = el.emptyState.querySelector("p");
      const completedIsVisible =
        !!completedCard &&
        completedCard.style.display !== "none" &&
        completedVisible > 0;

      // La vista Completadas tiene su propio estado vacío. No debemos
      // confundirla con "No encontramos coincidencias" solo porque no
      // haya tarjetas normales en el tablero.
      if (activeTaskView === "completed") {
        if (completedIsVisible) {
          el.emptyState.style.display = "none";
        } else {
          el.emptyState.style.display = "block";
          if (query) {
            title.textContent = "No encontramos coincidencias";
            message.textContent =
              "Prueba con otra palabra o limpia el buscador.";
          } else {
            title.textContent =
              "Todavía no hay tareas completadas ✨";
            message.textContent =
              "Cuando completes una tarea, aparecerá aquí.";
          }
        }
        return;
      }

      if (!state.categories.length) {
        el.emptyState.style.display = "block";
        title.textContent = "Tu tablero está limpio ✨";
        message.textContent =
          "Crea una fase para empezar. Puedes mover fases, reordenar tareas, pegar listas completas y copiar tu plan a WhatsApp.";
        return;
      }

      if (query && visibleCategories === 0 && !completedIsVisible) {
        el.emptyState.style.display = "block";
        title.textContent = "No encontramos coincidencias";
        message.textContent =
          "Prueba con otra palabra o limpia el buscador.";
      } else {
        el.emptyState.style.display = "none";
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

    let overdueSelectedTaskIds = new Set();

    function syncOverdueSelection(tasks) {
      const validIds = new Set((tasks || []).map(task => task.id));
      overdueSelectedTaskIds = new Set(
        [...overdueSelectedTaskIds].filter(id => validIds.has(id))
      );
    }

    function updateOverdueBulkControls(tasks = overdueTasks()) {
      const total = tasks.length;
      const selected = tasks.filter(task => overdueSelectedTaskIds.has(task.id)).length;
      const selectAll = document.getElementById('overdueSelectAll');
      const selectedLabel = document.getElementById('overdueSelectedCount');
      const restoreSelected = document.getElementById('restoreSelectedOverdueBtn');

      if (selectAll) {
        selectAll.checked = total > 0 && selected === total;
        selectAll.indeterminate = selected > 0 && selected < total;
        selectAll.disabled = total === 0;
      }

      if (selectedLabel) {
        selectedLabel.textContent = selected === 0
          ? 'Ninguna seleccionada'
          : `${selected} seleccionada${selected === 1 ? '' : 's'}`;
      }

      if (restoreSelected) {
        restoreSelected.disabled = selected === 0;
        restoreSelected.setAttribute('aria-disabled', selected === 0 ? 'true' : 'false');
      }
    }

    function setOverdueTaskSelected(taskId, selected) {
      if (!taskId) return;
      if (selected) overdueSelectedTaskIds.add(taskId);
      else overdueSelectedTaskIds.delete(taskId);

      const row = document.querySelector(`.overdue-row[data-task-id="${cssEscapeSafe(taskId)}"]`);
      if (row) row.classList.toggle('is-selected', selected);
      updateOverdueBulkControls();
    }

    function toggleAllOverdueTasks(selected) {
      const tasks = overdueTasks();
      overdueSelectedTaskIds = selected
        ? new Set(tasks.map(task => task.id))
        : new Set();
      renderOverdueModal();
    }

    function restoreOverdueToToday(taskIds) {
      const selectedIds = new Set((taskIds || []).filter(Boolean));
      if (!selectedIds.size) return;

      let changed = 0;
      for (const cat of state.categories) {
        for (const task of cat.tasks || []) {
          if (selectedIds.has(task.id) && !task.draft && String(task.text || '').trim() && task.date < today()) {
            task.date = today();
            changed++;
          }
        }
      }

      overdueSelectedTaskIds.clear();
      if (!changed) {
        renderOverdueModal();
        return;
      }

      persistLocal();
      localDirty = true;
      render();
      updateSummaryUI();
      updateTaskHeights();
      scheduleSave(changed === 1 ? 'restablecer atrasada' : 'restablecer varias atrasadas');
      softHaptic(22);
      playTaskySound('restore');
      toast(
        changed === 1
          ? 'Tarea restablecida para hoy'
          : `${changed} tareas restablecidas para hoy`,
        'calendar-check'
      );

      renderOverdueModal();
    }

    function renderOverdueModal() {
      const tasks = overdueTasks();
      syncOverdueSelection(tasks);
      el.overdueList.innerHTML = "";

      if (!tasks.length) {
        el.overdueList.innerHTML = `
          <div class="overdue-empty-state" role="status" aria-live="polite">
            <div class="overdue-empty-icon"><i data-lucide="check-check"></i></div>
            <strong>No tienes tareas atrasadas 🎉</strong>
            <span>Todo está al día. Puedes continuar con tu plan.</span>
          </div>
        `;
        refreshIcons();
        updateOverdueBulkControls(tasks);
        return;
      }

      const selectedCount = tasks.filter(task => overdueSelectedTaskIds.has(task.id)).length;

      const header = document.createElement('div');
      header.className = 'overdue-bulk-toolbar';
      header.innerHTML = `
        <label class="overdue-select-all">
          <input id="overdueSelectAll" type="checkbox" ${selectedCount === tasks.length ? 'checked' : ''} aria-label="Seleccionar todas las tareas atrasadas">
          <span>Seleccionar todas</span>
        </label>
        <span id="overdueSelectedCount" class="overdue-selected-count">${selectedCount ? `${selectedCount} seleccionada${selectedCount === 1 ? '' : 's'}` : 'Ninguna seleccionada'}</span>
        <div class="overdue-bulk-buttons">
          <button id="restoreSelectedOverdueBtn" class="soft-btn overdue-restore-selected" type="button" ${selectedCount ? '' : 'disabled'} data-overdue-action="restore-selected" aria-disabled="${selectedCount ? 'false' : 'true'}">
            <i data-lucide="rotate-ccw"></i><span>Restablecer seleccionadas</span>
          </button>
          <button class="soft-btn overdue-restore-all" type="button" data-overdue-action="restore-all">
            <i data-lucide="check-check"></i><span>Restablecer todas</span>
          </button>
        </div>
      `;
      el.overdueList.appendChild(header);

      for (const task of tasks) {
        const selected = overdueSelectedTaskIds.has(task.id);
        const row = document.createElement("div");
        row.className = `overdue-row${selected ? ' is-selected' : ''}`;
        row.dataset.taskId = task.id;
        row.innerHTML = `
          <label class="overdue-check">
            <input type="checkbox" class="overdue-task-check" data-overdue-action="select" data-task-id="${escapeHTML(task.id)}" ${selected ? 'checked' : ''} aria-label="Seleccionar ${escapeHTML(task.text)}">
          </label>
          <div class="overdue-row-copy">
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
      updateOverdueBulkControls(tasks);
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

        const localTotalBeforeWrite = stateStats(state).total;
        const remoteTotalBeforeWrite = stateStats(liveRemote).total;
        const suspiciousEmptyRemoteBeforeWrite =
          !allowDestructive &&
          localTotalBeforeWrite > 0 &&
          remoteTotalBeforeWrite === 0 &&
          liveUpdatedBy &&
          liveUpdatedBy !== deviceId;

        if (suspiciousEmptyRemoteBeforeWrite) {
          pendingRemoteState = liveRemote;
          warnProtectedRemote(
            liveHash,
            'Se bloqueó un estado remoto vacío para proteger tus tareas locales.'
          );
          saveSafetyBackup('estado remoto vacío bloqueado', state);
          return;
        }

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
          if (syncRepeatingTasksForToday()) {
            persistLocal();
            localDirty = true;
          }
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

        const recovered = restoreBestRecoveryState("recuperación por documento remoto vacío");
        if (recovered) {
          render();
          updateSummaryUI();
          hideLoading();
          setTimeout(() => saveCloud("restaurar respaldo recuperado"), 120);
          toast("Se recuperaron tus tareas desde un respaldo de seguridad.", "shield-check", "success");
          return;
        }

        state = defaultState();
        render();
        hideLoading();
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

      if (stateStats(remote).total === 0) {
        const recovered = restoreBestRecoveryState("estado remoto vacío protegido");
        if (recovered) {
          render();
          updateSummaryUI();
          hideLoading();
          scheduleSave("restaurar respaldo ante estado remoto vacío", 0);
          toast("Se protegieron tus datos y se restauró el respaldo más completo.", "shield-check", "success");
          return;
        }
      }

      state = remote;
      const repeatChanged = syncRepeatingTasksForToday();
      persistLocal();
      if (repeatChanged) localDirty = true;
      saveSafetyBackup('sincronización remota aceptada');
      lastSavedHash = hash({ categories: state.categories, completed: state.completed });
      lastConfirmedRemoteHash = remoteHash;
      lastConfirmedRemoteUpdatedBy = remoteUpdatedBy;
      pendingRemoteState = null;
      render();
      if (repeatChanged) scheduleSave('normalizar tareas repetitivas', 0);
      setSyncStatus("online", repeatChanged ? "Actualizando repetición…" : "Sincronizado");
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
      const repeatChanged = syncRepeatingTasksForToday();
      persistLocal();
      if (repeatChanged) localDirty = true;
      saveSafetyBackup('sincronización diferida aceptada');
      lastSavedHash = hash({ categories: state.categories, completed: state.completed });
      lastConfirmedRemoteHash = remoteHash;
      render();
      if (repeatChanged) scheduleSave('normalizar tareas repetitivas', 0);
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

    let pomodoroDurationMinutes = 25;
    let pomodoroSeconds = pomodoroDurationMinutes * 60;
    let pomodoroRunning = false;
    let pomodoroTimer = null;

    function setPomodoroIcon(id, name) {
      const node = document.getElementById(id);
      if (!node) return;
      const svg = node.matches('svg') ? node : node.querySelector?.('svg');
      if (svg) {
        svg.innerHTML = LOCAL_ICON_SVG[name] || LOCAL_ICON_SVG.timer || LOCAL_ICON_SVG.plus;
        return;
      }
      node.setAttribute('data-lucide', name);
      refreshIcons();
    }

    function setPomodoroDockVisible(visible) {
      const dock = document.getElementById('pomodoroDock');
      if (!dock) return;
      dock.hidden = !visible;
      dock.classList.toggle('is-visible', visible);
    }

    function paintPomodoro() {
      const formatted = `${String(Math.floor(pomodoroSeconds / 60)).padStart(2, '0')}:${String(pomodoroSeconds % 60).padStart(2, '0')}`;
      const node = document.getElementById('pomodoro-timer');
      const modalNode = document.getElementById('pomodoro-modal-timer');
      const dockNode = document.getElementById('pomodoro-dock-timer');
      if (node) node.textContent = formatted;
      if (modalNode) modalNode.textContent = formatted;
      if (dockNode) dockNode.textContent = formatted;

      const durationInput = document.getElementById('pomodoro-duration');
      const durationValue = document.getElementById('pomodoro-duration-value');
      if (durationInput) {
        durationInput.value = String(pomodoroDurationMinutes);
        durationInput.disabled = pomodoroRunning;
        const ratio = Math.max(0, Math.min(1, (pomodoroDurationMinutes - 1) / 59));
        durationInput.style.background = `linear-gradient(90deg,#0A84FF 0%,#5856D6 ${Math.max(8, ratio * 100)}%,#D8D9E2 ${Math.max(8, ratio * 100)}%,#D8D9E2 100%)`;
      }
      if (durationValue) durationValue.textContent = String(pomodoroDurationMinutes);

      setPomodoroIcon('pomo-icon', pomodoroRunning ? 'pause' : 'timer');
      setPomodoroIcon('pomodoro-modal-icon', pomodoroRunning ? 'pause' : 'play');
      setPomodoroIcon('pomodoro-dock-toggle', pomodoroRunning ? 'pause' : 'play');

      const modalBtn = document.getElementById('pomodoro-modal-toggle');
      if (modalBtn) {
        const label = modalBtn.querySelector('span');
        if (label) label.textContent = pomodoroRunning ? 'Pausar' : 'Iniciar';
      }

      const dockState = document.getElementById('pomodoro-dock-state');
      if (dockState) dockState.textContent = pomodoroRunning ? 'Sesión en curso' : 'Sesión en pausa';
      const dockToggle = document.getElementById('pomodoro-dock-toggle');
      if (dockToggle) dockToggle.setAttribute('aria-label', pomodoroRunning ? 'Pausar Pomodoro' : 'Continuar Pomodoro');

      const stateLabel = document.getElementById('pomo-session-label');
      if (stateLabel) stateLabel.textContent = pomodoroRunning ? 'Sesión en curso' : `${pomodoroDurationMinutes} min configurados`;

      const button = document.getElementById('pomo-toggle-btn');
      if (button) button.setAttribute('aria-label', pomodoroRunning ? 'Pomodoro en curso' : 'Abrir Pomodoro');

      const modalState = document.getElementById('pomo-modal-state');
      if (modalState) {
        modalState.textContent = pomodoroRunning
          ? 'Sesión en curso · puedes seguir usando Tasky mientras el contador avanza.'
          : (pomodoroSeconds < pomodoroDurationMinutes * 60 ? 'Sesión en pausa.' : `Listo para una sesión de ${pomodoroDurationMinutes} minutos.`);
      }

      if (pomodoroRunning) setPomodoroDockVisible(true);
      refreshIcons();
    }

    function setPomodoroDuration(minutes) {
      if (pomodoroRunning) return;
      const value = Math.max(1, Math.min(60, Number(minutes) || 25));
      pomodoroDurationMinutes = value;
      pomodoroSeconds = value * 60;
      paintPomodoro();
    }

    function togglePomodoro() {
      pomodoroRunning = !pomodoroRunning;
      clearInterval(pomodoroTimer);
      if (pomodoroRunning) {
        setPomodoroDockVisible(true);
        closeModal('pomodoroModal');
        pomodoroTimer = window.setInterval(() => {
          if (pomodoroSeconds <= 1) {
            pomodoroSeconds = 0;
            pomodoroRunning = false;
            clearInterval(pomodoroTimer);
            playTaskySound('complete');
            toast('Sesión de Pomodoro completada', 'check');
                return;
          }
          pomodoroSeconds -= 1;
          paintPomodoro();
        }, 1000);
      }
      paintPomodoro();
      playTaskySound('toggle');
    }

    function resetPomodoro() {
      pomodoroRunning = false;
      clearInterval(pomodoroTimer);
      pomodoroSeconds = pomodoroDurationMinutes * 60;
      setPomodoroDockVisible(false);
      paintPomodoro();
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
        if (target.matches("#rescheduleDateInput")) {
          if (target.value) selectPlanningDate(target.value);
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


        if (event.key === "Escape") {
          const openModal = document.querySelector(".modal-backdrop.open");
          if (openModal) {
            event.preventDefault();
            if (openModal.id === 'deleteCategoryModal') pendingDeleteCategoryId = null;
            closeModal(openModal.id);
            playTaskySound('close');
            return;
          }

          if (document.activeElement === el.searchInput || activeSearch.trim()) {
            event.preventDefault();
            activeSearch = "";
            el.searchInput.value = "";
            el.searchInput.blur();
            applySearchFilter();
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

        const planningDateControl = event.target.closest("[data-planning-date]");
        if (planningDateControl && !planningDateControl.disabled) {
          selectPlanningDate(planningDateControl.dataset.planningDate);
          return;
        }

        const planningShortcut = event.target.closest("[data-planning-shortcut]");
        if (planningShortcut) {
          const shortcut = planningShortcut.dataset.planningShortcut;
          if (shortcut === "tomorrow") {
            selectPlanningDate(addDays(today(), 1));
          } else if (shortcut === "monday") {
            selectPlanningDate(nextWeekdayDate(today(), 1));
          }
          return;
        }

        const action = event.target.closest("[data-action]")?.dataset.action;

        if (action === "planning-prev-month") {
          shiftPlanningCalendarMonth(-1);
          return;
        }

        if (action === "planning-next-month") {
          shiftPlanningCalendarMonth(1);
          return;
        }



        if (action === "planning-prev-month") {
          shiftPlanningCalendarMonth(-1);
          return;
        }

        if (action === "planning-next-month") {
          shiftPlanningCalendarMonth(1);
          return;
        }

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

        if (action === "toggle-completed") {
          const card = event.target.closest('.completed-card');
          if (!card) return;

          completedCollapsed = !completedCollapsed;
          safeStorage.setItem(COMPLETED_COLLAPSED_KEY, completedCollapsed ? '1' : '0');
          card.classList.toggle('is-collapsed', completedCollapsed);
          const list = card.querySelector('.task-list');
          const button = card.querySelector('.completed-toggle-btn');
          if (list) list.style.display = completedCollapsed ? 'none' : '';
          if (button) {
            button.textContent = completedCollapsed ? '▼' : '▲';
            button.setAttribute('aria-expanded', completedCollapsed ? 'false' : 'true');
            const completedTooltip = completedCollapsed ? 'Expandir completadas' : 'Contraer completadas';
            button.dataset.tooltip = completedTooltip;
            button.removeAttribute('title');
            button.setAttribute('aria-label', completedTooltip);
          }
          playTaskySound('click');
          softHaptic(10);
          return;
        }

        if (action === "toggle-rescheduled") {
          const card = event.target.closest('.rescheduled-card');
          if (!card) return;

          rescheduledCollapsed = !rescheduledCollapsed;
          safeStorage.setItem(RESCHEDULED_COLLAPSED_KEY, rescheduledCollapsed ? '1' : '0');
          card.classList.toggle('is-collapsed', rescheduledCollapsed);
          const list = card.querySelector('[data-rescheduled-list]');
          const button = card.querySelector('.rescheduled-toggle-btn');

          if (list) list.style.display = rescheduledCollapsed ? 'none' : '';
          if (button) {
            const tooltip = rescheduledCollapsed ? 'Expandir tareas reprogramadas' : 'Contraer tareas reprogramadas';
            button.textContent = rescheduledCollapsed ? '▼' : '▲';
            button.setAttribute('aria-expanded', rescheduledCollapsed ? 'false' : 'true');
            button.dataset.tooltip = tooltip;
            button.removeAttribute('title');
            button.setAttribute('aria-label', tooltip);
          }

          playTaskySound('click');
          softHaptic(10);
          return;
        }

        if (action === "toggle-category") {
          const button = event.target.closest('[data-action="toggle-category"]');
          const card = button?.closest("[data-category-id]");
          const category = state.categories.find(cat => cat.id === card?.dataset.categoryId);
          if (!category) return;

          category.collapsed = !Boolean(category.collapsed);
          persistLocal();
          localDirty = true;

          const list = card.querySelector('.task-list');
          const progress = card.querySelector('.card-progress');
          const addTaskButton = card.querySelector('.add-task');
          card.classList.toggle('is-collapsed', category.collapsed);
          [list, progress, addTaskButton].forEach(node => {
            if (node) node.style.display = category.collapsed ? 'none' : '';
          });
          button.classList.toggle('is-collapsed', category.collapsed);
          button.setAttribute('aria-expanded', category.collapsed ? 'false' : 'true');
          const categoryTooltip = category.collapsed ? 'Expandir fase' : 'Contraer fase';
          button.dataset.tooltip = categoryTooltip;
          button.removeAttribute('title');
          button.setAttribute('aria-label', categoryTooltip);
          button.textContent = category.collapsed ? '▼' : '▲';
          scheduleSave(category.collapsed ? "contraer fase" : "expandir fase");
          softHaptic(10);
          playTaskySound('click');
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
          requestDeleteCategory(card?.dataset.categoryId);
          return;
        }

        if (action === "confirm-delete-category") {
          confirmDeleteCategory();
          return;
        }

        if (action === "cancel-delete-category") {
          cancelDeleteCategory();
          return;
        }

        if (action === "reschedule-tomorrow") {
          const item = event.target.closest("[data-task-id]");
          rescheduleTaskToTomorrow(item?.dataset.taskId);
          return;
        }

        if (action === "reschedule-date") {
          const item = event.target.closest("[data-task-id]");
          openRescheduleDateEditor(item?.dataset.taskId);
          return;
        }

        if (action === "save-reschedule-date") {
          saveRescheduleDate();
          return;
        }

        if (action === "close-milestone") {
          closeMilestoneModal();
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

        if (event.target.closest("#rescheduledBtn")) {
          renderRescheduledModal();
          openModal("rescheduledModal");
          return;
        }

        const rescheduledControl = event.target.closest("[data-rescheduled-action]");
        const rescheduledAction = rescheduledControl?.dataset.rescheduledAction;
        const rescheduledTaskId = rescheduledControl?.dataset.taskId;
        if (rescheduledAction === "today") {
          restoreRescheduledTaskToToday(rescheduledTaskId);
          return;
        }

        const overdueControl = event.target.closest("[data-overdue-action]");
        const overdueAction = overdueControl?.dataset.overdueAction;
        const overdueTaskId = overdueControl?.dataset.taskId;

        if (overdueAction === "select") {
          setOverdueTaskSelected(overdueTaskId, Boolean(overdueControl.checked));
          return;
        }

        if (overdueAction === "restore-selected") {
          restoreOverdueToToday([...overdueSelectedTaskIds]);
          return;
        }

        if (overdueAction === "restore-all") {
          restoreOverdueToToday(overdueTasks().map(task => task.id));
          return;
        }

        if (overdueAction === "today") {
          moveOverdueToToday(overdueTaskId);
          return;
        }

        if (overdueAction === "delete") {
          deleteTask(overdueTaskId);
          renderOverdueModal();
          return;
        }

        if (event.target?.id === 'overdueSelectAll') {
          toggleAllOverdueTasks(Boolean(event.target.checked));
          return;
        }

        const closeId = event.target.closest("[data-close-modal]")?.dataset.closeModal;
        if (closeId) {
          if (closeId === 'deleteCategoryModal') pendingDeleteCategoryId = null;
          closeModal(closeId);
        }

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
          if (taskId) {
            const text = String(event.target.value || "");

            // Las tareas nuevas permanecen solo si ya contienen algún contenido.
            // Si el usuario sale dejando el borrador completamente vacío, se descarta.
            if (!text.trim()) {
              if (discardEmptyDraftTask(taskId, { renderAfter: true, reason: "descartar borrador vacío" })) {
                flushPendingRemote();
                return;
              }
            }

            updateTask(taskId, text);
            persistLocal();
            localDirty = true;
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

      document.getElementById('allTaskTab')?.addEventListener('click', () => setTaskView('all'));
      document.getElementById('todayTaskTab')?.addEventListener('click', () => setTaskView('today'));
      document.getElementById('completedTaskTab')?.addEventListener('click', () => setTaskView('completed'));


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
          if (event.target.id === 'deleteCategoryModal') pendingDeleteCategoryId = null;
          event.target.classList.remove("open");
          playTaskySound('close');
        }
      });


      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          persistLocal();
          if (localDirty) saveCloud("visibilitychange");
          return;
        }

        if (document.visibilityState === "visible") {
          const repeatChanged = syncRepeatingTasksForToday();
          if (repeatChanged) {
            persistLocal();
            localDirty = true;
            render();
            scheduleSave("actualizar repetición por cambio de día", 0);
          }
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

    // Biblioteca integrada para aportar variedad incluso cuando quotes.json
    // no esté disponible. Se mezcla con las frases remotas y se eliminan duplicados.
    const BUILTIN_MOTIVATIONAL_QUOTES = [
      { text: "No es que tengamos poco tiempo, sino que perdemos mucho.", author: "Séneca" },
      { text: "La vida es larga si sabes utilizarla.", author: "Séneca" },
      { text: "A menudo sufrimos más en la imaginación que en la realidad.", author: "Séneca" },
      { text: "No son las cosas las que nos perturban, sino nuestros juicios sobre ellas.", author: "Epicteto" },
      { text: "El impedimento a la acción impulsa la acción.", author: "Marco Aurelio" },
      { text: "La felicidad de tu vida depende de la calidad de tus pensamientos.", author: "Marco Aurelio" },
      { text: "Tienes poder sobre tu mente, no sobre los acontecimientos externos. Date cuenta de esto y encontrarás fuerza.", author: "Marco Aurelio" },
      { text: "La calidad de tus pensamientos determina la calidad de tu vida.", author: "Marco Aurelio" },
      { text: "La mejor manera de empezar es dejar de hablar y comenzar a hacer.", author: "Walt Disney" },
      { text: "El futuro depende de lo que hagamos en el presente.", author: "Mahatma Gandhi" },
      { text: "Un viaje de mil millas comienza con un solo paso.", author: "Lao-Tse" },
      { text: "La vida es como montar en bicicleta. Para mantener el equilibrio, debes seguir moviéndote.", author: "Albert Einstein" },
      { text: "Aprende del ayer, vive para hoy, espera el mañana.", author: "Albert Einstein" },
      { text: "El único modo de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
      { text: "Bien hecho es mejor que bien dicho.", author: "Benjamin Franklin" },
      { text: "Haz lo que puedas, con lo que tengas, donde estés.", author: "Theodore Roosevelt" },
      { text: "El futuro pertenece a quienes creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" },
      { text: "Da el primer paso con fe. No necesitas ver toda la escalera, solo el primer paso.", author: "Martin Luther King Jr." },
      { text: "Siempre parece imposible hasta que se hace.", author: "Nelson Mandela" },
      { text: "La vida examinada no merece ser vivida.", author: "Sócrates" },
      { text: "Sé fiel a ti mismo.", author: "William Shakespeare" },
      { text: "Mientras aplazamos, la vida pasa.", author: "Séneca" },
      { text: "Si no sabes hacia qué puerto navegas, ningún viento es favorable.", author: "Séneca" },
      { text: "Las dificultades fortalecen la mente, como el trabajo fortalece el cuerpo.", author: "Séneca" }
    ];

    const CLEAN_BUILTIN_MOTIVATIONAL_QUOTES =
      normalizeQuoteList(BUILTIN_MOTIVATIONAL_QUOTES);

    const QUOTE_SOURCE = "quotes.json";
    const QUOTE_CACHE_KEY = "tasky_quotes_cache_v108";
    const QUOTE_HISTORY_KEY = "tasky_quote_history_v108";
    const QUOTE_INTERVAL_MS = 60 * 1000;
    const QUOTE_HISTORY_DAYS = 60;
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

        // Nunca mostramos atribuciones internas de la aplicación.
        // Esto también filtra restos antiguos que puedan venir de quotes.json,
        // Cache Storage o datos locales.
        const normalizedAuthor = author
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase();

        if (normalizedAuthor === "tasky" || normalizedAuthor === "tasky app" || normalizedAuthor === "tasky-app" || normalizedAuthor === "reflexion" || normalizedAuthor === "reflexión") {
          continue;
        }

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

      const safeQuote =
        normalizeQuoteList([quote])[0];

      if (!safeQuote) {
        return false;
      }

      // Frase y autor se actualizan juntos.
      node.textContent = safeQuote.text;
      authorNode.textContent =
        safeQuote.author;

      node.classList.remove("is-loading", "is-error", "is-changing");

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
      quoteTimer = null;

      if (!quoteLibraryReady || MOTIVATIONAL_QUOTES.length < 2) return;
      if (document.hidden) return;

      quoteTimer = window.setInterval(() => {
        if (document.hidden) return;
        updateMotivationalQuote(false);
      }, QUOTE_INTERVAL_MS);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInterval(quoteTimer);
        quoteTimer = null;
        return;
      }

      if (quoteLibraryReady && MOTIVATIONAL_QUOTES.length > 1) {
        updateMotivationalQuote(false);
        startQuoteRotation();
      }
    });

    function initMotivationalQuotesImmediate() {
      // Garantiza contenido visible sin depender de Firebase, Cache Storage ni red.
      const localBuiltIns = CLEAN_BUILTIN_MOTIVATIONAL_QUOTES;
      if (!localBuiltIns.length) return false;

      MOTIVATIONAL_QUOTES = localBuiltIns;
      quoteLibraryReady = true;
      quoteRotationSeed = createQuoteSeed();
      quoteCurrentIndex = -1;

      const rendered = updateMotivationalQuote(true);
      startQuoteRotation();
      return rendered;
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

      const builtInQuotes =
        normalizeQuoteList(BUILTIN_MOTIVATIONAL_QUOTES);

      // Nivel 1: usar todo lo que ya exista localmente, sin perder
      // la caché por el simple hecho de que otra fuente también exista.
      const cachedQuotes = await readQuotesFromCacheStorage();
      const localQuotes = readQuotesLocal();
      let quotes =
        normalizeQuoteList([
          ...builtInQuotes,
          ...cachedQuotes,
          ...localQuotes
        ]);

      // Pintar cache inmediatamente para que nunca se quede una sola frase
      // estática mientras esperamos la red.
      if (quotes.length) {
        MOTIVATIONAL_QUOTES = quotes;
        quoteLibraryReady = true;
        quoteRotationSeed = createQuoteSeed();
        quoteCurrentIndex = -1;
        updateMotivationalQuote(true);
        startQuoteRotation();
      }

      // Nivel 3: red. Merge total con las fuentes locales.
      const networkQuotes = await fetchQuotesFromNetwork();
      const mergedNetworkQuotes =
        normalizeQuoteList([
          ...builtInQuotes,
          ...cachedQuotes,
          ...localQuotes,
          ...networkQuotes
        ]);

      if (mergedNetworkQuotes.length) {
        MOTIVATIONAL_QUOTES = mergedNetworkQuotes;
        quoteLibraryReady = true;
        saveQuotesLocal(mergedNetworkQuotes);
        quoteRotationSeed = createQuoteSeed();
        quoteCurrentIndex = -1;
        updateMotivationalQuote(true);
        startQuoteRotation();
        return true;
      }

      if (quotes.length) return true;

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

    let taskyDayRolloverTimer = null;

    function scheduleTaskyDayRollover() {
      clearTimeout(taskyDayRolloverTimer);
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 150);
      const delay = Math.max(250, nextMidnight.getTime() - now.getTime());

      taskyDayRolloverTimer = window.setTimeout(() => {
        try {
          const repeatChanged = syncRepeatingTasksForToday();
          if (repeatChanged) {
            persistLocal();
            localDirty = true;
          }
          render();
          updateSummaryUI();
          refreshIcons();
        } catch (error) {
          console.warn("Cambio de día Tasky:", error);
        } finally {
          scheduleTaskyDayRollover();
        }
      }, delay);
    }

    function init() {
      try {
        deviceId = getOrCreateDeviceId();
        document.documentElement.classList.toggle('touch-device', isTouchDevice());
        const savedTheme = safeStorage.getItem(THEME_KEY) || "system";
        applyTheme(savedTheme);
        completedCollapsed = safeStorage.getItem(COMPLETED_COLLAPSED_KEY) === '1';
        rescheduledCollapsed = safeStorage.getItem(RESCHEDULED_COLLAPSED_KEY) === '1';

        if (!getLatestBackupRecord()) {
          const legacy = loadSafetyBackup();
          if (legacy) saveSafetyBackup('migración de respaldo V42', legacy);
        }

        const local = loadLocalState();
        if (local && stateStats(local).total > 0) {
          state = local;
          render();
          if (!loadSafetyBackup() && stateStats(state).total > 0) saveSafetyBackup('inicio');
          setSyncStatus("offline", "Cargando copia local");
        } else {
          const recovered = restoreBestRecoveryState("recuperación automática al iniciar");
          if (recovered) {
            render();
            updateSummaryUI();
            setSyncStatus("offline", "Respaldo recuperado");
            toast("Tasky recuperó el respaldo más completo disponible.", "shield-check", "success");
          }
        }

        bindEvents();
        scheduleTaskyDayRollover();
        // V65: la biblioteca se carga en segundo plano; la UI no espera.
        initMotivationalQuotesImmediate();
        void loadQuotesLibrary();

        // Primer render terminado: Tasky queda interactiva YA.
        hideLoading();

        // Los iconos y Firebase son secundarios y van en segundo plano.
        refreshIcons();
        updateSoundToggleUI();
        updateTaskViewTabs();
        setupTooltips();

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



    /* =========================================================
       TASKY V106 · patches funcionales
       Selección múltiple · Ctrl+Z · fases reprogramadas
       ========================================================= */
    const TASKY_V106_UNDO_KEY = "tasky_undo_stack_v106";
    const TASKY_V106_UNDO_LIMIT = 30;
    const taskyV106Selected = new Set();
    let taskyV106UndoStack = [];
    let taskyV106UndoRestoring = false;
    let taskyV106LastPersisted = null;

    function taskyV106LoadUndo() {
      try {
        const raw = safeStorage.getItem(TASKY_V106_UNDO_KEY);
        const data = JSON.parse(raw || "[]");
        return Array.isArray(data) ? data.slice(-TASKY_V106_UNDO_LIMIT) : [];
      } catch (_) {
        return [];
      }
    }

    function taskyV106SaveUndo() {
      try {
        safeStorage.setItem(TASKY_V106_UNDO_KEY, JSON.stringify(taskyV106UndoStack.slice(-TASKY_V106_UNDO_LIMIT)));
      } catch (_) {}
    }

    function taskyV106IsEditableFocus() {
      const node = document.activeElement;
      return Boolean(node && (
        node.matches?.("textarea") ||
        node.matches?.("select") ||
        node.matches?.("input:not([type='hidden']):not([type='button']):not([type='checkbox'])") ||
        node.isContentEditable
      ));
    }

    function taskyV106CaptureUndo() {
      if (taskyV106UndoRestoring || taskyV106IsEditableFocus()) return;
      if (!taskyV106LastPersisted) return;
      if (taskyV106UndoStack[taskyV106UndoStack.length - 1] === taskyV106LastPersisted) return;

      taskyV106UndoStack.push(taskyV106LastPersisted);
      if (taskyV106UndoStack.length > TASKY_V106_UNDO_LIMIT) {
        taskyV106UndoStack = taskyV106UndoStack.slice(-TASKY_V106_UNDO_LIMIT);
      }
      taskyV106SaveUndo();
    }

    const taskyV106BasePersistLocal = persistLocal;
    persistLocal = function() {
      const next = serialize(state);
      if (!taskyV106UndoRestoring && taskyV106LastPersisted && taskyV106LastPersisted !== next) {
        taskyV106CaptureUndo();
      }
      taskyV106BasePersistLocal();
      taskyV106LastPersisted = next;
    };

    function taskyV106Undo() {
      if (!taskyV106UndoStack.length) {
        toast("No hay una acción anterior para deshacer.", "rotate-ccw", "info");
        return;
      }

      const snapshot = taskyV106UndoStack.pop();
      taskyV106SaveUndo();

      try {
        taskyV106UndoRestoring = true;
        state = normalizeState(JSON.parse(snapshot));
        taskyV106Selected.clear();
        pendingRemoteState = null;
        persistLocal();
        localDirty = true;
        render();
        updateSummaryUI();
        scheduleSave("deshacer acción", 0);
        softHaptic(24);
        playTaskySound("restore");
        toast("Acción deshecha", "rotate-ccw");
      } catch (error) {
        console.error("Undo Tasky:", error);
        toast("No se pudo deshacer la última acción.", "triangle-alert", "error");
      } finally {
        taskyV106UndoRestoring = false;
      }
    }

    function taskyV106UpdateSelectionUI() {
      const validIds = new Set();
      state.categories.forEach(cat => {
        (cat.tasks || []).forEach(task => {
          if (task && !task.draft && String(task.text || "").trim()) validIds.add(task.id);
        });
      });
      [...taskyV106Selected].forEach(id => {
        if (!validIds.has(id)) taskyV106Selected.delete(id);
      });

      const bar = document.getElementById("bulkActionsBar");
      const count = document.getElementById("bulkSelectedCount");
      if (count) count.textContent = String(taskyV106Selected.size);
      if (bar) {
        bar.hidden = taskyV106Selected.size === 0;
        bar.classList.toggle("is-visible", taskyV106Selected.size > 0);
      }

      document.querySelectorAll(".task-item[data-task-id]").forEach(item => {
        const id = item.dataset.taskId;
        const selected = taskyV106Selected.has(id);
        item.classList.toggle("is-selected", selected);
        const button = item.querySelector(".select-task-btn");
        if (button) {
          button.setAttribute("aria-pressed", selected ? "true" : "false");
          const mark = button.querySelector(".selection-mark");
          if (mark) mark.textContent = selected ? "✓" : "";
        }
      });
    }

    function taskyV106ToggleSelection(taskId) {
      if (!taskId) return;
      if (taskyV106Selected.has(taskId)) taskyV106Selected.delete(taskId);
      else taskyV106Selected.add(taskId);
      taskyV106UpdateSelectionUI();
      playTaskySound("click");
      softHaptic(8);
    }

    function taskyV106ClearSelection() {
      taskyV106Selected.clear();
      taskyV106UpdateSelectionUI();
    }

    function taskyV106SelectedItems() {
      const items = [];
      state.categories.forEach(cat => {
        (cat.tasks || []).forEach(task => {
          if (taskyV106Selected.has(task.id) && !task.draft && String(task.text || "").trim()) {
            items.push({task,cat});
          }
        });
      });
      return items;
    }

    function taskyV106CreateBulkBar() {
      if (document.getElementById("bulkActionsBar")) return;

      const toolbar = document.querySelector(".pro-task-toolbar");
      if (!toolbar) return;

      const bar = document.createElement("div");
      bar.id = "bulkActionsBar";
      bar.className = "bulk-actions-bar";
      bar.hidden = true;
      bar.innerHTML =
        '<div class="bulk-selection-label">' +
          '<span class="bulk-selection-icon"><i data-lucide="check-square"></i></span>' +
          '<strong><span id="bulkSelectedCount">0</span> seleccionadas</strong>' +
        '</div>' +
        '<div class="bulk-actions-buttons">' +
          '<button type="button" class="bulk-action-btn" data-action="bulk-tomorrow"><i data-lucide="sun"></i><span>Mañana</span></button>' +
          '<button type="button" class="bulk-action-btn" data-action="bulk-date"><i data-lucide="calendar-plus"></i><span>Elegir fecha</span></button>' +
          '<button type="button" class="bulk-action-btn danger" data-action="bulk-delete"><i data-lucide="trash-2"></i><span>Eliminar</span></button>' +
          '<button type="button" class="bulk-clear-btn" data-action="clear-selection" aria-label="Cancelar selección"><i data-lucide="x"></i></button>' +
        '</div>';

      toolbar.insertAdjacentElement("afterend", bar);
      refreshIcons();
    }

    const taskyV106BaseBuildTaskItem = buildTaskItem;
    buildTaskItem = function(task, query, completed) {
      const item = taskyV106BaseBuildTaskItem(task, query, completed);
      if (completed || !item) return item;

      const textarea = item.querySelector(".task-input");
      if (!textarea || item.querySelector(".select-task-btn")) return item;

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "select-task-btn";
      selectButton.dataset.action = "toggle-select-task";
      selectButton.dataset.tooltip = "Seleccionar tarea";
      selectButton.setAttribute("aria-label", "Seleccionar tarea");
      selectButton.setAttribute("aria-pressed", taskyV106Selected.has(task.id) ? "true" : "false");
      selectButton.innerHTML = '<span class="selection-mark">' + (taskyV106Selected.has(task.id) ? "✓" : "") + '</span>';

      textarea.parentNode.insertBefore(selectButton, textarea);

      if (task.rescheduled && task.date && task.date > today()) {
        const dateBadge = document.createElement("span");
        dateBadge.className = "task-rescheduled-date";
        dateBadge.innerHTML = '<i data-lucide="calendar-clock"></i>' + escapeHTML("Reprogramada · " + formatDateLong(task.date));
        item.appendChild(dateBadge);
      }

      return item;
    };

    function taskyV106DecorateRescheduledPhases() {
      document.querySelectorAll(".rescheduled-card").forEach(node => node.remove());

      const rescheduledCategories = state.categories.filter(cat => isFullyRescheduledCategory(cat));

      rescheduledCategories.forEach(cat => {
        let card = document.querySelector('.activity-card[data-category-id="' + cssEscapeSafe(cat.id) + '"]');

        // render() base intentionally separates fully-rescheduled phases from
        // active/finished phases. We create their normal category card here
        // and then place it at the very end, preserving the original phase.
        if (!card) {
          const categoryIndex = state.categories.findIndex(item => item.id === cat.id);
          card = buildCategoryCard(cat, categoryIndex, activeSearch.trim().toLowerCase());
          if (card) el.board.appendChild(card);
        }

        if (!card) return;

        card.classList.add("rescheduled-phase-card");

        const list = card.querySelector(".task-list");
        if (list) {
          list.innerHTML = "";
          (cat.tasks || []).forEach(task => {
            if (!task.draft && String(task.text || "").trim() && task.rescheduled && task.date > today()) {
              list.appendChild(buildTaskItem(task, activeSearch.trim().toLowerCase(), false));
            }
          });
        }

        const count = cat.tasks.filter(task =>
          !task.draft && String(task.text || "").trim() && task.rescheduled && task.date > today()
        ).length;

        const countNode = card.querySelector(".category-pending-count");
        if (countNode) countNode.textContent = String(count);

        const pills = card.querySelectorAll(".card-meta .pill");
        if (pills[0]) {
          pills[0].innerHTML =
            '<i data-lucide="calendar-clock"></i>' +
            count + ' reprogramada' + (count === 1 ? '' : 's');
        }
        if (pills[1]) {
          pills[pills.length - 1].textContent = "Fuera de hoy";
          pills[pills.length - 1].className = "pill rescheduled-pill";
        }

        // El card reprogramado siempre va debajo de las fases ya cumplidas.
        el.board.appendChild(card);
      });

      refreshIcons();
      updateTaskHeights();
      if (typeof initTaskPointerDrag === "function") initTaskPointerDrag();
    }

    const taskyV106BaseRender = render;
    render = function() {
      taskyV106BaseRender.apply(this, arguments);
      taskyV106DecorateRescheduledPhases();
      taskyV106UpdateSelectionUI();
    };

    // Ya no queremos una tarjeta global adicional de reprogramadas en el tablero.
    buildRescheduledCard = function() { return null; };
    updateRescheduledCardUI = function() {
      document.querySelectorAll(".rescheduled-card").forEach(node => node.remove());
      updateRescheduledUI();
    };

    // Reprogramación para una fecha personalizada, individual o múltiple.
    saveRescheduleDate = function() {
      const hidden = document.getElementById("rescheduleDateTaskId");
      const input = document.getElementById("rescheduleDateInput");
      if (!hidden || !input) return;

      const taskIds = String(hidden.value || "").split(",").map(id => id.trim()).filter(Boolean);
      const targetDate = planningCalendarSelected || input.value;

      if (!taskIds.length || !targetDate || targetDate <= today()) {
        toast("Elige una fecha futura para reprogramar la tarea.", "calendar-alert", "error");
        return;
      }

      const selected = [];
      state.categories.forEach(cat => {
        (cat.tasks || []).forEach(task => {
          if (taskIds.includes(task.id) && !task.draft && !task.repeat) selected.push({task,cat});
        });
      });

      if (!selected.length) {
        closeModal("rescheduleDateModal");
        toast("No hay tareas válidas para reprogramar.", "calendar-alert", "error");
        return;
      }

      taskyV106CaptureUndo();

      selected.forEach(({task}) => {
        const originalDate = task.rescheduledFrom || task.date || today();
        task.rescheduled = true;
        task.rescheduledFrom = originalDate;
        task.rescheduledAt = new Date().toISOString();
        task.date = targetDate;
      });

      closeModal("rescheduleDateModal");
      taskyV106ClearSelection();
      persistLocal();
      localDirty = true;
      state.categories.forEach(cat => syncCategoryPlacement(cat.id));
      render();
      updateSummaryUI();
      scheduleSave("reprogramar tarea(s) para otra fecha");
      playTaskySound("reschedule");
      toast(selected.length + " tarea" + (selected.length===1 ? "" : "s") + " reprogramada" + (selected.length===1 ? "" : "s") + " para " + formatDateLong(targetDate),"calendar-check");
    };

    function taskyV106BulkTomorrow() {
      const selected = taskyV106SelectedItems().filter(({task}) => !task.repeat);
      if (!selected.length) {
        toast("No hay tareas normales seleccionadas.", "calendar-alert", "info");
        return;
      }

      taskyV106CaptureUndo();
      const target = addDays(today(),1);

      selected.forEach(({task}) => {
        const originalDate = task.rescheduledFrom || task.date || today();
        task.rescheduled = true;
        task.rescheduledFrom = originalDate;
        task.rescheduledAt = new Date().toISOString();
        task.date = target;
      });

      taskyV106ClearSelection();
      persistLocal();
      localDirty = true;
      state.categories.forEach(cat => syncCategoryPlacement(cat.id));
      render();
      updateSummaryUI();
      scheduleSave("reprogramar selección para mañana");
      playTaskySound("reschedule");
      toast(selected.length + " tarea" + (selected.length===1 ? "" : "s") + " reprogramada" + (selected.length===1 ? "" : "s") + " para mañana","sun");
    }

    function taskyV106BulkDelete() {
      const selected = taskyV106SelectedItems();
      if (!selected.length) return;

      taskyV106CaptureUndo();

      const ids = new Set(selected.map(({task}) => task.id));
      state.categories.forEach(cat => {
        cat.tasks = (cat.tasks || []).filter(task => !ids.has(task.id));
      });

      taskyV106ClearSelection();
      persistLocal();
      localDirty = true;
      render();
      updateSummaryUI();
      scheduleSave("eliminar tareas seleccionadas");
      playTaskySound("delete");
      toast(selected.length + " tarea" + (selected.length===1 ? "" : "s") + " eliminada" + (selected.length===1 ? "" : "s"),"trash-2");
    }

    // Inicialización V106 después de las funciones base.
    const taskyV106BaseInit = init;
    init = function() {
      taskyV106UndoStack = taskyV106LoadUndo();
      taskyV106LastPersisted = safeStorage.getItem(STORAGE_KEY) || null;
      taskyV106BaseInit.apply(this, arguments);
      taskyV106CreateBulkBar();
      taskyV106UpdateSelectionUI();

      document.addEventListener("click", event => {
        const action = event.target.closest?.("[data-action]")?.dataset.action;

        if (action === "toggle-select-task") {
          event.preventDefault();
          event.stopPropagation();
          taskyV106ToggleSelection(event.target.closest("[data-task-id]")?.dataset.taskId);
          return;
        }

        if (action === "bulk-tomorrow") {
          event.preventDefault();
          event.stopPropagation();
          taskyV106BulkTomorrow();
          return;
        }

        if (action === "bulk-date") {
          event.preventDefault();
          event.stopPropagation();
          openBulkRescheduleDateEditor();
          return;
        }

        if (action === "bulk-delete") {
          event.preventDefault();
          event.stopPropagation();
          taskyV106BulkDelete();
          return;
        }

        if (action === "clear-selection") {
          event.preventDefault();
          event.stopPropagation();
          taskyV106ClearSelection();
        }
      });

      document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !taskyV106IsEditableFocus()) {
          event.preventDefault();
          taskyV106Undo();
        }
      });
    };


    function openBulkRescheduleDateEditor() {
      const selected = taskyV106SelectedItems().filter(({task}) => !task.repeat);
      if (!selected.length) {
        toast("Selecciona al menos una tarea normal.", "calendar-alert", "info");
        return;
      }

      const target = addDays(today(), 1);
      planningCalendarSelected = target;

      const date = typeof parseISODateLocal === "function" ? parseISODateLocal(target) : null;
      planningCalendarCursor = date
        ? new Date(date.getFullYear(), date.getMonth(), 1)
        : null;

      const hidden = document.getElementById("rescheduleDateTaskId");
      const name = document.getElementById("rescheduleDateTaskName");
      const input = document.getElementById("rescheduleDateInput");

      if (hidden) hidden.value = selected.map(({task}) => task.id).join(",");
      if (name) name.textContent = selected.length + " tareas seleccionadas";
      if (input) input.value = target;

      openModal("rescheduleDateModal");
      renderPlanningCalendar();
    }

    /* =========================================================
       TASKY V107 · UX refinado
       ========================================================= */

    function taskyV107NormalizeArrivedRescheduledTasks() {
      const current = today();
      let changed = false;
      for (const category of state.categories || []) {
        for (const task of category.tasks || []) {
          if (!task || task.draft || !String(task.text || '').trim()) continue;
          if (!task.rescheduled || !task.date) continue;
          if (task.date <= current) {
            task.rescheduled = false;
            task.rescheduledFrom = null;
            task.rescheduledAt = null;
            changed = true;
          }
        }
      }
      if (changed) {
        const previous = taskyV106UndoRestoring;
        taskyV106UndoRestoring = true;
        persistLocal();
        taskyV106UndoRestoring = previous;
        localDirty = true;
        scheduleSave('activar tareas al llegar su fecha', 0);
      }
      return changed;
    }

    const taskyV107BaseRender = render;
    render = function() {
      taskyV107NormalizeArrivedRescheduledTasks();
      taskyV107BaseRender.apply(this, arguments);
    };

    const taskyV107BaseDeleteCategory = deleteCategory;
    deleteCategory = function(categoryId) {
      taskyV106CaptureUndo();
      taskyV107BaseDeleteCategory(categoryId);
    };

    function taskyV107CompletionFeedback() {
      const stats = todayTaskStats();
      const completed = stats.completed;
      const total = Math.max(completed, stats.total);
      if (completed === 1) return '¡Primera tarea completada! El día ya está en movimiento.';
      if (completed === 2) return '¡2 tareas completadas! Ya construiste el impulso.';
      if (completed === 3) return '¡3 tareas completadas! Tu avance ya empieza a notarse.';
      if (completed === 4) return '¡4 tareas completadas! Estás a un paso de tu próximo bloque.';
      if (completed === 5) return '¡5 tareas completadas! Primer gran bloque del día cerrado.';
      if (completed < 10) return '¡' + completed + ' tareas completadas! Mantén el ritmo.';
      if (completed < 15) return '¡' + completed + ' tareas completadas! Tu constancia está marcando la diferencia.';
      if (completed < 20) return '¡' + completed + ' tareas completadas! Estás construyendo un día extraordinario.';
      if (total > 0 && completed >= total) return '¡Día completado! Cerraste todo lo que te propusiste.';
      return '¡' + completed + ' tareas completadas! Sigue con la siguiente.';
    }

    const TASKY_V107_ACTIONS = [
      'Dar un paso más hoy','Terminar lo que empezaste','Cumplir una tarea pendiente','Ordenar tu próximo paso','Empezar aunque no sea perfecto',
      'Mantener tu palabra contigo','Elegir una prioridad','Cerrar un pendiente pequeño','Avanzar sin buscar prisa','Volver al plan después de una pausa',
      'Proteger unos minutos de enfoque','Hacer primero lo importante','Convertir una idea en acción','Poner orden donde hay ruido','Seguir cuando la motivación baja',
      'Reconocer un avance pequeño','Dividir un reto grande','Preparar el terreno para mañana','Hacer espacio para concentrarte','Decidir qué merece tu energía',
      'Completar una cosa antes de saltar a otra','Volver a intentarlo con calma','Cuidar la constancia','Usar bien la próxima hora','Elegir el siguiente paso'
    ];

    const TASKY_V107_RESULTS = [
      'reduce la distancia entre tu intención y tu resultado.','convierte una intención en algo que ya existe.','demuestra que el progreso también se construye en pequeño.',
      'te devuelve claridad cuando todo parece urgente.','fortalece el hábito de confiar en tus propias decisiones.','hace que mañana empiece con menos peso.',
      'te ayuda a cambiar movimiento por avance real.','crea evidencia de que sí puedes cumplirte.','pone el foco en lo que realmente importa.',
      'hace visible un progreso que antes solo estaba en tu cabeza.','te acerca a la versión de tu día que querías construir.',
      'protege tu atención de lo que no necesita ocurrir ahora.','transforma esfuerzo disperso en dirección.','abre espacio mental para pensar con más calma.',
      'hace que una meta grande se sienta más manejable.'
    ];

    const TASKY_V107_GENERATED_QUOTES = [];
    for (const action of TASKY_V107_ACTIONS) {
      for (const result of TASKY_V107_RESULTS) {
        TASKY_V107_GENERATED_QUOTES.push({ text: action + ' ' + result, author: 'Reflexión' });
      }
    }
    BUILTIN_MOTIVATIONAL_QUOTES.push(...TASKY_V107_GENERATED_QUOTES);
    CLEAN_BUILTIN_MOTIVATIONAL_QUOTES.push(...TASKY_V107_GENERATED_QUOTES);
    /* TASKY V108 · Fallback de frases con autor identificado */
    const TASKY_V108_VERIFIED_FALLBACK_QUOTES = [
      { text: 'Admira a los que han emprendido cosas grandes aunque hayan fracasado.', author: 'Séneca' },
      { text: 'El trabajo es el alimento de las almas nobles.', author: 'Séneca' },
      { text: 'No nos atrevemos a muchas cosas porque son difíciles, pero son difíciles porque no nos atrevemos a hacerlas.', author: 'Séneca' },
      { text: 'Nuestra naturaleza está en la acción. El reposo presagia la muerte.', author: 'Séneca' },
      { text: 'Por la dificultad se llega a las estrellas.', author: 'Séneca' },
      { text: 'Hace falta toda una vida para aprender a vivir.', author: 'Séneca' },
      { text: 'Debemos rehuir la amistad de los malos y la enemistad de los buenos.', author: 'Epicteto' },
      { text: 'El deseo y la felicidad no pueden vivir juntos.', author: 'Epicteto' },
      { text: 'La adversidad no es una desgracia, antes bien, el sufrirla con grandeza de ánimo es una dicha.', author: 'Epicteto' },
      { text: 'Las ocasiones son diferentes, no lo es el uso que se hace de ellas.', author: 'Epicteto' },
      { text: 'Lo que perturba al hombre no son las cosas, sino los juicios relativos a las cosas.', author: 'Epicteto' },
      { text: 'Los hábitos contraídos no se corrigen sino con hábitos opuestos.', author: 'Epicteto' },
      { text: 'La conciencia vale por mil testigos.', author: 'Marco Aurelio' },
      { text: 'El tiempo es como un río, formado por los hechos, que adquiere violenta corriente.', author: 'Marco Aurelio' },
      { text: 'La falta de cuidado hace más daño que la falta de ciencia.', author: 'Benjamin Franklin' },
      { text: 'La pereza hace que todo sea difícil; el trabajo lo vuelve todo fácil.', author: 'Benjamin Franklin' },
      { text: 'Las puertas de la sabiduría nunca están cerradas.', author: 'Benjamin Franklin' },
      { text: 'Abandonar puede tener justificación, abandonarse no la tiene jamás.', author: 'Ralph Waldo Emerson' },
      { text: 'La confianza en uno mismo es el primer secreto del éxito.', author: 'Ralph Waldo Emerson' },
      { text: 'El pensamiento es la semilla de la acción.', author: 'Ralph Waldo Emerson' },
      { text: 'No vayas por donde el camino te lleve. Ve en cambio por donde no hay camino, y deja rastro.', author: 'Ralph Waldo Emerson' },
      { text: 'Es duro caer, pero es peor todavía no haber intentado nunca subir.', author: 'Theodore Roosevelt' },
      { text: 'El futuro pertenece a quienes creen en la belleza de sus sueños.', author: 'Eleanor Roosevelt' },
      { text: 'El éxito depende menos de las ayudas externas que de la confianza en sí mismo.', author: 'Abraham Lincoln' },
      { text: 'Siempre parece imposible hasta que se hace.', author: 'Nelson Mandela' },
      { text: 'Da el primer paso con fe. No necesitas ver toda la escalera, solo el primer paso.', author: 'Martin Luther King Jr.' },
      { text: 'Actuar es fácil, pensar es difícil; actuar según se piensa es aún más difícil.', author: 'Johann Wolfgang von Goethe' },
      { text: 'Ambición y amor son las alas de las grandes acciones.', author: 'Johann Wolfgang von Goethe' },
      { text: 'Actúa como si lo que haces marca la diferencia. Lo hace.', author: 'William James' },
      { text: 'La acción puede no siempre traer felicidad, pero no hay felicidad sin acción.', author: 'William James' },
      { text: 'La paciencia tiene más poder que la fuerza.', author: 'Plutarco' },
      { text: 'El cerebro no es un vaso por llenar, sino una lámpara por encender.', author: 'Plutarco' },
      { text: 'El camino a todas las cosas grandes pasa por el silencio.', author: 'Friedrich Nietzsche' },
      { text: 'Todo lo que no me hace morir me hace más fuerte.', author: 'Friedrich Nietzsche' },
      { text: 'Comprender es el primer paso; vivir, el segundo.', author: 'Victor Hugo' },
      { text: 'El futuro tiene muchos nombres. Para los débiles es lo inalcanzable. Para los temerosos, lo desconocido. Para los valientes es la oportunidad.', author: 'Victor Hugo' },
      { text: 'La condición esencial de la felicidad del ser humano es el trabajo.', author: 'León Tolstói' },
      { text: 'La única intención de la vida es servir al género humano.', author: 'León Tolstói' },
      { text: 'La gota horada la piedra, no por su fuerza, sino por su constancia.', author: 'Ovidio' },
      { text: 'Si el hombre fuera constante, sería perfecto.', author: 'William Shakespeare' },
      { text: 'Aprender sin pensar es inútil. Pensar sin aprender, peligroso.', author: 'Confucio' },
      { text: 'El que vence a los otros es fuerte. El que se vence a sí mismo es poderoso.', author: 'Lao-Tsé' },
      { text: 'El éxito es fácil de obtener. Lo difícil es merecerlo.', author: 'Albert Camus' },
      { text: 'El genio se compone de un 2 % de talento y un 98 % de perseverante aplicación.', author: 'Beethoven' },
      { text: 'El valor es bueno, pero la perseverancia es mejor.', author: 'Theodor Fontane' },
      { text: 'Perseverar en el cumplimiento del deber y guardar silencio es la mejor respuesta a la calumnia.', author: 'George Washington' },
      { text: 'Caminante, son tus huellas el camino y nada más; caminante, no hay camino, se hace camino al andar.', author: 'Antonio Machado' },
      { text: 'El camino hacia el éxito se encuentra siempre en construcción.', author: 'Lily Tomlin' },
      { text: 'El éxito es hijo de la perseverancia y firmeza en el trabajo.', author: 'Orison Swett Marden' }
    ];
    BUILTIN_MOTIVATIONAL_QUOTES.length = 0;
    BUILTIN_MOTIVATIONAL_QUOTES.push(...TASKY_V108_VERIFIED_FALLBACK_QUOTES);
    CLEAN_BUILTIN_MOTIVATIONAL_QUOTES.length = 0;
    CLEAN_BUILTIN_MOTIVATIONAL_QUOTES.push(...normalizeQuoteList(TASKY_V108_VERIFIED_FALLBACK_QUOTES));
    init();