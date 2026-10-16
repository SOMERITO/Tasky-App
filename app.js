/* ==========================================================================
   TASKY APP ENGINE · VOL. 144 · HOLD-TO-DRAG + CUSTOM REPEAT + PRO ANALYTICS
   ========================================================================== */
"use strict";

(function () {
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

  const QUOTES_POOL = [{"text": "La dicha del hombre consiste en observar las reglas y condiciones por las cuales se consigue el bien de todos los hombres.", "author": "León Tolstói"}, {"text": "No es que tengamos poco tiempo, sino que perdemos mucho.", "author": "Séneca"}, {"text": "Por cada minuto dedicado a organizar, se gana una hora.", "author": "Benjamin Franklin"}, {"text": "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.", "author": "Aristóteles"}, {"text": "Concéntrate en cada minuto como un romano, haciendo lo que tienes delante con dignidad y precisión.", "author": "Marco Aurelio"}, {"text": "El secreto de salir adelante es simplemente empezar.", "author": "Mark Twain"}, {"text": "Primero di a ti mismo lo que serías; y luego haz lo que tengas que hacer.", "author": "Epicteto"}, {"text": "La simplicidad es la máxima sofisticación.", "author": "Leonardo da Vinci"}, {"text": "Tu mente es para tener ideas, no para retenerlas.", "author": "David Allen"}, {"text": "Lo que se mide se mejora; lo que se planifica con claridad se ejecuta con calma.", "author": "Peter Drucker"}, {"text": "Enfocarse significa decir que no a cien buenas ideas más.", "author": "Steve Jobs"}, {"text": "Pequeñas disciplinas repetidas con consistencia cada día conducen a grandes logros.", "author": "John C. Maxwell"}, {"text": "Ningún viento es favorable para quien no sabe a qué puerto se dirige.", "author": "Séneca"}, {"text": "El orden es el placer de la razón; pero el desorden es la delicia de la imaginación.", "author": "Paul Claudel"}, {"text": "Haz cada cosa en la vida como si fuera lo último que fueras a hacer.", "author": "Marco Aurelio"}, {"text": "El futuro depende de lo que hagas hoy.", "author": "Mahatma Gandhi"}, {"text": "La disciplina es el puente entre las metas y los logros.", "author": "Jim Rohn"}, {"text": "No dejes que lo que no puedes hacer interfiera con lo que sí puedes hacer.", "author": "John Wooden"}, {"text": "Un viaje de mil millas comienza con un solo paso.", "author": "Lao-Tsé"}, {"text": "Quien tiene un porqué para vivir puede soportar casi cualquier cómo.", "author": "Friedrich Nietzsche"}, {"text": "La acción es la clave fundamental de todo éxito.", "author": "Pablo Picasso"}, {"text": "La mejor manera de predecir el futuro es creándolo.", "author": "Peter Drucker"}, {"text": "El hombre que mueve montañas comienza cargando pequeñas piedras.", "author": "Confucio"}, {"text": "No cuentes los días, haz que los días cuenten.", "author": "Muhammad Ali"}, {"text": "La constancia es la virtud por la cual todas las otras virtudes dan su fruto.", "author": "Arturo Graf"}, {"text": "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", "author": "Robert Collier"}, {"text": "La claridad precede a la maestría.", "author": "Robin Sharma"}, {"text": "Nada es particularmente difícil si lo divides en pequeños trabajos.", "author": "Henry Ford"}, {"text": "El sabio no se sienta a lamentarse por lo perdido, sino que se alegra de remediarlo.", "author": "William Shakespeare"}, {"text": "Donde hay orden, hay tranquilidad y progreso.", "author": "Cicerón"}, {"text": "La paciencia es amarga, pero su fruto es dulce.", "author": "Jean-Jacques Rousseau"}, {"text": "El que domina a los otros es fuerte; el que se domina a sí mismo es poderoso.", "author": "Lao-Tsé"}, {"text": "Saber qué hacer elimina el miedo.", "author": "Rosa Parks"}, {"text": "La energía y la persistencia conquistan todas las cosas.", "author": "Benjamin Franklin"}, {"text": "Nunca es demasiado tarde para ser lo que podrías haber sido.", "author": "George Eliot"}, {"text": "Lo que hacemos ahora resuena en la eternidad.", "author": "Marco Aurelio"}, {"text": "La buena fortuna favorece a los audaces y organizados.", "author": "Virgilio"}, {"text": "Empieza donde estás, usa lo que tienes, haz lo que puedas.", "author": "Arthur Ashe"}, {"text": "El tiempo es la cosa más valiosa que una persona puede gastar.", "author": "Teofrasto"}, {"text": "Pensar es fácil. Actuar es difícil. Actuar siguiendo el pensamiento propio es lo más difícil del mundo.", "author": "Johann Wolfgang von Goethe"}];
  const DAY_SHORT_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const DAY_FULL_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${DAY_FULL_NAMES[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
  }

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
      { title: "Lavar los servicios", frequency: "daily", repeatDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: "Barrer sala, comedor y cuarto", frequency: "once", repeatDays: [] },
      { title: "Trapear cuarto", frequency: "once", repeatDays: [] },
      { title: "Trapear sala", frequency: "once", repeatDays: [] },
      { title: "Cambiar bolsas de basura", frequency: "once", repeatDays: [] },
      { title: "Ver dónde guardar los libros que saqué", frequency: "once", repeatDays: [] },
      { title: "Limpiar lavador de platos", frequency: "once", repeatDays: [] },
      { title: "Limpiar cocina", frequency: "once", repeatDays: [] },
      { title: "Limpiar lavamanos de nosotros", frequency: "once", repeatDays: [] },
      { title: "Colgar ropa", frequency: "once", repeatDays: [] },
      { title: "Ordenar ropa lavada", frequency: "once", repeatDays: [] },
      { title: "Probar Tasky App", frequency: "once", repeatDays: [] }
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
        repeatDays: item.repeatDays,
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
        repeatDays: [],
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
        repeatDays: [],
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
        repeatDays: [],
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
    activeTab: "all",
    searchQuery: "",
    quotes: QUOTES_POOL.slice(),
    currentQuoteIndex: 0,
    quoteTimer: null,
    reschedulingTaskId: null,
    repeatingTaskId: null,
    selectedRepeatDays: [],
    editingBoxId: null,
    editingTaskId: null,
    confirmCallback: null,
    charts: {
      trend: null,
      distribution: null,
      balance: null
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

  // Point 6: Web Audio API Sound Engine + Sound Toggle Button
  let sharedAudioCtx = null;
  function playUiSound(type) {
    if (!appState.settings.soundsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
      if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();

      const now = sharedAudioCtx.currentTime;
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);

      if (type === "complete") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.26); // C6
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "dragReady") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(392.00, now); // G4
        osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.11); // D5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "drop") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(493.88, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (type === "delete") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(349.23, now);
        osc.frequency.exponentialRampToValueAtTime(246.94, now + 0.14);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.17);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.05);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.start(now);
        osc.stop(now + 0.07);
      }
    } catch (e) {}
  }

  // Point 12: Celebratory Particle Burst on Checkbox Complete
  function spawnCompletionParticles(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ["#4285f4", "#9b72cb", "#d96570", "#fbbc04", "#34a853", "#22c55e"];

    for (let i = 0; i < 12; i++) {
      const dot = document.createElement("span");
      dot.className = "particle-burst-dot";
      const angle = (Math.PI * 2 * i) / 12;
      const dist = 22 + Math.random() * 18;
      dot.style.left = `${cx - 3}px`;
      dot.style.top = `${cy - 3}px`;
      dot.style.background = colors[i % colors.length];
      dot.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      dot.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 650);
    }
  }

  // Point 4 & 10: Fast Minimal Notification Pill below Top Navbar
  function showToast(message, isError = false) {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    while (stack.children.length >= 2) {
      stack.firstElementChild.remove();
    }

    const pill = document.createElement("div");
    pill.className = `mini-toast ${isError ? "error" : ""}`;
    pill.innerHTML = `<span class="mini-toast-dot"></span><span>${escapeHtml(message)}</span>`;
    stack.appendChild(pill);

    const duration = isError ? 1750 : 1150;
    setTimeout(() => {
      pill.style.opacity = "0";
      pill.style.transform = "translateY(-8px) scale(0.95)";
      setTimeout(() => {
        if (pill.parentNode) pill.remove();
      }, 200);
    }, duration);
  }

  // Point 10: Professional Floating Tooltip System
  function initProTooltips() {
    const tooltip = document.getElementById("pro-tooltip");
    const titleEl = document.getElementById("pro-tooltip-title-text");
    const descEl = document.getElementById("pro-tooltip-desc-text");
    if (!tooltip || !titleEl || !descEl) return;

    let activeTarget = null;

    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest("[data-tip-title]");
      if (!target) {
        if (activeTarget) {
          activeTarget = null;
          tooltip.classList.remove("visible");
        }
        return;
      }
      activeTarget = target;
      titleEl.textContent = target.dataset.tipTitle || "";
      descEl.textContent = target.dataset.tipDesc || "";
      tooltip.classList.add("visible");

      const rect = target.getBoundingClientRect();
      const ttWidth = 240;
      let left = rect.left + rect.width / 2 - ttWidth / 2;
      left = Math.max(12, Math.min(window.innerWidth - ttWidth - 12, left));
      let top = rect.bottom + 10;
      if (top + 70 > window.innerHeight) {
        top = rect.top - 68;
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    document.addEventListener("mousedown", () => {
      tooltip.classList.remove("visible");
    });
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
      const freq = String(t.frequency || "once");
      let repDays = Array.isArray(t.repeatDays) ? t.repeatDays : [];
      if (freq === "daily" && repDays.length === 0) repDays = [0, 1, 2, 3, 4, 5, 6];
      return {
        ...t,
        id: String(t.id || `task_${Date.now()}_${idx}`),
        boxId: String(t.boxId || (boxes[0] ? boxes[0].id : "box_casa")),
        title: String(t.title || t.name || "Tarea").trim(),
        done: Boolean(t.done || t.completed),
        createdAt: Number(t.createdAt || Date.now()),
        dueDate: due,
        frequency: freq,
        repeatDays: repDays,
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
      if (appState.backups.length > 20) appState.backups = appState.backups.slice(0, 20);
      safeStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(appState.backups));
    }

    safeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(appState.history));
    safeStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(appState.history));

    const modalSyncTime = document.getElementById("modal-sync-last-time");
    if (modalSyncTime) {
      const now = new Date();
      modalSyncTime.textContent = `${now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} (${ok ? "Almacenamiento local activo" : "Memoria activa"})`;
    }
  }

  function applyThemeAndSoundUI() {
    if (appState.settings.theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    const themeBtn = document.getElementById("btn-theme-toggle");
    if (themeBtn) {
      themeBtn.innerHTML = appState.settings.theme === "dark"
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    }

    const soundBtn = document.getElementById("btn-sound-toggle");
    if (soundBtn) {
      soundBtn.classList.toggle("sound-muted", !appState.settings.soundsEnabled);
      soundBtn.innerHTML = appState.settings.soundsEnabled
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    }
  }

  function renderHeroDate() {
    const el = document.getElementById("current-date-display");
    if (!el) return;
    const now = new Date();
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    el.textContent = `${DAY_FULL_NAMES[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  }

  // Point 2: Quote rotation set to 75 seconds (1 min 15 sec)
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
      }, 260);
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
    }, 75000);
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

  // Format Repeat Schedule Label (Point 8)
  function formatRepeatBadgeLabel(task) {
    const days = Array.isArray(task.repeatDays) ? task.repeatDays.slice().sort((a, b) => a - b) : [];
    if (task.frequency === "daily" || days.length === 7) {
      return "🔁 Todos los días";
    }
    if (task.frequency === "weekdays" || (days.length === 5 && days.join(",") === "1,2,3,4,5")) {
      return "🔁 Lunes a viernes";
    }
    if (task.frequency === "weekends" || (days.length === 2 && days.join(",") === "0,6")) {
      return "🔁 Fines de semana";
    }
    if (days.length === 1) {
      return `🔁 Solo ${DAY_FULL_NAMES[days[0]]}`;
    }
    if (days.length > 1) {
      return `🔁 ${days.map(d => DAY_SHORT_NAMES[d]).join(", ")}`;
    }
    return "";
  }

  function updateMetrics() {
    const tasks = appState.data.tasks;
    const boxes = appState.data.boxes;

    const todayTasks = tasks.filter(t => isTaskForToday(t));
    const totalToday = todayTasks.length;
    const doneToday = todayTasks.filter(t => t.done).length;
    const pendingToday = todayTasks.filter(t => !t.done).length;
    const dailyPct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

    const ring = document.getElementById("daily-progress-ring");
    if (ring) {
      const offset = 125.6 - (dailyPct / 100) * 125.6;
      ring.style.strokeDashoffset = String(offset);
      ring.style.stroke = dailyPct === 100 ? "var(--success)" : "var(--primary)";
    }

    document.getElementById("metric-daily-pct").textContent = `${dailyPct}%`;
    document.getElementById("metric-daily-sub").textContent = `${doneToday} de ${totalToday} tareas de hoy`;

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

  // ==========================================================================
  // POINT 7: HOLD-TO-DRAG ENGINE WITH LOADING LINE, LIVE DROP PREVIEW & AUTO-SCROLL
  // ==========================================================================
  const dragEngine = {
    holdTimer: null,
    chargingEl: null,
    activeType: null, // 'task' | 'box'
    activeId: null,
    activeEl: null,
    previewSlot: null,
    autoScrollRaf: null,
    autoScrollVelocity: 0,
    startX: 0,
    startY: 0
  };

  function cancelHoldCharge() {
    if (dragEngine.holdTimer) {
      clearTimeout(dragEngine.holdTimer);
      dragEngine.holdTimer = null;
    }
    if (dragEngine.chargingEl) {
      dragEngine.chargingEl.classList.remove("is-charging");
      dragEngine.chargingEl = null;
    }
  }

  function stopAutoScrollLoop() {
    if (dragEngine.autoScrollRaf) {
      cancelAnimationFrame(dragEngine.autoScrollRaf);
      dragEngine.autoScrollRaf = null;
    }
    dragEngine.autoScrollVelocity = 0;
  }

  function runAutoScrollLoop() {
    if (dragEngine.autoScrollVelocity !== 0) {
      window.scrollBy(0, dragEngine.autoScrollVelocity);
    }
    if (dragEngine.activeId) {
      dragEngine.autoScrollRaf = requestAnimationFrame(runAutoScrollLoop);
    }
  }

  function beginHoldDrag(type, id, element, clientX, clientY) {
    cancelHoldCharge();
    dragEngine.startX = clientX;
    dragEngine.startY = clientY;
    dragEngine.chargingEl = element;
    element.classList.add("is-charging");

    dragEngine.holdTimer = setTimeout(() => {
      dragEngine.holdTimer = null;
      element.classList.remove("is-charging");
      dragEngine.activeType = type;
      dragEngine.activeId = id;
      dragEngine.activeEl = element;

      element.classList.add("is-held-dragging");
      playUiSound("dragReady");

      // Create live Drop Preview Slot right after the active element
      const slot = document.createElement("div");
      slot.className = `drop-preview-slot ${type === "box" ? "box-slot" : ""}`;
      slot.innerHTML = `<span>✨ Vista previa: Soltar aquí para ubicar ${type === "box" ? "la casilla" : "la tarea"}</span>`;
      dragEngine.previewSlot = slot;
      element.parentNode.insertBefore(slot, element.nextSibling);

      runAutoScrollLoop();
    }, 380);
  }

  function handleGlobalPointerMove(e) {
    const clientX = e.clientX;
    const clientY = e.clientY;

    // If still charging hold, cancel if user moved finger/mouse more than 12px (scrolling)
    if (dragEngine.holdTimer) {
      const dist = Math.hypot(clientX - dragEngine.startX, clientY - dragEngine.startY);
      if (dist > 12) {
        cancelHoldCharge();
      }
      return;
    }

    if (!dragEngine.activeId || !dragEngine.previewSlot) return;

    // Auto-scroll when pointer is near top or bottom of viewport (Point 7)
    const edgeThreshold = 95;
    if (clientY < edgeThreshold) {
      dragEngine.autoScrollVelocity = -Math.max(4, Math.round((edgeThreshold - clientY) / 5));
    } else if (clientY > window.innerHeight - edgeThreshold) {
      dragEngine.autoScrollVelocity = Math.max(4, Math.round((clientY - (window.innerHeight - edgeThreshold)) / 5));
    } else {
      dragEngine.autoScrollVelocity = 0;
    }

    const hitElements = document.elementsFromPoint(clientX, clientY);

    if (dragEngine.activeType === "task") {
      const overTask = hitElements.find(el => el.classList && el.classList.contains("task-item") && el !== dragEngine.activeEl);
      if (overTask && overTask.parentNode) {
        const rect = overTask.getBoundingClientRect();
        const insertBefore = clientY < rect.top + rect.height / 2;
        overTask.parentNode.insertBefore(
          dragEngine.previewSlot,
          insertBefore ? overTask : overTask.nextSibling
        );
        return;
      }

      const overBox = hitElements.find(el => el.classList && el.classList.contains("box-card") && el.dataset.boxId);
      if (overBox) {
        const listEl = overBox.querySelector(".tasks-list");
        if (listEl && !listEl.contains(dragEngine.previewSlot)) {
          listEl.appendChild(dragEngine.previewSlot);
        }
      }
    } else if (dragEngine.activeType === "box") {
      const overBox = hitElements.find(
        el => el.classList && el.classList.contains("box-card") && el.dataset.boxId && el !== dragEngine.activeEl
      );
      if (overBox && overBox.parentNode) {
        const rect = overBox.getBoundingClientRect();
        const insertBefore = clientY < rect.top + rect.height / 2;
        overBox.parentNode.insertBefore(
          dragEngine.previewSlot,
          insertBefore ? overBox : overBox.nextSibling
        );
      }
    }
  }

  function handleGlobalPointerUp() {
    cancelHoldCharge();
    stopAutoScrollLoop();

    if (!dragEngine.activeId) return;

    const { activeType, activeId, activeEl, previewSlot } = dragEngine;
    if (activeEl) activeEl.classList.remove("is-held-dragging");

    if (previewSlot && previewSlot.parentNode) {
      if (activeType === "task") {
        const listEl = previewSlot.closest(".tasks-list");
        const targetBoxId = listEl ? listEl.dataset.boxList : null;
        if (targetBoxId) {
          // Determine the new order inside targetBoxId based on previewSlot position
          const task = appState.data.tasks.find(t => t.id === activeId);
          if (task) {
            task.boxId = targetBoxId;
            // Place activeEl at previewSlot position to read exact order
            previewSlot.parentNode.insertBefore(activeEl, previewSlot);
            previewSlot.remove();
            const siblingIds = Array.from(listEl.querySelectorAll(".task-item")).map(el => el.dataset.taskId);
            siblingIds.forEach((id, idx) => {
              const tObj = appState.data.tasks.find(x => x.id === id);
              if (tObj) tObj.order = idx;
            });
            playUiSound("drop");
            saveData(true, `Movió tarea: ${task.title}`);
            renderBoard();
            showToast("Tarea reubicada");
          }
        }
      } else if (activeType === "box") {
        const container = document.getElementById("boxes-container");
        if (container && previewSlot.parentNode === container) {
          container.insertBefore(activeEl, previewSlot);
          previewSlot.remove();
          const boxIds = Array.from(container.querySelectorAll(".box-card[data-box-id]")).map(el => el.dataset.boxId);
          boxIds.forEach((id, idx) => {
            const bObj = appState.data.boxes.find(x => x.id === id);
            if (bObj) bObj.order = idx;
          });
          playUiSound("drop");
          saveData(true, "Reordenó casillas");
          renderBoard();
          showToast("Casilla reubicada");
        }
      }
      if (previewSlot.parentNode) previewSlot.remove();
    }

    dragEngine.activeType = null;
    dragEngine.activeId = null;
    dragEngine.activeEl = null;
    dragEngine.previewSlot = null;
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

      const hasRescheduled = reschedInBox.length > 0;

      const card = document.createElement("section");
      card.className = `box-card ${box.collapsed ? "collapsed" : ""} ${hasRescheduled ? "box-rescheduled-theme" : ""}`;
      card.dataset.boxId = box.id;

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

      // Point 9: Up/Down buttons on LEFT side, Collapse/Expand on RIGHT side, and NO alphabetical sort button
      card.innerHTML = `
        <div class="hold-charge-bar"><div class="hold-charge-fill"></div></div>
        <div class="box-top-row">
          <div class="box-title-left">
            <div class="box-heading-line">
              <div class="box-left-move-btns">
                <button type="button" class="box-ctrl-btn" data-box-action="move-up" data-tip-title="▲ Subir casilla" data-tip-desc="Desplaza este bloque una posición hacia arriba en tu tablero.">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <button type="button" class="box-ctrl-btn" data-box-action="move-down" data-tip-title="▼ Bajar casilla" data-tip-desc="Desplaza este bloque una posición hacia abajo en tu tablero.">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
              <h2 class="box-name" data-tip-title="✏️ Renombrar casilla" data-tip-desc="Haz clic para modificar el nombre de esta casilla de trabajo.">${escapeHtml(box.name)}</h2>
            </div>
            <div class="box-badges-row">${badgesHtml}</div>
          </div>

          <div class="box-header-actions">
            <button type="button" class="box-ctrl-btn collapse-right-btn" data-box-action="collapse" data-tip-title="⌄ Plegar o desplegar casilla" data-tip-desc="Oculta o muestra el listado de tareas de este bloque para despejar tu vista.">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button type="button" class="box-ctrl-btn delete-btn" data-box-action="delete" data-tip-title="🗑️ Eliminar casilla" data-tip-desc="Elimina este bloque y sus tareas asociadas previa confirmación de seguridad.">
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
          <button type="button" class="add-task-BarBtn" data-box-action="show-inline-add" data-tip-title="➕ Añadir nueva tarea" data-tip-desc="Abre el campo rápido para registrar una tarea directamente en esta casilla.">+ Añadir tarea</button>
          <form class="inline-add-form" data-box-form="${escapeHtml(box.id)}">
            <input type="text" class="inline-add-input" placeholder="Escribe la tarea y presiona Enter..." maxlength="180" />
            <button type="submit" class="btn-primary" style="padding:7px 14px;font-size:0.8rem;">Guardar</button>
            <button type="button" class="btn-secondary" data-box-action="cancel-inline-add" style="padding:7px 11px;font-size:0.8rem;">✕</button>
          </form>
        </div>
      `;

      // Hold-to-Drag on Box Header (Point 7)
      const boxTopRow = card.querySelector(".box-top-row");
      boxTopRow.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button") || e.target.closest(".box-name")) return;
        beginHoldDrag("box", box.id, card, e.clientX, e.clientY);
      });

      card.querySelector('[data-box-action="collapse"]').addEventListener("click", () => {
        playUiSound("tap");
        box.collapsed = !box.collapsed;
        saveData(false);
        renderBoard();
      });

      card.querySelector(".box-name").addEventListener("click", () => {
        playUiSound("tap");
        openBoxModal(box.id);
      });

      card.querySelector('[data-box-action="move-up"]').addEventListener("click", () => {
        if (boxIdx === 0) return;
        playUiSound("tap");
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
        playUiSound("tap");
        const next = sortedBoxes[boxIdx + 1];
        const tmp = box.order;
        box.order = next.order;
        next.order = tmp;
        saveData(false);
        renderBoard();
        showToast("Casilla movida abajo");
      });

      card.querySelector('[data-box-action="delete"]').addEventListener("click", () => {
        playUiSound("tap");
        confirmDeleteBox(box.id);
      });

      const addBarBtn = card.querySelector('[data-box-action="show-inline-add"]');
      const inlineForm = card.querySelector(".inline-add-form");
      const inlineInput = card.querySelector(".inline-add-input");

      addBarBtn.addEventListener("click", () => {
        playUiSound("tap");
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
          repeatDays: [],
          rescheduledCount: 0,
          isRescheduled: false,
          order: boxTasksAll.length
        };
        appState.data.tasks.push(newTask);
        playUiSound("complete");
        saveData(true, `Añadió tarea en ${box.name}`);
        renderBoard();
        showToast("Tarea agregada");
      });

      const listEl = card.querySelector(".tasks-list");
      visibleTasks.forEach((task) => {
        listEl.appendChild(createTaskRowElement(task, box));
      });

      container.appendChild(card);
    });

    // AUTOMATIC "TAREAS COMPLETADAS" BOX AT BOTTOM
    const allCompletedTasks = appState.data.tasks.filter(t => t.done && matchesSearch(t, "Tareas completadas"));
    if (allCompletedTasks.length > 0 && appState.activeTab !== "completed") {
      const compCard = document.createElement("section");
      compCard.className = "box-card box-completed-theme";
      compCard.innerHTML = `
        <div class="box-top-row">
          <div class="box-title-left">
            <div class="box-heading-line">
              <span style="color:var(--success);display:inline-flex;align-items:center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </span>
              <h2 class="box-name" style="color:var(--success);cursor:default;">TAREAS COMPLETADAS</h2>
            </div>
            <div class="box-badges-row">
              <span class="box-pill green">✓ ${allCompletedTasks.length} completada${allCompletedTasks.length === 1 ? "" : "s"} hoy</span>
            </div>
          </div>
          <div class="box-header-actions">
            <button type="button" class="btn-secondary" id="btn-clear-completed-inline" style="padding:6px 12px;font-size:0.78rem;" data-tip-title="🧹 Archivar completadas" data-tip-desc="Limpia de la vista las tareas ya finalizadas conservando tu historial mensual.">Limpiar completadas</button>
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
          playUiSound("delete");
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
    item.dataset.taskId = task.id;

    const isResched = isTaskRescheduledFuture(task);
    const repeatLabel = formatRepeatBadgeLabel(task);
    const hasRepeat = Boolean(repeatLabel);

    let subBadges = "";
    if (hasRepeat) {
      subBadges += `<span class="task-daily-pill">${escapeHtml(repeatLabel)}</span>`;
    }
    if (isResched) {
      subBadges += `<span class="task-resched-tag">🕒 Reprogramada · ${escapeHtml(formatSpanishDateLong(task.dueDate))}</span>`;
    }
    if (showOriginBox && box) {
      subBadges += `<span class="box-pill neutral" style="font-size:0.68rem;">${escapeHtml(box.name)}</span>`;
    }

    item.innerHTML = `
      <div class="hold-charge-bar"><div class="hold-charge-fill"></div></div>
      <div class="task-left">
        <span class="drag-handle task-drag-handle" data-tip-title="⋮⋮ Mantén presionado para mover" data-tip-desc="Sostén el clic unos instantes hasta cargar la barra superior y arrastra la tarea.">⋮⋮</span>
        <button type="button" class="task-check-circle" aria-label="Completar tarea" data-tip-title="✓ Marcar como completada" data-tip-desc="Registra el cumplimiento de esta tarea y actualiza tu progreso diario.">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <div class="task-text-wrap">
          <div class="task-title" data-tip-title="✏️ Editar tarea" data-tip-desc="Haz clic sobre el texto para modificar la descripción de esta tarea.">${escapeHtml(task.title)}</div>
          ${subBadges ? `<div class="task-sub-badges">${subBadges}</div>` : ""}
        </div>
      </div>

      <div class="task-right-actions">
        <button type="button" class="task-act-btn ${!isResched && !task.done ? "sun-active" : ""}" data-task-action="today" data-tip-title="☀️ Enfoque Para Hoy" data-tip-desc="Asigna esta tarea directamente a tu lista de prioridades de hoy.">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </button>
        <button type="button" class="task-act-btn ${isResched ? "calendar-active" : ""}" data-task-action="reschedule" data-tip-title="📅 Reprogramar Fecha" data-tip-desc="Elige una nueva fecha en el calendario para postergar o planificar esta tarea.">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
        <button type="button" class="task-act-btn ${hasRepeat ? "repeat-active" : ""}" data-task-action="toggle-daily" data-tip-title="🔁 Configurar Repetición" data-tip-desc="Elige si deseas repetir la tarea todos los días, algunos días o un día específico.">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </button>
        <button type="button" class="task-act-btn del-btn" data-task-action="delete" data-tip-title="✕ Eliminar Tarea" data-tip-desc="Retira esta tarea permanentemente de la casilla actual.">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    // Point 7: Hold-to-Drag with loading bar on Task Row
    item.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.target.closest(".task-title")) return;
      beginHoldDrag("task", task.id, item, e.clientX, e.clientY);
    });

    const checkBtn = item.querySelector(".task-check-circle");
    checkBtn.addEventListener("click", () => toggleTaskDone(task.id, checkBtn));
    item.querySelector(".task-title").addEventListener("click", () => openEditTaskTitleModal(task.id));

    item.querySelector('[data-task-action="today"]').addEventListener("click", () => {
      playUiSound("tap");
      task.dueDate = getTodayISO();
      task.isRescheduled = false;
      task.rescheduledCount = 0;
      saveData(true, `Movió a hoy: ${task.title}`);
      renderBoard();
      showToast("Movida para hoy");
    });

    item.querySelector('[data-task-action="reschedule"]').addEventListener("click", () => {
      playUiSound("tap");
      openDatePickerModal(task.id);
    });

    // Point 8: Open Custom Repeat Days Picker Modal
    item.querySelector('[data-task-action="toggle-daily"]').addEventListener("click", () => {
      playUiSound("tap");
      openRepeatPickerModal(task.id);
    });

    item.querySelector('[data-task-action="delete"]').addEventListener("click", () => {
      playUiSound("delete");
      deleteTask(task.id);
    });

    return item;
  }

  function toggleTaskDone(taskId, checkBtnEl) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.done = !task.done;
    const today = getTodayISO();
    if (task.done) {
      playUiSound("complete");
      spawnCompletionParticles(checkBtnEl);
      appState.history[today] = (appState.history[today] || 0) + 1;
      showToast("Tarea completada");
    } else {
      playUiSound("tap");
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

  // Point 8: Repeat Schedule Picker Modal Logic
  function openRepeatPickerModal(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    appState.repeatingTaskId = taskId;
    document.getElementById("repeat-task-name").textContent = task.title;

    if (Array.isArray(task.repeatDays) && task.repeatDays.length > 0) {
      appState.selectedRepeatDays = task.repeatDays.slice();
    } else if (task.frequency === "daily") {
      appState.selectedRepeatDays = [0, 1, 2, 3, 4, 5, 6];
    } else {
      appState.selectedRepeatDays = [];
    }

    syncRepeatWeekdayChipsUI();
    document.getElementById("modal-repeat-picker").classList.add("open");
  }

  function syncRepeatWeekdayChipsUI() {
    document.querySelectorAll("#repeat-weekdays-grid .weekday-chip").forEach(btn => {
      const d = Number(btn.dataset.day);
      btn.classList.toggle("selected", appState.selectedRepeatDays.includes(d));
    });
  }

  function saveRepeatSchedule(freqType, daysArray) {
    const task = appState.data.tasks.find(t => t.id === appState.repeatingTaskId);
    if (!task) return;
    task.frequency = freqType;
    task.repeatDays = daysArray.slice().sort((a, b) => a - b);
    document.getElementById("modal-repeat-picker").classList.remove("open");
    playUiSound("complete");
    saveData(true, `Repetición actualizada: ${task.title}`);
    renderBoard();
    const label = formatRepeatBadgeLabel(task);
    showToast(label ? label.replace("🔁 ", "Repetición: ") : "Sin repetición");
  }

  // Date Picker / Reschedule Modal
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

    playUiSound("tap");
    document.getElementById("modal-date-picker").classList.remove("open");
    saveData(true, `Reprogramó: ${task.title}`);
    renderBoard();
    if (document.getElementById("modal-rescheduled-list").classList.contains("open")) {
      renderRescheduledModalList();
    }
  }

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
        <div style="padding:28px 16px;text-align:center;color:var(--muted);font-size:0.9rem;">
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
          <button type="button" class="resched-sun-btn" data-tip-title="☀️ Traer a Para hoy" data-tip-desc="Mueve inmediatamente esta tarea reprogramada a tu lista de hoy.">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          </button>
          <div style="min-width:0;flex:1;">
            <div style="font-weight:700;font-size:0.92rem;color:var(--text);line-height:1.35;">${escapeHtml(task.title)}</div>
            <div style="font-size:0.78rem;color:var(--muted);margin-top:3px;">${escapeHtml(boxName)} · Para ${escapeHtml(formatSpanishDateLong(task.dueDate))}</div>
          </div>
        </div>
        <button type="button" class="resched-cal-btn" data-tip-title="📅 Cambiar fecha" data-tip-desc="Modifica la fecha programada para esta tarea.">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
      `;

      card.querySelector(".resched-sun-btn").addEventListener("click", () => {
        playUiSound("tap");
        task.dueDate = getTodayISO();
        task.isRescheduled = false;
        task.rescheduledCount = 0;
        saveData(true, `Movió a hoy: ${task.title}`);
        renderBoard();
        renderRescheduledModalList();
        showToast("Tarea movida para hoy");
      });

      card.querySelector(".resched-cal-btn").addEventListener("click", () => {
        playUiSound("tap");
        openDatePickerModal(task.id);
      });

      container.appendChild(card);
    });
  }

  function openEditTaskTitleModal(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    appState.editingTaskId = taskId;
    const input = document.getElementById("input-edit-task-title");
    input.value = task.title;
    document.getElementById("modal-edit-task").classList.add("open");
    setTimeout(() => input.focus(), 60);
  }

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
      playUiSound("delete");
      appState.data.boxes = appState.data.boxes.filter(b => b.id !== boxId);
      appState.data.tasks = appState.data.tasks.filter(t => t.boxId !== boxId);
      saveData(true, `Eliminó casilla: ${box.name}`);
      renderBoard();
      showToast("Casilla eliminada");
    };
    document.getElementById("modal-confirm").classList.add("open");
  }

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
      version: "Tasky Pro Vol. 144",
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

  // Point 5: Synchronization & Backups details inside the 3-dots Options Modal
  function openOptionsModal() {
    const modal = document.getElementById("modal-options");
    const slotsEl = document.getElementById("backups-list-container");
    const countEl = document.getElementById("backup-slots-count");
    const syncBoxesEl = document.getElementById("sync-diag-boxes");
    const syncTasksEl = document.getElementById("sync-diag-tasks");

    if (syncBoxesEl) syncBoxesEl.textContent = `${appState.data.boxes.length} casillas registradas`;
    if (syncTasksEl) syncTasksEl.textContent = `${appState.data.tasks.length} tareas activas`;
    if (countEl) countEl.textContent = `${appState.backups.length} / 20 copias automáticas`;

    if (slotsEl) {
      if (appState.backups.length === 0) {
        slotsEl.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:0.82rem;text-align:center;">Cada cambio que realices generará automáticamente un punto de restauración aquí.</div>`;
      } else {
        slotsEl.innerHTML = "";
        appState.backups.slice(0, 8).forEach((bkp, idx) => {
          const d = new Date(bkp.timestamp);
          const row = document.createElement("div");
          row.className = "backup-slot-item";
          row.innerHTML = `
            <div>
              <div style="font-weight:700;color:var(--text);">#${idx + 1} · ${escapeHtml(bkp.label || "Respaldo")}</div>
              <div style="font-size:0.74rem;color:var(--muted);">${d.toLocaleTimeString("es-PE")} · ${bkp.boxesCount} casillas, ${bkp.tasksCount} tareas</div>
            </div>
            <button type="button" class="btn-secondary" style="padding:5px 11px;font-size:0.75rem;">Restaurar</button>
          `;
          row.querySelector("button").addEventListener("click", () => {
            if (!bkp.data) return;
            appState.data = normalizeDataPayload(bkp.data);
            saveData(false);
            renderBoard();
            modal.classList.remove("open");
            showToast("Copia restaurada");
          });
          slotsEl.appendChild(row);
        });
      }
    }

    modal.classList.add("open");
  }

  // Point 3: Executive-Level Productivity Analytics Modal with 6 KPIs, 3 Charts & Per-Box Breakdown
  function openProductivityModal() {
    const modal = document.getElementById("modal-productivity");
    modal.classList.add("open");

    const tasks = appState.data.tasks;
    const boxes = appState.data.boxes;
    const todayTasks = tasks.filter(t => isTaskForToday(t));
    const doneToday = todayTasks.filter(t => t.done).length;
    const pendingToday = todayTasks.filter(t => !t.done).length;
    const rate = todayTasks.length > 0 ? Math.round((doneToday / todayTasks.length) * 100) : 0;
    const reschedCount = tasks.filter(t => isTaskRescheduledFuture(t)).length;
    const recurringCount = tasks.filter(t => t.frequency !== "once" || (t.repeatDays && t.repeatDays.length > 0)).length;
    const focusScore = tasks.length > 0 ? Math.round(((tasks.length - reschedCount) / tasks.length) * 100) : 100;
    const monthlyTotal = (appState.data.monthlyCompletedBase || 66) + doneToday;

    // Find dominant box
    let topBoxName = "CASA";
    let topBoxCount = 0;
    boxes.forEach(b => {
      const c = tasks.filter(t => t.boxId === b.id).length;
      if (c > topBoxCount) {
        topBoxCount = c;
        topBoxName = b.name;
      }
    });

    document.getElementById("prod-kpi-rate").textContent = `${rate}%`;
    document.getElementById("prod-kpi-done").textContent = String(monthlyTotal);
    document.getElementById("prod-kpi-focus").textContent = `${focusScore}%`;
    document.getElementById("prod-kpi-recurring").textContent = String(recurringCount);
    document.getElementById("prod-kpi-resched").textContent = String(reschedCount);
    document.getElementById("prod-kpi-topbox").textContent = `${topBoxName} (${topBoxCount})`;

    // Per-box breakdown list
    const breakdownEl = document.getElementById("prod-boxes-breakdown");
    if (breakdownEl) {
      breakdownEl.innerHTML = "";
      boxes.forEach(b => {
        const bAll = tasks.filter(t => t.boxId === b.id);
        const bDone = bAll.filter(t => t.done).length;
        const bResched = bAll.filter(t => isTaskRescheduledFuture(t)).length;
        const bPend = bAll.length - bDone - bResched;
        const bPct = bAll.length > 0 ? Math.round((bDone / bAll.length) * 100) : 0;

        const row = document.createElement("div");
        row.className = "prod-breakdown-row";
        row.innerHTML = `
          <div style="min-width:140px;font-weight:700;color:var(--text);">${escapeHtml(b.name)}</div>
          <div style="flex:1;height:7px;background:var(--line-strong);border-radius:999px;overflow:hidden;">
            <div style="width:${bPct}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--success));border-radius:999px;"></div>
          </div>
          <div style="font-size:0.76rem;color:var(--muted);min-width:175px;text-align:right;">
            <strong>${bDone}</strong> logradas · <strong>${bPend}</strong> hoy · <strong>${bResched}</strong> reprog.
          </div>
        `;
        breakdownEl.appendChild(row);
      });
    }

    if (typeof window.Chart === "undefined") return;
    const isDark = appState.settings.theme === "dark";
    const textColor = isDark ? "#cbd5e1" : "#475569";
    const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)";

    // Chart 1: 7-Day Activity & Velocity Trend
    const labels7 = [];
    const values7 = [];
    const baseline7 = [3, 5, 4, 6, 4, 5, doneToday];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${day}`;
      labels7.push(`${DAY_SHORT_NAMES[d.getDay()]} ${d.getDate()}`);
      values7.push(appState.history[iso] !== undefined ? appState.history[iso] : baseline7[6 - i]);
    }

    const ctxTrend = document.getElementById("chart-productivity-trend");
    if (ctxTrend) {
      if (appState.charts.trend) appState.charts.trend.destroy();
      appState.charts.trend = new window.Chart(ctxTrend, {
        type: "bar",
        data: {
          labels: labels7,
          datasets: [
            {
              type: "line",
              label: "Tendencia",
              data: values7,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.15)",
              borderWidth: 2.5,
              tension: 0.38,
              fill: true
            },
            {
              type: "bar",
              label: "Completadas",
              data: values7,
              backgroundColor: "rgba(37, 99, 235, 0.78)",
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: textColor }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { stepSize: 2, color: textColor }, grid: { color: gridColor } }
          }
        }
      });
    }

    // Chart 2: Box Distribution Doughnut
    const ctxDist = document.getElementById("chart-box-distribution");
    if (ctxDist) {
      if (appState.charts.distribution) appState.charts.distribution.destroy();
      const activeBoxes = boxes.filter(b => tasks.some(t => t.boxId === b.id));
      appState.charts.distribution = new window.Chart(ctxDist, {
        type: "doughnut",
        data: {
          labels: activeBoxes.map(b => b.name),
          datasets: [{
            data: activeBoxes.map(b => tasks.filter(t => t.boxId === b.id).length),
            backgroundColor: ["#2563eb", "#8b5cf6", "#0d9488", "#f59e0b", "#e11d48", "#16a34a"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "64%",
          plugins: { legend: { position: "bottom", labels: { color: textColor, boxWidth: 11, font: { size: 11 } } } }
        }
      });
    }

    // Chart 3: Execution Balance Horizontal Bar
    const ctxBal = document.getElementById("chart-execution-balance");
    if (ctxBal) {
      if (appState.charts.balance) appState.charts.balance.destroy();
      appState.charts.balance = new window.Chart(ctxBal, {
        type: "bar",
        data: {
          labels: ["Pendientes Hoy", "Reprogramadas", "Hábitos Recurrentes", "Completadas Hoy"],
          datasets: [{
            label: "Tareas",
            data: [pendingToday, reschedCount, recurringCount, doneToday],
            backgroundColor: ["#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e"],
            borderRadius: 8
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 5, color: textColor }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });
    }
  }

  function initEvents() {
    // Global pointer listeners for Hold-to-Drag & Auto-Scroll (Point 7)
    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true });
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear-btn");

    searchInput.addEventListener("input", () => {
      appState.searchQuery = searchInput.value.trim();
      searchClear.style.display = appState.searchQuery ? "inline-flex" : "none";
      renderBoard();
    });

    searchClear.addEventListener("click", () => {
      playUiSound("tap");
      searchInput.value = "";
      appState.searchQuery = "";
      searchClear.style.display = "none";
      renderBoard();
    });

    // Direct Ctrl+F and Cmd+K search focus
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

    document.getElementById("quote-container").addEventListener("click", () => {
      playUiSound("tap");
      appState.currentQuoteIndex = (appState.currentQuoteIndex + 1) % appState.quotes.length;
      renderQuote(true);
      startQuoteRotation();
    });

    // Point 6: Sound Toggle Button
    document.getElementById("btn-sound-toggle").addEventListener("click", () => {
      appState.settings.soundsEnabled = !appState.settings.soundsEnabled;
      applyThemeAndSoundUI();
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
      if (appState.settings.soundsEnabled) playUiSound("complete");
      showToast(appState.settings.soundsEnabled ? "Sonido activado" : "Sonido silenciado");
    });

    document.getElementById("btn-theme-toggle").addEventListener("click", () => {
      appState.settings.theme = appState.settings.theme === "dark" ? "light" : "dark";
      applyThemeAndSoundUI();
      playUiSound("tap");
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
      showToast(appState.settings.theme === "dark" ? "Modo oscuro" : "Modo claro");
    });

    document.getElementById("btn-more-options").addEventListener("click", () => {
      playUiSound("tap");
      openOptionsModal();
    });

    // Filter Tabs
    document.querySelectorAll("[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        playUiSound("tap");
        appState.activeTab = btn.dataset.tab;
        document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b === btn));
        renderBoard();
      });
    });

    document.getElementById("btn-filter-rescheduled").addEventListener("click", () => {
      playUiSound("tap");
      openRescheduledModal();
    });

    document.getElementById("btn-open-productivity").addEventListener("click", () => {
      playUiSound("tap");
      openProductivityModal();
    });

    document.getElementById("btn-filter-overdue").addEventListener("click", () => {
      playUiSound("tap");
      const overdue = appState.data.tasks.filter(t => isTaskOverdue(t));
      if (overdue.length === 0) {
        showToast("Sin tareas atrasadas");
      } else {
        openRescheduledModal();
      }
    });

    // Point 8: Repeat Modal Events
    document.querySelectorAll("[data-repeat-preset]").forEach(btn => {
      btn.addEventListener("click", () => {
        const preset = btn.dataset.repeatPreset;
        if (preset === "daily") {
          saveRepeatSchedule("daily", [0, 1, 2, 3, 4, 5, 6]);
        } else if (preset === "weekdays") {
          saveRepeatSchedule("weekdays", [1, 2, 3, 4, 5]);
        } else if (preset === "weekends") {
          saveRepeatSchedule("weekends", [0, 6]);
        } else if (preset === "once") {
          saveRepeatSchedule("once", []);
        }
      });
    });

    document.querySelectorAll("#repeat-weekdays-grid .weekday-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        playUiSound("tap");
        const dayNum = Number(chip.dataset.day);
        const idx = appState.selectedRepeatDays.indexOf(dayNum);
        if (idx === -1) {
          appState.selectedRepeatDays.push(dayNum);
        } else {
          appState.selectedRepeatDays.splice(idx, 1);
        }
        syncRepeatWeekdayChipsUI();
      });
    });

    document.getElementById("btn-save-custom-repeat").addEventListener("click", () => {
      if (appState.selectedRepeatDays.length === 0) {
        saveRepeatSchedule("once", []);
      } else if (appState.selectedRepeatDays.length === 7) {
        saveRepeatSchedule("daily", [0, 1, 2, 3, 4, 5, 6]);
      } else {
        saveRepeatSchedule("custom", appState.selectedRepeatDays);
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
      playUiSound("complete");
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
      playUiSound("tap");
      saveData(true, `Editó: ${val}`);
      document.getElementById("modal-edit-task").classList.remove("open");
      renderBoard();
      showToast("Tarea actualizada");
    });

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
      playUiSound("complete");
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
          playUiSound("complete");
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
        playUiSound("tap");
        const target = document.getElementById(btn.dataset.closeModal);
        if (target) target.classList.remove("open");
      });
    });

    // Bottom-right Floating Buttons
    const fabWrapper = document.getElementById("fab-wrapper");
    document.getElementById("fab-main-trigger").addEventListener("click", () => {
      playUiSound("tap");
      fabWrapper.classList.toggle("open");
    });

    document.getElementById("fab-collapse-all").addEventListener("click", () => {
      playUiSound("tap");
      const anyExpanded = appState.data.boxes.some(b => !b.collapsed);
      appState.data.boxes.forEach(b => { b.collapsed = anyExpanded; });
      saveData(false);
      renderBoard();
      showToast(anyExpanded ? "Casillas plegadas" : "Casillas desplegadas");
    });

    document.getElementById("fab-action-new-box").addEventListener("click", () => {
      playUiSound("tap");
      fabWrapper.classList.remove("open");
      openBoxModal(null);
    });

    document.getElementById("fab-action-whatsapp").addEventListener("click", () => {
      playUiSound("tap");
      fabWrapper.classList.remove("open");
      generateWhatsAppReport();
    });

    document.getElementById("fab-action-backup").addEventListener("click", () => {
      playUiSound("tap");
      fabWrapper.classList.remove("open");
      exportJsonBackup();
    });
  }

  function boot() {
    loadRegisteredData();
    applyThemeAndSoundUI();
    renderHeroDate();
    renderQuote(false);
    startQuoteRotation();
    initProTooltips();
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
