/* ==========================================================================
   TASKY PRO ENGINE · VOL. 141 · 100% BACKWARD-COMPATIBLE + MOBILE-FIRST UX
   ========================================================================== */
"use strict";

(function () {
  // Exact storage keys used by Tasky-App + legacy compatibility detection
  const STORAGE_KEYS = {
    DATA: "tasky_data",
    BACKUPS: "tasky_backups",
    SETTINGS: "tasky_settings",
    STATS: "tasky_stats",
    HISTORY: "tasky_history"
  };

  const memoryStorage = new Map();

  const safeStorage = {
    getItem(key) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {
        // Fallback to memoryStorage in restricted environments
      }
      return memoryStorage.has(key) ? memoryStorage.get(key) : null;
    },
    setItem(key, value) {
      memoryStorage.set(key, value);
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
    getAllKeys() {
      const keys = new Set(memoryStorage.keys());
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.add(k);
        }
      } catch (e) {
        // Ignore storage inspection error in sandboxed frame
      }
      return Array.from(keys);
    }
  };

  const DEFAULT_QUOTES = [
    { text: "No es que tengamos poco tiempo, sino que perdemos mucho.", author: "Séneca", category: "estoicismo" },
    { text: "El secreto de salir adelante es simplemente empezar.", author: "Mark Twain", category: "accion" },
    { text: "Por cada minuto dedicado a organizar, se gana una hora.", author: "Benjamin Franklin", category: "orden" },
    { text: "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.", author: "Aristóteles", category: "habitos" },
    { text: "Concéntrate en cada minuto como un romano, haciendo lo que tienes delante con dignidad y precisión.", author: "Marco Aurelio", category: "estoicismo" },
    { text: "Primero di a ti mismo lo que serías; y luego haz lo que tengas que hacer.", author: "Epicteto", category: "estoicismo" },
    { text: "La simplicidad es la máxima sofisticación.", author: "Leonardo da Vinci", category: "orden" },
    { text: "Tu mente es para tener ideas, no para retenerlas.", author: "David Allen", category: "orden" },
    { text: "Enfocarse significa decir que no a cien buenas ideas más.", author: "Steve Jobs", category: "orden" }
  ];

  // Application State
  const appState = {
    data: {
      boxes: [],
      tasks: []
    },
    settings: {
      theme: "light",
      soundsEnabled: true,
      quoteFilter: "all"
    },
    backups: [],
    history: {},
    activeTab: "all", // 'all' | 'today' | 'completed'
    specialFilter: null, // null | 'rescheduled' | 'overdue'
    sortBy: "order", // 'order' | 'dueDate' | 'rescheduled' | 'alpha'
    searchQuery: "",
    quotes: DEFAULT_QUOTES.slice(),
    currentQuoteIndex: 0,
    editingBoxId: null,
    editingTaskId: null,
    selectedBoxColor: "#2563eb",
    confirmCallback: null,
    lastDeletedSnapshot: null,
    mobilePreview: false,
    charts: {
      trend: null,
      distribution: null
    }
  };

  function getTodayISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Synthesized Web Audio UI feedback (no external audio files needed)
  function playUiSound(type) {
    if (!appState.settings.soundsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "complete") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.09); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.20); // G5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        osc.start(now);
        osc.stop(now + 0.27);
      } else if (type === "error") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(185, now + 0.1);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch (e) {
      // Ignore audio context restrictions before user gesture
    }
  }

  // Professional Toast & Error Diagnostic System
  function showToast(options) {
    const {
      type = "info", // 'error' | 'warning' | 'success' | 'info'
      title = "Notificación del sistema",
      message = "",
      code = "",
      actionLabel = "",
      onAction = null,
      duration = 4800
    } = options;

    if (type === "error") playUiSound("error");

    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `pro-toast ${type}`;

    const iconSvg = {
      error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    }[type] || "";

    toast.innerHTML = `
      <div class="pro-toast-icon">${iconSvg}</div>
      <div class="pro-toast-body">
        <div class="pro-toast-title">
          <span>${escapeHtml(title)}</span>
          ${code ? `<span class="pro-toast-code">${escapeHtml(code)}</span>` : ""}
        </div>
        <div class="pro-toast-msg">${escapeHtml(message)}</div>
        <div class="pro-toast-actions"></div>
      </div>
    `;

    const actionsContainer = toast.querySelector(".pro-toast-actions");
    if (actionLabel && typeof onAction === "function") {
      const actBtn = document.createElement("button");
      actBtn.type = "button";
      actBtn.className = "toast-action-btn";
      actBtn.textContent = actionLabel;
      actBtn.addEventListener("click", () => {
        onAction();
        toast.remove();
      });
      actionsContainer.appendChild(actBtn);
    }

    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "toast-action-btn";
    dismissBtn.textContent = "Cerrar";
    dismissBtn.addEventListener("click", () => toast.remove());
    actionsContainer.appendChild(dismissBtn);

    stack.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, duration);
  }

  function showFieldValidationError(inputEl, bannerId, errorMessage, errorCode) {
    if (inputEl) {
      inputEl.classList.add("input-invalid", "shake-error");
      inputEl.focus();
      setTimeout(() => inputEl.classList.remove("shake-error"), 450);
    }
    const banner = document.getElementById(bannerId);
    if (banner) {
      banner.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div><strong>Validación requerida (${escapeHtml(errorCode)}):</strong> ${escapeHtml(errorMessage)}</div>
      `;
      banner.classList.add("visible");
    }
    showToast({
      type: "error",
      title: "No se pudo completar el registro",
      message: errorMessage,
      code: errorCode
    });
  }

  function clearFieldValidationError(inputEl, bannerId) {
    if (inputEl) inputEl.classList.remove("input-invalid");
    const banner = document.getElementById(bannerId);
    if (banner) {
      banner.classList.remove("visible");
      banner.innerHTML = "";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Normalize & Preserve Registered Data without losing a single field
  function normalizeDataPayload(raw) {
    if (!raw || typeof raw !== "object") return null;
    const boxesRaw = Array.isArray(raw.boxes) ? raw.boxes : (Array.isArray(raw.casillas) ? raw.casillas : []);
    const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : (Array.isArray(raw.tareas) ? raw.tareas : []);

    const boxes = boxesRaw.map((b, idx) => ({
      ...b,
      id: String(b.id || `box_${Date.now()}_${idx}`),
      name: String(b.name || b.title || "CASILLA").trim(),
      color: String(b.color || "#2563eb"),
      note: String(b.note || ""),
      collapsed: Boolean(b.collapsed),
      order: typeof b.order === "number" ? b.order : idx
    }));

    const tasks = tasksRaw.map((t, idx) => ({
      ...t,
      id: String(t.id || `task_${Date.now()}_${idx}`),
      boxId: String(t.boxId || (boxes[0] ? boxes[0].id : "box_default")),
      title: String(t.title || t.name || t.text || "Tarea sin título").trim(),
      note: String(t.note || t.description || ""),
      done: Boolean(t.done || t.completed),
      createdAt: Number(t.createdAt || Date.now()),
      dueDate: String(t.dueDate || getTodayISO()),
      frequency: String(t.frequency || "daily"),
      rescheduledCount: Number(t.rescheduledCount || 0),
      order: typeof t.order === "number" ? t.order : idx
    }));

    return { ...raw, boxes, tasks };
  }

  function loadRegisteredData() {
    // 1. Load Settings
    const rawSettings = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      try {
        const parsedSettings = JSON.parse(rawSettings);
        appState.settings = { ...appState.settings, ...parsedSettings };
      } catch (e) {
        // Keep defaults
      }
    }

    // 2. Load Backups
    const rawBackups = safeStorage.getItem(STORAGE_KEYS.BACKUPS);
    if (rawBackups) {
      try {
        const parsedBackups = JSON.parse(rawBackups);
        if (Array.isArray(parsedBackups)) appState.backups = parsedBackups;
      } catch (e) {
        appState.backups = [];
      }
    }

    // 3. Load History / Stats
    const rawHistory = safeStorage.getItem(STORAGE_KEYS.HISTORY) || safeStorage.getItem(STORAGE_KEYS.STATS);
    if (rawHistory) {
      try {
        const parsedHist = JSON.parse(rawHistory);
        if (parsedHist && typeof parsedHist === "object") appState.history = parsedHist;
      } catch (e) {
        appState.history = {};
      }
    }

    // 4. Load Primary Registered Data (`tasky_data` or any existing `tasky_*` data key)
    let loadedData = null;
    const rawPrimary = safeStorage.getItem(STORAGE_KEYS.DATA);
    if (rawPrimary) {
      try {
        loadedData = normalizeDataPayload(JSON.parse(rawPrimary));
      } catch (e) {
        loadedData = null;
      }
    }

    // Check if another tasky_* key holds registered boxes/tasks if primary was empty
    if (!loadedData || (!loadedData.boxes.length && !loadedData.tasks.length)) {
      const allKeys = safeStorage.getAllKeys();
      for (const k of allKeys) {
        if (k.toLowerCase().includes("tasky") && k !== STORAGE_KEYS.SETTINGS && k !== STORAGE_KEYS.BACKUPS) {
          try {
            const candidate = JSON.parse(safeStorage.getItem(k));
            if (candidate && (Array.isArray(candidate.boxes) || Array.isArray(candidate.tasks))) {
              const norm = normalizeDataPayload(candidate);
              if (norm && (norm.boxes.length > 0 || norm.tasks.length > 0)) {
                loadedData = norm;
                break;
              }
            }
          } catch (e) {
            // Continue scanning
          }
        }
      }
    }

    // Seed initial baseline matching live Tasky-App ("CASA" -> "Lavar los servicios") if no registered data exists yet
    if (!loadedData || (!loadedData.boxes.length && !loadedData.tasks.length)) {
      const today = getTodayISO();
      loadedData = {
        boxes: [
          {
            id: "box_casa_01",
            name: "CASA",
            color: "#2563eb",
            note: "Organización y mantenimiento diario del hogar",
            collapsed: false,
            order: 0
          }
        ],
        tasks: [
          {
            id: "task_servicios_01",
            boxId: "box_casa_01",
            title: "Lavar los servicios",
            note: "Rutina diaria de orden en cocina",
            done: false,
            createdAt: Date.now() - 3600000,
            dueDate: today,
            frequency: "daily",
            rescheduledCount: 0,
            order: 0
          }
        ]
      };
      safeStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(loadedData));
    }

    appState.data = loadedData;
  }

  function saveData(recordBackup = true, actionLabel = "Actualización automática") {
    const payloadStr = JSON.stringify(appState.data);
    const ok = safeStorage.setItem(STORAGE_KEYS.DATA, payloadStr);

    if (recordBackup) {
      const snapshot = {
        id: `bkp_${Date.now()}`,
        timestamp: Date.now(),
        label: actionLabel,
        boxesCount: appState.data.boxes.length,
        tasksCount: appState.data.tasks.length,
        data: JSON.parse(payloadStr)
      };
      appState.backups.unshift(snapshot);
      if (appState.backups.length > 20) {
        appState.backups = appState.backups.slice(0, 20);
      }
      safeStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(appState.backups));
    }

    safeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(appState.history));
    safeStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(appState.history));

    const syncLabel = document.getElementById("sync-status-text");
    if (syncLabel) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      syncLabel.textContent = ok ? `Sincronizado · ${hh}:${mm}` : `Memoria activa · ${hh}:${mm}`;
    }
  }

  function saveSettings() {
    safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
  }

  function applyTheme() {
    if (appState.settings.theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    const themeBtn = document.getElementById("btn-theme-toggle");
    if (themeBtn) {
      themeBtn.innerHTML = appState.settings.theme === "dark"
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
    const soundBtn = document.getElementById("btn-sound-toggle");
    if (soundBtn) {
      soundBtn.innerHTML = appState.settings.soundsEnabled
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    }
  }

  // Format human-friendly Spanish date
  function renderHeroDate() {
    const el = document.getElementById("current-date-display");
    if (!el) return;
    const now = new Date();
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    el.textContent = `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  }

  function renderQuote(animate = false) {
    const filtered = appState.settings.quoteFilter === "all"
      ? appState.quotes
      : appState.quotes.filter(q => q.category === appState.settings.quoteFilter);
    const pool = filtered.length ? filtered : appState.quotes;
    const quote = pool[appState.currentQuoteIndex % pool.length];

    const textEl = document.getElementById("quote-text");
    const authorEl = document.getElementById("quote-author");
    if (!textEl || !authorEl || !quote) return;

    if (animate) {
      textEl.style.opacity = "0";
      textEl.style.transform = "translateY(5px)";
      setTimeout(() => {
        textEl.textContent = `“${quote.text}”`;
        authorEl.textContent = `— ${quote.author}`;
        textEl.style.opacity = "1";
        textEl.style.transform = "translateY(0)";
      }, 180);
    } else {
      textEl.textContent = `“${quote.text}”`;
      authorEl.textContent = `— ${quote.author}`;
    }
  }

  // Compute Metrics & Update Dashboard
  function updateMetrics() {
    const today = getTodayISO();
    const tasks = appState.data.tasks;
    const boxes = appState.data.boxes;

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.done).length;
    const pendingTasks = totalTasks - doneTasks;
    const dailyPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Circular progress ring circumference = 2 * PI * 22 = 138.23
    const ring = document.getElementById("daily-progress-ring");
    if (ring) {
      const offset = 138.2 - (dailyPct / 100) * 138.2;
      ring.style.strokeDashoffset = String(offset);
      ring.style.stroke = dailyPct === 100 ? "var(--success)" : "var(--primary)";
    }

    const pctEl = document.getElementById("metric-daily-pct");
    if (pctEl) pctEl.textContent = `${dailyPct}%`;
    const pctSub = document.getElementById("metric-daily-sub");
    if (pctSub) {
      pctSub.textContent = totalTasks === 0
        ? "Sin tareas registradas"
        : `${doneTasks} de ${totalTasks} completadas`;
    }

    const activeBoxes = boxes.filter(b => tasks.some(t => t.boxId === b.id && !t.done)).length || boxes.length;
    const boxesEl = document.getElementById("metric-boxes-count");
    if (boxesEl) boxesEl.textContent = String(boxes.length);
    const boxesSub = document.getElementById("metric-boxes-sub");
    if (boxesSub) boxesSub.textContent = `${activeBoxes} en ejecución activa`;

    const overdueCount = tasks.filter(t => !t.done && t.dueDate && t.dueDate < today).length;
    const rescheduledCount = tasks.filter(t => (t.rescheduledCount || 0) > 0).length;

    const pendingEl = document.getElementById("metric-pending-count");
    if (pendingEl) pendingEl.textContent = String(pendingTasks);
    const pendingSub = document.getElementById("metric-pending-sub");
    if (pendingSub) {
      pendingSub.textContent = overdueCount > 0 ? `${overdueCount} atrasada(s)` : "Al día sin atrasos";
    }

    const completedEl = document.getElementById("metric-completed-count");
    if (completedEl) completedEl.textContent = String(doneTasks);

    // Filter counts
    const countAll = document.getElementById("tab-count-all");
    const countToday = document.getElementById("tab-count-today");
    const countDone = document.getElementById("tab-count-completed");
    if (countAll) countAll.textContent = String(totalTasks);
    if (countToday) countToday.textContent = String(tasks.filter(t => t.dueDate <= today || t.frequency === "daily").length);
    if (countDone) countDone.textContent = String(doneTasks);

    const badgeRescheduled = document.getElementById("badge-rescheduled-count");
    const badgeOverdue = document.getElementById("badge-overdue-count");
    if (badgeRescheduled) badgeRescheduled.textContent = String(rescheduledCount);
    if (badgeOverdue) badgeOverdue.textContent = String(overdueCount);
  }

  function filterTask(task) {
    const today = getTodayISO();
    if (appState.activeTab === "today") {
      if (task.dueDate > today && task.frequency !== "daily") return false;
    } else if (appState.activeTab === "completed") {
      if (!task.done) return false;
    }

    if (appState.specialFilter === "rescheduled") {
      if (!task.rescheduledCount || task.rescheduledCount <= 0) return false;
    } else if (appState.specialFilter === "overdue") {
      if (task.done || !task.dueDate || task.dueDate >= today) return false;
    }

    if (appState.searchQuery) {
      const q = appState.searchQuery.toLowerCase();
      const box = appState.data.boxes.find(b => b.id === task.boxId);
      const boxName = box ? box.name.toLowerCase() : "";
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchNote = (task.note || "").toLowerCase().includes(q);
      const matchBox = boxName.includes(q);
      if (!matchTitle && !matchNote && !matchBox) return false;
    }

    return true;
  }

  function sortTasksList(tasks) {
    const copy = tasks.slice();
    if (appState.sortBy === "dueDate") {
      copy.sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
    } else if (appState.sortBy === "rescheduled") {
      copy.sort((a, b) => (b.rescheduledCount || 0) - (a.rescheduledCount || 0));
    } else if (appState.sortBy === "alpha") {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      copy.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return copy;
  }

  function formatFrequencyLabel(freq) {
    const map = {
      daily: "Todos los días",
      weekly: "Semanal",
      monthly: "Mensual",
      once: "Una vez"
    };
    return map[freq] || "Todos los días";
  }

  function formatDueDateBadge(dueDate, done) {
    const today = getTodayISO();
    if (!dueDate) return { label: "Sin fecha", cls: "badge-date" };
    if (!done && dueDate < today) {
      return { label: `Atrasada · ${dueDate}`, cls: "badge-overdue" };
    }
    if (dueDate === today) {
      return { label: "Para hoy", cls: "badge-date" };
    }
    return { label: dueDate, cls: "badge-date" };
  }

  function renderBoard() {
    updateMetrics();
    const container = document.getElementById("boxes-container");
    if (!container) return;
    container.innerHTML = "";

    const sortedBoxes = appState.data.boxes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    if (sortedBoxes.length === 0) {
      container.innerHTML = `
        <div class="hero-card" style="text-align:center;align-items:center;padding:42px 24px;">
          <div class="version-pill">Tablero vacío</div>
          <h3 style="font-size:1.25rem;margin-bottom:8px;">No hay casillas creadas todavía</h3>
          <p style="color:var(--muted);font-size:0.9rem;max-width:440px;margin-bottom:18px;">
            Crea tu primera casilla (por ejemplo, «CASA», «TRABAJO» o «ESTUDIOS») para agrupar y organizar tus tareas con claridad.
          </p>
          <button type="button" class="btn-primary" id="btn-empty-new-box">+ Crear primera casilla</button>
        </div>
      `;
      const emptyBtn = document.getElementById("btn-empty-new-box");
      if (emptyBtn) emptyBtn.addEventListener("click", () => openBoxModal(null));
      return;
    }

    sortedBoxes.forEach((box) => {
      const allBoxTasks = appState.data.tasks.filter(t => t.boxId === box.id);
      const visibleTasks = sortTasksList(allBoxTasks.filter(filterTask));

      if ((appState.searchQuery || appState.specialFilter) && visibleTasks.length === 0) {
        const boxMatchesQuery = appState.searchQuery && box.name.toLowerCase().includes(appState.searchQuery.toLowerCase());
        if (!boxMatchesQuery) return;
      }

      const boxTotal = allBoxTasks.length;
      const boxDone = allBoxTasks.filter(t => t.done).length;
      const boxPending = boxTotal - boxDone;
      const boxPct = boxTotal > 0 ? Math.round((boxDone / boxTotal) * 100) : 0;

      const card = document.createElement("section");
      card.className = `box-card ${box.collapsed ? "collapsed" : ""}`;
      card.dataset.boxId = box.id;

      card.innerHTML = `
        <div class="box-header">
          <div class="box-title-area">
            <span class="box-color-dot" style="background:${escapeHtml(box.color || "#2563eb")}"></span>
            <div style="min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <h2 class="box-name">${escapeHtml(box.name)}</h2>
                <span class="box-stat-badge">${boxPending} pendiente${boxPending === 1 ? "" : "s"} · ${boxPct}%</span>
              </div>
              ${box.note ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">${escapeHtml(box.note)}</div>` : ""}
            </div>
          </div>
          <div class="box-meta-pills">
            <div class="box-progress-track" title="Progreso de casilla: ${boxPct}%">
              <div class="box-progress-fill" style="width:${boxPct}%;background:${escapeHtml(box.color || "#2563eb")}"></div>
            </div>
            <div class="box-controls">
              <button type="button" class="box-icon-btn" data-action="add-task-modal" title="Nueva tarea detallada en ${escapeHtml(box.name)}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button type="button" class="box-icon-btn" data-action="edit-box" title="Editar casilla">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button type="button" class="box-icon-btn" data-action="toggle-collapse" title="${box.collapsed ? "Expandir casilla" : "Colapsar casilla"}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="transform:rotate(${box.collapsed ? "-90deg" : "0deg"});transition:transform .2s;"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <button type="button" class="box-icon-btn danger" data-action="delete-box" title="Eliminar casilla">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="box-body">
          <form class="quick-add-row" data-box-id="${escapeHtml(box.id)}">
            <input type="text" class="quick-add-input" placeholder="Escribir nueva tarea en ${escapeHtml(box.name)}..." aria-label="Nueva tarea en ${escapeHtml(box.name)}" />
            <select class="quick-freq-select" aria-label="Frecuencia">
              <option value="daily">Todos los días</option>
              <option value="once">Una vez</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
            <button type="submit" class="quick-add-submit">Agregar</button>
          </form>
          <div class="tasks-list"></div>
        </div>
      `;

      // Bind Box Header buttons
      card.querySelector('[data-action="add-task-modal"]').addEventListener("click", () => openTaskModal(null, box.id));
      card.querySelector('[data-action="edit-box"]').addEventListener("click", () => openBoxModal(box.id));
      card.querySelector('[data-action="toggle-collapse"]').addEventListener("click", () => {
        box.collapsed = !box.collapsed;
        saveData(false);
        renderBoard();
      });
      card.querySelector('[data-action="delete-box"]').addEventListener("click", () => confirmDeleteBox(box.id));

      // Bind Quick Add Form inside Box
      const quickForm = card.querySelector(".quick-add-row");
      quickForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = quickForm.querySelector(".quick-add-input");
        const freqSelect = quickForm.querySelector(".quick-freq-select");
        const title = input.value.trim();

        if (!title) {
          input.classList.add("input-invalid", "shake-error");
          input.focus();
          setTimeout(() => input.classList.remove("shake-error", "input-invalid"), 650);
          showToast({
            type: "error",
            title: "Título de tarea vacío",
            message: `Escribe una descripción clara antes de agregar la tarea en la casilla «${box.name}».`,
            code: "ERR-TASK-EMPTY"
          });
          return;
        }

        if (title.length > 160) {
          showToast({
            type: "warning",
            title: "Título demasiado extenso",
            message: "Por claridad visual, usa máximo 160 caracteres en el título y añade detalles en la nota.",
            code: "WARN-TASK-LEN"
          });
          return;
        }

        const newTask = {
          id: `task_${Date.now()}`,
          boxId: box.id,
          title,
          note: "",
          done: false,
          createdAt: Date.now(),
          dueDate: getTodayISO(),
          frequency: freqSelect.value || "daily",
          rescheduledCount: 0,
          order: allBoxTasks.length
        };

        appState.data.tasks.push(newTask);
        input.value = "";
        playUiSound("click");
        saveData(true, `Nueva tarea: ${title}`);
        renderBoard();
        showToast({
          type: "success",
          title: "Tarea registrada",
          message: `«${title}» se añadió a la casilla «${box.name}».`,
          code: "OK-201"
        });
      });

      const listEl = card.querySelector(".tasks-list");
      if (visibleTasks.length === 0) {
        listEl.innerHTML = `
          <div style="padding:14px;text-align:center;color:var(--muted);font-size:0.83rem;border:1px dashed var(--line-strong);border-radius:12px;">
            No hay tareas que coincidan con la vista actual en <strong>${escapeHtml(box.name)}</strong>.
          </div>
        `;
      } else {
        visibleTasks.forEach((task) => {
          const item = document.createElement("div");
          item.className = `task-item ${task.done ? "done" : ""}`;
          const dueBadge = formatDueDateBadge(task.dueDate, task.done);

          item.innerHTML = `
            <div class="task-left">
              <button type="button" class="task-checkbox" aria-label="Marcar tarea completada">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <div class="task-content">
                <div class="task-title">${escapeHtml(task.title)}</div>
                ${task.note ? `<div class="task-note">${escapeHtml(task.note)}</div>` : ""}
                <div class="task-badges">
                  <span class="badge badge-freq">${escapeHtml(formatFrequencyLabel(task.frequency))}</span>
                  <span class="badge ${dueBadge.cls}">${escapeHtml(dueBadge.label)}</span>
                  ${task.rescheduledCount > 0 ? `<span class="badge badge-rescheduled">Reprogramada ${task.rescheduledCount}x</span>` : ""}
                </div>
              </div>
            </div>
            <div class="task-actions">
              <button type="button" class="box-icon-btn" data-task-action="reschedule" title="Reprogramar (+1 día)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </button>
              <button type="button" class="box-icon-btn" data-task-action="edit" title="Editar tarea">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button type="button" class="box-icon-btn danger" data-task-action="delete" title="Eliminar tarea">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `;

          item.querySelector(".task-checkbox").addEventListener("click", () => toggleTaskDone(task.id));
          item.querySelector('[data-task-action="reschedule"]').addEventListener("click", () => rescheduleTask(task.id));
          item.querySelector('[data-task-action="edit"]').addEventListener("click", () => openTaskModal(task.id, box.id));
          item.querySelector('[data-task-action="delete"]').addEventListener("click", () => deleteTask(task.id));

          listEl.appendChild(item);
        });
      }

      container.appendChild(card);
    });
  }

  function toggleTaskDone(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.done = !task.done;
    const today = getTodayISO();
    if (task.done) {
      playUiSound("complete");
      appState.history[today] = (appState.history[today] || 0) + 1;
    } else {
      playUiSound("click");
      if (appState.history[today] > 0) appState.history[today]--;
    }
    saveData(true, `${task.done ? "Completó" : "Reabrió"}: ${task.title}`);
    renderBoard();
  }

  function rescheduleTask(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    const baseDate = task.dueDate && task.dueDate >= getTodayISO() ? new Date(task.dueDate + "T00:00:00") : new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, "0");
    const d = String(baseDate.getDate()).padStart(2, "0");
    task.dueDate = `${y}-${m}-${d}`;
    task.rescheduledCount = (task.rescheduledCount || 0) + 1;
    playUiSound("click");
    saveData(true, `Reprogramó: ${task.title}`);
    renderBoard();
    showToast({
      type: "info",
      title: "Tarea reprogramada",
      message: `«${task.title}» se movió para el ${task.dueDate} (reprogramación #${task.rescheduledCount}).`,
      code: "RESCHED-OK"
    });
  }

  function deleteTask(taskId) {
    const idx = appState.data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const removed = appState.data.tasks.splice(idx, 1)[0];
    saveData(true, `Eliminó tarea: ${removed.title}`);
    renderBoard();
    showToast({
      type: "warning",
      title: "Tarea eliminada",
      message: `Se eliminó «${removed.title}». Puedes deshacer esta acción ahora mismo.`,
      code: "DEL-TASK",
      actionLabel: "Deshacer",
      onAction: () => {
        appState.data.tasks.push(removed);
        saveData(false);
        renderBoard();
        showToast({
          type: "success",
          title: "Tarea restaurada",
          message: `«${removed.title}» volvió a su casilla original.`,
          code: "UNDO-OK"
        });
      }
    });
  }

  // Box Modal (Create / Edit)
  function openBoxModal(boxId = null) {
    appState.editingBoxId = boxId;
    const modal = document.getElementById("modal-box");
    const titleEl = document.getElementById("modal-box-title");
    const nameInput = document.getElementById("input-box-name");
    const noteInput = document.getElementById("input-box-note");
    clearFieldValidationError(nameInput, "error-box-name");

    if (boxId) {
      const box = appState.data.boxes.find(b => b.id === boxId);
      if (!box) return;
      titleEl.textContent = "Editar casilla";
      nameInput.value = box.name;
      noteInput.value = box.note || "";
      appState.selectedBoxColor = box.color || "#2563eb";
    } else {
      titleEl.textContent = "Nueva casilla de trabajo";
      nameInput.value = "";
      noteInput.value = "";
      appState.selectedBoxColor = "#2563eb";
    }

    document.querySelectorAll("#box-color-swatches .color-swatch").forEach(sw => {
      sw.classList.toggle("selected", sw.dataset.color === appState.selectedBoxColor);
    });

    modal.classList.add("open");
    setTimeout(() => nameInput.focus(), 80);
  }

  function saveBoxFromModal(e) {
    e.preventDefault();
    const nameInput = document.getElementById("input-box-name");
    const noteInput = document.getElementById("input-box-note");
    const rawName = nameInput.value.trim().toUpperCase();

    clearFieldValidationError(nameInput, "error-box-name");

    if (!rawName) {
      showFieldValidationError(
        nameInput,
        "error-box-name",
        "Ingresa un nombre descriptivo para la casilla (por ejemplo: CASA, TRABAJO o FINANZAS).",
        "ERR-BOX-REQUIRED"
      );
      return;
    }

    const duplicate = appState.data.boxes.find(
      b => b.name.toUpperCase() === rawName && b.id !== appState.editingBoxId
    );
    if (duplicate) {
      showFieldValidationError(
        nameInput,
        "error-box-name",
        `Ya existe una casilla registrada con el nombre «${rawName}». Usa un identificador distinto.`,
        "ERR-BOX-DUPLICATE"
      );
      return;
    }

    if (appState.editingBoxId) {
      const box = appState.data.boxes.find(b => b.id === appState.editingBoxId);
      if (box) {
        box.name = rawName;
        box.note = noteInput.value.trim();
        box.color = appState.selectedBoxColor;
      }
      saveData(true, `Editó casilla: ${rawName}`);
      showToast({
        type: "success",
        title: "Casilla actualizada",
        message: `Los cambios en «${rawName}» fueron guardados correctamente.`,
        code: "BOX-UPD"
      });
    } else {
      const newBox = {
        id: `box_${Date.now()}`,
        name: rawName,
        color: appState.selectedBoxColor,
        note: noteInput.value.trim(),
        collapsed: false,
        order: appState.data.boxes.length
      };
      appState.data.boxes.push(newBox);
      saveData(true, `Creó casilla: ${rawName}`);
      showToast({
        type: "success",
        title: "Casilla creada",
        message: `La casilla «${rawName}» está lista para recibir tareas.`,
        code: "BOX-NEW"
      });
    }

    document.getElementById("modal-box").classList.remove("open");
    renderBoard();
  }

  function confirmDeleteBox(boxId) {
    const box = appState.data.boxes.find(b => b.id === boxId);
    if (!box) return;
    const count = appState.data.tasks.filter(t => t.boxId === boxId).length;
    openConfirmModal({
      title: `¿Eliminar casilla «${box.name}»?`,
      message: count > 0
        ? `Esta acción eliminará la casilla «${box.name}» junto con sus ${count} tarea(s) asociada(s). Se creará automáticamente un respaldo previo en el centro de seguridad.`
        : `Se eliminará la casilla «${box.name}» del tablero principal.`,
      confirmText: "Sí, eliminar casilla",
      onConfirm: () => {
        const backupBoxes = appState.data.boxes.slice();
        const backupTasks = appState.data.tasks.slice();
        appState.data.boxes = appState.data.boxes.filter(b => b.id !== boxId);
        appState.data.tasks = appState.data.tasks.filter(t => t.boxId !== boxId);
        saveData(true, `Eliminó casilla: ${box.name}`);
        renderBoard();
        showToast({
          type: "warning",
          title: `Casilla «${box.name}» eliminada`,
          message: "Se guardó una copia automática en las ranuras de respaldo.",
          code: "BOX-DEL",
          actionLabel: "Deshacer",
          onAction: () => {
            appState.data.boxes = backupBoxes;
            appState.data.tasks = backupTasks;
            saveData(false);
            renderBoard();
          }
        });
      }
    });
  }

  // Task Modal (Create / Edit Detailed)
  function openTaskModal(taskId = null, defaultBoxId = null) {
    if (appState.data.boxes.length === 0) {
      showToast({
        type: "error",
        title: "Sin casillas disponibles",
        message: "Primero debes crear al menos una casilla antes de registrar tareas.",
        code: "ERR-NO-BOXES"
      });
      openBoxModal(null);
      return;
    }

    appState.editingTaskId = taskId;
    const modal = document.getElementById("modal-task");
    const titleEl = document.getElementById("modal-task-header");
    const titleInput = document.getElementById("input-task-title");
    const noteInput = document.getElementById("input-task-note");
    const boxSelect = document.getElementById("select-task-box");
    const freqSelect = document.getElementById("select-task-freq");
    const dateInput = document.getElementById("input-task-date");

    clearFieldValidationError(titleInput, "error-task-title");

    boxSelect.innerHTML = appState.data.boxes
      .map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
      .join("");

    if (taskId) {
      const task = appState.data.tasks.find(t => t.id === taskId);
      if (!task) return;
      titleEl.textContent = "Editar tarea";
      titleInput.value = task.title;
      noteInput.value = task.note || "";
      boxSelect.value = task.boxId;
      freqSelect.value = task.frequency || "daily";
      dateInput.value = task.dueDate || getTodayISO();
    } else {
      titleEl.textContent = "Registrar nueva tarea";
      titleInput.value = "";
      noteInput.value = "";
      boxSelect.value = defaultBoxId || appState.data.boxes[0].id;
      freqSelect.value = "daily";
      dateInput.value = getTodayISO();
    }

    modal.classList.add("open");
    setTimeout(() => titleInput.focus(), 80);
  }

  function saveTaskFromModal(e) {
    e.preventDefault();
    const titleInput = document.getElementById("input-task-title");
    const noteInput = document.getElementById("input-task-note");
    const boxSelect = document.getElementById("select-task-box");
    const freqSelect = document.getElementById("select-task-freq");
    const dateInput = document.getElementById("input-task-date");

    clearFieldValidationError(titleInput, "error-task-title");
    const title = titleInput.value.trim();

    if (!title) {
      showFieldValidationError(
        titleInput,
        "error-task-title",
        "El título de la tarea es obligatorio. Describe la acción concreta a realizar (ej. «Lavar los servicios»).",
        "ERR-TASK-TITLE"
      );
      return;
    }

    if (!dateInput.value) {
      showFieldValidationError(
        dateInput,
        "error-task-title",
        "Selecciona una fecha de ejecución válida para programar la tarea.",
        "ERR-TASK-DATE"
      );
      return;
    }

    if (appState.editingTaskId) {
      const task = appState.data.tasks.find(t => t.id === appState.editingTaskId);
      if (task) {
        task.title = title;
        task.note = noteInput.value.trim();
        task.boxId = boxSelect.value;
        task.frequency = freqSelect.value;
        task.dueDate = dateInput.value;
      }
      saveData(true, `Editó tarea: ${title}`);
      showToast({
        type: "success",
        title: "Tarea actualizada",
        message: `Se guardaron los cambios en «${title}».`,
        code: "TASK-UPD"
      });
    } else {
      const newTask = {
        id: `task_${Date.now()}`,
        boxId: boxSelect.value,
        title,
        note: noteInput.value.trim(),
        done: false,
        createdAt: Date.now(),
        dueDate: dateInput.value,
        frequency: freqSelect.value,
        rescheduledCount: 0,
        order: appState.data.tasks.length
      };
      appState.data.tasks.push(newTask);
      saveData(true, `Nueva tarea: ${title}`);
      showToast({
        type: "success",
        title: "Tarea creada",
        message: `«${title}» fue registrada correctamente.`,
        code: "TASK-NEW"
      });
    }

    document.getElementById("modal-task").classList.remove("open");
    renderBoard();
  }

  // Custom Confirmation Modal
  function openConfirmModal({ title, message, confirmText = "Confirmar", onConfirm }) {
    const modal = document.getElementById("modal-confirm");
    document.getElementById("confirm-modal-title").textContent = title;
    document.getElementById("confirm-modal-msg").textContent = message;
    const btn = document.getElementById("btn-confirm-proceed");
    btn.textContent = confirmText;
    appState.confirmCallback = onConfirm;
    modal.classList.add("open");
  }

  // WhatsApp Report Generator & Clipboard Copy
  function generateWhatsAppReport() {
    const today = getTodayISO();
    const total = appState.data.tasks.length;
    const done = appState.data.tasks.filter(t => t.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    let lines = [
      `📋 *REPORTE TASKY · ${today}*`,
      `⚡ Progreso diario: *${pct}%* (${done}/${total} completadas)`,
      ""
    ];

    appState.data.boxes.forEach(box => {
      const bTasks = appState.data.tasks.filter(t => t.boxId === box.id);
      lines.push(`🗂️ *${box.name}* (${bTasks.filter(t => t.done).length}/${bTasks.length})`);
      if (bTasks.length === 0) {
        lines.push(`   • _Sin tareas registradas_`);
      } else {
        bTasks.forEach(t => {
          const icon = t.done ? "✅" : "⏳";
          const freq = t.frequency === "daily" ? " [Diario]" : "";
          lines.push(`   ${icon} ${t.title}${freq}`);
        });
      }
      lines.push("");
    });

    const text = lines.join("\n").trim();
    const copyDone = () => {
      showToast({
        type: "success",
        title: "Resumen copiado para WhatsApp",
        message: "El reporte formateado ya está en tu portapapeles listo para pegar.",
        code: "WA-COPY-OK"
      });
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(copyDone).catch(() => fallbackCopy(text, copyDone));
    } else {
      fallbackCopy(text, copyDone);
    }
  }

  function fallbackCopy(text, callback) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      callback();
    } catch (e) {
      showToast({
        type: "error",
        title: "Error de acceso al portapapeles",
        message: "Tu navegador bloqueó el copiado automático. Intenta desde las opciones de exportación.",
        code: "ERR-CLIPBOARD"
      });
    }
    document.body.removeChild(ta);
  }

  // Security & Backups Modal
  function openOptionsModal() {
    renderBackupsList();
    const modal = document.getElementById("modal-options");
    clearFieldValidationError(null, "error-import-json");
    modal.classList.add("open");
  }

  function renderBackupsList() {
    const listEl = document.getElementById("backups-list-container");
    const countBadge = document.getElementById("backup-slots-count");
    if (countBadge) countBadge.textContent = `${appState.backups.length} / 20 ranuras`;
    if (!listEl) return;

    if (appState.backups.length === 0) {
      listEl.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:0.82rem;text-align:center;">Los puntos de restauración automáticos aparecerán aquí tras cada cambio.</div>`;
      return;
    }

    listEl.innerHTML = "";
    appState.backups.forEach((bkp, idx) => {
      const d = new Date(bkp.timestamp);
      const timeStr = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = d.toLocaleDateString("es-PE");
      const row = document.createElement("div");
      row.className = "backup-slot-item";
      row.innerHTML = `
        <div>
          <div style="font-weight:700;color:var(--text);">#${idx + 1} · ${escapeHtml(bkp.label || "Respaldo automático")}</div>
          <div style="color:var(--muted);font-size:0.75rem;">${dateStr} ${timeStr} · ${bkp.boxesCount} casilla(s), ${bkp.tasksCount} tarea(s)</div>
        </div>
        <button type="button" class="btn-secondary" style="padding:5px 11px;font-size:0.76rem;">Restaurar</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        if (!bkp.data) return;
        appState.data = normalizeDataPayload(bkp.data);
        saveData(false);
        renderBoard();
        document.getElementById("modal-options").classList.remove("open");
        showToast({
          type: "success",
          title: "Punto de restauración aplicado",
          message: `Se recuperó el estado «${bkp.label}» (${bkp.tasksCount} tareas).`,
          code: "RESTORE-OK"
        });
      });
      listEl.appendChild(row);
    });
  }

  function exportJsonBackup() {
    const exportPayload = {
      version: "Vol. 141 Pro",
      exportedAt: new Date().toISOString(),
      tasky_data: appState.data,
      tasky_settings: appState.settings,
      tasky_history: appState.history,
      boxes: appState.data.boxes,
      tasks: appState.data.tasks
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasky-backup-${getTodayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast({
      type: "success",
      title: "Respaldo JSON exportado",
      message: `Se descargó el archivo «tasky-backup-${getTodayISO()}.json» con todos tus registros.`,
      code: "EXPORT-200"
    });
  }

  function handleImportJsonFile(file) {
    clearFieldValidationError(null, "error-import-json");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      showFieldValidationError(
        null,
        "error-import-json",
        `El archivo «${file.name}» no tiene formato .json. Selecciona un respaldo válido exportado desde Tasky.`,
        "ERR-IMPORT-EXT"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target.result || ""));
        const targetData = parsed.tasky_data ? parsed.tasky_data : parsed;
        if (!targetData || (!Array.isArray(targetData.boxes) && !Array.isArray(targetData.tasks))) {
          showFieldValidationError(
            null,
            "error-import-json",
            "Estructura JSON incompatible: no se encontraron las colecciones requeridas («boxes» y «tasks»).",
            "ERR-IMPORT-SCHEMA"
          );
          return;
        }
        const normalized = normalizeDataPayload(targetData);
        appState.data = normalized;
        saveData(true, `Importación de archivo: ${file.name}`);
        renderBoard();
        renderBackupsList();
        document.getElementById("modal-options").classList.remove("open");
        showToast({
          type: "success",
          title: "Base de datos importada",
          message: `Se cargaron ${normalized.boxes.length} casilla(s) y ${normalized.tasks.length} tarea(s) exitosamente.`,
          code: "IMPORT-200"
        });
      } catch (err) {
        showFieldValidationError(
          null,
          "error-import-json",
          "El archivo JSON está dañado o contiene errores de sintaxis que impiden su lectura segura.",
          "ERR-JSON-PARSE"
        );
      }
    };
    reader.readAsText(file);
  }

  // Productivity Modal & Charts
  function openProductivityModal() {
    const modal = document.getElementById("modal-productivity");
    modal.classList.add("open");

    const tasks = appState.data.tasks;
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    const reschedTotal = tasks.reduce((acc, t) => acc + (t.rescheduledCount || 0), 0);

    document.getElementById("prod-kpi-rate").textContent = `${rate}%`;
    document.getElementById("prod-kpi-done").textContent = String(done);
    document.getElementById("prod-kpi-resched").textContent = String(reschedTotal);

    if (typeof window.Chart === "undefined") return;

    const isDark = appState.settings.theme === "dark";
    const textColor = isDark ? "#cbd5e1" : "#475569";
    const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)";

    // 1. Last 7 Days Trend Chart
    const labels7 = [];
    const values7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${day}`;
      labels7.push(d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" }));
      values7.push(appState.history[iso] || (i === 0 ? done : 0));
    }

    const ctxTrend = document.getElementById("chart-productivity-trend");
    if (ctxTrend) {
      if (appState.charts.trend) appState.charts.trend.destroy();
      appState.charts.trend = new window.Chart(ctxTrend, {
        type: "bar",
        data: {
          labels: labels7,
          datasets: [{
            label: "Tareas completadas",
            data: values7,
            backgroundColor: "#2563eb",
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: textColor }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } }
          }
        }
      });
    }

    // 2. Box Distribution Chart
    const ctxDist = document.getElementById("chart-box-distribution");
    if (ctxDist) {
      if (appState.charts.distribution) appState.charts.distribution.destroy();
      const boxNames = appState.data.boxes.map(b => b.name);
      const boxCounts = appState.data.boxes.map(b => tasks.filter(t => t.boxId === b.id).length);
      const boxColors = appState.data.boxes.map(b => b.color || "#2563eb");

      appState.charts.distribution = new window.Chart(ctxDist, {
        type: "doughnut",
        data: {
          labels: boxNames.length ? boxNames : ["Sin casillas"],
          datasets: [{
            data: boxCounts.some(c => c > 0) ? boxCounts : [1],
            backgroundColor: boxColors.length ? boxColors : ["#94a3b8"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: textColor, boxWidth: 12 } }
          }
        }
      });
    }
  }

  function setTabSelection(tabName) {
    appState.activeTab = tabName;
    appState.specialFilter = null;
    document.querySelectorAll("[data-tab]").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === tabName);
    });
    document.querySelectorAll("[data-mobile-tab]").forEach(b => {
      b.classList.toggle("active", b.dataset.mobileTab === tabName);
    });
    document.getElementById("btn-filter-rescheduled").classList.remove("active-filter");
    document.getElementById("btn-filter-overdue").classList.remove("active-filter");
    renderBoard();
  }

  function initEvents() {
    // Search bar
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear-btn");
    const searchKbd = document.getElementById("search-kbd-hint");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        appState.searchQuery = searchInput.value.trim();
        if (searchClear) searchClear.style.display = appState.searchQuery ? "inline-flex" : "none";
        if (searchKbd) searchKbd.style.display = appState.searchQuery ? "none" : "inline-block";
        renderBoard();
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        searchInput.value = "";
        appState.searchQuery = "";
        searchClear.style.display = "none";
        if (searchKbd) searchKbd.style.display = "inline-block";
        renderBoard();
      });
    }

    // Keyboard shortcut Cmd+K or / for search
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (searchInput) searchInput.focus();
      } else if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop.open").forEach(m => m.classList.remove("open"));
        const fab = document.getElementById("fab-wrapper");
        if (fab) fab.classList.remove("open");
      }
    });

    // Mobile Preview Toggle (for testing phone layout on desktop)
    const btnMobilePreview = document.getElementById("btn-mobile-preview");
    if (btnMobilePreview) {
      btnMobilePreview.addEventListener("click", () => {
        appState.mobilePreview = !appState.mobilePreview;
        document.body.classList.toggle("mobile-preview-mode", appState.mobilePreview);
        btnMobilePreview.classList.toggle("active-preview", appState.mobilePreview);
        showToast({
          type: "info",
          title: appState.mobilePreview ? "Vista Celular activada" : "Vista adaptable estándar",
          message: appState.mobilePreview
            ? "Previsualizando el diseño compacto de 412px para smartphone."
            : "Diseño fluido completo restaurado.",
          code: "VIEW-MOB"
        });
      });
    }

    // Top bar buttons
    document.getElementById("btn-theme-toggle").addEventListener("click", () => {
      appState.settings.theme = appState.settings.theme === "dark" ? "light" : "dark";
      applyTheme();
      saveSettings();
      playUiSound("click");
    });

    document.getElementById("btn-sound-toggle").addEventListener("click", () => {
      appState.settings.soundsEnabled = !appState.settings.soundsEnabled;
      applyTheme();
      saveSettings();
      showToast({
        type: "info",
        title: appState.settings.soundsEnabled ? "Sonidos activados" : "Sonidos silenciados",
        message: appState.settings.soundsEnabled
          ? "Las confirmaciones auditivas suaves están activas."
          : "Se desactivaron los efectos de sonido de la interfaz.",
        code: "AUDIO-CFG"
      });
    });

    document.getElementById("btn-more-options").addEventListener("click", openOptionsModal);
    document.getElementById("sync-pill-btn").addEventListener("click", openOptionsModal);

    // Quote refresh
    document.getElementById("btn-next-quote").addEventListener("click", () => {
      appState.currentQuoteIndex = (appState.currentQuoteIndex + 1) % appState.quotes.length;
      renderQuote(true);
      playUiSound("click");
    });

    // Filter Tabs (Desktop & Mobile Bottom Dock)
    document.querySelectorAll("[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => setTabSelection(btn.dataset.tab));
    });

    document.querySelectorAll("[data-mobile-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        setTabSelection(btn.dataset.mobileTab);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    // Mobile Bottom Bar extra triggers
    const mobNewTask = document.getElementById("mob-nav-new-task");
    if (mobNewTask) mobNewTask.addEventListener("click", () => openTaskModal(null, null));
    const mobProd = document.getElementById("mob-nav-productivity");
    if (mobProd) mobProd.addEventListener("click", openProductivityModal);
    const mobOpts = document.getElementById("mob-nav-options");
    if (mobOpts) mobOpts.addEventListener("click", openOptionsModal);

    // Special Filter Pills
    const btnResched = document.getElementById("btn-filter-rescheduled");
    btnResched.addEventListener("click", () => {
      appState.specialFilter = appState.specialFilter === "rescheduled" ? null : "rescheduled";
      btnResched.classList.toggle("active-filter", appState.specialFilter === "rescheduled");
      document.getElementById("btn-filter-overdue").classList.remove("active-filter");
      renderBoard();
    });

    const btnOverdue = document.getElementById("btn-filter-overdue");
    btnOverdue.addEventListener("click", () => {
      appState.specialFilter = appState.specialFilter === "overdue" ? null : "overdue";
      btnOverdue.classList.toggle("active-filter", appState.specialFilter === "overdue");
      btnResched.classList.remove("active-filter");
      renderBoard();
    });

    document.getElementById("btn-open-productivity").addEventListener("click", openProductivityModal);

    document.getElementById("select-sort-by").addEventListener("change", (e) => {
      appState.sortBy = e.target.value;
      renderBoard();
    });

    // Workspace primary buttons
    document.getElementById("btn-new-box-top").addEventListener("click", () => openBoxModal(null));
    document.getElementById("btn-new-task-top").addEventListener("click", () => openTaskModal(null, null));

    // Box Modal events
    document.getElementById("form-box").addEventListener("submit", saveBoxFromModal);
    document.querySelectorAll("#box-color-swatches .color-swatch").forEach(sw => {
      sw.addEventListener("click", () => {
        appState.selectedBoxColor = sw.dataset.color;
        document.querySelectorAll("#box-color-swatches .color-swatch").forEach(s => s.classList.remove("selected"));
        sw.classList.add("selected");
      });
    });

    // Task Modal events
    document.getElementById("form-task").addEventListener("submit", saveTaskFromModal);

    // Close modal buttons
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.closeModal);
        if (target) target.classList.remove("open");
      });
    });

    // Confirm modal proceed
    document.getElementById("btn-confirm-proceed").addEventListener("click", () => {
      document.getElementById("modal-confirm").classList.remove("open");
      if (typeof appState.confirmCallback === "function") {
        appState.confirmCallback();
        appState.confirmCallback = null;
      }
    });

    // Security & Options Modal actions
    document.getElementById("btn-export-json").addEventListener("click", exportJsonBackup);
    document.getElementById("input-import-json").addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImportJsonFile(e.target.files[0]);
        e.target.value = "";
      }
    });

    document.getElementById("btn-clear-completed").addEventListener("click", () => {
      const doneCount = appState.data.tasks.filter(t => t.done).length;
      if (doneCount === 0) {
        showToast({
          type: "info",
          title: "Sin tareas completadas para limpiar",
          message: "No hay tareas marcadas como completadas en este momento.",
          code: "CLEAN-NONE"
        });
        return;
      }
      appState.data.tasks = appState.data.tasks.filter(t => !t.done);
      saveData(true, `Limpió ${doneCount} tarea(s) completada(s)`);
      renderBoard();
      renderBackupsList();
      showToast({
        type: "success",
        title: "Tablero depurado",
        message: `Se archivaron y limpiaron ${doneCount} tarea(s) completada(s).`,
        code: "CLEAN-OK"
      });
    });

    // Floating Action Button (FAB)
    const fabWrapper = document.getElementById("fab-wrapper");
    document.getElementById("fab-main-trigger").addEventListener("click", () => {
      fabWrapper.classList.toggle("open");
      playUiSound("click");
    });

    document.getElementById("fab-action-whatsapp").addEventListener("click", () => {
      fabWrapper.classList.remove("open");
      generateWhatsAppReport();
    });

    document.getElementById("fab-action-backup").addEventListener("click", () => {
      fabWrapper.classList.remove("open");
      exportJsonBackup();
    });

    document.getElementById("fab-action-new-box").addEventListener("click", () => {
      fabWrapper.classList.remove("open");
      openBoxModal(null);
    });

    document.getElementById("fab-action-new-task").addEventListener("click", () => {
      fabWrapper.classList.remove("open");
      openTaskModal(null, null);
    });
  }

  function boot() {
    loadRegisteredData();
    applyTheme();
    renderHeroDate();
    renderQuote(false);
    initEvents();
    renderBoard();
    document.documentElement.classList.remove("tasky-booting");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
