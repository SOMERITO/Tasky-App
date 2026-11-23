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
    HISTORY: "tasky_history",
    MEMORY: "tasky_task_memory",
    CLOUD_CHANNEL: "tasky_cloud_channel",
    FIREBASE_CONFIG: "tasky_firebase_config_v1",
    VIEW_STATE: "tasky_view_state_v1",
    CLOUD_BASELINE: "tasky_cloud_baseline_fingerprint_v1",
    CLOUD_DIRTY: "tasky_cloud_local_changes_pending_v1"
  };

  let activeWorkspaceId = "";
  let activeWorkspaceContext = null;
  let activeStorageNamespace = "";
  let leahChildTaskRecords = [];
  let leahChildPendingCompletionIds = new Set();

  function isLeahChildAccount() {
    return activeWorkspaceId === "leah" &&
      Boolean(activeWorkspaceContext && activeWorkspaceContext.role === "child");
  }

  function canLeahUseBoardTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    if (target.closest(".add-task-BarBtn, .inline-add-form, .task-memory-suggestions .memory-suggestion-select")) return true;
    if (target.closest(".task-check-circle")) return true;
    if (target.closest('.box-header-actions [data-box-action="collapse"]')) return true;

    const taskRow = target.closest(".task-item[data-task-id]");
    if (!taskRow) return false;
    const task = appState && appState.data && appState.data.tasks
      ? appState.data.tasks.find((item) => String(item.id) === String(taskRow.dataset.taskId))
      : null;
    if (!task || task.__leahChildTask !== true || task.leahChildTaskStatus !== "pending") return false;

    if (target.closest(".task-title")) return true;
    const taskAction = target.closest('.task-right-actions [data-task-action="edit"]');
    return Boolean(taskAction);
  }

  document.addEventListener("click", (event) => {
    if (!isLeahChildAccount()) return;
    const shell = event.target && event.target.closest ? event.target.closest(".app-shell") : null;
    if (!shell || canLeahUseBoardTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener("submit", (event) => {
    if (!isLeahChildAccount()) return;
    const shell = event.target && event.target.closest ? event.target.closest(".app-shell") : null;
    if (!shell || event.target.matches(".inline-add-form")) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener("contextmenu", (event) => {
    if (!isLeahChildAccount()) return;
    if (event.target && event.target.closest && event.target.closest(".app-shell")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  const GLOBAL_STORAGE_KEYS = new Set([STORAGE_KEYS.FIREBASE_CONFIG]);
  const memoryStorage = new Map();

  function getScopedStorageKey(key) {
    return !activeStorageNamespace || GLOBAL_STORAGE_KEYS.has(key)
      ? key
      : activeStorageNamespace + ":" + key;
  }

  const safeStorage = {
    getItem(key) {
      const scopedKey = getScopedStorageKey(key);
      try {
        const val = window.localStorage.getItem(scopedKey);
        if (val !== null) return val;
        // Legacy Tasky keys belong only to José. Never use them for Camila or Leah.
        if (activeWorkspaceId === "jose" && scopedKey !== key) {
          const legacyVal = window.localStorage.getItem(key);
          if (legacyVal !== null) return legacyVal;
        }
        // Preserve the previous shared Leah cache for adult guardians only.
        // The child role never reads this namespace, so private data cannot bleed into it.
        if (activeWorkspaceId === "leah" && activeWorkspaceContext &&
            activeWorkspaceContext.role !== "child" && scopedKey !== key) {
          const legacyAdultKey = "tasky:v2:leah:" + key;
          const legacyAdultValue = window.localStorage.getItem(legacyAdultKey);
          if (legacyAdultValue !== null) {
            try { window.localStorage.setItem(scopedKey, legacyAdultValue); } catch (e) {}
            return legacyAdultValue;
          }
        }
      } catch (e) {}
      if (memoryStorage.has(scopedKey)) return memoryStorage.get(scopedKey);
      if (activeWorkspaceId === "jose" && scopedKey !== key && memoryStorage.has(key)) return memoryStorage.get(key);
      return null;
    },
    setItem(key, value) {
      const scopedKey = getScopedStorageKey(key);
      memoryStorage.set(scopedKey, value);
      try {
        window.localStorage.setItem(scopedKey, value);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  const QUOTES_POOL = [
  {
    "text": "La dicha del hombre consiste en observar las reglas y condiciones por las cuales se consigue el bien de todos los hombres.",
    "author": "León Tolstói"
  },
  {
    "text": "No es que tengamos poco tiempo, sino que perdemos mucho.",
    "author": "Séneca"
  },
  {
    "text": "Por cada minuto dedicado a organizar, se gana una hora.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.",
    "author": "Aristóteles"
  },
  {
    "text": "Concéntrate en cada minuto como un romano, haciendo lo que tienes delante con dignidad y precisión.",
    "author": "Marco Aurelio"
  },
  {
    "text": "El secreto de salir adelante es simplemente empezar.",
    "author": "Mark Twain"
  },
  {
    "text": "Primero di a ti mismo lo que serías; y luego haz lo que tengas que hacer.",
    "author": "Epicteto"
  },
  {
    "text": "La simplicidad es la máxima sofisticación.",
    "author": "Leonardo da Vinci"
  },
  {
    "text": "Tu mente es para tener ideas, no para retenerlas.",
    "author": "David Allen"
  },
  {
    "text": "Lo que se mide se mejora; lo que se planifica con claridad se ejecuta con calma.",
    "author": "Peter Drucker"
  },
  {
    "text": "Enfocarse significa decir que no a cien buenas ideas más.",
    "author": "Steve Jobs"
  },
  {
    "text": "Pequeñas disciplinas repetidas con consistencia cada día conducen a grandes logros.",
    "author": "John C. Maxwell"
  },
  {
    "text": "Ningún viento es favorable para quien no sabe a qué puerto se dirige.",
    "author": "Séneca"
  },
  {
    "text": "El orden es el placer de la razón; pero el desorden es la delicia de la imaginación.",
    "author": "Paul Claudel"
  },
  {
    "text": "Haz cada cosa en la vida como si fuera lo último que fueras a hacer.",
    "author": "Marco Aurelio"
  },
  {
    "text": "El futuro depende de lo que hagas hoy.",
    "author": "Mahatma Gandhi"
  },
  {
    "text": "La disciplina es el puente entre las metas y los logros.",
    "author": "Jim Rohn"
  },
  {
    "text": "No dejes que lo que no puedes hacer interfiera con lo que sí puedes hacer.",
    "author": "John Wooden"
  },
  {
    "text": "Un viaje de mil millas comienza con un solo paso.",
    "author": "Lao-Tsé"
  },
  {
    "text": "Quien tiene un porqué para vivir puede soportar casi cualquier cómo.",
    "author": "Friedrich Nietzsche"
  },
  {
    "text": "La acción es la clave fundamental de todo éxito.",
    "author": "Pablo Picasso"
  },
  {
    "text": "La mejor manera de predecir el futuro es creándolo.",
    "author": "Peter Drucker"
  },
  {
    "text": "El hombre que mueve montañas comienza cargando pequeñas piedras.",
    "author": "Confucio"
  },
  {
    "text": "No cuentes los días, haz que los días cuenten.",
    "author": "Muhammad Ali"
  },
  {
    "text": "La constancia es la virtud por la cual todas las otras virtudes dan su fruto.",
    "author": "Arturo Graf"
  },
  {
    "text": "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
    "author": "Robert Collier"
  },
  {
    "text": "La claridad precede a la maestría.",
    "author": "Robin Sharma"
  },
  {
    "text": "Nada es particularmente difícil si lo divides en pequeños trabajos.",
    "author": "Henry Ford"
  },
  {
    "text": "El sabio no se sienta a lamentarse por lo perdido, sino que se alegra de remediarlo.",
    "author": "William Shakespeare"
  },
  {
    "text": "Donde hay orden, hay tranquilidad y progreso.",
    "author": "Cicerón"
  },
  {
    "text": "La paciencia es amarga, pero su fruto es dulce.",
    "author": "Jean-Jacques Rousseau"
  },
  {
    "text": "El que domina a los otros es fuerte; el que se domina a sí mismo es poderoso.",
    "author": "Lao-Tsé"
  },
  {
    "text": "Saber qué hacer elimina el miedo.",
    "author": "Rosa Parks"
  },
  {
    "text": "La energía y la persistencia conquistan todas las cosas.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Nunca es demasiado tarde para ser lo que podrías haber sido.",
    "author": "George Eliot"
  },
  {
    "text": "Lo que hacemos ahora resuena en la eternidad.",
    "author": "Marco Aurelio"
  },
  {
    "text": "La buena fortuna favorece a los audaces y organizados.",
    "author": "Virgilio"
  },
  {
    "text": "Empieza donde estás, usa lo que tienes, haz lo que puedas.",
    "author": "Arthur Ashe"
  },
  {
    "text": "El tiempo es la cosa más valiosa que una persona puede gastar.",
    "author": "Teofrasto"
  },
  {
    "text": "Pensar es fácil. Actuar es difícil. Actuar siguiendo el pensamiento propio es lo más difícil del mundo.",
    "author": "Johann Wolfgang von Goethe"
  },
  {
    "text": "Al hombre se le puede arrebatar todo salvo una cosa: la última de las libertades humanas, la elección de la actitud personal ante cualquier circunstancia.",
    "author": "Viktor Frankl"
  },
  {
    "text": "Cuando ya no podemos cambiar una situación, tenemos el desafío de cambiarnos a nosotros mismos.",
    "author": "Viktor Frankl"
  },
  {
    "text": "Siempre parece imposible hasta que se hace.",
    "author": "Nelson Mandela"
  },
  {
    "text": "No me juzgues por mis éxitos, júzgame por las veces que me caí y volví a levantarme.",
    "author": "Nelson Mandela"
  },
  {
    "text": "Soy el amo de mi destino, soy el capitán de mi alma.",
    "author": "Nelson Mandela"
  },
  {
    "text": "Pies, ¿para qué los quiero si tengo alas pa' volar?",
    "author": "Frida Kahlo"
  },
  {
    "text": "Al final del día, podemos soportar mucho más de lo que creemos que podemos.",
    "author": "Frida Kahlo"
  },
  {
    "text": "Si no puedes volar, corre; si no puedes correr, camina; si no puedes caminar, gatea, pero sigue avanzando hacia tu meta.",
    "author": "Martin Luther King Jr."
  },
  {
    "text": "La oscuridad no puede expulsar a la oscuridad; solo la luz puede hacer eso.",
    "author": "Martin Luther King Jr."
  },
  {
    "text": "Aunque el mundo está lleno de sufrimiento, también está lleno de la superación del mismo.",
    "author": "Helen Keller"
  },
  {
    "text": "El optimismo es la fe que conduce al logro; nada puede hacerse sin esperanza y confianza.",
    "author": "Helen Keller"
  },
  {
    "text": "Nunca dobles la cabeza. Mantenla siempre alta. Mira al mundo directamente a los ojos.",
    "author": "Helen Keller"
  },
  {
    "text": "Por muy difícil que parezca la vida, siempre hay algo que puedes hacer y en lo que puedes tener éxito.",
    "author": "Stephen Hawking"
  },
  {
    "text": "La inteligencia es la capacidad de adaptarse al cambio.",
    "author": "Stephen Hawking"
  },
  {
    "text": "Si no puedes conseguir un milagro, conviértete en uno.",
    "author": "Nick Vujicic"
  },
  {
    "text": "El miedo es una discapacidad mayor que no tener brazos ni piernas.",
    "author": "Nick Vujicic"
  },
  {
    "text": "Si me caigo cien veces, me intentaré levantar cien veces más.",
    "author": "Nick Vujicic"
  },
  {
    "text": "Un niño, un profesor, un libro y una pluma pueden cambiar el mundo.",
    "author": "Malala Yousafzai"
  },
  {
    "text": "Nos damos cuenta de la importancia de nuestra voz solo cuando somos silenciados.",
    "author": "Malala Yousafzai"
  },
  {
    "text": "Convierte tus heridas en sabiduría.",
    "author": "Oprah Winfrey"
  },
  {
    "text": "Donde no hay lucha, no hay fuerza.",
    "author": "Oprah Winfrey"
  },
  {
    "text": "La mayor descubrimiento de todos los tiempos es que una persona puede cambiar su futuro simplemente cambiando su actitud.",
    "author": "Oprah Winfrey"
  },
  {
    "text": "El fondo de la roca se convirtió en la base sólida sobre la cual reconstruí mi vida.",
    "author": "J.K. Rowling"
  },
  {
    "text": "Es imposible vivir sin fracasar en algo, a menos que vivas tan cautelosamente que bien podrías no haber vivido en absoluto.",
    "author": "J.K. Rowling"
  },
  {
    "text": "Nuestra mayor gloria no está en no caer nunca, sino en levantarnos cada vez que caemos.",
    "author": "Confucio"
  },
  {
    "text": "El obstáculo en el camino se convierte en el camino. Nunca olvides que dentro de cada obstáculo hay una oportunidad para mejorar.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Tienes poder sobre tu mente, no sobre los acontecimientos externos. Date cuenta de esto y encontrarás la fuerza.",
    "author": "Marco Aurelio"
  },
  {
    "text": "El fuego prueba el oro; la adversidad prueba a los hombres fuertes.",
    "author": "Séneca"
  },
  {
    "text": "A veces incluso vivir es un acto de coraje.",
    "author": "Séneca"
  },
  {
    "text": "No es lo que te sucede, sino cómo reaccionas a ello lo que importa.",
    "author": "Epicteto"
  },
  {
    "text": "Las dificultades son las cosas que muestran lo que son los hombres.",
    "author": "Epicteto"
  },
  {
    "text": "En medio del invierno aprendí por fin que había en mí un verano invencible.",
    "author": "Albert Camus"
  },
  {
    "text": "El éxito consiste en ir de fracaso en fracaso sin perder el entusiasmo.",
    "author": "Winston Churchill"
  },
  {
    "text": "Si estás atravesando un infierno, sigue caminando.",
    "author": "Winston Churchill"
  },
  {
    "text": "Las cometas se elevan más alto contra el viento, no a favor de él.",
    "author": "Winston Churchill"
  },
  {
    "text": "En medio de la dificultad reside la oportunidad.",
    "author": "Albert Einstein"
  },
  {
    "text": "Hay una fuerza motriz más poderosa que el vapor, la electricidad y la energía atómica: la voluntad.",
    "author": "Albert Einstein"
  },
  {
    "text": "La vida es como montar en bicicleta. Para mantener el equilibrio, debes seguir moviéndote.",
    "author": "Albert Einstein"
  },
  {
    "text": "He fallado una y otra y otra vez en mi vida. Y es por eso que tengo éxito.",
    "author": "Michael Jordan"
  },
  {
    "text": "Los obstáculos no tienen que detenerte. Si te encuentras con un muro, no te des la vuelta; descubre cómo escalarlo.",
    "author": "Michael Jordan"
  },
  {
    "text": "Lo más importante es intentar inspirar a las personas para que puedan ser grandes en lo que sea que quieran hacer.",
    "author": "Kobe Bryant"
  },
  {
    "text": "Todo lo negativo —la presión, los desafíos— es una oportunidad para mí de levantarme.",
    "author": "Kobe Bryant"
  },
  {
    "text": "Odié cada minuto de entrenamiento, pero dije: 'No renuncies. Sufre ahora y vive el resto de tu vida como un campeón'.",
    "author": "Muhammad Ali"
  },
  {
    "text": "Imposible es solo una palabra grande lanzada por hombres pequeños que encuentran más fácil vivir en el mundo que se les ha dado.",
    "author": "Muhammad Ali"
  },
  {
    "text": "En la vida no hay nada que temer, solo hay que comprender.",
    "author": "Marie Curie"
  },
  {
    "text": "La vida no es fácil para ninguno de nosotros. Pero ¡qué importa! Hay que perseverar y, sobre todo, tener confianza en uno mismo.",
    "author": "Marie Curie"
  },
  {
    "text": "El fracaso es simplemente la oportunidad de comenzar de nuevo, esta vez de forma más inteligente.",
    "author": "Henry Ford"
  },
  {
    "text": "Tanto si piensas que puedes, como si piensas que no puedes, estás en lo cierto.",
    "author": "Henry Ford"
  },
  {
    "text": "No he fracasado. Simpl