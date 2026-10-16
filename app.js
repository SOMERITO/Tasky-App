/* ==========================================================================
   TASKY APP ENGINE · COMPLETE RESTORATION + DRAG & DROP + RESCHEDULE MODAL
   ========================================================================== */
"use strict";

(function () {
  const STORAGE_KEYS = {
    DATA: "tasky_data",
    BACKUPS: "tasky_backups",
    SETTINGS: "tasky_settings",
    STATS: "tasky_stats",
    HISTORY: "tasky_history",
    RESTORED_V142: "tasky_restored_v142"
  };

  const memoryStorage = new Map();

  const safeStorage = {
    getItem(key) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {}
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
    }
  };

  const QUOTES_POOL = [{"text": "La dicha del hombre consiste en observar las reglas y condiciones por las cuales se consigue el bien de todos los hombres.", "author": "León Tolstói"}, {"text": "No es que tengamos poco tiempo, sino que perdemos mucho.", "author": "Séneca"}, {"text": "Por cada minuto dedicado a organizar, se gana una hora.", "author": "Benjamin Franklin"}, {"text": "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.", "author": "Aristóteles"}, {"text": "Concéntrate en cada minuto como un romano, haciendo lo que tienes delante con dignidad y precisión.", "author": "Marco Aurelio"}, {"text": "El secreto de salir adelante es simplemente empezar.", "author": "Mark Twain"}, {"text": "Primero di a ti mismo lo que serías; y luego haz lo que tengas que hacer.", "author": "Epicteto"}, {"text": "La simplicidad es la máxima sofisticación.", "author": "Leonardo da Vinci"}, {"text": "Tu mente es para tener ideas, no para retenerlas.", "author": "David Allen"}, {"text": "Lo que se mide se mejora; lo que se planifica con claridad se ejecuta con calma.", "author": "Peter Drucker"}, {"text": "Enfocarse significa decir que no a cien buenas ideas más.", "author": "Steve Jobs"}, {"text": "Pequeñas disciplinas repetidas con consistencia cada día conducen a grandes logros.", "author": "John C. Maxwell"}, {"text": "Ningún viento es favorable para quien no sabe a qué puerto se dirige.", "author": "Séneca"}, {"text": "El orden es el placer de la razón; pero el desorden es el delicia de la imaginación.", "author": "Paul Claudel"}, {"text": "Haz cada cosa en la vida como si fuera lo último que fueras a hacer.", "author": "Marco Aurelio"}, {"text": "El futuro depende de lo que hagas hoy.", "author": "Mahatma Gandhi"}, {"text": "La disciplina es el puente entre las metas y los logros.", "author": "Jim Rohn"}, {"text": "No dejes que lo que no puedes hacer interfiera con lo que sí puedes hacer.", "author": "John Wooden"}, {"text": "Un viaje de mil millas comienza con un solo paso.", "author": "Lao-Tsé"}, {"text": "Quien tiene un porqué para vivir puede soportar casi cualquier cómo.", "author": "Friedrich Nietzsche"}, {"text": "La acción es la clave fundamental de todo éxito.", "author": "Pablo Picasso"}, {"text": "La mejor manera de predecir el futuro es creándolo.", "author": "Peter Drucker"}, {"text": "El hombre que mueve montañas comienza cargando pequeñas piedras.", "author": "Confucio"}, {"text": "No cuentes los días, haz que los días cuenten.", "author": "Muhammad Ali"}, {"text": "La constancia es la virtud por la cual todas las otras virtudes dan su fruto.", "author": "Arturo Graf"}, {"text": "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", "author": "Robert Collier"}, {"text": "La claridad precede a la maestría.", "author": "Robin Sharma"}, {"text": "Nada es particularmente difícil si lo divides en pequeños trabajos.", "author": "Henry Ford"}, {"text": "El sabio no se sienta a lamentarse por lo perdido, sino que se alegra de remediarlo.", "author": "William Shakespeare"}, {"text": "Donde hay orden, hay tranquilidad y progreso.", "author": "Cicerón"}, {"text": "La paciencia es amarga, pero su fruto es dulce.", "author": "Jean-Jacques Rousseau"}, {"text": "El que domina a los otros es fuerte; el que se domina a sí mismo es poderoso.", "author": "Lao-Tsé"}, {"text": "Saber qué hacer elimina el miedo.", "author": "Rosa Parks"}, {"text": "La energía y la persistencia conquistan todas las cosas.", "author": "Benjamin Franklin"}, {"text": "Nunca es demasiado tarde para ser lo que podrías haber sido.", "author": "George Eliot"}, {"text": "Lo que hacemos ahora resuena en la eternidad.", "author": "Marco Aurelio"}, {"text": "La buena fortuna favorece a los audaces y organizados.", "author": "Virgilio"}, {"text": "Empieza donde estás, usa lo que tienes, haz lo que puedas.", "author": "Arthur Ashe"}, {"text": "El tiempo es la cosa más valiosa que una persona puede gastar.", "author": "Teofrasto"}, {"text": "Pensar es fácil. Actuar es difícil. Actuar siguiendo el pensamiento propio es lo más difícil del mundo.", "author": "Johann Wolfgang von Goethe"}];

  function getTodayISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDaysISO(baseIso, days) {
    const d = baseIso ? new Date(baseIso + "T00:00:00") : new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getNextWeekdayISO(targetDay) {
    const d = new Date();
    const current = d.getDay();
    let diff = (targetDay - current + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatSpanishDateLong(isoStr) {
    if (!isoStr) return "";
    const parts = isoStr.split("-");
    if (parts.length !== 3) return isoStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return isoStr;
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
  }

  // Exact User Registered Data from Screenshots (Point 11)
  function buildRestoredUserDataset() {
    const today = getTodayISO();
    const boxes = [
      { id: "box_casa", name: "CASA", color: "#2563eb", collapsed: false, order: 0 },
      { id: "box_mercado", name: "MERCADO", color: "#2563eb", collapsed: false, order: 1 },
      { id: "box_jose", name: "Pendientes José 🧔🏻", color: "#2563eb", collapsed: false, order: 2 },
      { id: "box_leah", name: "Pendientes Leah 👧🏻", color: "#2563eb", collapsed: false, order: 3 },
      { id: "box_abuela", name: "CASA DE ABUELA ROSA", color: "#2563eb", collapsed: false, order: 4 },
      { id: "box_bombero", name: "COMO BOMBERO 🚒", color: "#2563eb", collapsed: false, order: 5 },
      { id: "box_oficina", name: "OFICINA", color: "#f59e0b", collapsed: false, order: 6 }
    ];

    const casaTasks = [
      { title: "Lavar los servicios", frequency: "daily" },
      { title: "Barrer sala, comedor y cuarto", frequency: "once" },
      { title: "Trapear cuarto", frequency: "once" },
      { title: "Trapear sala", frequency: "once" },
      { title: "Cambiar bolsas de basura", frequency: "once" },
      { title: "Ver dónde guardar los libros que saqué", frequency: "once" },
      { title: "Limpiar lavador de platos", frequency: "once" },
      { title: "Limpiar cocina", frequency: "once" },
      { title: "Limpiar lavamanos de nosotros", frequency: "once" },
      { title: "Colgar ropa", frequency: "once" },
      { title: "Ordenar ropa lavada", frequency: "once" },
      { title: "Probar Tasky App", frequency: "once" }
    ];

    const mercadoTasks = [
      "Comprar hojas de impresión",
      "Comprar esponja para cocina",
      "Comprar esponja para baño",
      "Bloqueador de Nivea",
      "Comprar downy",
      "Agua",
      "Ajustador de bota",
      "Jarra",
      "Comprar pollo"
    ];

    const joseTasks = [
      "Acomodar maleta de bombero",
      "Colocar destornillador en su caja de herramientas",
      "Colocar polos que ya no voy a utilizar en una bolsa para poder regalar"
    ];

    const oficinaTasks = [
      {
        title: "Revisar a detalle el trámite de Carta de Permanencia y apuntar los datos en Syncro",
        dueDate: "2026-10-19",
        rescheduledCount: 1,
        isRescheduled: true
      },
      {
        title: "Revisar el caso de Banda sobre la derivación a WSP o en qué caso aplica la plantilla de",
        dueDate: "2026-10-19",
        rescheduledCount: 1,
        isRescheduled: true
      },
      {
        title: "Actualizar dla página de Simulador de Pensiones",
        dueDate: "2026-10-24",
        rescheduledCount: 1,
        isRescheduled: true
      }
    ];

    const tasks = [];
    let tIdx = 0;

    casaTasks.forEach((item, idx) => {
      tasks.push({
        id: `task_casa_${idx + 1}`,
        boxId: "box_casa",
        title: item.title,
        done: false,
        createdAt: Date.now() - (30 - tIdx++) * 60000,
        dueDate: today,
        frequency: item.frequency,
        rescheduledCount: 0,
        isRescheduled: false,
        order: idx
      });
    });

    mercadoTasks.forEach((title, idx) => {
      tasks.push({
        id: `task_mercado_${idx + 1}`,
        boxId: "box_mercado",
        title,
        done: false,
        createdAt: Date.now() - (30 - tIdx++) * 60000,
        dueDate: today,
        frequency: "once",
        rescheduledCount: 0,
        isRescheduled: false,
        order: idx
      });
    });

    joseTasks.forEach((title, idx) => {
      tasks.push({
        id: `task_jose_${idx + 1}`,
        boxId: "box_jose",
        title,
        done: false,
        createdAt: Date.now() - (30 - tIdx++) * 60000,
        dueDate: today,
        frequency: "once",
        rescheduledCount: 0,
        isRescheduled: false,
        order: idx
      });
    });

    oficinaTasks.forEach((item, idx) => {
      tasks.push({
        id: `task_oficina_${idx + 1}`,
        boxId: "box_oficina",
        title: item.title,
        done: false,
        createdAt: Date.now() - (30 - tIdx++) * 60000,
        dueDate: item.dueDate,
        frequency: "once",
        rescheduledCount: item.rescheduledCount,
        isRescheduled: true,
        order: idx
      });
    });

    return {
      boxes,
      tasks,
      monthlyCompletedBase: 66
    };
  }

  const appState = {
    data: {
      boxes: [],
      tasks: [],
      monthlyCompletedBase: 66
    },
    settings: {
      theme: "light",
      soundsEnabled: true
    },
    backups: [],
    history: {},
    activeTab: "all", // 'all' | 'today' | 'completed'
    searchQuery: "",
    quotes: QUOTES_POOL.slice(),
    currentQuoteIndex: 0,
    quoteTimer: null,
    reschedulingTaskId: null,
    editingBoxId: null,
    confirmCallback: null,
    draggedTaskId: null,
    draggedBoxId: null,
    charts: {
      trend: null,
      distribution: null
    }
  };

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Minimal Fast Notification Pill (Point 10: disappears quickly, only states the change)
  function showToast(message, isError = false) {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    // Keep maximum 2 pills at a time so it never clutters
    while (stack.children.length >= 2) {
      stack.firstElementChild.remove();
    }

    const pill = document.createElement("div");
    pill.className = `mini-toast ${isError ? "error" : ""}`;
    pill.innerHTML = `<span class="mini-toast-dot"></span><span>${escapeHtml(message)}</span>`;
    stack.appendChild(pill);

    const duration = isError ? 1800 : 1150;
    setTimeout(() => {
      pill.style.opacity = "0";
      pill.style.transform = "translateY(-8px) scale(0.95)";
      setTimeout(() => {
        if (pill.parentNode) pill.remove();
      }, 220);
    }, duration);
  }

  function normalizeDataPayload(raw) {
    if (!raw || typeof raw !== "object") return null;
    const today = getTodayISO();
    const boxesRaw = Array.isArray(raw.boxes) ? raw.boxes : [];
    const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : [];

    const boxes = boxesRaw.map((b, idx) => ({
      ...b,
      id: String(b.id || `box_${Date.now()}_${idx}`),
      name: String(b.name || b.title || "CASILLA").trim(),
      color: String(b.color || "#2563eb"),
      collapsed: Boolean(b.collapsed),
      order: typeof b.order === "number" ? b.order : idx
    }));

    const tasks = tasksRaw.map((t, idx) => {
      const due = String(t.dueDate || today);
      const isResched = Boolean(t.isRescheduled || (t.rescheduledCount && t.rescheduledCount > 0) || due > today);
      return {
        ...t,
        id: String(t.id || `task_${Date.now()}_${idx}`),
        boxId: String(t.boxId || (boxes[0] ? boxes[0].id : "box_casa")),
        title: String(t.title || t.name || "Tarea").trim(),
        done: Boolean(t.done || t.completed),
        createdAt: Number(t.createdAt || Date.now()),
        dueDate: due,
        frequency: String(t.frequency || "once"),
        rescheduledCount: Number(t.rescheduledCount || (isResched ? 1 : 0)),
        isRescheduled: isResched,
        order: typeof t.order === "number" ? t.order : idx
      };
    });

    return {
      ...raw,
      boxes,
      tasks,
      monthlyCompletedBase: typeof raw.monthlyCompletedBase === "number" ? raw.monthlyCompletedBase : 66
    };
  }

  function loadRegisteredData() {
    const rawSettings = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      try {
        appState.settings = { ...appState.settings, ...JSON.parse(rawSettings) };
      } catch (e) {}
    }

    const rawBackups = safeStorage.getItem(STORAGE_KEYS.BACKUPS);
    if (rawBackups) {
      try {
        const parsedBkp = JSON.parse(rawBackups);
        if (Array.isArray(parsedBkp)) appState.backups = parsedBkp;
      } catch (e) {}
    }

    const rawHistory = safeStorage.getItem(STORAGE_KEYS.HISTORY) || safeStorage.getItem(STORAGE_KEYS.STATS);
    if (rawHistory) {
      try {
        appState.history = JSON.parse(rawHistory) || {};
      } catch (e) {}
    }

    let loaded = null;
    const rawPrimary = safeStorage.getItem(STORAGE_KEYS.DATA);
    if (rawPrimary) {
      try {
        loaded = normalizeDataPayload(JSON.parse(rawPrimary));
      } catch (e) {
        loaded = null;
      }
    }

    const alreadyRestoredV143 = safeStorage.getItem("tasky_restored_v143_full");
    if (!loaded || (!loaded.boxes.length && !loaded.tasks.length)) {
      loaded = buildRestoredUserDataset();
      safeStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(loaded));
      safeStorage.setItem("tasky_restored_v143_full", "true");
    } else if (!alreadyRestoredV143) {
      // Merge both missing boxes AND missing tasks inside existing boxes (e.g. CASA's 12 tasks) without losing any user-created items
      const baseline = buildRestoredUserDataset();
      baseline.boxes.forEach((baseBox) => {
        let targetBox = loaded.boxes.find(b => b.name.trim().toUpperCase() === baseBox.name.trim().toUpperCase());
        if (!targetBox) {
          targetBox = { ...baseBox, order: loaded.boxes.length };
          loaded.boxes.push(targetBox);
        }
        const existingTitlesInBox = new Set(
          loaded.tasks.filter(t => t.boxId === targetBox.id).map(t => t.title.trim().toLowerCase())
        );
        const baseTasksForBox = baseline.tasks.filter(t => t.boxId === baseBox.id);
        baseTasksForBox.forEach((bt) => {
          if (!existingTitlesInBox.has(bt.title.trim().toLowerCase())) {
            loaded.tasks.push({
              ...bt,
              boxId: targetBox.id,
              order: loaded.tasks.filter(t => t.boxId === targetBox.id).length
            });
          }
        });
      });
      loaded.monthlyCompletedBase = Math.max(loaded.monthlyCompletedBase || 0, 66);
      safeStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(loaded));
      safeStorage.setItem("tasky_restored_v143_full", "true");
    }

    appState.data = loaded;
  }

  function saveData(recordBackup = true, actionLabel = "Cambio guardado") {
    const payloadStr = JSON.stringify(appState.data);
    safeStorage.setItem(STORAGE_KEYS.DATA, payloadStr);

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
      if (appState.backups.length > 20) appState.backups = appState.backups.slice(0, 20);
      safeStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(appState.backups));
    }

    safeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(appState.history));
    safeStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(appState.history));
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
        ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    }
  }

  function renderHeroDate() {
    const el = document.getElementById("current-date-display");
    if (!el) return;
    const now = new Date();
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    el.textContent = `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  }

  // Constant Automatic Quote Rotation (Point 5)
  function renderQuote(animate = false) {
    const pool = appState.quotes;
    if (!pool.length) return;
    const quote = pool[appState.currentQuoteIndex % pool.length];
    const box = document.getElementById("quote-container");
    const textEl = document.getElementById("quote-text");
    const authorEl = document.getElementById("quote-author");
    if (!textEl || !authorEl || !quote) return;

    if (animate && box) {
      box.style.opacity = "0";
      box.style.transform = "translateY(4px)";
      setTimeout(() => {
        textEl.textContent = quote.text;
        authorEl.textContent = `— ${quote.author}`;
        box.style.opacity = "1";
        box.style.transform = "translateY(0)";
      }, 240);
    } else {
      textEl.textContent = quote.text;
      authorEl.textContent = `— ${quote.author}`;
    }
  }

  function startQuoteRotation() {
    if (appState.quoteTimer) clearInterval(appState.quoteTimer);
    appState.quoteTimer = setInterval(() => {
      appState.currentQuoteIndex = (appState.currentQuoteIndex + 1) % appState.quotes.length;
      renderQuote(true);
    }, 7000);
  }

  function isTaskRescheduledFuture(task) {
    const today = getTodayISO();
    return !task.done && Boolean(task.isRescheduled || (task.dueDate && task.dueDate > today));
  }

  function isTaskOverdue(task) {
    const today = getTodayISO();
    return !task.done && Boolean(task.dueDate && task.dueDate < today);
  }

  function isTaskForToday(task) {
    return !isTaskRescheduledFuture(task);
  }

  // Update 4-Card Dashboard Metrics
  function updateMetrics() {
    const tasks = appState.data.tasks;
    const boxes = appState.data.boxes;

    const todayTasks = tasks.filter(t => isTaskForToday(t));
    const totalToday = todayTasks.length;
    const doneToday = todayTasks.filter(t => t.done).length;
    const pendingToday = todayTasks.filter(t => !t.done).length;
    const dailyPct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

    // Circumference = 2 * PI * 20 = 125.66
    const ring = document.getElementById("daily-progress-ring");
    if (ring) {
      const offset = 125.6 - (dailyPct / 100) * 125.6;
      ring.style.strokeDashoffset = String(offset);
      ring.style.stroke = dailyPct === 100 ? "var(--success)" : "var(--primary)";
    }

    document.getElementById("metric-daily-pct").textContent = `${dailyPct}%`;
    document.getElementById("metric-daily-sub").textContent = `${doneToday} de ${totalToday} tareas de hoy`;

    // Active execution boxes = boxes that have at least 1 task for today not done
    const activeBoxesCount = boxes.filter(b =>
      tasks.some(t => t.boxId === b.id && !t.done && isTaskForToday(t))
    ).length;

    document.getElementById("metric-boxes-count").textContent = String(activeBoxesCount);
    document.getElementById("metric-pending-count").textContent = String(pendingToday);

    const totalDoneNow = tasks.filter(t => t.done).length;
    const monthlyTotal = (appState.data.monthlyCompletedBase || 66) + totalDoneNow;
    document.getElementById("metric-completed-count").textContent = String(monthlyTotal);

    const reschedTasks = tasks.filter(t => isTaskRescheduledFuture(t));
    const overdueTasks = tasks.filter(t => isTaskOverdue(t));

    document.getElementById("badge-rescheduled-count").textContent = String(reschedTasks.length);
    document.getElementById("badge-overdue-count").textContent = String(overdueTasks.length);
  }

  function matchesSearch(task, boxName) {
    if (!appState.searchQuery) return true;
    const q = appState.searchQuery.toLowerCase();
    return task.title.toLowerCase().includes(q) || (boxName || "").toLowerCase().includes(q);
  }

  function renderBoard() {
    updateMetrics();
    const container = document.getElementById("boxes-container");
    if (!container) return;
    container.innerHTML = "";

    const sortedBoxes = appState.data.boxes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedBoxes.forEach((box, boxIdx) => {
      const boxTasksAll = appState.data.tasks
        .filter(t => t.boxId === box.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Pending tasks in this box (completed tasks move to the TAREAS COMPLETADAS box at the bottom or show in Completadas tab)
      const pendingBoxTasks = boxTasksAll.filter(t => !t.done);
      const doneBoxTasks = boxTasksAll.filter(t => t.done);

      let visibleTasks = [];
      if (appState.activeTab === "completed") {
        visibleTasks = doneBoxTasks.filter(t => matchesSearch(t, box.name));
      } else if (appState.activeTab === "today") {
        visibleTasks = pendingBoxTasks.filter(t => isTaskForToday(t) && matchesSearch(t, box.name));
      } else {
        visibleTasks = pendingBoxTasks.filter(t => matchesSearch(t, box.name));
      }

      if (appState.searchQuery && visibleTasks.length === 0 && !box.name.toLowerCase().includes(appState.searchQuery.toLowerCase())) {
        return;
      }

      const reschedInBox = pendingBoxTasks.filter(t => isTaskRescheduledFuture(t));
      const todayInBox = pendingBoxTasks.filter(t => isTaskForToday(t));
      const totalTodayBox = todayInBox.length + doneBoxTasks.length;
      const pctTodayBox = totalTodayBox > 0 ? Math.round((doneBoxTasks.length / totalTodayBox) * 100) : 0;

      // Dynamic Box Theme if Box has Rescheduled Tasks (Point 11)
      const hasRescheduled = reschedInBox.length > 0;

      const card = document.createElement("section");
      card.className = `box-card ${box.collapsed ? "collapsed" : ""} ${hasRescheduled ? "box-rescheduled-theme" : ""}`;
      card.dataset.boxId = box.id;

      // Status Badges under Box Name matching Original Screenshot
      let badgesHtml = "";
      if (hasRescheduled && todayInBox.length === 0) {
        badgesHtml = `
          <span class="box-pill amber">🕒 ${reschedInBox.length} reprogramada${reschedInBox.length === 1 ? "" : "s"}</span>
          <span class="box-pill amber">Fuera de hoy</span>
        `;
      } else if (hasRescheduled && todayInBox.length > 0) {
        badgesHtml = `
          <span class="box-pill neutral">${todayInBox.length} pendiente${todayInBox.length === 1 ? "" : "s"}</span>
          <span class="box-pill amber">🕒 ${reschedInBox.length} reprogramada${reschedInBox.length === 1 ? "" : "s"}</span>
          <span class="box-pill blue">${pctTodayBox}% hoy</span>
        `;
      } else if (totalTodayBox === 0) {
        badgesHtml = `
          <span class="box-pill neutral">0 pendientes</span>
          <span class="box-pill blue">Sin tareas hoy</span>
        `;
      } else {
        badgesHtml = `
          <span class="box-pill neutral">${todayInBox.length} pendiente${todayInBox.length === 1 ? "" : "s"}</span>
          <span class="box-pill blue">${pctTodayBox}% hoy</span>
        `;
      }

      const rightLabel = hasRescheduled && todayInBox.length === 0
        ? "—"
        : (totalTodayBox === 0 ? "—" : `${doneBoxTasks.length}/${totalTodayBox} hoy`);

      const barFillWidth = hasRescheduled && todayInBox.length === 0 ? 100 : pctTodayBox;

      card.innerHTML = `
        <div class="box-top-row">
          <div class="box-title-left">
            <div class="box-heading-line">
              <span class="drag-handle box-drag-handle" draggable="true" title="Arrastrar para mover casilla">⋮⋮</span>
              <button type="button" class="collapse-btn" data-box-action="collapse" title="Colapsar o expandir casilla">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <h2 class="box-name" title="Clic para renombrar casilla">${escapeHtml(box.name)}</h2>
            </div>
            <div class="box-badges-row">${badgesHtml}</div>
          </div>

          <div class="box-header-actions">
            <button type="button" class="box-ctrl-btn" data-box-action="move-up" title="Subir casilla">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button type="button" class="box-ctrl-btn" data-box-action="move-down" title="Bajar casilla">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button type="button" class="box-ctrl-btn sort-btn" data-box-action="sort-alpha" title="Ordenar tareas A-Z">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/></svg>
            </button>
            <button type="button" class="box-ctrl-btn delete-btn" data-box-action="delete" title="Eliminar casilla">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <div class="box-progress-row">
          <div class="box-progress-bar">
            <div class="box-progress-fill" style="width:${barFillWidth}%;"></div>
          </div>
          <span class="box-progress-label">${escapeHtml(rightLabel)}</span>
        </div>

        <div class="box-body">
          <div class="tasks-list" data-box-list="${escapeHtml(box.id)}"></div>
          <button type="button" class="add-task-BarBtn" data-box-action="show-inline-add">+ Añadir tarea</button>
          <form class="inline-add-form" data-box-form="${escapeHtml(box.id)}">
            <input type="text" class="inline-add-input" placeholder="Escribe la tarea y presiona Enter..." maxlength="180" />
            <button type="submit" class="btn-primary" style="padding:6px 12px;font-size:0.78rem;">Guardar</button>
            <button type="button" class="btn-secondary" data-box-action="cancel-inline-add" style="padding:6px 10px;font-size:0.78rem;">✕</button>
          </form>
        </div>
      `;

      // Box Drag & Drop Events (Point 9)
      const boxHandle = card.querySelector(".box-top-row");
      boxHandle.setAttribute("draggable", "true");
      boxHandle.addEventListener("dragstart", (e) => {
        if (e.target.closest("button")) { e.preventDefault(); return; }
        appState.draggedBoxId = box.id;
        appState.draggedTaskId = null;
        card.classList.add("dragging-box");
        e.dataTransfer.effectAllowed = "move";
      });
      boxHandle.addEventListener("dragend", () => {
        appState.draggedBoxId = null;
        card.classList.remove("dragging-box");
        document.querySelectorAll(".box-card").forEach(c => c.classList.remove("drag-over-box"));
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (appState.draggedBoxId && appState.draggedBoxId !== box.id) {
          card.classList.add("drag-over-box");
        }
      });
      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over-box");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over-box");
        if (appState.draggedBoxId && appState.draggedBoxId !== box.id) {
          reorderBoxesByDrop(appState.draggedBoxId, box.id);
        } else if (appState.draggedTaskId) {
          moveTaskToBox(appState.draggedTaskId, box.id, null);
        }
      });

      // Box Header Controls
      card.querySelector('[data-box-action="collapse"]').addEventListener("click", () => {
        box.collapsed = !box.collapsed;
        saveData(false);
        renderBoard();
      });

      card.querySelector(".box-name").addEventListener("click", () => openBoxModal(box.id));

      card.querySelector('[data-box-action="move-up"]').addEventListener("click", () => {
        if (boxIdx === 0) return;
        const prev = sortedBoxes[boxIdx - 1];
        const tmp = box.order;
        box.order = prev.order;
        prev.order = tmp;
        saveData(false);
        renderBoard();
        showToast("Casilla movida arriba");
      });

      card.querySelector('[data-box-action="move-down"]').addEventListener("click", () => {
        if (boxIdx >= sortedBoxes.length - 1) return;
        const next = sortedBoxes[boxIdx + 1];
        const tmp = box.order;
        box.order = next.order;
        next.order = tmp;
        saveData(false);
        renderBoard();
        showToast("Casilla movida abajo");
      });

      card.querySelector('[data-box-action="sort-alpha"]').addEventListener("click", () => {
        const bTasks = appState.data.tasks.filter(t => t.boxId === box.id);
        bTasks.sort((a, b) => a.title.localeCompare(b.title));
        bTasks.forEach((t, i) => { t.order = i; });
        saveData(true, `Orden A-Z en ${box.name}`);
        renderBoard();
        showToast("Tareas ordenadas A-Z");
      });

      card.querySelector('[data-box-action="delete"]').addEventListener("click", () => confirmDeleteBox(box.id));

      // Inline "+ Añadir tarea" inside Box
      const addBarBtn = card.querySelector('[data-box-action="show-inline-add"]');
      const inlineForm = card.querySelector(".inline-add-form");
      const inlineInput = card.querySelector(".inline-add-input");

      addBarBtn.addEventListener("click", () => {
        addBarBtn.style.display = "none";
        inlineForm.classList.add("open");
        inlineInput.focus();
      });

      card.querySelector('[data-box-action="cancel-inline-add"]').addEventListener("click", () => {
        inlineForm.classList.remove("open");
        addBarBtn.style.display = "flex";
        inlineInput.value = "";
      });

      inlineForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = inlineInput.value.trim();
        if (!title) {
          inlineInput.classList.add("input-invalid");
          setTimeout(() => inlineInput.classList.remove("input-invalid"), 400);
          showToast("Escribe el nombre de la tarea", true);
          return;
        }
        const newTask = {
          id: `task_${Date.now()}`,
          boxId: box.id,
          title,
          done: false,
          createdAt: Date.now(),
          dueDate: getTodayISO(),
          frequency: "once",
          rescheduledCount: 0,
          isRescheduled: false,
          order: boxTasksAll.length
        };
        appState.data.tasks.push(newTask);
        saveData(true, `Añadió tarea en ${box.name}`);
        renderBoard();
        showToast("Tarea agregada");
      });

      // Render Tasks inside Box
      const listEl = card.querySelector(".tasks-list");
      visibleTasks.forEach((task) => {
        listEl.appendChild(createTaskRowElement(task, box));
      });

      container.appendChild(card);
    });

    // AUTOMATIC "TAREAS COMPLETADAS" BOX AT BOTTOM WHEN TASKS ARE COMPLETED (Point 11)
    const allCompletedTasks = appState.data.tasks.filter(t => t.done && matchesSearch(t, "Tareas completadas"));
    if (allCompletedTasks.length > 0 && appState.activeTab !== "completed") {
      const compCard = document.createElement("section");
      compCard.className = "box-card box-completed-theme";
      compCard.innerHTML = `
        <div class="box-top-row">
          <div class="box-title-left">
            <div class="box-heading-line">
              <span style="color:var(--success);display:inline-flex;align-items:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </span>
              <h2 class="box-name" style="color:var(--success);">TAREAS COMPLETADAS</h2>
            </div>
            <div class="box-badges-row" style="padding-left:26px;">
              <span class="box-pill green">✓ ${allCompletedTasks.length} completada${allCompletedTasks.length === 1 ? "" : "s"} hoy</span>
            </div>
          </div>
          <div class="box-header-actions">
            <button type="button" class="btn-secondary" id="btn-clear-completed-inline" style="padding:5px 10px;font-size:0.74rem;">Limpiar completadas</button>
          </div>
        </div>
        <div class="box-body">
          <div class="tasks-list" id="completed-box-tasks-list"></div>
        </div>
      `;

      const compList = compCard.querySelector("#completed-box-tasks-list");
      allCompletedTasks.forEach((task) => {
        const originBox = appState.data.boxes.find(b => b.id === task.boxId);
        compList.appendChild(createTaskRowElement(task, originBox, true));
      });

      const clearBtn = compCard.querySelector("#btn-clear-completed-inline");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          appState.data.tasks = appState.data.tasks.filter(t => !t.done);
          saveData(true, "Limpió tareas completadas");
          renderBoard();
          showToast("Tareas completadas archivadas");
        });
      }

      container.appendChild(compCard);
    }
  }

  function createTaskRowElement(task, box, showOriginBox = false) {
    const item = document.createElement("div");
    item.className = `task-item ${task.done ? "done" : ""}`;
    item.draggable = true;
    item.dataset.taskId = task.id;

    const isResched = isTaskRescheduledFuture(task);
    const isDaily = task.frequency === "daily";

    let subBadges = "";
    if (isDaily) {
      subBadges += `<span class="task-daily-pill">🔁 Todos los días</span>`;
    }
    if (isResched) {
      subBadges += `<span class="task-resched-tag">🕒 Reprogramada · ${escapeHtml(formatSpanishDateLong(task.dueDate))}</span>`;
    }
    if (showOriginBox && box) {
      subBadges += `<span class="box-pill neutral" style="font-size:0.65rem;">${escapeHtml(box.name)}</span>`;
    }

    item.innerHTML = `
      <div class="task-left">
        <span class="drag-handle task-drag-handle" title="Arrastrar tarea">⋮⋮</span>
        <button type="button" class="task-check-circle" aria-label="Completar tarea">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <div class="task-text-wrap">
          <div class="task-title" title="Clic para editar texto de la tarea">${escapeHtml(task.title)}</div>
          ${subBadges ? `<div class="task-sub-badges">${subBadges}</div>` : ""}
        </div>
      </div>

      <div class="task-right-actions">
        <button type="button" class="task-act-btn ${!isResched && !task.done ? "sun-active" : ""}" data-task-action="today" title="Mover a Para hoy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </button>
        <button type="button" class="task-act-btn ${isResched ? "calendar-active" : ""}" data-task-action="reschedule" title="Reprogramar / Cambiar fecha">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
        <button type="button" class="task-act-btn ${isDaily ? "repeat-active" : ""}" data-task-action="toggle-daily" title="Repetir todos los días">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </button>
        <button type="button" class="task-act-btn del-btn" data-task-action="delete" title="Eliminar tarea">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    // Task Drag & Drop Events (Point 9)
    item.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      appState.draggedTaskId = task.id;
      appState.draggedBoxId = null;
      item.classList.add("dragging-task");
      e.dataTransfer.effectAllowed = "move";
    });

    item.addEventListener("dragend", () => {
      appState.draggedTaskId = null;
      item.classList.remove("dragging-task");
      document.querySelectorAll(".task-item").forEach(el => el.classList.remove("drag-over-task"));
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (appState.draggedTaskId && appState.draggedTaskId !== task.id) {
        item.classList.add("drag-over-task");
      }
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over-task");
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.classList.remove("drag-over-task");
      if (appState.draggedTaskId && appState.draggedTaskId !== task.id) {
        moveTaskToBox(appState.draggedTaskId, task.boxId, task.id);
      }
    });

    // Task Actions
    item.querySelector(".task-check-circle").addEventListener("click", () => toggleTaskDone(task.id));
    item.querySelector(".task-title").addEventListener("click", () => openEditTaskTitleModal(task.id));

    item.querySelector('[data-task-action="today"]').addEventListener("click", () => {
      task.dueDate = getTodayISO();
      task.isRescheduled = false;
      task.rescheduledCount = 0;
      saveData(true, `Movió a hoy: ${task.title}`);
      renderBoard();
      showToast("Movida para hoy");
    });

    item.querySelector('[data-task-action="reschedule"]').addEventListener("click", () => {
      openDatePickerModal(task.id);
    });

    item.querySelector('[data-task-action="toggle-daily"]').addEventListener("click", () => {
      task.frequency = task.frequency === "daily" ? "once" : "daily";
      saveData(true, `Frecuencia actualizada: ${task.title}`);
      renderBoard();
      showToast(task.frequency === "daily" ? "Frecuencia: Todos los días" : "Frecuencia: Una vez");
    });

    item.querySelector('[data-task-action="delete"]').addEventListener("click", () => {
      deleteTask(task.id);
    });

    return item;
  }

  function reorderBoxesByDrop(draggedBoxId, targetBoxId) {
    const sorted = appState.data.boxes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const fromIdx = sorted.findIndex(b => b.id === draggedBoxId);
    const toIdx = sorted.findIndex(b => b.id === targetBoxId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    sorted.forEach((b, idx) => { b.order = idx; });
    saveData(false);
    renderBoard();
    showToast("Orden de casillas actualizado");
  }

  function moveTaskToBox(draggedTaskId, targetBoxId, beforeTaskId = null) {
    const draggedTask = appState.data.tasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) return;
    draggedTask.boxId = targetBoxId;

    const boxTasks = appState.data.tasks
      .filter(t => t.boxId === targetBoxId && t.id !== draggedTaskId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (beforeTaskId) {
      const targetIdx = boxTasks.findIndex(t => t.id === beforeTaskId);
      if (targetIdx !== -1) {
        boxTasks.splice(targetIdx, 0, draggedTask);
      } else {
        boxTasks.push(draggedTask);
      }
    } else {
      boxTasks.push(draggedTask);
    }

    boxTasks.forEach((t, idx) => { t.order = idx; });
    saveData(false);
    renderBoard();
    showToast("Tarea movida de lugar");
  }

  function toggleTaskDone(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.done = !task.done;
    const today = getTodayISO();
    if (task.done) {
      appState.history[today] = (appState.history[today] || 0) + 1;
      showToast("Tarea completada");
    } else {
      if (appState.history[today] > 0) appState.history[today]--;
      showToast("Tarea reabierta");
    }
    saveData(true, `${task.done ? "Completó" : "Reabrió"}: ${task.title}`);
    renderBoard();
  }

  function deleteTask(taskId) {
    const idx = appState.data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const removed = appState.data.tasks.splice(idx, 1)[0];
    saveData(true, `Eliminó: ${removed.title}`);
    renderBoard();
    showToast("Tarea eliminada");
  }

  // Date Picker / Reschedule Modal (Point 8)
  function openDatePickerModal(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    appState.reschedulingTaskId = taskId;
    document.getElementById("resched-task-name").textContent = task.title;
    const dateInput = document.getElementById("input-resched-date");
    dateInput.value = task.dueDate && task.dueDate > getTodayISO() ? task.dueDate : addDaysISO(getTodayISO(), 1);
    document.getElementById("modal-date-picker").classList.add("open");
  }

  function applyTaskRescheduleDate(newDateIso, moveToToday = false) {
    const task = appState.data.tasks.find(t => t.id === appState.reschedulingTaskId);
    if (!task) return;
    const today = getTodayISO();

    if (moveToToday || newDateIso <= today) {
      task.dueDate = today;
      task.isRescheduled = false;
      task.rescheduledCount = 0;
      showToast("Programada para hoy");
    } else {
      task.dueDate = newDateIso;
      task.isRescheduled = true;
      task.rescheduledCount = (task.rescheduledCount || 0) + 1;
      showToast(`Reprogramada · ${formatSpanishDateLong(newDateIso)}`);
    }

    document.getElementById("modal-date-picker").classList.remove("open");
    saveData(true, `Reprogramó: ${task.title}`);
    renderBoard();
    if (document.getElementById("modal-rescheduled-list").classList.contains("open")) {
      renderRescheduledModalList();
    }
  }

  // "Tareas reprogramadas" Modal (Exact Match to Screenshot 2)
  function openRescheduledModal() {
    renderRescheduledModalList();
    document.getElementById("modal-rescheduled-list").classList.add("open");
  }

  function renderRescheduledModalList() {
    const container = document.getElementById("rescheduled-modal-items");
    if (!container) return;
    const reschedTasks = appState.data.tasks.filter(t => isTaskRescheduledFuture(t));

    if (reschedTasks.length === 0) {
      container.innerHTML = `
        <div style="padding:28px 16px;text-align:center;color:var(--muted);font-size:0.88rem;">
          No tienes tareas reprogramadas fuera de hoy.
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    reschedTasks.forEach((task) => {
      const box = appState.data.boxes.find(b => b.id === task.boxId);
      const boxName = box ? box.name : "CASILLA";
      const card = document.createElement("div");
      card.className = "resched-modal-card";
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
          <button type="button" class="resched-sun-btn" title="Traer a Para hoy">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          </button>
          <div style="min-width:0;flex:1;">
            <div style="font-weight:700;font-size:0.88rem;color:var(--text);line-height:1.35;">${escapeHtml(task.title)}</div>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:3px;">${escapeHtml(boxName)} · Para ${escapeHtml(formatSpanishDateLong(task.dueDate))}</div>
          </div>
        </div>
        <button type="button" class="resched-cal-btn" title="Cambiar fecha">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
      `;

      card.querySelector(".resched-sun-btn").addEventListener("click", () => {
        task.dueDate = getTodayISO();
        task.isRescheduled = false;
        task.rescheduledCount = 0;
        saveData(true, `Movió a hoy: ${task.title}`);
        renderBoard();
        renderRescheduledModalList();
        showToast("Tarea movida para hoy");
      });

      card.querySelector(".resched-cal-btn").addEventListener("click", () => {
        openDatePickerModal(task.id);
      });

      container.appendChild(card);
    });
  }

  // Edit Task Title Modal
  function openEditTaskTitleModal(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    appState.editingTaskId = taskId;
    const input = document.getElementById("input-edit-task-title");
    input.value = task.title;
    document.getElementById("modal-edit-task").classList.add("open");
    setTimeout(() => input.focus(), 60);
  }

  // Box Create / Edit Modal
  function openBoxModal(boxId = null) {
    appState.editingBoxId = boxId;
    const modal = document.getElementById("modal-box");
    const titleEl = document.getElementById("modal-box-title");
    const nameInput = document.getElementById("input-box-name");

    if (boxId) {
      const box = appState.data.boxes.find(b => b.id === boxId);
      if (!box) return;
      titleEl.textContent = "Renombrar casilla";
      nameInput.value = box.name;
    } else {
      titleEl.textContent = "Nueva casilla";
      nameInput.value = "";
    }
    modal.classList.add("open");
    setTimeout(() => nameInput.focus(), 60);
  }

  function confirmDeleteBox(boxId) {
    const box = appState.data.boxes.find(b => b.id === boxId);
    if (!box) return;
    document.getElementById("confirm-modal-title").textContent = `¿Eliminar «${box.name}»?`;
    document.getElementById("confirm-modal-msg").textContent = `Se eliminará la casilla «${box.name}» y sus tareas asociadas.`;
    appState.confirmCallback = () => {
      appState.data.boxes = appState.data.boxes.filter(b => b.id !== boxId);
      appState.data.tasks = appState.data.tasks.filter(t => t.boxId !== boxId);
      saveData(true, `Eliminó casilla: ${box.name}`);
      renderBoard();
      showToast("Casilla eliminada");
    };
    document.getElementById("modal-confirm").classList.add("open");
  }

  // WhatsApp Report Copy
  function generateWhatsAppReport() {
    const today = getTodayISO();
    const todayTasks = appState.data.tasks.filter(t => isTaskForToday(t));
    const done = todayTasks.filter(t => t.done).length;
    const pct = todayTasks.length > 0 ? Math.round((done / todayTasks.length) * 100) : 0;

    let lines = [
      `📋 *TASKY · ${formatSpanishDateLong(today)}*`,
      `⚡ Progreso: *${pct}%* (${done}/${todayTasks.length})`,
      ""
    ];

    appState.data.boxes.forEach(box => {
      const bTasks = appState.data.tasks.filter(t => t.boxId === box.id);
      if (!bTasks.length) return;
      lines.push(`🗂️ *${box.name}*`);
      bTasks.forEach(t => {
        const icon = t.done ? "✅" : (isTaskRescheduledFuture(t) ? "🕒" : "⏳");
        lines.push(`  ${icon} ${t.title}`);
      });
      lines.push("");
    });

    const text = lines.join("\n").trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast("Copiado para WhatsApp"));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); showToast("Copiado para WhatsApp"); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function exportJsonBackup() {
    const exportPayload = {
      version: "Tasky Pro",
      exportedAt: new Date().toISOString(),
      tasky_data: appState.data,
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
    showToast("Respaldo exportado");
  }

  function openProductivityModal() {
    const modal = document.getElementById("modal-productivity");
    modal.classList.add("open");

    const tasks = appState.data.tasks;
    const todayTasks = tasks.filter(t => isTaskForToday(t));
    const done = todayTasks.filter(t => t.done).length;
    const rate = todayTasks.length > 0 ? Math.round((done / todayTasks.length) * 100) : 0;
    const reschedCount = tasks.filter(t => isTaskRescheduledFuture(t)).length;

    document.getElementById("prod-kpi-rate").textContent = `${rate}%`;
    document.getElementById("prod-kpi-done").textContent = String((appState.data.monthlyCompletedBase || 66) + done);
    document.getElementById("prod-kpi-resched").textContent = String(reschedCount);

    if (typeof window.Chart === "undefined") return;
    const isDark = appState.settings.theme === "dark";
    const textColor = isDark ? "#cbd5e1" : "#475569";

    const ctxDist = document.getElementById("chart-box-distribution");
    if (ctxDist) {
      if (appState.charts.distribution) appState.charts.distribution.destroy();
      const activeBoxes = appState.data.boxes.filter(b => tasks.some(t => t.boxId === b.id));
      appState.charts.distribution = new window.Chart(ctxDist, {
        type: "doughnut",
        data: {
          labels: activeBoxes.map(b => b.name),
          datasets: [{
            data: activeBoxes.map(b => tasks.filter(t => t.boxId === b.id).length),
            backgroundColor: ["#2563eb", "#4f46e5", "#0d9488", "#f59e0b", "#e11d48", "#7c3aed"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { color: textColor, boxWidth: 12 } } }
        }
      });
    }
  }

  function initEvents() {
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear-btn");

    searchInput.addEventListener("input", () => {
      appState.searchQuery = searchInput.value.trim();
      searchClear.style.display = appState.searchQuery ? "inline-flex" : "none";
      renderBoard();
    });

    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      appState.searchQuery = "";
      searchClear.style.display = "none";
      renderBoard();
    });

    // Point 2: Direct Ctrl+F and Cmd+K search focus without any badge text
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop.open").forEach(m => m.classList.remove("open"));
        document.getElementById("fab-wrapper").classList.remove("open");
      }
    });

    // Click quote to advance immediately + reset timer
    document.getElementById("quote-container").addEventListener("click", () => {
      appState.currentQuoteIndex = (appState.currentQuoteIndex + 1) % appState.quotes.length;
      renderQuote(true);
      startQuoteRotation();
    });

    document.getElementById("btn-theme-toggle").addEventListener("click", () => {
      appState.settings.theme = appState.settings.theme === "dark" ? "light" : "dark";
      applyTheme();
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
      showToast(appState.settings.theme === "dark" ? "Modo oscuro" : "Modo claro");
    });

    document.getElementById("btn-more-options").addEventListener("click", () => {
      document.getElementById("modal-options").classList.add("open");
    });

    document.getElementById("sync-pill-btn").addEventListener("click", () => {
      document.getElementById("modal-options").classList.add("open");
    });

    // Filter Tabs
    document.querySelectorAll("[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        appState.activeTab = btn.dataset.tab;
        document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b === btn));
        renderBoard();
      });
    });

    // Rescheduled & Productivity Pills
    document.getElementById("btn-filter-rescheduled").addEventListener("click", openRescheduledModal);
    document.getElementById("btn-open-productivity").addEventListener("click", openProductivityModal);
    document.getElementById("btn-filter-overdue").addEventListener("click", () => {
      const overdue = appState.data.tasks.filter(t => isTaskOverdue(t));
      if (overdue.length === 0) {
        showToast("Sin tareas atrasadas");
      } else {
        openRescheduledModal();
      }
    });

    // Date Picker Modal Events
    document.querySelectorAll("[data-date-preset]").forEach(btn => {
      btn.addEventListener("click", () => {
        const preset = btn.dataset.datePreset;
        const today = getTodayISO();
        if (preset === "today") {
          applyTaskRescheduleDate(today, true);
        } else if (preset === "tomorrow") {
          applyTaskRescheduleDate(addDaysISO(today, 1), false);
        } else if (preset === "monday") {
          applyTaskRescheduleDate(getNextWeekdayISO(1), false);
        } else if (preset === "saturday") {
          applyTaskRescheduleDate(getNextWeekdayISO(6), false);
        }
      });
    });

    document.getElementById("form-date-picker").addEventListener("submit", (e) => {
      e.preventDefault();
      const val = document.getElementById("input-resched-date").value;
      if (!val) {
        showToast("Selecciona una fecha válida", true);
        return;
      }
      applyTaskRescheduleDate(val, false);
    });

    // Box Form Submit
    document.getElementById("form-box").addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("input-box-name");
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.classList.add("input-invalid");
        setTimeout(() => nameInput.classList.remove("input-invalid"), 400);
        showToast("Ingresa un nombre de casilla", true);
        return;
      }
      if (appState.editingBoxId) {
        const box = appState.data.boxes.find(b => b.id === appState.editingBoxId);
        if (box) box.name = name;
        showToast("Casilla actualizada");
      } else {
        appState.data.boxes.push({
          id: `box_${Date.now()}`,
          name,
          color: "#2563eb",
          collapsed: false,
          order: appState.data.boxes.length
        });
        showToast("Casilla creada");
      }
      saveData(true, `Casilla: ${name}`);
      document.getElementById("modal-box").classList.remove("open");
      renderBoard();
    });

    // Edit Task Title Form Submit
    document.getElementById("form-edit-task").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("input-edit-task-title");
      const val = input.value.trim();
      if (!val) {
        input.classList.add("input-invalid");
        setTimeout(() => input.classList.remove("input-invalid"), 400);
        showToast("El título no puede estar vacío", true);
        return;
      }
      const task = appState.data.tasks.find(t => t.id === appState.editingTaskId);
      if (task) task.title = val;
      saveData(true, `Editó: ${val}`);
      document.getElementById("modal-edit-task").classList.remove("open");
      renderBoard();
      showToast("Tarea actualizada");
    });

    // Confirm Modal
    document.getElementById("btn-confirm-proceed").addEventListener("click", () => {
      document.getElementById("modal-confirm").classList.remove("open");
      if (typeof appState.confirmCallback === "function") {
        appState.confirmCallback();
        appState.confirmCallback = null;
      }
    });

    // Options Modal Buttons
    document.getElementById("btn-export-json").addEventListener("click", exportJsonBackup);
    document.getElementById("btn-restore-initial-records").addEventListener("click", () => {
      appState.data = buildRestoredUserDataset();
      saveData(true, "Restauró registros originales");
      document.getElementById("modal-options").classList.remove("open");
      renderBoard();
      showToast("Registros originales restaurados");
    });

    document.getElementById("input-import-json").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(String(ev.target.result || ""));
          const target = parsed.tasky_data ? parsed.tasky_data : parsed;
          const norm = normalizeDataPayload(target);
          if (!norm || !norm.boxes.length) {
            showToast("Archivo de respaldo inválido", true);
            return;
          }
          appState.data = norm;
          saveData(true, "Importó respaldo JSON");
          document.getElementById("modal-options").classList.remove("open");
          renderBoard();
          showToast("Respaldo importado");
        } catch (err) {
          showToast("Error al leer el archivo JSON", true);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    // Close Modals
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.closeModal);
        if (target) target.classList.remove("open");
      });
    });

    // Bottom-right Floating Buttons
    const fabWrapper = document.getElementById("fab-wrapper");
    document.getElementById("fab-main-trigger").addEventListener("click", () => {
      fabWrapper.classList.toggle("open");
    });

    document.getElementById("fab-collapse-all").addEventListener("click", () => {
      const anyExpanded = appState.data.boxes.some(b => !b.collapsed);
      appState.data.boxes.forEach(b => { b.collapsed = anyExpanded; });
      saveData(false);
      renderBoard();
      showToast(anyExpanded ? "Casillas colapsadas" : "Casillas expandidas");
    });

    document.getElementById("fab-action-new-box").addEventListener("click", () => {
      fabWrapper.classList.remove("open");
      openBoxModal(null);
    });

    document.getElementById("fab-action-whatsapp").addEventListener("click", () => {
      fabWrapper.classList.remove("open");
      generateWhatsAppReport();
    });

    document.getElementById("fab-action-backup").addEventListener("click", () => {
      fabWrapper.classList.remove("open");
      exportJsonBackup();
    });
  }

  function boot() {
    loadRegisteredData();
    applyTheme();
    renderHeroDate();
    renderQuote(false);
    startQuoteRotation();
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
