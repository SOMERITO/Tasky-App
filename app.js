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
    FIREBASE_CONFIG: "tasky_firebase_config_v1"
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

  const QUOTES_POOL = [{"text": "La dicha del hombre consiste en observar las reglas y condiciones por las cuales se consigue el bien de todos los hombres.", "author": "León Tolstói"}, {"text": "No es que tengamos poco tiempo, sino que perdemos mucho.", "author": "Séneca"}, {"text": "Por cada minuto dedicado a organizar, se gana una hora.", "author": "Benjamin Franklin"}, {"text": "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.", "author": "Aristóteles"}, {"text": "Concéntrate en cada minuto como un romano, haciendo lo que tienes delante con dignidad y precisión.", "author": "Marco Aurelio"}, {"text": "El secreto de salir adelante es simplemente empezar.", "author": "Mark Twain"}, {"text": "Primero di a ti mismo lo que serías; y luego haz lo que tengas que hacer.", "author": "Epicteto"}, {"text": "La simplicidad es la máxima sofisticación.", "author": "Leonardo da Vinci"}, {"text": "Tu mente es para tener ideas, no para retenerlas.", "author": "David Allen"}, {"text": "Lo que se mide se mejora; lo que se planifica con claridad se ejecuta con calma.", "author": "Peter Drucker"}, {"text": "Enfocarse significa decir que no a cien buenas ideas más.", "author": "Steve Jobs"}, {"text": "Pequeñas disciplinas repetidas con consistencia cada día conducen a grandes logros.", "author": "John C. Maxwell"}, {"text": "Ningún viento es favorable para quien no sabe a qué puerto se dirige.", "author": "Séneca"}, {"text": "El orden es el placer de la razón; pero el desorden es la delicia de la imaginación.", "author": "Paul Claudel"}, {"text": "Haz cada cosa en la vida como si fuera lo último que fueras a hacer.", "author": "Marco Aurelio"}, {"text": "El futuro depende de lo que hagas hoy.", "author": "Mahatma Gandhi"}, {"text": "La disciplina es el puente entre las metas y los logros.", "author": "Jim Rohn"}, {"text": "No dejes que lo que no puedes hacer interfiera con lo que sí puedes hacer.", "author": "John Wooden"}, {"text": "Un viaje de mil millas comienza con un solo paso.", "author": "Lao-Tsé"}, {"text": "Quien tiene un porqué para vivir puede soportar casi cualquier cómo.", "author": "Friedrich Nietzsche"}, {"text": "La acción es la clave fundamental de todo éxito.", "author": "Pablo Picasso"}, {"text": "La mejor manera de predecir el futuro es creándolo.", "author": "Peter Drucker"}, {"text": "El hombre que mueve montañas comienza cargando pequeñas piedras.", "author": "Confucio"}, {"text": "No cuentes los días, haz que los días cuenten.", "author": "Muhammad Ali"}, {"text": "La constancia es la virtud por la cual todas las otras virtudes dan su fruto.", "author": "Arturo Graf"}, {"text": "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", "author": "Robert Collier"}, {"text": "La claridad precede a la maestría.", "author": "Robin Sharma"}, {"text": "Nada es particularmente difícil si lo divides en pequeños trabajos.", "author": "Henry Ford"}, {"text": "El sabio no se sienta a lamentarse por lo perdido, sino que se alegra de remediarlo.", "author": "William Shakespeare"}, {"text": "Donde hay orden, hay tranquilidad y progreso.", "author": "Cicerón"}, {"text": "La paciencia es amarga, pero su fruto es dulce.", "author": "Jean-Jacques Rousseau"}, {"text": "El que domina a los otros es fuerte; el que se domina a sí mismo es poderoso.", "author": "Lao-Tsé"}, {"text": "Saber qué hacer elimina el miedo.", "author": "Rosa Parks"}, {"text": "La energía y la persistencia conquistan todas las cosas.", "author": "Benjamin Franklin"}, {"text": "Nunca es demasiado tarde para ser lo que podrías haber sido.", "author": "George Eliot"}, {"text": "Lo que hacemos ahora resuena en la eternidad.", "author": "Marco Aurelio"}, {"text": "La buena fortuna favorece a los audaces y organizados.", "author": "Virgilio"}, {"text": "Empieza donde estás, usa lo que tienes, haz lo que puedas.", "author": "Arthur Ashe"}, {"text": "El tiempo es la cosa más valiosa que una persona puede gastar.", "author": "Teofrasto"}, {"text": "Pensar es fácil. Actuar es difícil. Actuar siguiendo el pensamiento propio es lo más difícil del mundo.", "author": "Johann Wolfgang von Goethe"}, {"text": "Al hombre se le puede arrebatar todo salvo una cosa: la última de las libertades humanas, la elección de la actitud personal ante cualquier circunstancia.", "author": "Viktor Frankl"}, {"text": "Cuando ya no podemos cambiar una situación, tenemos el desafío de cambiarnos a nosotros mismos.", "author": "Viktor Frankl"}, {"text": "Siempre parece imposible hasta que se hace.", "author": "Nelson Mandela"}, {"text": "No me juzgues por mis éxitos, júzgame por las veces que me caí y volví a levantarme.", "author": "Nelson Mandela"}, {"text": "Soy el amo de mi destino, soy el capitán de mi alma.", "author": "Nelson Mandela"}, {"text": "Pies, ¿para qué los quiero si tengo alas pa' volar?", "author": "Frida Kahlo"}, {"text": "Al final del día, podemos soportar mucho más de lo que creemos que podemos.", "author": "Frida Kahlo"}, {"text": "Si no puedes volar, corre; si no puedes correr, camina; si no puedes caminar, gatea, pero sigue avanzando hacia tu meta.", "author": "Martin Luther King Jr."}, {"text": "La oscuridad no puede expulsar a la oscuridad; solo la luz puede hacer eso.", "author": "Martin Luther King Jr."}, {"text": "Aunque el mundo está lleno de sufrimiento, también está lleno de la superación del mismo.", "author": "Helen Keller"}, {"text": "El optimismo es la fe que conduce al logro; nada puede hacerse sin esperanza y confianza.", "author": "Helen Keller"}, {"text": "Nunca dobles la cabeza. Mantenla siempre alta. Mira al mundo directamente a los ojos.", "author": "Helen Keller"}, {"text": "Por muy difícil que parezca la vida, siempre hay algo que puedes hacer y en lo que puedes tener éxito.", "author": "Stephen Hawking"}, {"text": "La inteligencia es la capacidad de adaptarse al cambio.", "author": "Stephen Hawking"}, {"text": "Si no puedes conseguir un milagro, conviértete en uno.", "author": "Nick Vujicic"}, {"text": "El miedo es una discapacidad mayor que no tener brazos ni piernas.", "author": "Nick Vujicic"}, {"text": "Si me caigo cien veces, me intentaré levantar cien veces más.", "author": "Nick Vujicic"}, {"text": "Un niño, un profesor, un libro y una pluma pueden cambiar el mundo.", "author": "Malala Yousafzai"}, {"text": "Nos damos cuenta de la importancia de nuestra voz solo cuando somos silenciados.", "author": "Malala Yousafzai"}, {"text": "Convierte tus heridas en sabiduría.", "author": "Oprah Winfrey"}, {"text": "Donde no hay lucha, no hay fuerza.", "author": "Oprah Winfrey"}, {"text": "La mayor descubrimiento de todos los tiempos es que una persona puede cambiar su futuro simplemente cambiando su actitud.", "author": "Oprah Winfrey"}, {"text": "El fondo de la roca se convirtió en la base sólida sobre la cual reconstruí mi vida.", "author": "J.K. Rowling"}, {"text": "Es imposible vivir sin fracasar en algo, a menos que vivas tan cautelosamente que bien podrías no haber vivido en absoluto.", "author": "J.K. Rowling"}, {"text": "Nuestra mayor gloria no está en no caer nunca, sino en levantarnos cada vez que caemos.", "author": "Confucio"}, {"text": "El obstáculo en el camino se convierte en el camino. Nunca olvides que dentro de cada obstáculo hay una oportunidad para mejorar.", "author": "Marco Aurelio"}, {"text": "Tienes poder sobre tu mente, no sobre los acontecimientos externos. Date cuenta de esto y encontrarás la fuerza.", "author": "Marco Aurelio"}, {"text": "El fuego prueba el oro; la adversidad prueba a los hombres fuertes.", "author": "Séneca"}, {"text": "A veces incluso vivir es un acto de coraje.", "author": "Séneca"}, {"text": "No es lo que te sucede, sino cómo reaccionas a ello lo que importa.", "author": "Epicteto"}, {"text": "Las dificultades son las cosas que muestran lo que son los hombres.", "author": "Epicteto"}, {"text": "En medio del invierno aprendí por fin que había en mí un verano invencible.", "author": "Albert Camus"}, {"text": "El éxito consiste en ir de fracaso en fracaso sin perder el entusiasmo.", "author": "Winston Churchill"}, {"text": "Si estás atravesando un infierno, sigue caminando.", "author": "Winston Churchill"}, {"text": "Las cometas se elevan más alto contra el viento, no a favor de él.", "author": "Winston Churchill"}, {"text": "En medio de la dificultad reside la oportunidad.", "author": "Albert Einstein"}, {"text": "Hay una fuerza motriz más poderosa que el vapor, la electricidad y la energía atómica: la voluntad.", "author": "Albert Einstein"}, {"text": "La vida es como montar en bicicleta. Para mantener el equilibrio, debes seguir moviéndote.", "author": "Albert Einstein"}, {"text": "He fallado una y otra y otra vez en mi vida. Y es por eso que tengo éxito.", "author": "Michael Jordan"}, {"text": "Los obstáculos no tienen que detenerte. Si te encuentras con un muro, no te des la vuelta; descubre cómo escalarlo.", "author": "Michael Jordan"}, {"text": "Lo más importante es intentar inspirar a las personas para que puedan ser grandes en lo que sea que quieran hacer.", "author": "Kobe Bryant"}, {"text": "Todo lo negativo —la presión, los desafíos— es una oportunidad para mí de levantarme.", "author": "Kobe Bryant"}, {"text": "Odié cada minuto de entrenamiento, pero dije: 'No renuncies. Sufre ahora y vive el resto de tu vida como un campeón'.", "author": "Muhammad Ali"}, {"text": "Imposible es solo una palabra grande lanzada por hombres pequeños que encuentran más fácil vivir en el mundo que se les ha dado.", "author": "Muhammad Ali"}, {"text": "En la vida no hay nada que temer, solo hay que comprender.", "author": "Marie Curie"}, {"text": "La vida no es fácil para ninguno de nosotros. Pero ¡qué importa! Hay que perseverar y, sobre todo, tener confianza en uno mismo.", "author": "Marie Curie"}, {"text": "El fracaso es simplemente la oportunidad de comenzar de nuevo, esta vez de forma más inteligente.", "author": "Henry Ford"}, {"text": "Tanto si piensas que puedes, como si piensas que no puedes, estás en lo cierto.", "author": "Henry Ford"}, {"text": "No he fracasado. Simplemente he encontrado diez mil maneras que no funcionan.", "author": "Thomas Alva Edison"}, {"text": "Nuestra mayor debilidad radica en renunciar. La forma más segura de tener éxito es intentarlo una vez más.", "author": "Thomas Alva Edison"}, {"text": "El mundo rompe a todos, y después, muchos son fuertes en los lugares rotos.", "author": "Ernest Hemingway"}, {"text": "Pero el hombre no está hecho para la derrota. Un hombre puede ser destruido, pero no derrotado.", "author": "Ernest Hemingway"}, {"text": "Caer siete veces y levantarse ocho.", "author": "Proverbio Japonés"}, {"text": "El bambú que se dobla es más fuerte que el roble que resiste.", "author": "Proverbio Japonés"}, {"text": "Podrán encontrarme derrotada muchas veces, pero nunca reducida.", "author": "Maya Angelou"}, {"text": "Si no te gusta algo, cámbialo. Si no puedes cambiarlo, cambia tu actitud.", "author": "Maya Angelou"}, {"text": "Nada puede apagar la luz que brilla desde el interior.", "author": "Maya Angelou"}, {"text": "No soy producto de mis circunstancias. Soy producto de mis decisiones.", "author": "Stephen R. Covey"}, {"text": "Lo principal es mantener lo principal como lo principal.", "author": "Stephen R. Covey"}, {"text": "Tú no subes al nivel de tus metas. Caes al nivel de tus sistemas.", "author": "James Clear"}, {"text": "Cada acción que realizas es un voto por el tipo de persona en la que deseas convertirte.", "author": "James Clear"}, {"text": "Los hábitos son el interés compuesto de la superación personal.", "author": "James Clear"}, {"text": "La claridad sobre lo que importa proporciona claridad sobre lo que no importa.", "author": "Cal Newport"}, {"text": "Los esfuerzos profundos producen valor duradero y serenidad mental.", "author": "Cal Newport"}, {"text": "Si gastas tu tiempo persiguiendo mariposas, ellas volarán; si construyes un hermoso jardín, las mariposas vendrán a ti.", "author": "Mario Quintana"}, {"text": "Un marinero experto no se hace en mares tranquilos.", "author": "Franklin D. Roosevelt"}, {"text": "Lo único a lo que debemos temer es al miedo mismo.", "author": "Franklin D. Roosevelt"}, {"text": "Haz lo que puedas, con lo que tengas, donde estés.", "author": "Theodore Roosevelt"}, {"text": "Cree que puedes y ya estarás a medio camino.", "author": "Theodore Roosevelt"}, {"text": "No es el crítico quien cuenta, sino el hombre que realmente está en la arena y se esfuerza valientemente.", "author": "Theodore Roosevelt"}, {"text": "La resiliencia es aceptar tu nueva realidad, incluso si es menos buena que la que tenías antes.", "author": "Elizabeth Edwards"}, {"text": "El dolor es inevitable, pero el sufrimiento es opcional.", "author": "Haruki Murakami"}, {"text": "Cuando salgas de la tormenta, no serás la misma persona que entró en ella.", "author": "Haruki Murakami"}, {"text": "La cicatriz demuestra que la herida sanó y que tú fuiste más fuerte que aquello que intentó detenerte.", "author": "Viktor Frankl"}, {"text": "La verdadera medida de un hombre no se ve en momentos de comodidad, sino en momentos de desafío.", "author": "Martin Luther King Jr."}, {"text": "La perseverancia no es una carrera larga; son muchas carreras cortas una tras otra.", "author": "Walter Elliot"}, {"text": "Cambia tus pensamientos y cambiarás tu mundo.", "author": "Norman Vincent Peale"}, {"text": "El coraje no siempre ruge. A veces el coraje es la pequeña voz al final del día que dice: lo intentaré de nuevo mañana.", "author": "Mary Anne Radmacher"}, {"text": "Primero hacemos nuestros hábitos, y luego nuestros hábitos nos hacen a nosotros.", "author": "John Dryden"}, {"text": "La motivación es lo que te pone en marcha, y el hábito es lo que hace que sigas avanzando.", "author": "Jim Ryun"}];
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
      { id: "box_jose", name: "PENDIENTES JOSÉ 🧔🏻", color: "#2563eb", collapsed: false, order: 2 },
      { id: "box_leah", name: "PENDIENTES LEAH 👧🏻", color: "#2563eb", collapsed: false, order: 3 },
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

    boxes.forEach(box => { box.bootstrapSeed = true; });
    tasks.forEach(task => { task.bootstrapSeed = true; });
    return {
      boxes,
      tasks,
      monthlyCompletedBase: 66,
      completedBoxCollapsed: false,
      taskMemoryByBox: {},
      deletedTaskIds: [],
      deletedBoxIds: [],
      syncSchemaVersion: 1,
      bootstrapSeedData: true,
      updatedAt: 0
    };
  }

  const appState = {
    data: {
      boxes: [],
      tasks: [],
      monthlyCompletedBase: 66,
      completedBoxCollapsed: false,
      updatedAt: 0
    },
    settings: {
      theme: "light",
      soundsEnabled: true
    },
    backups: [],
    history: {},
    taskMemory: [],
    undoStack: [],
    redoStack: [],
    cloudChannel: "tasky_somerito_jose_sync_v1",
    cloudEventSource: null,
    deviceId: `dev_${Math.random().toString(36).slice(2, 10)}`,
    hasBootRendered: false,
    selectedRescheduledIds: new Set(),
    selectedOverdueIds: new Set(),
    firebaseConfig: {
      apiKey: "AIzaSyBCiHv2iS76-q4y3WHgdrJ2zW5YhrvEcb8",
      authDomain: "tasky-7a30c.firebaseapp.com",
      projectId: "tasky-7a30c",
      storageBucket: "tasky-7a30c.firebasestorage.app",
      messagingSenderId: "505071526437",
      appId: "1:505071526437:web:6c9eb46dbb4fef296655cc",
      databaseURL: "",
      docPath: "tasky_sync/somerito_main"
    },
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
    keepInlineAddOpenBoxId: null,
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

  // Point 6: Studio-Grade Warm Acoustic Marimba / Celeste Sound Engine (Things 3 / Apple Design Award Style)
  let sharedAudioCtx = null;
  function playNoteLayer(ctx, freqStart, freqEnd, delaySec, durationSec, oscType, peakGain) {
    const start = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = oscType || "sine";
    subOsc.type = "sine";

    osc.frequency.setValueAtTime(freqStart, start);
    subOsc.frequency.setValueAtTime(freqStart * 2, start);

    if (freqEnd && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, start + durationSec);
      subOsc.frequency.exponentialRampToValueAtTime(freqEnd * 2, start + durationSec);
    }

    // Warm acoustic low-pass filter removes harsh digital overtones
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, start);
    filter.frequency.exponentialRampToValueAtTime(680, start + durationSec);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + Math.min(0.012, durationSec * 0.18));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(peakGain * 0.18, start);
    subGain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec * 0.65);

    osc.connect(filter);
    subOsc.connect(subGain);
    subGain.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    subOsc.start(start);
    osc.stop(start + durationSec + 0.015);
    subOsc.stop(start + durationSec + 0.015);
  }

  function playUiSound(type) {
    if (!appState.settings.soundsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
      if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
      const ctx = sharedAudioCtx;

      switch (type) {
        case "complete":
          // Warm acoustic Celeste / Marimba Major-9th arpeggio (C5 - E5 - G5 - B5 - D6)
          playNoteLayer(ctx, 523.25, 523.25, 0.00, 0.22, "sine", 0.055);
          playNoteLayer(ctx, 659.25, 659.25, 0.045, 0.24, "sine", 0.058);
          playNoteLayer(ctx, 783.99, 783.99, 0.09, 0.28, "sine", 0.062);
          playNoteLayer(ctx, 1046.50, 1046.50, 0.135, 0.36, "sine", 0.068);
          break;
        case "uncomplete":
          // Soft wooden marimba two-note step down (G5 -> E5)
          playNoteLayer(ctx, 783.99, 783.99, 0.00, 0.13, "sine", 0.045);
          playNoteLayer(ctx, 659.25, 659.25, 0.05, 0.16, "sine", 0.042);
          break;
        case "addTask":
          // Warm Kalimba / Rhodes fifth interval (F5 -> C6)
          playNoteLayer(ctx, 698.46, 698.46, 0.00, 0.14, "sine", 0.05);
          playNoteLayer(ctx, 1046.50, 1046.50, 0.045, 0.20, "sine", 0.055);
          break;
        case "fold":
          // Gentle warm wooden kalimba note down (E5 -> C5)
          playNoteLayer(ctx, 659.25, 659.25, 0.00, 0.10, "sine", 0.038);
          playNoteLayer(ctx, 523.25, 523.25, 0.035, 0.13, "sine", 0.036);
          break;
        case "unfold":
          // Gentle warm wooden kalimba note up (C5 -> E5)
          playNoteLayer(ctx, 523.25, 523.25, 0.00, 0.10, "sine", 0.038);
          playNoteLayer(ctx, 659.25, 659.25, 0.035, 0.13, "sine", 0.04);
          break;
        case "reschedule":
          // Warm Rhodes sunrise chord (D5 -> F#5 -> A5)
          playNoteLayer(ctx, 587.33, 587.33, 0.00, 0.15, "sine", 0.048);
          playNoteLayer(ctx, 739.99, 739.99, 0.04, 0.18, "sine", 0.048);
          playNoteLayer(ctx, 880.00, 880.00, 0.08, 0.22, "sine", 0.052);
          break;
        case "repeat":
          // Soft harmonic bell chime (A5 -> E6)
          playNoteLayer(ctx, 880.00, 880.00, 0.00, 0.14, "sine", 0.045);
          playNoteLayer(ctx, 1318.51, 1318.51, 0.045, 0.20, "sine", 0.042);
          break;
        case "dragReady":
          // Subtle tactile wooden marimba lift (D5 -> A5)
          playNoteLayer(ctx, 587.33, 587.33, 0.00, 0.09, "sine", 0.042);
          playNoteLayer(ctx, 880.00, 880.00, 0.03, 0.12, "sine", 0.045);
          break;
        case "drop":
          // Warm acoustic settle chord (G4 -> D5)
          playNoteLayer(ctx, 392.00, 392.00, 0.00, 0.10, "sine", 0.045);
          playNoteLayer(ctx, 587.33, 587.33, 0.025, 0.14, "sine", 0.048);
          break;
        case "delete":
          // Soft muted low marimba note (A4 -> D4)
          playNoteLayer(ctx, 440.00, 440.00, 0.00, 0.10, "sine", 0.042);
          playNoteLayer(ctx, 293.66, 293.66, 0.04, 0.15, "sine", 0.045);
          break;
        case "scrollTop":
          // Soft harp glissando (C5 -> G5 -> C6)
          playNoteLayer(ctx, 523.25, 523.25, 0.00, 0.10, "sine", 0.035);
          playNoteLayer(ctx, 783.99, 783.99, 0.03, 0.12, "sine", 0.038);
          playNoteLayer(ctx, 1046.50, 1046.50, 0.06, 0.16, "sine", 0.04);
          break;
        case "modalOpen":
          // Subtle glass bell note (E5)
          playNoteLayer(ctx, 659.25, 659.25, 0.00, 0.12, "sine", 0.036);
          break;
        case "themeSwitch":
          // Warm Rhodes sixth interval (C5 -> A5)
          playNoteLayer(ctx, 523.25, 523.25, 0.00, 0.14, "sine", 0.045);
          playNoteLayer(ctx, 880.00, 880.00, 0.045, 0.18, "sine", 0.048);
          break;
        default:
          // Delicate wooden marimba tap (G5)
          playNoteLayer(ctx, 783.99, 783.99, 0.00, 0.055, "sine", 0.035);
          break;
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

  function copyTextToClipboard(text, toastMessage = "📋 Copiado al portapapeles", btnEl = null) {
    const cleanText = String(text || "");
    const triggerFeedback = () => {
      playUiSound("tap");
      if (btnEl) {
        btnEl.classList.add("copy-success-flash");
        setTimeout(() => btnEl.classList.remove("copy-success-flash"), 850);
      }
      showToast(toastMessage);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(cleanText).then(triggerFeedback).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = cleanText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        triggerFeedback();
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = cleanText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      triggerFeedback();
    }
  }

  // Point 3: Always capitalize first letter of every task
  function capitalizeFirst(str) {
    const trimmed = String(str || "").trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  function autoCapitalizeInputEl(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      const val = inputEl.value;
      if (val.length > 0 && val.charAt(0) !== val.charAt(0).toUpperCase()) {
        const pos = inputEl.selectionStart;
        inputEl.value = val.charAt(0).toUpperCase() + val.slice(1);
        try { inputEl.setSelectionRange(pos, pos); } catch (e) {}
      }
    });
  }

  // Point 4: Professional Floating Tooltip System with 1.35s Hover Delay
  function initProTooltips() {
    const tooltip = document.getElementById("pro-tooltip");
    const titleEl = document.getElementById("pro-tooltip-title-text");
    const descEl = document.getElementById("pro-tooltip-desc-text");
    if (!tooltip || !titleEl || !descEl) return;

    let activeTarget = null;
    let hoverTimer = null;

    function hideTooltip() {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      activeTarget = null;
      tooltip.classList.remove("visible");
    }

    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest("[data-tip-title]");
      if (!target) {
        hideTooltip();
        return;
      }
      if (target === activeTarget) return;
      hideTooltip();
      activeTarget = target;

      hoverTimer = setTimeout(() => {
        if (!activeTarget || !document.body.contains(activeTarget)) return;
        titleEl.textContent = activeTarget.dataset.tipTitle || "";
        descEl.textContent = activeTarget.dataset.tipDesc || "";
        const rect = activeTarget.getBoundingClientRect();
        const ttWidth = 240;
        let left = rect.left + rect.width / 2 - ttWidth / 2;
        left = Math.max(12, Math.min(window.innerWidth - ttWidth - 12, left));
        let top = rect.bottom + 10;
        if (top + 70 > window.innerHeight) {
          top = rect.top - 68;
        }
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.add("visible");
      }, 1350);
    });

    document.addEventListener("mousedown", hideTooltip);
    window.addEventListener("scroll", hideTooltip, { passive: true });
  }

  function normalizeDataPayload(raw) {
    if (!raw || typeof raw !== "object") return null;
    const today = getTodayISO();
    const boxesRaw = Array.isArray(raw.boxes) ? raw.boxes : [];
    const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : [];

    const boxes = boxesRaw.map((b, idx) => ({
      ...b,
      id: String(b.id || `box_${Date.now()}_${idx}`),
      name: String(b.name || b.title || "CASILLA").trim().toUpperCase(),
      color: String(b.color || "#2563eb"),
      collapsed: Boolean(b.collapsed),
      order: typeof b.order === "number" ? b.order : idx
    }));

    const tasks = tasksRaw.map((t, idx) => {
      const due = String(t.dueDate || today);
      const isResched = Boolean(due > today);
      const freq = String(t.frequency || "once");
      let repDays = Array.isArray(t.repeatDays) ? t.repeatDays : [];
      if (freq === "daily" && repDays.length === 0) repDays = [0, 1, 2, 3, 4, 5, 6];
      return {
        ...t,
        id: String(t.id || `task_${Date.now()}_${idx}`),
        boxId: String(t.boxId || (boxes[0] ? boxes[0].id : "box_casa")),
        title: capitalizeFirst(t.title || t.name || "Tarea"),
        completedDate: t.completedDate ? String(t.completedDate) : (Boolean(t.done || t.completed) ? today : null),
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
      monthlyCompletedBase: typeof raw.monthlyCompletedBase === "number" ? raw.monthlyCompletedBase : 66,
      completedBoxCollapsed: Boolean(raw.completedBoxCollapsed),
      taskMemoryByBox: (raw.taskMemoryByBox && typeof raw.taskMemoryByBox === "object" && !Array.isArray(raw.taskMemoryByBox)) ? raw.taskMemoryByBox : {},
      deletedTaskIds: Array.isArray(raw.deletedTaskIds) ? Array.from(new Set(raw.deletedTaskIds.map(x => String(x || "").trim()).filter(Boolean))) : [],
      deletedBoxIds: Array.isArray(raw.deletedBoxIds) ? Array.from(new Set(raw.deletedBoxIds.map(x => String(x || "").trim()).filter(Boolean))) : [],
      syncSchemaVersion: Number(raw.syncSchemaVersion || 0),
      bootstrapSeedData: Boolean(raw.bootstrapSeedData),
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0
    };
  }

  // ==========================================================================
  // POINT 2: PER-CASILLA TASK MEMORY ENGINE (Strictly isolated per Box!)
  // ==========================================================================
  function getBoxMemoryKey(boxId) {
    if (!boxId) return "default_box";
    const box = appState.data.boxes.find(b => b.id === boxId);
    if (box && box.name) {
      return `box_mem_${box.name.trim().toUpperCase()}`;
    }
    return String(boxId);
  }

  function rebuildTaskMemoryFromTasks() {
    let memMap = {};
    const rawMem = safeStorage.getItem(STORAGE_KEYS.MEMORY);
    if (rawMem) {
      try {
        const parsed = JSON.parse(rawMem);
        // Only accept object map keyed by box (ignore legacy flat array!)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          memMap = { ...parsed };
        }
      } catch (e) {}
    }

    if (appState.data.taskMemoryByBox && typeof appState.data.taskMemoryByBox === "object" && !Array.isArray(appState.data.taskMemoryByBox)) {
      Object.keys(appState.data.taskMemoryByBox).forEach(k => {
        const arr = Array.isArray(appState.data.taskMemoryByBox[k]) ? appState.data.taskMemoryByBox[k] : [];
        const existing = Array.isArray(memMap[k]) ? memMap[k] : [];
        const merged = [...existing];
        arr.forEach(item => {
          const clean = capitalizeFirst(item);
          if (clean && !merged.some(x => String(x).toLowerCase() === clean.toLowerCase())) {
            merged.push(clean);
          }
        });
        memMap[k] = merged;
      });
    }

    // Seed each box ONLY with its own tasks
    appState.data.tasks.forEach(t => {
      const key = getBoxMemoryKey(t.boxId);
      if (!Array.isArray(memMap[key])) memMap[key] = [];
      const clean = capitalizeFirst(t.title);
      if (clean && !memMap[key].some(x => String(x).toLowerCase() === clean.toLowerCase())) {
        memMap[key].push(clean);
      }
    });

    // Also seed baseline tasks strictly into their matching Casilla
    const baseline = buildRestoredUserDataset();
    baseline.tasks.forEach(bt => {
      const baseBox = baseline.boxes.find(b => b.id === bt.boxId);
      const key = baseBox ? `box_mem_${baseBox.name.trim().toUpperCase()}` : String(bt.boxId);
      if (!Array.isArray(memMap[key])) memMap[key] = [];
      const clean = capitalizeFirst(bt.title);
      if (clean && !memMap[key].some(x => String(x).toLowerCase() === clean.toLowerCase())) {
        memMap[key].push(clean);
      }
    });

    appState.taskMemory = memMap;
    appState.data.taskMemoryByBox = memMap;
    safeStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memMap));
  }

  function learnTaskTitle(title, boxId) {
    const clean = capitalizeFirst(title);
    if (!clean || clean.length < 2 || !boxId) return;
    if (!appState.taskMemory || typeof appState.taskMemory !== "object" || Array.isArray(appState.taskMemory)) {
      appState.taskMemory = {};
    }
    const key = getBoxMemoryKey(boxId);
    const currentList = Array.isArray(appState.taskMemory[key]) ? appState.taskMemory[key] : [];
    const lower = clean.toLowerCase();
    appState.taskMemory[key] = [
      clean,
      ...currentList.filter(item => String(item).toLowerCase() !== lower)
    ].slice(0, 120);
    appState.data.taskMemoryByBox = appState.taskMemory;
    safeStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(appState.taskMemory));
  }

  function getTaskSuggestions(queryText, boxId) {
    const q = String(queryText || "").trim().toLowerCase();
    if (!q || !boxId) return [];

    const key = getBoxMemoryKey(boxId);
    const boxList = (appState.taskMemory && Array.isArray(appState.taskMemory[key]))
      ? appState.taskMemory[key]
      : [];

    const prefixMatches = [];
    const containsMatches = [];
    const seen = new Set();

    boxList.forEach(item => {
      const text = String(item || "").trim();
      const lower = text.toLowerCase();
      if (!text || lower === q || seen.has(lower)) return;
      if (lower.startsWith(q)) {
        seen.add(lower);
        prefixMatches.push(text);
      } else if (lower.includes(q)) {
        seen.add(lower);
        containsMatches.push(text);
      }
    });

    return [...prefixMatches, ...containsMatches].slice(0, 5);
  }

  // ==========================================================================
  // POINT 11: UNDO / REDO HISTORY ENGINE (Ctrl + Z / Ctrl + Shift + Z)
  // ==========================================================================
  function pushUndoSnapshot(actionLabel = "Acción") {
    try {
      const snap = JSON.stringify(appState.data);
      if (appState.undoStack.length > 0 && appState.undoStack[appState.undoStack.length - 1].snap === snap) {
        return;
      }
      appState.undoStack.push({ label: actionLabel, snap });
      if (appState.undoStack.length > 35) appState.undoStack.shift();
      appState.redoStack = [];
    } catch (e) {}
  }

  function performUndo() {
    if (!appState.undoStack.length) {
      showToast("No hay acciones para deshacer");
      return;
    }
    const last = appState.undoStack.pop();
    appState.redoStack.push({
      label: last.label,
      snap: JSON.stringify(appState.data)
    });
    appState.data = normalizeDataPayload(JSON.parse(last.snap));
    appState.data.updatedAt = Date.now();
    playUiSound("uncomplete");
    saveData(false, "Deshizo acción");
    renderBoard();
    showToast(`Deshecho: ${last.label}`);
  }

  function performRedo() {
    if (!appState.redoStack.length) {
      showToast("No hay acciones para rehacer");
      return;
    }
    const next = appState.redoStack.pop();
    appState.undoStack.push({
      label: next.label,
      snap: JSON.stringify(appState.data)
    });
    appState.data = normalizeDataPayload(JSON.parse(next.snap));
    appState.data.updatedAt = Date.now();
    playUiSound("complete");
    saveData(false, "Rehizo acción");
    renderBoard();
    showToast(`Rehecho: ${next.label}`);
  }

  // ==========================================================================
  // POINT 2: NATIVE FIREBASE CLOUD ENGINE (FIRESTORE + REALTIME DB) & FULL DATA RESCUE
  // Zero JSONBin reliance — rescues 100% of web tasks, Casillas, memory & history into Firebase
  // ==========================================================================
  let cloudSyncReady = false;
  let cloudSyncReadyConfig = "";
  let cloudPullInFlight = false;
  let cloudBootstrapInFlight = false;
  let lastCloudBootstrapError = "";
  let syncBroadcastChannel = null;
  try {
    if (typeof window.BroadcastChannel !== "undefined") {
      syncBroadcastChannel = new window.BroadcastChannel("tasky_firebase_realtime_bus");
      syncBroadcastChannel.onmessage = (ev) => {
        if (ev.data && ev.data.payload && ev.data.deviceId !== appState.deviceId) {
          applyIncomingSyncPayload(ev.data.payload, false);
        }
      };
    }
  } catch (e) {}

  window.addEventListener("storage", (ev) => {
    if (ev.key === STORAGE_KEYS.DATA && ev.newValue) {
      try {
        const parsed = JSON.parse(ev.newValue);
        applyIncomingSyncPayload(parsed, false);
      } catch (e) {}
    }
  });

  function isCloudNetworkAllowed() {
    return (
      typeof window.fetch === "function" &&
      (window.location.protocol === "https:" || window.location.protocol === "http:") &&
      navigator.onLine !== false
    );
  }

  function getCloudSyncConfigKey() {
    const cfg = appState.firebaseConfig || {};
    return JSON.stringify({
      projectId: String(cfg.projectId || "").trim(),
      databaseURL: String(cfg.databaseURL || "").trim().replace(/\/+$/, ""),
      docPath: String(cfg.docPath || "").trim().replace(/^\/+|\/+$/g, "")
    });
  }

  function loadSavedFirebaseConfig() {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.projectId) {
          const parsedProjectId = String(parsed.projectId).trim();
          if (parsedProjectId === "esbas-2026" || parsedProjectId === "tasky-7a30c") {
            // Migrate stale devices to the verified Tasky web config. Keep the chosen Firestore path.
            // Preserve a Realtime Database URL only when the saved config is already Tasky's project.
            const migrated = {
              ...appState.firebaseConfig,
              docPath: String(parsed.docPath || appState.firebaseConfig.docPath || "tasky_sync/somerito_main").replace(/^\/+|\/+$/g, ""),
              databaseURL: parsedProjectId === "tasky-7a30c" ? String(parsed.databaseURL || "") : ""
            };
            appState.firebaseConfig = migrated;
            safeStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(migrated));
          } else {
            appState.firebaseConfig = {
              ...appState.firebaseConfig,
              ...parsed
            };
          }
        }
      }
      ["jsonbin_config", "tasky_jsonbin", "cfo_v101_final"].forEach((legacyKey) => {
        try {
          if (legacyKey.includes("jsonbin")) window.localStorage.removeItem(legacyKey);
        } catch (e) {}
      });
    } catch (e) {}
  }

  function getFirebaseFirestoreUrl() {
    const cfg = appState.firebaseConfig || {};
    const proj = String(cfg.projectId || "tasky-7a30c").trim();
    const docPath = String(cfg.docPath || "tasky_sync/somerito_main").replace(/^\/+|\/+$/g, "");
    const keyParam = cfg.apiKey ? `?key=${encodeURIComponent(cfg.apiKey)}` : "";
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(proj)}/databases/(default)/documents/${docPath}${keyParam}`;
  }

  function getFirebaseRtdbUrl() {
    const cfg = appState.firebaseConfig || {};
    // Only query Realtime Database when its exact URL is configured.
    // Tasky's registered Firebase Web SDK config does not contain databaseURL, so do not guess a host.
    const base = String(cfg.databaseURL || "").trim().replace(/\/+$/, "");
    if (!base) return "";
    const docPath = String(cfg.docPath || "tasky_sync/somerito_main").replace(/^\/+|\/+$/g, "");
    return `${base}/${docPath}.json`;
  }

  function getCloudTopicUrl(suffix = "") {
    const proj = String((appState.firebaseConfig && appState.firebaseConfig.projectId) || appState.cloudChannel || "tasky_somerito_firebase_v1")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    return `https://ntfy.sh/tasky_fb_${proj}${suffix}`;
  }

  function packCompactEnvelope() {
    const d = appState.data;
    return JSON.stringify({
      v: 2,
      d: appState.deviceId,
      u: Number(d.updatedAt || Date.now()),
      m: Number(d.monthlyCompletedBase || 66),
      cc: d.completedBoxCollapsed ? 1 : 0,
      sv: 1,
      dt: Array.isArray(d.deletedTaskIds) ? d.deletedTaskIds : [],
      db: Array.isArray(d.deletedBoxIds) ? d.deletedBoxIds : [],
      b: d.boxes.map(x => [x.id, String(x.name || "").toUpperCase(), x.color || "#2563eb", x.collapsed ? 1 : 0, x.order || 0]),
      t: d.tasks.map(x => [
        x.id,
        x.boxId,
        x.title,
        x.done ? 1 : 0,
        x.completedDate || "",
        x.dueDate || "",
        x.frequency || "once",
        Array.isArray(x.repeatDays) ? x.repeatDays : [],
        x.rescheduledCount || 0,
        x.isRescheduled ? 1 : 0,
        x.order || 0
      ])
    });
  }

  function unpackCompactEnvelope(parsed) {
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.tasky_data) {
      return normalizeDataPayload(parsed.tasky_data);
    }
    if (parsed.boxes && parsed.tasks) {
      return normalizeDataPayload(parsed);
    }
    if (parsed.v === 2 && Array.isArray(parsed.b) && Array.isArray(parsed.t)) {
      const boxes = parsed.b.map((arr, idx) => ({
        id: arr[0],
        name: String(arr[1] || "CASILLA").toUpperCase(),
        color: arr[2] || "#2563eb",
        collapsed: Boolean(arr[3]),
        order: typeof arr[4] === "number" ? arr[4] : idx
      }));
      const tasks = parsed.t.map((arr, idx) => ({
        id: arr[0],
        boxId: arr[1],
        title: arr[2],
        done: Boolean(arr[3]),
        completedDate: arr[4] || null,
        dueDate: arr[5] || getTodayISO(),
        frequency: arr[6] || "once",
        repeatDays: Array.isArray(arr[7]) ? arr[7] : [],
        rescheduledCount: Number(arr[8] || 0),
        isRescheduled: Boolean(arr[9]),
        order: typeof arr[10] === "number" ? arr[10] : idx
      }));
      return normalizeDataPayload({
        boxes,
        tasks,
        monthlyCompletedBase: Number(parsed.m || 66),
        completedBoxCollapsed: Boolean(parsed.cc),
        deletedTaskIds: Array.isArray(parsed.dt) ? parsed.dt : [],
        deletedBoxIds: Array.isArray(parsed.db) ? parsed.db : [],
        syncSchemaVersion: Number(parsed.sv || 0),
        updatedAt: Number(parsed.u || 0)
      });
    }
    return null;
  }

  function syncFingerprint(raw) {
    const d = normalizeDataPayload(raw);
    if (!d) return "";
    return JSON.stringify({
      boxes: d.boxes,
      tasks: d.tasks,
      deletedTaskIds: d.deletedTaskIds.slice().sort(),
      deletedBoxIds: d.deletedBoxIds.slice().sort(),
      monthlyCompletedBase: d.monthlyCompletedBase,
      completedBoxCollapsed: d.completedBoxCollapsed,
      taskMemoryByBox: d.taskMemoryByBox || {},
      history: d.history || {},
      settings: d.settings || {}
    });
  }

  function canonicalBoxKey(name) {
    return String(name || "CASILLA")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function mergeSyncDatasets(leftRaw, rightRaw) {
    const left = normalizeDataPayload(leftRaw);
    const right = normalizeDataPayload(rightRaw);
    if (!left) return right;
    if (!right) return left;

    const leftTime = Number(left.updatedAt || 0);
    const rightTime = Number(right.updatedAt || 0);
    let primary = (leftTime <= 0 && rightTime > 0) ? right
      : (rightTime <= 0 && leftTime > 0) ? left
      : (rightTime >= leftTime ? right : left);
    let secondary = primary === left ? right : left;

    const leftDeletedTaskIds = new Set(left.deletedTaskIds || []);
    const rightDeletedTaskIds = new Set(right.deletedTaskIds || []);
    const leftDeletedBoxIds = new Set(left.deletedBoxIds || []);
    const rightDeletedBoxIds = new Set(right.deletedBoxIds || []);
    const leftTaskIds = new Set(left.tasks.map(task => String(task.id)));
    const rightTaskIds = new Set(right.tasks.map(task => String(task.id)));

    const leftBoxKeys = new Set(left.boxes.map(box => canonicalBoxKey(box.name)));
    const rightBoxKeys = new Set(right.boxes.map(box => canonicalBoxKey(box.name)));
    const leftMissingCount =
      left.tasks.filter(task => !rightTaskIds.has(String(task.id)) && !rightDeletedTaskIds.has(String(task.id))).length +
      left.boxes.filter(box => !rightBoxKeys.has(canonicalBoxKey(box.name)) && !rightDeletedBoxIds.has(String(box.id))).length;
    const rightMissingCount =
      right.tasks.filter(task => !leftTaskIds.has(String(task.id)) && !leftDeletedTaskIds.has(String(task.id))).length +
      right.boxes.filter(box => !leftBoxKeys.has(canonicalBoxKey(box.name)) && !leftDeletedBoxIds.has(String(box.id))).length;

    // Prefer the materially more complete dataset even when its clock is older.
    if (leftMissingCount > rightMissingCount + 3) {
      primary = left;
      secondary = right;
    } else if (rightMissingCount > leftMissingCount + 3) {
      primary = right;
      secondary = left;
    } else {
      const leftMissingKnownData = rightMissingCount > 0;
      const rightMissingKnownData = leftMissingCount > 0;
      if (leftMissingKnownData && !rightMissingKnownData) {
        primary = right;
        secondary = left;
      } else if (rightMissingKnownData && !leftMissingKnownData) {
        primary = left;
        secondary = right;
      }
    }

    const ignoreUnversionedSecondary = Number(primary.updatedAt || 0) > 0 && Number(secondary.updatedAt || 0) <= 0;
    const primaryIsSeed = Boolean(primary.bootstrapSeedData);
    const secondaryIsSeed = Boolean(secondary.bootstrapSeedData);
    const deletedTaskIds = Array.from(new Set([
      ...(left.deletedTaskIds || []), ...(right.deletedTaskIds || [])
    ])).filter(Boolean);
    const deletedBoxIds = Array.from(new Set([
      ...(left.deletedBoxIds || []), ...(right.deletedBoxIds || [])
    ])).filter(Boolean);
    const deletedTasks = new Set(deletedTaskIds);
    const deletedBoxes = new Set(deletedBoxIds);

    // Map semantically identical boxes by normalized display name. The chosen primary box ID
    // becomes the canonical ID for tasks coming from either device.
    const primaryBoxesByKey = new Map();
    (primary.boxes || []).forEach(box => {
      const key = canonicalBoxKey(box.name);
      if (!primaryBoxesByKey.has(key) && !deletedBoxes.has(String(box.id))) primaryBoxesByKey.set(key, box);
    });
    const secondaryBoxesByKey = new Map();
    (secondary.boxes || []).forEach(box => {
      const key = canonicalBoxKey(box.name);
      if (!secondaryBoxesByKey.has(key) && !deletedBoxes.has(String(box.id))) secondaryBoxesByKey.set(key, box);
    });

    const canonicalBoxesByKey = new Map();
    primaryBoxesByKey.forEach((box, key) => {
      const other = secondaryBoxesByKey.get(key);
      let chosen = box;
      if (box.bootstrapSeed === true && other && other.bootstrapSeed !== true && !secondaryIsSeed) chosen = other;
      canonicalBoxesByKey.set(key, chosen);
    });
    if (!ignoreUnversionedSecondary) {
      secondaryBoxesByKey.forEach((box, key) => {
        if (canonicalBoxesByKey.has(key)) return;
        if (box.bootstrapSeed === true && !primaryIsSeed) return;
        canonicalBoxesByKey.set(key, box);
      });
    }

    const primaryIdToCanonical = new Map();
    const secondaryIdToCanonical = new Map();
    (primary.boxes || []).forEach(box => {
      const canonical = canonicalBoxesByKey.get(canonicalBoxKey(box.name));
      if (canonical) primaryIdToCanonical.set(String(box.id), String(canonical.id));
    });
    (secondary.boxes || []).forEach(box => {
      const canonical = canonicalBoxesByKey.get(canonicalBoxKey(box.name));
      if (canonical) secondaryIdToCanonical.set(String(box.id), String(canonical.id));
    });

    const canonicalPrimaryTasks = (primary.tasks || []).map(task => ({
      ...task,
      boxId: primaryIdToCanonical.get(String(task.boxId)) || String(task.boxId)
    }));
    const canonicalSecondaryTasks = (secondary.tasks || []).map(task => ({
      ...task,
      boxId: secondaryIdToCanonical.get(String(task.boxId)) || String(task.boxId)
    }));

    function combineById(primaryItems, secondaryItems, tombstones, idKey, extraFilter) {
      const byId = new Map();
      const secondaryById = new Map((Array.isArray(secondaryItems) ? secondaryItems : [])
        .filter(item => item && item[idKey] != null).map(item => [String(item[idKey]), item]));
      (Array.isArray(primaryItems) ? primaryItems : []).forEach(item => {
        if (!item || item[idKey] == null) return;
        const id = String(item[idKey]);
        if (tombstones.has(id)) return;
        const otherItem = secondaryById.get(id);
        const suppressSeed = item.bootstrapSeed === true && !secondaryIsSeed && !otherItem;
        const useOtherAuthoritativeItem = item.bootstrapSeed === true && otherItem && otherItem.bootstrapSeed !== true && !secondaryIsSeed;
        const chosenItem = useOtherAuthoritativeItem ? otherItem : item;
        if (!suppressSeed && (!extraFilter || extraFilter(chosenItem))) byId.set(id, chosenItem);
      });
      if (!ignoreUnversionedSecondary) {
        (Array.isArray(secondaryItems) ? secondaryItems : []).forEach(item => {
          if (!item || item[idKey] == null) return;
          const id = String(item[idKey]);
          if (tombstones.has(id) || byId.has(id)) return;
          const matchedOther = (Array.isArray(primaryItems) ? primaryItems : []).some(entry => entry && String(entry[idKey]) === id);
          const suppressSeed = item.bootstrapSeed === true && !primaryIsSeed && !matchedOther;
          if (!suppressSeed && (!extraFilter || extraFilter(item))) byId.set(id, item);
        });
      }
      return Array.from(byId.values());
    }

    const tasks = combineById(
      canonicalPrimaryTasks,
      canonicalSecondaryTasks,
      deletedTasks,
      "id",
      task => Array.from(canonicalBoxesByKey.values()).some(box => String(box.id) === String(task.boxId))
    );

    const usedCanonicalBoxIds = new Set(tasks.map(task => String(task.boxId)));
    const boxes = Array.from(canonicalBoxesByKey.values()).filter(box =>
      !deletedBoxes.has(String(box.id)) &&
      (usedCanonicalBoxIds.has(String(box.id)) || !box.bootstrapSeed || canonicalBoxesByKey.size <= 7)
    );

    const normalizedTasks = tasks
      .filter(task => !deletedBoxes.has(String(task.boxId)) && boxes.some(box => String(box.id) === String(task.boxId)))
      .map(task => ({ ...task }));

    const merged = {
      ...primary,
      boxes,
      tasks: normalizedTasks,
      deletedTaskIds,
      deletedBoxIds,
      taskMemoryByBox: { ...(secondary.taskMemoryByBox || {}), ...(primary.taskMemoryByBox || {}) },
      history: { ...(secondary.history || {}), ...(primary.history || {}) },
      settings: { ...(secondary.settings || {}), ...(primary.settings || {}) },
      bootstrapSeedData: primaryIsSeed && secondaryIsSeed,
      syncSchemaVersion: 1,
      updatedAt: Math.max(leftTime, rightTime)
    };
    if (!merged.bootstrapSeedData) {
      merged.boxes.forEach(box => { delete box.bootstrapSeed; });
      merged.tasks.forEach(task => { delete task.bootstrapSeed; });
    }
    if (syncFingerprint(merged) !== syncFingerprint(primary)) {
      merged.updatedAt = Math.max(Date.now(), Math.max(leftTime, rightTime) + 1);
    }
    return merged;
  }

  function applyIncomingSyncPayload(incomingRaw, showNotification = false) {
    const norm = normalizeDataPayload(incomingRaw);
    if (!norm || !Array.isArray(norm.boxes) || !norm.boxes.length) return false;
    const local = normalizeDataPayload(appState.data);
    const merged = mergeSyncDatasets(local, norm);
    if (!merged) return false;

    const currentSig = syncFingerprint(local);
    const nextSig = syncFingerprint(merged);
    if (currentSig === nextSig) {
      if (Number(merged.updatedAt || 0) > Number(appState.data.updatedAt || 0)) {
        appState.data.updatedAt = merged.updatedAt;
        appState.data.syncSchemaVersion = 1;
        safeStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(appState.data));
      }
      if (syncFingerprint(merged) !== syncFingerprint(norm)) pushCloudSync(false);
      return false;
    }

    appState.data = merged;
    safeStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(appState.data));
    rebuildTaskMemoryFromTasks();
    renderBoard();
    const syncText = document.getElementById("sync-status-text");
    if (syncText) syncText.textContent = "Firebase conciliando datos";
    if (syncFingerprint(merged) !== syncFingerprint(norm)) pushCloudSync(false);
    if (showNotification) showToast("🔄 Datos fusionados sin perder tareas");
    return true;
  }

  let cloudPushTimer = null;
  function pushCloudSync(forceImmediateToast = false) {
    if (!cloudSyncReady || cloudSyncReadyConfig !== getCloudSyncConfigKey()) {
      if (forceImmediateToast) showToast("Sincronización bloqueada por seguridad: primero hay que verificar la nube o usar «Rescatar y Subir Todo a Firebase».");
      return;
    }
    if (syncBroadcastChannel) {
      try {
        syncBroadcastChannel.postMessage({
          deviceId: appState.deviceId,
          payload: appState.data
        });
      } catch (e) {}
    }
    if (!isCloudNetworkAllowed()) {
      if (forceImmediateToast) showToast("Guardado localmente (Firebase en espera de red)");
      return;
    }
    if (cloudPushTimer) clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(async () => {
      const fullPayload = {
        ...appState.data,
        syncSchemaVersion: 1,
        deletedTaskIds: Array.isArray(appState.data.deletedTaskIds) ? appState.data.deletedTaskIds : [],
        deletedBoxIds: Array.isArray(appState.data.deletedBoxIds) ? appState.data.deletedBoxIds : [],
        taskMemoryByBox: appState.taskMemory,
        history: appState.history,
        settings: appState.settings,
        deviceId: appState.deviceId,
        updatedAt: Number(appState.data.updatedAt || Date.now())
      };
      const compactStr = packCompactEnvelope();
      let firebaseSaved = false;

      // 1. Push to Cloud Firestore Document (Native Firebase v1 REST)
      try {
        const fsUrl = getFirebaseFirestoreUrl();
        const fsBody = {
          fields: {
            payloadJson: { stringValue: JSON.stringify(fullPayload) },
            compactEnvelope: { stringValue: compactStr },
            updatedAt: { integerValue: String(fullPayload.updatedAt) },
            deviceId: { stringValue: String(appState.deviceId) }
          }
        };
        const res = await window.fetch(fsUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fsBody),
          keepalive: true
        });
        if (res && res.ok) firebaseSaved = true;
      } catch (e) {}

      // 2. Push to Firebase Realtime Database (if databaseURL or default rtdb is active)
      try {
        const rtdbUrl = getFirebaseRtdbUrl();
        if (rtdbUrl) {
          const resRt = await window.fetch(rtdbUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fullPayload),
            keepalive: true
          });
          if (resRt && resRt.ok) firebaseSaved = true;
        }
      } catch (e) {}

      // 3. Mirror compact envelope to real-time SSE stream for instant sub-second push across open windows
      try {
        await window.fetch(getCloudTopicUrl(""), {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8", "Cache": "yes" },
          body: compactStr,
          keepalive: true
        });
      } catch (e) {}

      const syncText = document.getElementById("sync-status-text");
      if (syncText) syncText.textContent = firebaseSaved ? "Firebase sincronizado" : "Nube no confirmada · datos locales protegidos";
      const modalSyncTime = document.getElementById("modal-sync-last-time");
      if (modalSyncTime) {
        const now = new Date();
        modalSyncTime.textContent = firebaseSaved
          ? `${now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} (escritura confirmada en Firebase ${appState.firebaseConfig.projectId || "Cloud"})`
          : "No se confirmó la escritura remota; los datos locales se conservaron.";
      }
      if (forceImmediateToast) {
        showToast(
          firebaseSaved ? "🔥 Escritura confirmada en Firebase" : "⚠️ No se confirmó el guardado remoto; tus datos locales se conservaron.",
          !firebaseSaved
        );
      }
    }, forceImmediateToast ? 10 : 80);
  }

  function renderSyncDiagnostics(statuses) {
    const entries = [
      ["Firestore", statuses.firestore || "sin respuesta"],
      ["Realtime Database", statuses.rtdb || "sin respuesta"],
      ["ntfy (canal auxiliar)", statuses.ntfy || "no comprobado"]
    ];
    const fullText = entries.map(([name, value]) => `${name}: ${value}`).join(" · ");
    const details = document.getElementById("sync-diagnostic-details");
    if (details) details.textContent = fullText;
    return fullText;
  }

  function compactProviderStatus(value) {
    const match = String(value || "").match(/HTTP\\s+\\d+/i);
    if (match) return match[0].replace(/\\s+/g, "");
    if (String(value || "").startsWith("OK")) return "OK";
    if (String(value || "").includes("vacía") || String(value || "").includes("sin una copia válida") || String(value || "").includes("sin campo payloadJson")) return "200 sin datos válidos";
    return "error";
  }

  async function autoBootstrapFirestoreDocument(localRaw, sourceStatus) {
    if (cloudBootstrapInFlight) return "busy";
    cloudBootstrapInFlight = true;
    try {
      const cfg = appState.firebaseConfig || {};
      const projectId = String(cfg.projectId || "").trim();
      const parts = String(cfg.docPath || "tasky_sync/somerito_main")
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean);
      if (!projectId || parts.length < 2 || parts.length % 2 !== 0) {
        sourceStatus.firestore = "No se pudo inicializar: la ruta de documento no es válida.";
        renderSyncDiagnostics(sourceStatus);
        return "failed";
      }

      const candidate = normalizeDataPayload(localRaw);
      if (!candidate || !candidate.boxes.length || !Array.isArray(candidate.tasks)) {
        sourceStatus.firestore = "No se pudo inicializar: los datos locales no son válidos.";
        renderSyncDiagnostics(sourceStatus);
        return "failed";
      }

      candidate.updatedAt = Math.max(Date.now(), Number(candidate.updatedAt || 0) + 1);
      candidate.syncSchemaVersion = 1;
      candidate.deletedTaskIds = Array.isArray(candidate.deletedTaskIds) ? candidate.deletedTaskIds : [];
      candidate.deletedBoxIds = Array.isArray(candidate.deletedBoxIds) ? candidate.deletedBoxIds : [];
      candidate.bootstrapSeedData = false;
      candidate.boxes.forEach(box => { delete box.bootstrapSeed; });
      candidate.tasks.forEach(task => { delete task.bootstrapSeed; });

      appState.data = candidate;
      safeStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(appState.data));
      rebuildTaskMemoryFromTasks();

      const fullPayload = {
        ...appState.data,
        taskMemoryByBox: appState.taskMemory,
        history: appState.history,
        settings: appState.settings,
        deviceId: appState.deviceId,
        updatedAt: Number(appState.data.updatedAt)
      };
      const compactStr = packCompactEnvelope();
      const documentId = parts[parts.length - 1];
      const collectionPath = parts.slice(0, -1).map(encodeURIComponent).join("/");
      const keyParam = cfg.apiKey ? "&key=" + encodeURIComponent(cfg.apiKey) : "";
      const createUrl = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(projectId) +
        "/databases/(default)/documents/" + collectionPath + "?documentId=" + encodeURIComponent(documentId) + keyParam;
      const body = {
        fields: {
          payloadJson: { stringValue: JSON.stringify(fullPayload) },
          compactEnvelope: { stringValue: compactStr },
          updatedAt: { integerValue: String(fullPayload.updatedAt) },
          deviceId: { stringValue: String(appState.deviceId) }
        }
      };

      const response = await window.fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const responseText = await response.text();

      if (response.ok) {
        cloudSyncReady = true;
        cloudSyncReadyConfig = getCloudSyncConfigKey();
        sourceStatus.firestore = "Documento creado automáticamente · " + candidate.boxes.length + " casillas, " + candidate.tasks.length + " tareas";
        renderSyncDiagnostics(sourceStatus);
        const syncText = document.getElementById("sync-status-text");
        if (syncText) syncText.textContent = "Firebase inicializado · sincronización automática";
        const modalSyncTime = document.getElementById("modal-sync-last-time");
        if (modalSyncTime) modalSyncTime.textContent = "Copia inicial creada automáticamente en Firestore. Los cambios se sincronizarán sin pulsar botones.";
        lastCloudBootstrapError = "";
        showToast("✅ Nube inicializada. La sincronización automática ya está activa.");
        try {
          await window.fetch(getCloudTopicUrl(""), {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: compactStr
          });
        } catch (e) {}
        return "created";
      }

      let parsedError = "";
      try {
        const err = JSON.parse(responseText);
        parsedError = err && err.error && err.error.message ? String(err.error.message) : responseText;
      } catch (e) {
        parsedError = responseText;
      }
      const shortError = String(parsedError || response.statusText || "Error desconocido").replace(/\s+/g, " ").slice(0, 220);
      sourceStatus.firestore = "HTTP " + response.status + " al crear documento: " + shortError;
      renderSyncDiagnostics(sourceStatus);

      if (response.status === 409 || /ALREADY_EXISTS|already exists/i.test(shortError)) {
        sourceStatus.firestore = "El documento fue creado por otro dispositivo; se volverá a leer automáticamente.";
        renderSyncDiagnostics(sourceStatus);
        return "exists";
      }

      const signature = String(response.status) + ":" + shortError;
      if (signature !== lastCloudBootstrapError) {
        showToast("No se pudo iniciar Firestore (HTTP " + response.status + "). Revisa Diagnóstico de conexión.", true);
        lastCloudBootstrapError = signature;
      }
      return "failed";
    } catch (error) {
      const message = String(error && error.message || error).slice(0, 220);
      sourceStatus.firestore = "Error al crear documento: " + message;
      renderSyncDiagnostics(sourceStatus);
      const signature = "exception:" + message;
      if (signature !== lastCloudBootstrapError) {
        showToast("La inicialización automática de Firestore falló. Revisa el diagnóstico de conexión.", true);
        lastCloudBootstrapError = signature;
      }
      return "failed";
    } finally {
      cloudBootstrapInFlight = false;
    }
  }

  async function pullCloudSync(manual = false) {
    if (!isCloudNetworkAllowed()) {
      if (manual) showToast("Modo local activo");
      return;
    }
    if (cloudPullInFlight) return;
    cloudPullInFlight = true;

    try {
      const candidates = [];
      let durableCandidateCount = 0;
      const sourceStatus = {
        firestore: "no consultado",
        rtdb: "no consultada",
        ntfy: "no consultado"
      };
      const isValidSnapshot = (norm) => Boolean(norm && Array.isArray(norm.boxes) &&
        norm.boxes.length && Array.isArray(norm.tasks) && Number(norm.updatedAt || 0) > 0);
      const describeSnapshot = (norm) => isValidSnapshot(norm)
        ? `OK · ${norm.boxes.length} casillas, ${norm.tasks.length} tareas · revisión ${norm.updatedAt}`
        : "respuesta sin una copia válida (faltan casillas/tareas o updatedAt)";

      try {
        const fsUrl = getFirebaseFirestoreUrl();
        const res = await window.fetch(fsUrl, { cache: "no-store" });
        if (!res.ok) {
          sourceStatus.firestore = `HTTP ${res.status} ${res.statusText || ""}`.trim();
        } else {
          const docJson = await res.json();
          const rawStr = docJson && docJson.fields && docJson.fields.payloadJson && docJson.fields.payloadJson.stringValue;
          if (!rawStr) {
            sourceStatus.firestore = "HTTP 200 · documento vacío o sin campo payloadJson";
          } else {
            const norm = normalizeDataPayload(JSON.parse(rawStr));
            sourceStatus.firestore = describeSnapshot(norm);
            if (isValidSnapshot(norm)) {
              candidates.push(norm);
              durableCandidateCount++;
            }
          }
        }
      } catch (e) {
        sourceStatus.firestore = `error de lectura: ${String(e && e.message || e).slice(0, 140)}`;
      }

      try {
        const rtdbUrl = getFirebaseRtdbUrl();
        if (!rtdbUrl) {
          sourceStatus.rtdb = "URL no configurada";
        } else {
          const resRt = await window.fetch(rtdbUrl, { cache: "no-store" });
          if (!resRt.ok) {
            sourceStatus.rtdb = `HTTP ${resRt.status} ${resRt.statusText || ""}`.trim();
          } else {
            const parsedRt = await resRt.json();
            if (parsedRt == null) {
              sourceStatus.rtdb = "HTTP 200 · ruta vacía (null)";
            } else {
              const normRt = unpackCompactEnvelope(parsedRt);
              sourceStatus.rtdb = describeSnapshot(normRt);
              if (isValidSnapshot(normRt)) {
                candidates.push(normRt);
                durableCandidateCount++;
              }
            }
          }
        }
      } catch (e) {
        sourceStatus.rtdb = `error de lectura: ${String(e && e.message || e).slice(0, 140)}`;
      }

      // ntfy is a transport/history source only. It cannot authorize cloud writes by itself.
      try {
        const resStream = await window.fetch(getCloudTopicUrl(`/json?poll=1&since=all&_t=${Date.now()}`), { cache: "no-store" });
        if (!resStream.ok) {
          sourceStatus.ntfy = `HTTP ${resStream.status} ${resStream.statusText || ""}`.trim();
        } else {
          const responseText = await resStream.text();
          const rows = responseText ? responseText.trim().split(/\\r?\\n/) : [];
          let found = false;
          for (let i = rows.length - 1; i >= 0; i--) {
            try {
              const msg = JSON.parse(rows[i]);
              if (!msg || msg.event !== "message" || !msg.message) continue;
              const parsed = JSON.parse(msg.message);
              const unpacked = unpackCompactEnvelope(parsed);
              if (isValidSnapshot(unpacked)) {
                candidates.push(unpacked);
                sourceStatus.ntfy = `mensaje válido · ${unpacked.boxes.length} casillas, ${unpacked.tasks.length} tareas`;
                found = true;
                break;
              }
            } catch (err) {}
          }
          if (!found) sourceStatus.ntfy = "HTTP 200 · no se encontró mensaje válido";
        }
      } catch (e) {
        sourceStatus.ntfy = `error de lectura: ${String(e && e.message || e).slice(0, 140)}`;
      }

      renderSyncDiagnostics(sourceStatus);

      if (durableCandidateCount === 0 && /^HTTP 404\b/.test(sourceStatus.firestore)) {
        let bootstrapDataset = normalizeDataPayload(appState.data);
        for (const candidate of candidates) {
          bootstrapDataset = mergeSyncDatasets(bootstrapDataset, candidate);
        }
        const bootstrapResult = await autoBootstrapFirestoreDocument(bootstrapDataset, sourceStatus);
        if (bootstrapResult === "created" || bootstrapResult === "exists" || bootstrapResult === "busy") return;
      }

      if (durableCandidateCount === 0 || !candidates.length) {
        cloudSyncReady = false;
        cloudSyncReadyConfig = "";
        const summary = `Nube no verificada · FS ${compactProviderStatus(sourceStatus.firestore)} / RTDB ${compactProviderStatus(sourceStatus.rtdb)}`;
        const syncText = document.getElementById("sync-status-text");
        if (syncText) syncText.textContent = summary;
        const modalSyncTime = document.getElementById("modal-sync-last-time");
        if (modalSyncTime) modalSyncTime.textContent = "No se encontró una copia remota persistente válida. No se subieron datos automáticamente.";
        if (manual) showToast("La nube no se pudo verificar. Abre el menú «…» y revisa el diagnóstico de Firestore y Realtime Database. Tus datos locales siguen protegidos.", true);
        return;
      }

      let cloudCandidate = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        cloudCandidate = mergeSyncDatasets(cloudCandidate, candidates[i]);
      }
      const cloudNeedsRepair = candidates.some(candidate => syncFingerprint(candidate) !== syncFingerprint(cloudCandidate));

      cloudSyncReady = true;
      cloudSyncReadyConfig = getCloudSyncConfigKey();
      const syncText = document.getElementById("sync-status-text");
      if (syncText) syncText.textContent = "Nube verificada · conciliando datos";
      const modalSyncTime = document.getElementById("modal-sync-last-time");
      if (modalSyncTime) {
        modalSyncTime.textContent = `Copia remota verificada a las ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}; conciliando los dispositivos.`;
      }
      applyIncomingSyncPayload(cloudCandidate, manual);

      const localNow = normalizeDataPayload(appState.data);
      if (
        cloudNeedsRepair ||
        syncFingerprint(localNow) !== syncFingerprint(cloudCandidate) ||
        Number(localNow.updatedAt || 0) > Number(cloudCandidate.updatedAt || 0)
      ) {
        pushCloudSync(false);
      } else if (manual) {
        showToast("Sincronización verificada; los datos se conciliaron sin reemplazar tareas faltantes.");
      }
    } finally {
      cloudPullInFlight = false;
    }
  }

  function startCloudSyncStream() {
    if (!isCloudNetworkAllowed() || typeof window.EventSource === "undefined") return;
    try {
      if (appState.cloudEventSource) {
        appState.cloudEventSource.close();
      }
      const es = new window.EventSource(getCloudTopicUrl("/sse"));
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.message) {
            const parsed = JSON.parse(msg.message);
            if (parsed && parsed.d !== appState.deviceId && parsed.deviceId !== appState.deviceId) {
              const unpacked = unpackCompactEnvelope(parsed);
              if (unpacked && cloudSyncReady && cloudSyncReadyConfig === getCloudSyncConfigKey()) {
                applyIncomingSyncPayload(unpacked, true);
              }
            }
          }
        } catch (err) {}
      };
      es.onerror = () => {};
      appState.cloudEventSource = es;
    } catch (e) {}
  }

  function loadRegisteredData() {
    loadSavedFirebaseConfig();
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
          if (!existingTitlesInBox.has(bt.title.trim().toLowerCase()) &&
              !(Array.isArray(loaded.deletedTaskIds) && loaded.deletedTaskIds.includes(String(bt.id)))) {
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

    const savedChannel = safeStorage.getItem(STORAGE_KEYS.CLOUD_CHANNEL);
    if (savedChannel) {
      appState.cloudChannel = savedChannel;
    }
    // Point 4: Ensure all existing Casilla titles in storage are strictly UPPERCASE
    let boxesUppercased = false;
    loaded.boxes.forEach((b) => {
      const upper = String(b.name || "CASILLA").trim().toUpperCase();
      if (b.name !== upper) {
        b.name = upper;
        boxesUppercased = true;
      }
    });
    if (!loaded.lastRolloverDate) {
      loaded.lastRolloverDate = getTodayISO();
    }
    appState.data = loaded;
    appState.currentDayISO = getTodayISO();
    if (boxesUppercased) {
      safeStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(loaded));
    }
    rebuildTaskMemoryFromTasks();
  }

  // Point 6 & Point 1: Automatic Midnight (12:00 AM) Rollover & Cleanup without Ctrl + R
  let midnightTimeoutId = null;

  function cleanupCompletedTasksFromPreviousDays() {
    const today = getTodayISO();
    const prevTrackedDay = appState.currentDayISO || appState.data.lastRolloverDate || today;
    const dayRolledOver = prevTrackedDay < today;

    let changed = false;
    const remaining = [];

    appState.data.tasks.forEach((task) => {
      // If a rescheduled task's scheduled date has arrived (dueDate <= today), reactivate it in its Casilla!
      if (!task.done && task.isRescheduled && task.dueDate && task.dueDate <= today) {
        task.isRescheduled = false;
        changed = true;
      }

      // If a task is marked done and either its completedDate is before today OR midnight just rolled over
      const completedOnPastDay = task.done && (
        (task.completedDate && task.completedDate < today) ||
        (!task.completedDate && dayRolledOver) ||
        dayRolledOver
      );

      if (completedOnPastDay) {
        changed = true;
        appState.data.monthlyCompletedBase = (appState.data.monthlyCompletedBase || 66) + 1;
        const isRecurring = task.frequency !== "once" || (Array.isArray(task.repeatDays) && task.repeatDays.length > 0);
        if (isRecurring) {
          // Recurring tasks reset automatically for the new day
          remaining.push({
            ...task,
            done: false,
            completedDate: null,
            dueDate: today
          });
        }
        // One-time completed tasks from previous days disappear automatically at 12:00 AM
      } else {
        if (task.done && !task.completedDate) {
          task.completedDate = today;
        }
        remaining.push(task);
      }
    });

    if (dayRolledOver || appState.data.lastRolloverDate !== today) {
      appState.currentDayISO = today;
      appState.data.lastRolloverDate = today;
    }

    if (changed || dayRolledOver) {
      appState.data.tasks = remaining;
      saveData(false, "Actualización automática de medianoche");
      renderHeroDate();
      renderBoard();
      if (document.getElementById("modal-rescheduled-list") && document.getElementById("modal-rescheduled-list").classList.contains("open")) {
        renderRescheduledModalList();
      }
      if (dayRolledOver) {
        showToast("🌙 Nuevo día actualizado automáticamente");
      }
    }
  }

  function scheduleExactMidnightRollover() {
    if (midnightTimeoutId) clearTimeout(midnightTimeoutId);
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 60);
    const msUntilMidnight = Math.max(500, nextMidnight.getTime() - now.getTime());
    midnightTimeoutId = setTimeout(() => {
      cleanupCompletedTasksFromPreviousDays();
      scheduleExactMidnightRollover();
    }, msUntilMidnight);
  }

  function saveData(recordBackup = true, actionLabel = "Cambio guardado") {
    let previousData = null;
    try {
      const previousRaw = safeStorage.getItem(STORAGE_KEYS.DATA);
      if (previousRaw) previousData = JSON.parse(previousRaw);
    } catch (e) {}

    const previousTasksById = new Map((Array.isArray(previousData && previousData.tasks) ? previousData.tasks : [])
      .filter(task => task && task.id != null).map(task => [String(task.id), task]));
    const previousBoxesById = new Map((Array.isArray(previousData && previousData.boxes) ? previousData.boxes : [])
      .filter(box => box && box.id != null).map(box => [String(box.id), box]));
    (appState.data.tasks || []).forEach(task => {
      const previous = previousTasksById.get(String(task.id));
      if (task.bootstrapSeed && previous && JSON.stringify(task) !== JSON.stringify(previous)) delete task.bootstrapSeed;
    });
    (appState.data.boxes || []).forEach(box => {
      const previous = previousBoxesById.get(String(box.id));
      if (box.bootstrapSeed && previous && JSON.stringify(box) !== JSON.stringify(previous)) delete box.bootstrapSeed;
    });

    const currentTaskIds = new Set((appState.data.tasks || []).map(task => String(task.id)));
    const currentBoxIds = new Set((appState.data.boxes || []).map(box => String(box.id)));
    const deletedTasks = new Set([
      ...(Array.isArray(previousData && previousData.deletedTaskIds) ? previousData.deletedTaskIds : []),
      ...(Array.isArray(appState.data.deletedTaskIds) ? appState.data.deletedTaskIds : []),
      ...((Array.isArray(previousData && previousData.tasks) ? previousData.tasks : [])
        .filter(task => task && task.id != null && !currentTaskIds.has(String(task.id)))
        .map(task => String(task.id)))
    ]);
    const deletedBoxes = new Set([
      ...(Array.isArray(previousData && previousData.deletedBoxIds) ? previousData.deletedBoxIds : []),
      ...(Array.isArray(appState.data.deletedBoxIds) ? appState.data.deletedBoxIds : []),
      ...((Array.isArray(previousData && previousData.boxes) ? previousData.boxes : [])
        .filter(box => box && box.id != null && !currentBoxIds.has(String(box.id)))
        .map(box => String(box.id)))
    ]);
    currentTaskIds.forEach(id => deletedTasks.delete(id));
    currentBoxIds.forEach(id => deletedBoxes.delete(id));
    appState.data.deletedTaskIds = Array.from(deletedTasks);
    appState.data.deletedBoxIds = Array.from(deletedBoxes);
    appState.data.syncSchemaVersion = 1;
    appState.data.updatedAt = Math.max(Date.now(), Number(appState.data.updatedAt || 0) + 1);
    const payloadStr = JSON.stringify(appState.data);
    const ok = safeStorage.setItem(STORAGE_KEYS.DATA, payloadStr);
    pushCloudSync();

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
    return !task.done && Boolean(task.dueDate && task.dueDate > today);
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
    startY: 0,
    justDragged: false
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
      dragEngine.justDragged = true;

      element.classList.add("is-held-dragging");
      playUiSound("dragReady");

      // Point 9: Transparent live clone of the exact task or Casilla being dragged
      const clone = element.cloneNode(true);
      clone.classList.remove("is-held-dragging", "is-charging", "boot-animate");
      clone.classList.add("drop-ghost-clone");
      clone.removeAttribute("data-task-id");
      clone.removeAttribute("data-box-id");
      dragEngine.previewSlot = clone;
      element.parentNode.insertBefore(clone, element.nextSibling);

      runAutoScrollLoop();
    }, 360);
  }

  function handleGlobalPointerMove(e) {
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (dragEngine.holdTimer) {
      const dist = Math.hypot(clientX - dragEngine.startX, clientY - dragEngine.startY);
      if (dist > 12) {
        cancelHoldCharge();
      }
      return;
    }

    if (!dragEngine.activeId || !dragEngine.previewSlot) return;

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
      // Point 3: Auto-expand any collapsed Casilla when dragging a task over it so the user can see where to position the task
      const collapsedOverBox = hitElements.find(
        el => el.classList && el.classList.contains("box-card") && el.classList.contains("collapsed") && !el.classList.contains("drop-ghost-clone") && el.dataset.boxId
      );
      if (collapsedOverBox) {
        collapsedOverBox.classList.remove("collapsed");
        const targetBoxObj = appState.data.boxes.find(b => b.id === collapsedOverBox.dataset.boxId);
        if (targetBoxObj) {
          targetBoxObj.collapsed = false;
        }
        playUiSound("unfold");
        showToast(`📂 ${targetBoxObj ? targetBoxObj.name.toUpperCase() : "Casilla"} desplegada`);
      }

      const overTask = hitElements.find(
        el => el.classList && el.classList.contains("task-item") && !el.classList.contains("drop-ghost-clone") && el !== dragEngine.activeEl
      );
      if (overTask && overTask.parentNode) {
        const rect = overTask.getBoundingClientRect();
        const insertBefore = clientY < rect.top + rect.height / 2;
        const targetNode = insertBefore ? overTask : overTask.nextSibling;
        if (dragEngine.previewSlot.nextSibling !== targetNode) {
          overTask.parentNode.insertBefore(dragEngine.previewSlot, targetNode);
        }
        return;
      }

      const overBox = hitElements.find(
        el => el.classList && el.classList.contains("box-card") && !el.classList.contains("drop-ghost-clone") && el.dataset.boxId
      );
      if (overBox) {
        const listEl = overBox.querySelector(".tasks-list");
        if (listEl && !listEl.contains(dragEngine.previewSlot)) {
          listEl.appendChild(dragEngine.previewSlot);
        }
      }
    } else if (dragEngine.activeType === "box") {
      const overBox = hitElements.find(
        el => el.classList && el.classList.contains("box-card") && !el.classList.contains("drop-ghost-clone") && el.dataset.boxId && el !== dragEngine.activeEl
      );
      if (overBox && overBox.parentNode) {
        const rect = overBox.getBoundingClientRect();
        const insertBefore = clientY < rect.top + rect.height / 2;
        const targetNode = insertBefore ? overBox : overBox.nextSibling;
        if (dragEngine.previewSlot.nextSibling !== targetNode) {
          overBox.parentNode.insertBefore(dragEngine.previewSlot, targetNode);
        }
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
          const task = appState.data.tasks.find(t => t.id === activeId);
          if (task) {
            pushUndoSnapshot(`Mover tarea: ${task.title}`);
            const boxChanged = task.boxId !== targetBoxId;
            task.boxId = targetBoxId;
            previewSlot.parentNode.insertBefore(activeEl, previewSlot);
            previewSlot.remove();
            const siblingIds = Array.from(listEl.querySelectorAll(".task-item[data-task-id]")).map(el => el.dataset.taskId);
            siblingIds.forEach((id, idx) => {
              const tObj = appState.data.tasks.find(x => x.id === id);
              if (tObj) tObj.order = idx;
            });
            playUiSound("drop");
            saveData(true, `Movió tarea: ${task.title}`);
            // Point 9: Zero-flash update on drop (only re-render board if moved across different Casillas)
            if (boxChanged) {
              renderBoard();
            } else {
              updateMetrics();
            }
            showToast("Tarea reubicada");
          }
        }
      } else if (activeType === "box") {
        const container = document.getElementById("boxes-container");
        if (container && previewSlot.parentNode === container) {
          pushUndoSnapshot("Reordenar casillas");
          container.insertBefore(activeEl, previewSlot);
          previewSlot.remove();
          const boxIds = Array.from(container.querySelectorAll(".box-card[data-box-id]")).map(el => el.dataset.boxId);
          boxIds.forEach((id, idx) => {
            const bObj = appState.data.boxes.find(x => x.id === id);
            if (bObj) bObj.order = idx;
          });
          playUiSound("drop");
          saveData(true, "Reordenó casillas");
          updateMetrics();
          showToast("Casilla reubicada");
        }
      }
      if (previewSlot.parentNode) previewSlot.remove();
    }

    setTimeout(() => {
      dragEngine.justDragged = false;
    }, 80);

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

    // Point 3: Partition boxes into:
    // 1. activeBoxesList (has tasks for today or completed today)
    // 2. emptyBoxesList (has 0 tasks registered, e.g., COMO BOMBERO 🚒)
    // 3. allRescheduledBoxesList (has tasks, and ALL of them are rescheduled, e.g., OFICINA -> full orange, rendered below empty boxes!)
    const activeBoxesList = [];
    const emptyBoxesList = [];
    const allRescheduledBoxesList = [];

    sortedBoxes.forEach((b) => {
      const bTasks = appState.data.tasks.filter(t => t.boxId === b.id);
      if (bTasks.length === 0) {
        emptyBoxesList.push(b);
      } else {
        const bPending = bTasks.filter(t => !t.done);
        const bDone = bTasks.filter(t => t.done);
        const bResched = bPending.filter(t => isTaskRescheduledFuture(t));
        const bToday = bPending.filter(t => isTaskForToday(t));
        if (bToday.length === 0 && bDone.length === 0 && bResched.length > 0) {
          allRescheduledBoxesList.push(b);
        } else {
          activeBoxesList.push(b);
        }
      }
    });

    function renderSingleBoxCard(box, isEmptyStandby) {
      const boxIdx = sortedBoxes.findIndex(x => x.id === box.id);
      const boxTasksAll = appState.data.tasks
        .filter(t => t.boxId === box.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const pendingBoxTasks = boxTasksAll.filter(t => !t.done);
      const doneBoxTasks = boxTasksAll.filter(t => t.done);

      // Rescheduled tasks disappear from the Casilla and live in Tareas Reprogramadas until their dueDate arrives
      let visibleTasks = [];
      if (appState.activeTab === "completed") {
        visibleTasks = doneBoxTasks.filter(t => matchesSearch(t, box.name));
      } else {
        visibleTasks = pendingBoxTasks.filter(t => isTaskForToday(t) && matchesSearch(t, box.name));
      }

      if (appState.searchQuery && visibleTasks.length === 0 && !box.name.toLowerCase().includes(appState.searchQuery.toLowerCase())) {
        return;
      }

      const reschedInBox = pendingBoxTasks.filter(t => isTaskRescheduledFuture(t));
      const todayInBox = pendingBoxTasks.filter(t => isTaskForToday(t));
      const totalTodayBox = todayInBox.length + doneBoxTasks.length;
      const pctTodayBox = totalTodayBox > 0 ? Math.round((doneBoxTasks.length / totalTodayBox) * 100) : 0;

      // Point 3: Casillas that have ALL of their tasks rescheduled get the full orange color (box-rescheduled-theme)
      const isAllTasksRescheduled = boxTasksAll.length > 0 && todayInBox.length === 0 && doneBoxTasks.length === 0 && reschedInBox.length > 0;

      const card = document.createElement("section");
      card.className = `box-card ${!appState.hasBootRendered ? "boot-animate" : ""} ${box.collapsed ? "collapsed" : ""} ${isAllTasksRescheduled ? "box-rescheduled-theme" : ""} ${isEmptyStandby ? "box-empty-theme" : ""}`;
      card.dataset.boxId = box.id;

      // Point 2: No "X pendientes" pill in badgesHtml — replaced by the 34x34 colored number square in .box-header-actions!
      let badgesHtml = "";
      if (isEmptyStandby) {
        badgesHtml = `
          <span class="box-pill neutral">📭 Sin tareas registradas</span>
          <span class="box-pill blue">Casilla disponible</span>
        `;
      } else if (isAllTasksRescheduled) {
        badgesHtml = `
          <span class="box-pill amber">🕒 ${reschedInBox.length} reprogramada${reschedInBox.length === 1 ? "" : "s"}</span>
          <span class="box-pill amber">Fuera de hoy</span>
        `;
      } else if (reschedInBox.length > 0 && todayInBox.length > 0) {
        badgesHtml = `
          <span class="box-pill blue">${pctTodayBox}% hoy</span>
          <span class="box-pill amber">🕒 ${reschedInBox.length} reprogramada${reschedInBox.length === 1 ? "" : "s"}</span>
        `;
      } else if (totalTodayBox === 0) {
        badgesHtml = `
          <span class="box-pill blue">Sin tareas hoy</span>
        `;
      } else {
        badgesHtml = `
          <span class="box-pill blue">${pctTodayBox}% hoy</span>
        `;
      }

      const rightLabel = (todayInBox.length === 0 && doneBoxTasks.length === 0)
        ? "—"
        : `${doneBoxTasks.length}/${totalTodayBox} hoy`;

      const barFillWidth = isAllTasksRescheduled ? 100 : pctTodayBox;

      // Point 2: Colored 34x34px square badge showing ONLY the pending count number, same size as collapse/delete buttons
      const countSquareClass = isAllTasksRescheduled
        ? "box-pending-count-box orange-count"
        : (todayInBox.length === 0 ? "box-pending-count-box zero-count" : "box-pending-count-box");
      const countSquareNumber = todayInBox.length;
      const countSquareTipTitle = `📌 ${countSquareNumber} tarea${countSquareNumber === 1 ? "" : "s"} pendiente${countSquareNumber === 1 ? "" : "s"}`;
      const countSquareTipDesc = isAllTasksRescheduled
        ? `Todas las tareas de esta casilla (${reschedInBox.length}) están reprogramadas para otros días.`
        : `Número de tareas pendientes para hoy en ${box.name.toUpperCase()}.`;

      // Point 9: Up/Down buttons on LEFT side, Colored Pending Number Square + Collapse/Expand + Delete on RIGHT side
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
              <h2 class="box-name" data-tip-title="✏️ Renombrar casilla" data-tip-desc="Haz clic para modificar el nombre de esta casilla de trabajo.">${escapeHtml(box.name.toUpperCase())}</h2>
            </div>
            <div class="box-badges-row">${badgesHtml}</div>
          </div>

          <div class="box-header-actions">
            <span class="${countSquareClass}" data-tip-title="${escapeHtml(countSquareTipTitle)}" data-tip-desc="${escapeHtml(countSquareTipDesc)}">${countSquareNumber}</span>
            <button type="button" class="box-ctrl-btn copy-box-btn" data-box-action="copy-box" aria-label="Copiar casilla y tareas" data-tip-title="📋 Copiar casilla y tareas" data-tip-desc="Copia el título de esta casilla y todas las tareas registradas en ella al portapapeles.">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
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
          <div class="inline-add-wrapper">
            <form class="inline-add-form" data-box-form="${escapeHtml(box.id)}">
              <input type="text" class="inline-add-input" placeholder="Escribe la tarea y presiona Enter (ESC para salir)..." maxlength="180" autocomplete="off" />
              <button type="submit" class="btn-primary" style="padding:7px 14px;font-size:0.8rem;">Guardar</button>
              <button type="button" class="btn-secondary" data-box-action="cancel-inline-add" style="padding:7px 11px;font-size:0.8rem;">✕</button>
            </form>
            <div class="task-memory-suggestions" aria-label="Sugerencias de tareas"></div>
          </div>
        </div>
      `;

      // Hold-to-Drag on Box Header (Point 7) & Double-Click to Fold/Unfold (Point 1)
      const boxTopRow = card.querySelector(".box-top-row");
      boxTopRow.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button") || e.target.closest(".box-name")) return;
        beginHoldDrag("box", box.id, card, e.clientX, e.clientY);
      });

      // Point 2: Zero-Flash In-Place Fold/Unfold on Casilla (No DOM rebuild or flicker)
      card.addEventListener("dblclick", (e) => {
        if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".task-item")) return;
        cancelHoldCharge();
        box.collapsed = !box.collapsed;
        card.classList.toggle("collapsed", box.collapsed);
        playUiSound(box.collapsed ? "fold" : "unfold");
        saveData(false);
        showToast(box.collapsed ? "Casilla plegada" : "Casilla desplegada");
      });

      const copyBoxBtn = card.querySelector('[data-box-action="copy-box"]');
      if (copyBoxBtn) {
        copyBoxBtn.addEventListener("click", () => {
          const allRegisteredInBox = appState.data.tasks
            .filter(t => t.boxId === box.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          const lines = [box.name.toUpperCase()];
          if (allRegisteredInBox.length === 0) {
            lines.push("(Sin tareas registradas)");
          } else {
            allRegisteredInBox.forEach((t) => {
              lines.push(`• ${t.title}`);
            });
          }
          copyTextToClipboard(
            lines.join("\n"),
            `📋 Copiado: ${box.name.toUpperCase()} (${allRegisteredInBox.length} tarea${allRegisteredInBox.length === 1 ? "" : "s"})`,
            copyBoxBtn
          );
        });
      }

      card.querySelector('[data-box-action="collapse"]').addEventListener("click", () => {
        box.collapsed = !box.collapsed;
        card.classList.toggle("collapsed", box.collapsed);
        playUiSound(box.collapsed ? "fold" : "unfold");
        saveData(false);
      });

      card.querySelector(".box-name").addEventListener("click", () => {
        playUiSound("modalOpen");
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
        playUiSound("modalOpen");
        confirmDeleteBox(box.id);
      });

      const addBarBtn = card.querySelector('[data-box-action="show-inline-add"]');
      const inlineForm = card.querySelector(".inline-add-form");
      const inlineInput = card.querySelector(".inline-add-input");
      const suggestionsBox = card.querySelector(".task-memory-suggestions");
      let activeSuggestionIdx = -1;

      autoCapitalizeInputEl(inlineInput);

      function closeInlineAddBox() {
        appState.keepInlineAddOpenBoxId = null;
        inlineForm.classList.remove("open");
        suggestionsBox.classList.remove("open");
        suggestionsBox.innerHTML = "";
        addBarBtn.style.display = "flex";
        inlineInput.value = "";
        inlineInput.blur();
      }

      function renderInlineSuggestions() {
        const matches = getTaskSuggestions(inlineInput.value, box.id);
        activeSuggestionIdx = -1;
        if (!matches.length) {
          suggestionsBox.classList.remove("open");
          suggestionsBox.innerHTML = "";
          return;
        }
        suggestionsBox.innerHTML = "";
        matches.forEach((suggestionText, sIdx) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "memory-suggestion-item";
          btn.innerHTML = `
            <span>💡 ${escapeHtml(suggestionText)}</span>
            <span class="memory-suggestion-hint">Clic o Tab</span>
          `;
          btn.addEventListener("mousedown", (ev) => {
            ev.preventDefault();
            playUiSound("tap");
            inlineInput.value = suggestionText;
            suggestionsBox.classList.remove("open");
            inlineInput.focus();
          });
          suggestionsBox.appendChild(btn);
        });
        suggestionsBox.classList.add("open");
      }

      inlineInput.addEventListener("input", renderInlineSuggestions);

      // Point 4 & Point 1: ESC closes the task input box; Tab / ArrowDown navigates memory suggestions
      inlineInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          ev.stopPropagation();
          playUiSound("fold");
          closeInlineAddBox();
          return;
        }
        const items = Array.from(suggestionsBox.querySelectorAll(".memory-suggestion-item"));
        if (!items.length || !suggestionsBox.classList.contains("open")) return;

        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          activeSuggestionIdx = (activeSuggestionIdx + 1) % items.length;
          items.forEach((el, idx) => el.classList.toggle("active", idx === activeSuggestionIdx));
        } else if (ev.key === "ArrowUp") {
          ev.preventDefault();
          activeSuggestionIdx = (activeSuggestionIdx - 1 + items.length) % items.length;
          items.forEach((el, idx) => el.classList.toggle("active", idx === activeSuggestionIdx));
        } else if (ev.key === "Tab") {
          ev.preventDefault();
          const chosenIdx = activeSuggestionIdx >= 0 ? activeSuggestionIdx : 0;
          const matches = getTaskSuggestions(inlineInput.value, box.id);
          if (matches[chosenIdx]) {
            playUiSound("tap");
            inlineInput.value = matches[chosenIdx];
            suggestionsBox.classList.remove("open");
          }
        }
      });

      addBarBtn.addEventListener("click", () => {
        playUiSound("tap");
        appState.keepInlineAddOpenBoxId = box.id;
        addBarBtn.style.display = "none";
        inlineForm.classList.add("open");
        inlineInput.focus();
      });

      card.querySelector('[data-box-action="cancel-inline-add"]').addEventListener("click", () => {
        playUiSound("tap");
        closeInlineAddBox();
      });

      inlineForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const items = Array.from(suggestionsBox.querySelectorAll(".memory-suggestion-item"));
        if (activeSuggestionIdx >= 0 && items[activeSuggestionIdx]) {
          const matches = getTaskSuggestions(inlineInput.value, box.id);
          if (matches[activeSuggestionIdx]) {
            inlineInput.value = matches[activeSuggestionIdx];
            suggestionsBox.classList.remove("open");
            activeSuggestionIdx = -1;
            return;
          }
        }
        const title = capitalizeFirst(inlineInput.value);
        if (!title) {
          inlineInput.classList.add("input-invalid");
          setTimeout(() => inlineInput.classList.remove("input-invalid"), 400);
          showToast("Escribe el nombre de la tarea", true);
          return;
        }
        pushUndoSnapshot(`Añadir tarea: ${title}`);
        learnTaskTitle(title, box.id);
        const newTask = {
          id: `task_${Date.now()}`,
          boxId: box.id,
          title,
          done: false,
          completedDate: null,
          createdAt: Date.now(),
          dueDate: getTodayISO(),
          frequency: "once",
          repeatDays: [],
          rescheduledCount: 0,
          isRescheduled: false,
          order: boxTasksAll.length
        };
        appState.data.tasks.push(newTask);
        appState.keepInlineAddOpenBoxId = box.id;
        playUiSound("addTask");
        saveData(true, `Añadió tarea en ${box.name}`);
        renderBoard();
        showToast("Tarea agregada");
      });

      const listEl = card.querySelector(".tasks-list");
      visibleTasks.forEach((task) => {
        listEl.appendChild(createTaskRowElement(task, box));
      });

      if (appState.keepInlineAddOpenBoxId === box.id) {
        addBarBtn.style.display = "none";
        inlineForm.classList.add("open");
        setTimeout(() => {
          inlineInput.focus();
          inlineForm.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 30);
      }

      container.appendChild(card);
    }

    // 1. Render Active Casillas (with tasks)
    activeBoxesList.forEach(box => renderSingleBoxCard(box, false));

    // Point 10: AUTOMATIC "TAREAS COMPLETADAS" BOX WITH FOLD / UNFOLD SUPPORT
    const allCompletedTasks = appState.data.tasks.filter(t => t.done && matchesSearch(t, "Tareas completadas"));
    if (allCompletedTasks.length > 0 && appState.activeTab !== "completed") {
      const isCompCollapsed = Boolean(appState.data.completedBoxCollapsed);
      const compCard = document.createElement("section");
      compCard.className = `box-card box-completed-theme ${!appState.hasBootRendered ? "boot-animate" : ""} ${isCompCollapsed ? "collapsed" : ""}`;
      compCard.innerHTML = `
        <div class="box-top-row">
          <div class="box-title-left">
            <div class="box-heading-line">
              <span style="color:var(--success);display:inline-flex;align-items:center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </span>
              <h2 class="box-name" style="color:var(--success);cursor:pointer;">TAREAS COMPLETADAS</h2>
            </div>
            <div class="box-badges-row">
              <span class="box-pill green">✓ ${allCompletedTasks.length} completada${allCompletedTasks.length === 1 ? "" : "s"} hoy</span>
            </div>
          </div>
          <div class="box-header-actions">
            <button type="button" class="btn-secondary" id="btn-clear-completed-inline" style="padding:6px 12px;font-size:0.78rem;" data-tip-title="🧹 Archivar completadas" data-tip-desc="Limpia de la vista las tareas ya finalizadas conservando tu historial mensual.">Limpiar completadas</button>
            <button type="button" class="box-ctrl-btn copy-box-btn" data-comp-action="copy-completed" aria-label="Copiar tareas completadas" data-tip-title="📋 Copiar completadas" data-tip-desc="Copia el título TAREAS COMPLETADAS y el listado de tareas logradas hoy.">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button type="button" class="box-ctrl-btn collapse-right-btn" data-comp-action="collapse" data-tip-title="⌄ Plegar o desplegar completadas" data-tip-desc="Oculta o muestra tus tareas completadas del día.">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </div>
        <div class="box-body">
          <div class="tasks-list" id="completed-box-tasks-list"></div>
        </div>
      `;

      function toggleCompletedBoxCollapse(showMsg) {
        appState.data.completedBoxCollapsed = !appState.data.completedBoxCollapsed;
        compCard.classList.toggle("collapsed", appState.data.completedBoxCollapsed);
        playUiSound(appState.data.completedBoxCollapsed ? "fold" : "unfold");
        saveData(false);
        if (showMsg) {
          showToast(appState.data.completedBoxCollapsed ? "Completadas plegadas" : "Completadas desplegadas");
        }
      }

      const copyCompBtn = compCard.querySelector('[data-comp-action="copy-completed"]');
      if (copyCompBtn) {
        copyCompBtn.addEventListener("click", () => {
          const lines = ["TAREAS COMPLETADAS"];
          allCompletedTasks.forEach((t) => {
            lines.push(`• ${t.title}`);
          });
          copyTextToClipboard(
            lines.join("\n"),
            `📋 Copiado: TAREAS COMPLETADAS (${allCompletedTasks.length})`,
            copyCompBtn
          );
        });
      }

      compCard.querySelector('[data-comp-action="collapse"]').addEventListener("click", () => {
        toggleCompletedBoxCollapse(false);
      });

      compCard.addEventListener("dblclick", (e) => {
        if (e.target.closest("button") || e.target.closest(".task-item")) return;
        toggleCompletedBoxCollapse(true);
      });

      const compList = compCard.querySelector("#completed-box-tasks-list");
      allCompletedTasks.forEach((task) => {
        const originBox = appState.data.boxes.find(b => b.id === task.boxId);
        compList.appendChild(createTaskRowElement(task, originBox, true));
      });

      const clearBtn = compCard.querySelector("#btn-clear-completed-inline");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          pushUndoSnapshot("Limpiar tareas completadas");
          playUiSound("delete");
          appState.data.tasks = appState.data.tasks.filter(t => !t.done);
          saveData(true, "Limpió tareas completadas");
          renderBoard();
          showToast("Tareas completadas archivadas");
        });
      }

      container.appendChild(compCard);
    }

    // 3. Render Empty Casillas (with 0 tasks, e.g., COMO BOMBERO 🚒) below TAREAS COMPLETADAS
    emptyBoxesList.forEach(box => renderSingleBoxCard(box, true));

    // 4. Point 3: Render Casillas with ALL tasks rescheduled (e.g., OFICINA in full orange) BELOW Empty Casillas!
    allRescheduledBoxesList.forEach(box => renderSingleBoxCard(box, false));

    appState.hasBootRendered = true;
  }

  function createTaskRowElement(task, box, showOriginBox = false) {
    const item = document.createElement("div");
    item.className = `task-item ${task.done ? "done" : ""}`;
    item.dataset.taskId = task.id;

    const isResched = isTaskRescheduledFuture(task);
    const isOverdue = isTaskOverdue(task);
    const repeatLabel = formatRepeatBadgeLabel(task);
    const hasRepeat = Boolean(repeatLabel);

    let subBadges = "";
    if (hasRepeat) {
      subBadges += `<span class="task-daily-pill">${escapeHtml(repeatLabel)}</span>`;
    }
    if (isOverdue) {
      subBadges += `<span class="task-overdue-tag">⚠️ Atrasada · ${escapeHtml(formatSpanishDateLong(task.dueDate))}</span>`;
    } else if (isResched) {
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
        <button type="button" class="task-act-btn" data-task-action="copy" aria-label="Copiar tarea" data-tip-title="📋 Copiar tarea" data-tip-desc="Copia el texto de esta tarea al portapapeles.">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button type="button" class="task-act-btn" data-task-action="edit" data-tip-title="✏️ Editar texto" data-tip-desc="Abre el editor para modificar el texto de esta tarea (también puedes hacer clic en el título).">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button type="button" class="task-act-btn ${isResched ? "sun-active" : ""}" data-task-action="today" data-tip-title="☀️ Pasar para Mañana" data-tip-desc="Pasa inmediatamente esta tarea para el día de mañana (+1 día).">
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

    // Point 8: Hold-to-Drag works on any blank space of the task or even holding on the row
    item.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.target.closest("input")) return;
      beginHoldDrag("task", task.id, item, e.clientX, e.clientY);
    });

    const checkBtn = item.querySelector(".task-check-circle");
    checkBtn.addEventListener("click", () => toggleTaskDone(task.id, checkBtn));
    item.querySelector(".task-title").addEventListener("click", () => {
      if (dragEngine.justDragged) return;
      playUiSound("modalOpen");
      openEditTaskTitleModal(task.id);
    });
    const copyTaskBtn = item.querySelector('[data-task-action="copy"]');
    if (copyTaskBtn) {
      copyTaskBtn.addEventListener("click", () => {
        copyTextToClipboard(task.title, "📋 Tarea copiada al portapapeles", copyTaskBtn);
      });
    }

    item.querySelector('[data-task-action="edit"]').addEventListener("click", () => {
      playUiSound("modalOpen");
      openEditTaskTitleModal(task.id);
    });

    // Point 3: Sun button on task row passes the task to Tomorrow (Mañana)
    item.querySelector('[data-task-action="today"]').addEventListener("click", () => {
      pushUndoSnapshot(`Pasar para mañana: ${task.title}`);
      playUiSound("reschedule");
      const tomorrowIso = addDaysISO(getTodayISO(), 1);
      task.dueDate = tomorrowIso;
      task.isRescheduled = true;
      task.rescheduledCount = (task.rescheduledCount || 0) + 1;
      saveData(true, `Pasó para mañana: ${task.title}`);
      renderBoard();
      showToast("Pasada para mañana ☀️");
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
    pushUndoSnapshot(`${task.done ? "Reabrir" : "Completar"}: ${task.title}`);
    task.done = !task.done;
    const today = getTodayISO();
    if (task.done) {
      task.completedDate = today;
      playUiSound("complete");
      spawnCompletionParticles(checkBtnEl);
      appState.history[today] = (appState.history[today] || 0) + 1;
      showToast("Tarea completada");
    } else {
      task.completedDate = null;
      playUiSound("uncomplete");
      if (appState.history[today] > 0) appState.history[today]--;
      showToast("Tarea reabierta");
    }
    saveData(true, `${task.done ? "Completó" : "Reabrió"}: ${task.title}`);
    renderBoard();
  }

  function deleteTask(taskId) {
    const idx = appState.data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    pushUndoSnapshot(`Eliminar: ${appState.data.tasks[idx].title}`);
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
    playUiSound("repeat");
    saveData(true, `Repetición actualizada: ${task.title}`);
    renderBoard();
    const label = formatRepeatBadgeLabel(task);
    showToast(label ? label.replace("🔁 ", "Repetición: ") : "Sin repetición");
  }

  // Point 4: Interactive Professional Visual Calendar State & Renderer
  const calState = {
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    selectedIso: ""
  };

  function renderProVisualCalendar() {
    const grid = document.getElementById("pro-cal-days-grid");
    const monthLabel = document.getElementById("pro-cal-month-label");
    const selectedText = document.getElementById("pro-cal-selected-text");
    if (!grid || !monthLabel) return;

    const monthsCap = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    monthLabel.textContent = `${monthsCap[calState.viewMonth]} ${calState.viewYear}`;

    if (selectedText) {
      selectedText.textContent = calState.selectedIso
        ? `📅 ${formatSpanishDateLong(calState.selectedIso)}`
        : "📅 Selecciona un día";
    }

    const todayIso = getTodayISO();
    const firstDayOfMonth = new Date(calState.viewYear, calState.viewMonth, 1);
    // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(calState.viewYear, calState.viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calState.viewYear, calState.viewMonth, 0).getDate();

    // Count scheduled tasks per date to display workload dots
    const taskCountByDate = {};
    appState.data.tasks.forEach(t => {
      if (!t.done && t.dueDate) {
        taskCountByDate[t.dueDate] = (taskCountByDate[t.dueDate] || 0) + 1;
      }
    });

    grid.innerHTML = "";

    const totalCells = 42;
    for (let i = 0; i < totalCells; i++) {
      let cellYear = calState.viewYear;
      let cellMonth = calState.viewMonth;
      let dayNum = 1;
      let isOtherMonth = false;

      if (i < startWeekday) {
        isOtherMonth = true;
        dayNum = daysInPrevMonth - startWeekday + i + 1;
        cellMonth = calState.viewMonth - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear--;
        }
      } else if (i >= startWeekday + daysInMonth) {
        isOtherMonth = true;
        dayNum = i - (startWeekday + daysInMonth) + 1;
        cellMonth = calState.viewMonth + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear++;
        }
      } else {
        dayNum = i - startWeekday + 1;
      }

      const iso = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const btn = document.createElement("button");
      btn.type = "button";
      const isToday = iso === todayIso;
      const isSelected = iso === calState.selectedIso;
      const isPastOrToday = iso <= todayIso;
      const countOnDay = taskCountByDate[iso] || 0;

      btn.className = [
        "pro-cal-day",
        isOtherMonth ? "other-month" : "",
        isToday ? "is-today" : "",
        isSelected && !isPastOrToday ? "is-selected" : "",
        isPastOrToday ? "is-disabled-day" : ""
      ].filter(Boolean).join(" ");

      // Point 1: Do not allow rescheduling a task for today or past dates in the Reschedule Calendar
      if (isPastOrToday) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        btn.title = isToday ? "Hoy (elige otro día para reprogramar)" : "Fecha pasada no disponible";
      }

      btn.innerHTML = `
        <span>${dayNum}</span>
        ${countOnDay > 0 ? `<span class="pro-cal-task-dot" title="${countOnDay} tarea(s) en esta fecha"></span>` : ""}
      `;

      // Point 1: Clicking a new future date automatically selects that date and closes the pop-up immediately!
      if (!isPastOrToday) {
        btn.addEventListener("click", () => {
          calState.selectedIso = iso;
          calState.viewYear = cellYear;
          calState.viewMonth = cellMonth;
          const dateInput = document.getElementById("input-resched-date");
          if (dateInput) dateInput.value = iso;
          applyTaskRescheduleDate(iso, false);
        });
      }

      grid.appendChild(btn);
    }
  }

  // Date Picker / Reschedule Modal
  function openDatePickerModal(taskId) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    appState.reschedulingTaskId = taskId;
    document.getElementById("resched-task-name").textContent = task.title;
    const tomorrowIso = addDaysISO(getTodayISO(), 1);
    const defaultIso = task.dueDate && task.dueDate > getTodayISO() ? task.dueDate : tomorrowIso;
    const dateInput = document.getElementById("input-resched-date");
    dateInput.min = tomorrowIso;
    dateInput.value = defaultIso;

    const parts = defaultIso.split("-");
    calState.viewYear = Number(parts[0]) || new Date().getFullYear();
    calState.viewMonth = (Number(parts[1]) || (new Date().getMonth() + 1)) - 1;
    calState.selectedIso = defaultIso;
    renderProVisualCalendar();

    document.getElementById("modal-date-picker").classList.add("open");
  }

  function applyTaskRescheduleDate(newDateIso, moveToToday = false) {
    const task = appState.data.tasks.find(t => t.id === appState.reschedulingTaskId);
    if (!task) return;
    const today = getTodayISO();

    // Point 1: Reschedule modal cannot reprogram a task for today or earlier
    if (!moveToToday && (!newDateIso || newDateIso <= today)) {
      showToast("Elige una fecha futura (desde mañana) para reprogramar", true);
      return;
    }

    pushUndoSnapshot(`Reprogramar: ${task.title}`);

    if (moveToToday) {
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

    playUiSound("reschedule");
    document.getElementById("modal-date-picker").classList.remove("open");
    saveData(true, `Reprogramó: ${task.title}`);
    renderBoard();
    if (document.getElementById("modal-rescheduled-list").classList.contains("open")) {
      renderRescheduledModalList();
    }
    if (document.getElementById("modal-overdue-list") && document.getElementById("modal-overdue-list").classList.contains("open")) {
      renderOverdueModalList();
    }
  }

  function scheduleTaskIdsForToday(taskIds, actionDescription = "Programó tareas para hoy") {
    const idsSet = new Set(taskIds);
    if (idsSet.size === 0) return;
    pushUndoSnapshot(actionDescription);
    const today = getTodayISO();
    let movedCount = 0;

    appState.data.tasks.forEach((task) => {
      if (idsSet.has(task.id)) {
        task.dueDate = today;
        task.isRescheduled = false;
        task.rescheduledCount = 0;
        movedCount++;
      }
    });

    if (movedCount > 0) {
      playUiSound("complete");
      saveData(true, `${actionDescription} (${movedCount})`);
      renderBoard();
      if (document.getElementById("modal-rescheduled-list") && document.getElementById("modal-rescheduled-list").classList.contains("open")) {
        renderRescheduledModalList();
      }
      if (document.getElementById("modal-overdue-list") && document.getElementById("modal-overdue-list").classList.contains("open")) {
        renderOverdueModalList();
      }
      showToast(movedCount === 1 ? "☀️ 1 tarea programada para hoy" : `☀️ ${movedCount} tareas programadas para hoy`);
    }
  }

  function renderInteractiveTaskModalList({
    containerId,
    tasksList,
    selectedSet,
    emptyMessage,
    datePrefixLabel,
    isOverdueStyle
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clean stale IDs no longer in tasksList
    const validIds = new Set(tasksList.map(t => t.id));
    Array.from(selectedSet).forEach(id => {
      if (!validIds.has(id)) selectedSet.delete(id);
    });

    if (tasksList.length === 0) {
      container.innerHTML = `
        <div style="padding:32px 18px;text-align:center;color:var(--muted);font-size:0.92rem;background:var(--surface-muted);border-radius:16px;border:1px dashed var(--line-strong);">
          ${escapeHtml(emptyMessage)}
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    // Top Bulk Toolbar: Select All Checkbox + "Programar seleccionadas para hoy" + "Programar todas para hoy"
    const allSelected = tasksList.length > 0 && selectedSet.size === tasksList.length;
    const bulkBar = document.createElement("div");
    bulkBar.className = "modal-bulk-bar";
    bulkBar.innerHTML = `
      <label class="bulk-check-all-wrap">
        <input type="checkbox" class="modal-task-check bulk-select-all-input" ${allSelected ? "checked" : ""} />
        <span>Seleccionar todas (${tasksList.length})</span>
        <span class="box-pill ${selectedSet.size > 0 ? "blue" : "neutral"}">${selectedSet.size} seleccionada${selectedSet.size === 1 ? "" : "s"}</span>
      </label>
      <div class="bulk-actions-btns">
        <button type="button" class="btn-primary btn-bulk-selected" ${selectedSet.size === 0 ? "disabled" : ""}>
          ☀️ Programar seleccionadas para hoy (${selectedSet.size})
        </button>
        <button type="button" class="btn-primary btn-bulk-all">
          ☀️ Programar todas para hoy (${tasksList.length})
        </button>
      </div>
    `;

    const selectAllInput = bulkBar.querySelector(".bulk-select-all-input");
    selectAllInput.addEventListener("change", () => {
      playUiSound("tap");
      if (selectAllInput.checked) {
        tasksList.forEach(t => selectedSet.add(t.id));
      } else {
        selectedSet.clear();
      }
      renderInteractiveTaskModalList({
        containerId,
        tasksList,
        selectedSet,
        emptyMessage,
        datePrefixLabel,
        isOverdueStyle
      });
    });

    bulkBar.querySelector(".btn-bulk-selected").addEventListener("click", () => {
      if (selectedSet.size === 0) return;
      const ids = Array.from(selectedSet);
      selectedSet.clear();
      scheduleTaskIdsForToday(ids, "Programó seleccionadas para hoy");
    });

    bulkBar.querySelector(".btn-bulk-all").addEventListener("click", () => {
      const ids = tasksList.map(t => t.id);
      selectedSet.clear();
      scheduleTaskIdsForToday(ids, "Programó todas para hoy");
    });

    container.appendChild(bulkBar);

    tasksList.forEach((task) => {
      const box = appState.data.boxes.find(b => b.id === task.boxId);
      const boxName = box ? box.name.toUpperCase() : "CASILLA";
      const isChecked = selectedSet.has(task.id);
      const card = document.createElement("div");
      card.className = `resched-modal-card ${isChecked ? "is-checked" : ""}`;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
          <input type="checkbox" class="modal-task-check row-task-checkbox" aria-label="Seleccionar tarea" ${isChecked ? "checked" : ""} />
          <button type="button" class="resched-sun-btn" data-tip-title="☀️ Programar esta tarea para hoy" data-tip-desc="Mueve inmediatamente esta tarea a tu lista de hoy.">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          </button>
          <div style="min-width:0;flex:1;cursor:pointer;" class="modal-task-text-click">
            <div style="font-weight:700;font-size:0.92rem;color:var(--text);line-height:1.35;">${escapeHtml(task.title)}</div>
            <div style="font-size:0.78rem;color:${isOverdueStyle ? "var(--danger)" : "var(--muted)"};font-weight:${isOverdueStyle ? "700" : "500"};margin-top:3px;">
              ${escapeHtml(boxName)} · ${escapeHtml(datePrefixLabel)} ${escapeHtml(formatSpanishDateLong(task.dueDate))}
            </div>
          </div>
        </div>
        <button type="button" class="resched-cal-btn" data-tip-title="📅 Elegir otra fecha" data-tip-desc="Abre el calendario profesional para programar otra fecha.">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
      `;

      const rowCheckbox = card.querySelector(".row-task-checkbox");
      const toggleRowSelection = () => {
        playUiSound("tap");
        if (selectedSet.has(task.id)) {
          selectedSet.delete(task.id);
        } else {
          selectedSet.add(task.id);
        }
        renderInteractiveTaskModalList({
          containerId,
          tasksList,
          selectedSet,
          emptyMessage,
          datePrefixLabel,
          isOverdueStyle
        });
      };

      rowCheckbox.addEventListener("change", toggleRowSelection);
      card.querySelector(".modal-task-text-click").addEventListener("click", toggleRowSelection);

      card.querySelector(".resched-sun-btn").addEventListener("click", () => {
        selectedSet.delete(task.id);
        scheduleTaskIdsForToday([task.id], `Movió a hoy: ${task.title}`);
      });

      card.querySelector(".resched-cal-btn").addEventListener("click", () => {
        playUiSound("tap");
        openDatePickerModal(task.id);
      });

      container.appendChild(card);
    });
  }

  function openRescheduledModal() {
    appState.selectedRescheduledIds.clear();
    renderRescheduledModalList();
    document.getElementById("modal-rescheduled-list").classList.add("open");
  }

  function renderRescheduledModalList() {
    const reschedTasks = appState.data.tasks.filter(t => isTaskRescheduledFuture(t));
    renderInteractiveTaskModalList({
      containerId: "rescheduled-modal-items",
      tasksList: reschedTasks,
      selectedSet: appState.selectedRescheduledIds,
      emptyMessage: "No tienes tareas reprogramadas fuera de hoy.",
      datePrefixLabel: "Para",
      isOverdueStyle: false
    });
  }

  // Point 1: Dedicated Overdue Tasks Modal (shows ONLY overdue tasks, never future rescheduled tasks!)
  function openOverdueModal() {
    appState.selectedOverdueIds.clear();
    renderOverdueModalList();
    const modal = document.getElementById("modal-overdue-list");
    if (modal) modal.classList.add("open");
  }

  function renderOverdueModalList() {
    const overdueTasks = appState.data.tasks.filter(t => isTaskOverdue(t));
    renderInteractiveTaskModalList({
      containerId: "overdue-modal-items",
      tasksList: overdueTasks,
      selectedSet: appState.selectedOverdueIds,
      emptyMessage: "🎉 ¡Excelente! No tienes ninguna tarea atrasada pendiente.",
      datePrefixLabel: "⚠️ Venció el",
      isOverdueStyle: true
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
      nameInput.value = box.name.toUpperCase();
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
    const projInput = document.getElementById("input-firebase-project-id");
    const dbUrlInput = document.getElementById("input-firebase-db-url");
    const docPathInput = document.getElementById("input-cloud-sync-channel");
    if (projInput && appState.firebaseConfig) projInput.value = appState.firebaseConfig.projectId || "esbas-2026";
    if (dbUrlInput && appState.firebaseConfig) dbUrlInput.value = appState.firebaseConfig.databaseURL || "";
    if (docPathInput && appState.firebaseConfig) docPathInput.value = appState.firebaseConfig.docPath || "tasky_sync/somerito_main";
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

    // Point 4 & Point 11: Professional Keyboard Shortcuts (Ctrl+F/Cmd+K, Ctrl+Z Undo, Ctrl+Shift+Z/Ctrl+Y Redo, ESC, Alt+N/B/P/D)
    document.addEventListener("keydown", (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      const isTyping = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "z") {
        if (!isTyping) {
          e.preventDefault();
          if (e.shiftKey) {
            performRedo();
          } else {
            performUndo();
          }
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "y") {
        if (!isTyping) {
          e.preventDefault();
          performRedo();
          return;
        }
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === "n") {
          e.preventDefault();
          const firstAddBtn = document.querySelector('[data-box-action="show-inline-add"]');
          if (firstAddBtn) firstAddBtn.click();
          return;
        } else if (k === "b") {
          e.preventDefault();
          openBoxModal(null);
          return;
        } else if (k === "p") {
          e.preventDefault();
          openProductivityModal();
          return;
        } else if (k === "d") {
          e.preventDefault();
          document.getElementById("btn-theme-toggle").click();
          return;
        }
      }

      if (e.key === "Escape") {
        // Point 4: Close any open inline add-task input box
        const openForms = document.querySelectorAll(".inline-add-form.open");
        if (openForms.length > 0) {
          appState.keepInlineAddOpenBoxId = null;
          openForms.forEach(formEl => {
            formEl.classList.remove("open");
            const cardEl = formEl.closest(".box-card");
            if (cardEl) {
              const barBtn = cardEl.querySelector('[data-box-action="show-inline-add"]');
              if (barBtn) barBtn.style.display = "flex";
              const sugg = cardEl.querySelector(".task-memory-suggestions");
              if (sugg) sugg.classList.remove("open");
            }
            const inp = formEl.querySelector(".inline-add-input");
            if (inp) {
              inp.value = "";
              inp.blur();
            }
          });
        }
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
      playUiSound("themeSwitch");
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
      openOverdueModal();
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

    // Date Picker Modal Events (Point 1: Only future dates allowed, auto-select & close modal immediately)
    document.querySelectorAll("[data-date-preset]").forEach(btn => {
      btn.addEventListener("click", () => {
        const preset = btn.dataset.datePreset;
        const today = getTodayISO();
        if (preset === "today" || preset === "dayafter") {
          applyTaskRescheduleDate(addDaysISO(today, 2), false);
        } else if (preset === "tomorrow") {
          applyTaskRescheduleDate(addDaysISO(today, 1), false);
        } else if (preset === "monday") {
          applyTaskRescheduleDate(getNextWeekdayISO(1), false);
        } else if (preset === "saturday") {
          applyTaskRescheduleDate(getNextWeekdayISO(6), false);
        }
      });
    });

    // Visual Calendar navigation controls & automatic selection on date change
    document.getElementById("btn-cal-prev-month").addEventListener("click", () => {
      playUiSound("tap");
      calState.viewMonth--;
      if (calState.viewMonth < 0) {
        calState.viewMonth = 11;
        calState.viewYear--;
      }
      renderProVisualCalendar();
    });

    document.getElementById("btn-cal-next-month").addEventListener("click", () => {
      playUiSound("tap");
      calState.viewMonth++;
      if (calState.viewMonth > 11) {
        calState.viewMonth = 0;
        calState.viewYear++;
      }
      renderProVisualCalendar();
    });

    document.getElementById("btn-cal-today-jump").addEventListener("click", () => {
      playUiSound("tap");
      const tomorrowIso = addDaysISO(getTodayISO(), 1);
      const parts = tomorrowIso.split("-");
      calState.viewYear = Number(parts[0]);
      calState.viewMonth = Number(parts[1]) - 1;
      calState.selectedIso = tomorrowIso;
      document.getElementById("input-resched-date").value = tomorrowIso;
      renderProVisualCalendar();
    });

    document.getElementById("input-resched-date").addEventListener("change", (e) => {
      const val = e.target.value;
      const today = getTodayISO();
      if (val && val.split("-").length === 3) {
        if (val <= today) {
          const tomorrowIso = addDaysISO(today, 1);
          e.target.value = tomorrowIso;
          showToast("No puedes reprogramar para hoy; elige desde mañana", true);
          return;
        }
        calState.selectedIso = val;
        applyTaskRescheduleDate(val, false);
      }
    });

    document.getElementById("form-date-picker").addEventListener("submit", (e) => {
      e.preventDefault();
      const val = document.getElementById("input-resched-date").value || calState.selectedIso;
      if (!val || val <= getTodayISO()) {
        showToast("Selecciona una fecha futura (desde mañana)", true);
        return;
      }
      applyTaskRescheduleDate(val, false);
    });

    // Point 4: Live uppercase enforcement on Casilla Name input & submit
    const boxNameInputEl = document.getElementById("input-box-name");
    if (boxNameInputEl) {
      boxNameInputEl.addEventListener("input", () => {
        const upper = boxNameInputEl.value.toUpperCase();
        if (boxNameInputEl.value !== upper) {
          const pos = boxNameInputEl.selectionStart;
          boxNameInputEl.value = upper;
          try { boxNameInputEl.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }

    // Box Form Submit
    document.getElementById("form-box").addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("input-box-name");
      const name = nameInput.value.trim().toUpperCase();
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
    autoCapitalizeInputEl(document.getElementById("input-edit-task-title"));
    document.getElementById("form-edit-task").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("input-edit-task-title");
      const val = capitalizeFirst(input.value);
      if (!val) {
        input.classList.add("input-invalid");
        setTimeout(() => input.classList.remove("input-invalid"), 400);
        showToast("El título no puede estar vacío", true);
        return;
      }
      const task = appState.data.tasks.find(t => t.id === appState.editingTaskId);
      if (task) {
        pushUndoSnapshot(`Editar: ${task.title}`);
        task.title = val;
        learnTaskTitle(val, task.boxId);
      }
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

    // Point 2: Native Firebase Configuration & Rescue Controls inside 3-Dots Modal
    function saveFirebaseSettingsFromInputs() {
      const projInput = document.getElementById("input-firebase-project-id");
      const dbUrlInput = document.getElementById("input-firebase-db-url");
      const docPathInput = document.getElementById("input-cloud-sync-channel");
      const rawPasteInput = document.getElementById("input-firebase-raw-paste");

      if (rawPasteInput && rawPasteInput.value.trim()) {
        const parsedCfg = parseFirebaseConfigInput(rawPasteInput.value.trim());
        if (parsedCfg) {
          appState.firebaseConfig = { ...appState.firebaseConfig, ...parsedCfg };
          if (projInput) projInput.value = appState.firebaseConfig.projectId || "";
          if (dbUrlInput) dbUrlInput.value = appState.firebaseConfig.databaseURL || "";
          rawPasteInput.value = "";
        }
      } else {
        if (projInput && projInput.value.trim()) {
          const p = projInput.value.trim();
          appState.firebaseConfig.projectId = p;
          appState.firebaseConfig.authDomain = `${p}.firebaseapp.com`;
          appState.firebaseConfig.storageBucket = `${p}.firebasestorage.app`;
        }
        if (dbUrlInput) {
          appState.firebaseConfig.databaseURL = dbUrlInput.value.trim();
        }
      }
      if (docPathInput && docPathInput.value.trim()) {
        appState.firebaseConfig.docPath = docPathInput.value.trim();
        appState.cloudChannel = docPathInput.value.trim();
        safeStorage.setItem(STORAGE_KEYS.CLOUD_CHANNEL, appState.cloudChannel);
      }
      safeStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(appState.firebaseConfig));
      cloudSyncReady = false;
      cloudSyncReadyConfig = "";
      startCloudSyncStream();
    }

    const syncNowBtn = document.getElementById("btn-cloud-sync-now");
    if (syncNowBtn) {
      syncNowBtn.addEventListener("click", () => {
        playUiSound("tap");
        saveFirebaseSettingsFromInputs();
        pullCloudSync(true);
      });
    }

    const rescueMigrateBtn = document.getElementById("btn-firebase-rescue-migrate");
    if (rescueMigrateBtn) {
      rescueMigrateBtn.addEventListener("click", () => {
        playUiSound("complete");
        saveFirebaseSettingsFromInputs();
        cloudSyncReady = true;
        cloudSyncReadyConfig = getCloudSyncConfigKey();
        appState.data.updatedAt = Math.max(Date.now(), Number(appState.data.updatedAt || 0) + 1);
        appState.data.bootstrapSeedData = false;
        (appState.data.tasks || []).forEach(task => { delete task.bootstrapSeed; });
        (appState.data.boxes || []).forEach(box => { delete box.bootstrapSeed; });
        saveData(true, "Rescate y migración completa a Firebase");
        pushCloudSync(true);
      });
    }

    // Options Modal Buttons
    document.getElementById("btn-export-json").addEventListener("click", exportJsonBackup);
    document.getElementById("btn-restore-initial-records").addEventListener("click", () => {
      playUiSound("complete");
      appState.data = buildRestoredUserDataset();
      appState.data.bootstrapSeedData = false;
      (appState.data.tasks || []).forEach(task => { delete task.bootstrapSeed; });
      (appState.data.boxes || []).forEach(box => { delete box.bootstrapSeed; });
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

    // Point 1: Scroll-to-top button activates only after scrolling down a bit (not visible at the very top)
    const fabScrollTopBtn = document.getElementById("fab-collapse-all");
    function updateScrollTopButtonVisibility() {
      if (!fabScrollTopBtn) return;
      const scrolledY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      fabScrollTopBtn.classList.toggle("is-visible", scrolledY > 160);
    }
    window.addEventListener("scroll", updateScrollTopButtonVisibility, { passive: true });
    updateScrollTopButtonVisibility();

    fabScrollTopBtn.addEventListener("click", () => {
      playUiSound("scrollTop");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    cleanupCompletedTasksFromPreviousDays();
    scheduleExactMidnightRollover();
    setInterval(cleanupCompletedTasksFromPreviousDays, 5000);
    applyThemeAndSoundUI();
    renderHeroDate();
    renderQuote(false);
    startQuoteRotation();
    initProTooltips();
    initEvents();
    renderBoard();
    document.documentElement.classList.remove("tasky-booting");

    // Start real-time cross-device & incognito cloud sync (Web <-> Incognito <-> Mobile App)
    pullCloudSync(false);
    startCloudSyncStream();
    setInterval(() => {
      pullCloudSync(false);
    }, 6000);
    window.addEventListener("focus", () => {
      cleanupCompletedTasksFromPreviousDays();
      pullCloudSync(false);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        cleanupCompletedTasksFromPreviousDays();
        pullCloudSync(false);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
