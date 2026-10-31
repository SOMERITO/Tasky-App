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
    VIEW_STATE: "tasky_view_state_v1"
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
    "text": "No he fracasado. Simplemente he encontrado diez mil maneras que no funcionan.",
    "author": "Thomas Alva Edison"
  },
  {
    "text": "Nuestra mayor debilidad radica en renunciar. La forma más segura de tener éxito es intentarlo una vez más.",
    "author": "Thomas Alva Edison"
  },
  {
    "text": "El mundo rompe a todos, y después, muchos son fuertes en los lugares rotos.",
    "author": "Ernest Hemingway"
  },
  {
    "text": "Pero el hombre no está hecho para la derrota. Un hombre puede ser destruido, pero no derrotado.",
    "author": "Ernest Hemingway"
  },
  {
    "text": "Podrán encontrarme derrotada muchas veces, pero nunca reducida.",
    "author": "Maya Angelou"
  },
  {
    "text": "Si no te gusta algo, cámbialo. Si no puedes cambiarlo, cambia tu actitud.",
    "author": "Maya Angelou"
  },
  {
    "text": "Nada puede apagar la luz que brilla desde el interior.",
    "author": "Maya Angelou"
  },
  {
    "text": "No soy producto de mis circunstancias. Soy producto de mis decisiones.",
    "author": "Stephen R. Covey"
  },
  {
    "text": "Lo principal es mantener lo principal como lo principal.",
    "author": "Stephen R. Covey"
  },
  {
    "text": "Tú no subes al nivel de tus metas. Caes al nivel de tus sistemas.",
    "author": "James Clear"
  },
  {
    "text": "Cada acción que realizas es un voto por el tipo de persona en la que deseas convertirte.",
    "author": "James Clear"
  },
  {
    "text": "Los hábitos son el interés compuesto de la superación personal.",
    "author": "James Clear"
  },
  {
    "text": "La claridad sobre lo que importa proporciona claridad sobre lo que no importa.",
    "author": "Cal Newport"
  },
  {
    "text": "Los esfuerzos profundos producen valor duradero y serenidad mental.",
    "author": "Cal Newport"
  },
  {
    "text": "Si gastas tu tiempo persiguiendo mariposas, ellas volarán; si construyes un hermoso jardín, las mariposas vendrán a ti.",
    "author": "Mario Quintana"
  },
  {
    "text": "Un marinero experto no se hace en mares tranquilos.",
    "author": "Franklin D. Roosevelt"
  },
  {
    "text": "Lo único a lo que debemos temer es al miedo mismo.",
    "author": "Franklin D. Roosevelt"
  },
  {
    "text": "Haz lo que puedas, con lo que tengas, donde estés.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "Cree que puedes y ya estarás a medio camino.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "No es el crítico quien cuenta, sino el hombre que realmente está en la arena y se esfuerza valientemente.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "La resiliencia es aceptar tu nueva realidad, incluso si es menos buena que la que tenías antes.",
    "author": "Elizabeth Edwards"
  },
  {
    "text": "El dolor es inevitable, pero el sufrimiento es opcional.",
    "author": "Haruki Murakami"
  },
  {
    "text": "Cuando salgas de la tormenta, no serás la misma persona que entró en ella.",
    "author": "Haruki Murakami"
  },
  {
    "text": "La cicatriz demuestra que la herida sanó y que tú fuiste más fuerte que aquello que intentó detenerte.",
    "author": "Viktor Frankl"
  },
  {
    "text": "La verdadera medida de un hombre no se ve en momentos de comodidad, sino en momentos de desafío.",
    "author": "Martin Luther King Jr."
  },
  {
    "text": "La perseverancia no es una carrera larga; son muchas carreras cortas una tras otra.",
    "author": "Walter Elliot"
  },
  {
    "text": "Cambia tus pensamientos y cambiarás tu mundo.",
    "author": "Norman Vincent Peale"
  },
  {
    "text": "El coraje no siempre ruge. A veces el coraje es la pequeña voz al final del día que dice: lo intentaré de nuevo mañana.",
    "author": "Mary Anne Radmacher"
  },
  {
    "text": "Primero hacemos nuestros hábitos, y luego nuestros hábitos nos hacen a nosotros.",
    "author": "John Dryden"
  },
  {
    "text": "La motivación es lo que te pone en marcha, y el hábito es lo que hace que sigas avanzando.",
    "author": "Jim Ryun"
  },
  {
    "text": "No basta con saber qué es lo correcto: el carácter se demuestra cuando por fin lo haces.",
    "author": "Epicteto"
  },
  {
    "text": "Deja de discutir cómo debe ser una persona buena. Conviértete en una.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Si culpas a otros de tu conducta, les estás entregando el mando de tu vida.",
    "author": "Epicteto"
  },
  {
    "text": "No exijas que las cosas sucedan como deseas; aprende a recibirlas como suceden y tendrás más calma.",
    "author": "Epicteto"
  },
  {
    "text": "La dificultad no crea tu carácter: revela el que has entrenado.",
    "author": "Epicteto"
  },
  {
    "text": "La vida no es necesariamente corta; la volvemos pequeña cuando la desperdiciamos.",
    "author": "Séneca"
  },
  {
    "text": "Mientras aplazas vivir con propósito, el tiempo sigue pasando sin pedirte permiso.",
    "author": "Séneca"
  },
  {
    "text": "Sufrimos muchas veces más por lo que imaginamos que por lo que ocurre.",
    "author": "Séneca"
  },
  {
    "text": "No pidas una vida sin pruebas; entrena una voluntad que pueda atravesarlas.",
    "author": "Séneca"
  },
  {
    "text": "Tu mente se irá pareciendo a aquello en lo que piensa una y otra vez.",
    "author": "Marco Aurelio"
  },
  {
    "text": "La mejor venganza es no convertirte en aquello que te hizo daño.",
    "author": "Marco Aurelio"
  },
  {
    "text": "No necesitas ganar cada discusión; necesitas no perder el gobierno de ti mismo.",
    "author": "Marco Aurelio"
  },
  {
    "text": "No confundas la comodidad con la fortaleza: la capacidad se entrena soportando lo que evitas.",
    "author": "Musonio Rufo"
  },
  {
    "text": "Si soportas esfuerzos por dinero, fama o aprobación, también puedes soportarlos por tu carácter.",
    "author": "Musonio Rufo"
  },
  {
    "text": "La virtud no es teoría que puedas recitar: es una práctica que debes repetir.",
    "author": "Musonio Rufo"
  },
  {
    "text": "No te hace libre conseguir todo lo que deseas; te hace libre dejar de ser esclavo de tus deseos.",
    "author": "Epicteto"
  },
  {
    "text": "Si tu tranquilidad depende de la opinión ajena, has puesto tu paz en manos de otros.",
    "author": "Epicteto"
  },
  {
    "text": "No puedes elegir todos los acontecimientos, pero sí la calidad de tu respuesta.",
    "author": "Epicteto"
  },
  {
    "text": "El obstáculo puede detener tus planes; no tiene por qué detener tu capacidad de actuar con virtud.",
    "author": "Marco Aurelio"
  },
  {
    "text": "No esperes que el día sea fácil. Procura no abandonar tu carácter cuando se vuelva difícil.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Nadie puede practicar tu virtud por ti. Nadie puede hacer tus elecciones en tu lugar.",
    "author": "Epicteto"
  },
  {
    "text": "No es suficiente soportar el golpe; examina qué juicio te hace caer una segunda vez.",
    "author": "Epicteto"
  },
  {
    "text": "Que el esfuerzo de hoy te encuentre trabajando en tu carácter, no fabricando excusas.",
    "author": "Musonio Rufo"
  },
  {
    "text": "El tiempo que entregas a la queja no vuelve convertido en solución.",
    "author": "Séneca"
  },
  {
    "text": "No eres responsable de controlar el mundo; sí de no traicionarte cuando el mundo no obedece.",
    "author": "Marco Aurelio"
  },
  {
    "text": "La pregunta no es cuánto puedes soportar por ambición, sino cuánto estás dispuesto a practicar por virtud.",
    "author": "Musonio Rufo"
  },
  {
    "text": "Ser fuerte no consiste en no sentir el impulso, sino en decidir si merece obediencia.",
    "author": "Epicteto"
  },
  {
    "text": "De las cosas, unas dependen de nosotros y otras no.",
    "author": "Epicteto"
  },
  {
    "text": "No son las cosas las que nos perturban, sino nuestros juicios acerca de ellas.",
    "author": "Epicteto"
  },
  {
    "text": "No pretendas que los acontecimientos sucedan como deseas; desea que sucedan como suceden.",
    "author": "Epicteto"
  },
  {
    "text": "Si quieres mejorar, acepta parecer ignorante en aquello que todavía no dominas.",
    "author": "Epicteto"
  },
  {
    "text": "Asóciate con quienes puedan hacerte mejor.",
    "author": "Séneca"
  },
  {
    "text": "Ver lo correcto y no hacerlo es falta de valor.",
    "author": "Confucio"
  },
  {
    "text": "Cometer un error y no corregirlo es cometer otro error.",
    "author": "Confucio"
  },
  {
    "text": "Aprender sin reflexionar es inútil; reflexionar sin aprender es peligroso.",
    "author": "Confucio"
  },
  {
    "text": "El hombre superior es modesto al hablar, pero sobresale por sus acciones.",
    "author": "Confucio"
  },
  {
    "text": "No hagas lo que no es correcto ni digas lo que no es verdad.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Al levantarte, recuerda el privilegio de estar vivo y de poder cumplir tu trabajo como ser humano.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Las cosas que debemos aprender antes de hacerlas, las aprendemos haciéndolas.",
    "author": "Aristóteles"
  },
  {
    "text": "El hombre superior busca lo que es justo; el hombre inferior, lo que le resulta ventajoso.",
    "author": "Confucio"
  },
  {
    "text": "La vida es suficientemente larga si sabes utilizarla.",
    "author": "Séneca"
  },
  {
    "text": "El tiempo perdido nunca se recupera.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Recuerda que el tiempo es dinero.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Bien hecho es mejor que bien dicho.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Acostarse temprano y levantarse temprano hace al hombre sano, rico y sabio.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "La diligencia es la madre de la buena fortuna.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "El costo de una cosa es la cantidad de vida que intercambias por ella.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "Nuestra vida se desperdicia en detalles. Simplifica, simplifica.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "Los hombres se han convertido en herramientas de sus herramientas.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "Quise vivir deliberadamente, enfrentar solo los hechos esenciales de la vida.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "Llena cada minuto implacable con sesenta segundos de esfuerzo bien empleado.",
    "author": "Rudyard Kipling"
  },
  {
    "text": "Lo pasado es prólogo.",
    "author": "William Shakespeare"
  },
  {
    "text": "Hay una marea en los asuntos humanos que, aprovechada a tiempo, conduce a la fortuna.",
    "author": "William Shakespeare"
  },
  {
    "text": "Quienes avanzan despacio por el camino correcto pueden progresar más que quienes corren y se desvían.",
    "author": "René Descartes"
  },
  {
    "text": "El tiempo es el recurso más escaso y, si no se administra, nada más puede administrarse.",
    "author": "Peter F. Drucker"
  },
  {
    "text": "Es mucho mejor atreverse a cosas grandes y arriesgarse al fracaso que vivir sin conocer ni la victoria ni la derrota.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "No predico la vida de facilidad, sino la vida de esfuerzo, trabajo y lucha.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "Si no hay lucha, no hay progreso.",
    "author": "Frederick Douglass"
  },
  {
    "text": "El poder no concede nada sin una exigencia; nunca lo ha hecho ni lo hará.",
    "author": "Frederick Douglass"
  },
  {
    "text": "La fortuna favorece a los audaces.",
    "author": "Virgilio"
  },
  {
    "text": "Nada saldrá de la nada.",
    "author": "William Shakespeare"
  },
  {
    "text": "La acción es elocuencia.",
    "author": "William Shakespeare"
  },
  {
    "text": "Nuestras dudas son traidoras y nos hacen perder el bien que podríamos alcanzar por temor a intentarlo.",
    "author": "William Shakespeare"
  },
  {
    "text": "Quien trabaja con diligencia tiene más oportunidades de aprovechar la buena fortuna.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "La naturaleza, para ser dirigida, debe ser obedecida.",
    "author": "Francis Bacon"
  },
  {
    "text": "La actividad conforme a la virtud constituye el bien humano.",
    "author": "Aristóteles"
  },
  {
    "text": "La virtud se adquiere practicando actos virtuosos, del mismo modo que aprendemos un oficio practicándolo.",
    "author": "Aristóteles"
  },
  {
    "text": "Si puedes reunir todas tus ganancias, arriesgarlas, perderlas y volver a empezar sin lamentarte por la pérdida…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "Si puedes obligar a tu corazón, tus nervios y tus músculos a seguir sirviéndote cuando estén agotados…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "La experiencia mantiene una escuela costosa, pero los necios no aprenden en ninguna otra.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Los objetivos sirven para marcar una dirección; los sistemas son mejores para progresar.",
    "author": "James Clear"
  },
  {
    "text": "Te preocupa menos tu resultado actual de lo que debería preocuparte la trayectoria que llevas.",
    "author": "James Clear"
  },
  {
    "text": "La disciplina equivale a libertad.",
    "author": "Jocko Willink"
  },
  {
    "text": "La clave no es priorizar lo que está en tu agenda, sino agendar tus prioridades.",
    "author": "Stephen R. Covey"
  },
  {
    "text": "No ocultes tus talentos: se hicieron para usarse. ¿De qué sirve un reloj de sol a la sombra?",
    "author": "Benjamin Franklin"
  },
  {
    "text": "No hay ganancias sin esfuerzo.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Una golondrina no hace verano, ni un solo día; tampoco un día o un breve tiempo hacen feliz a un hombre.",
    "author": "Aristóteles"
  },
  {
    "text": "El hombre superior ve una oportunidad para corregirse cuando observa una virtud en otro.",
    "author": "Confucio"
  },
  {
    "text": "La constancia convierte pequeñas acciones en cambios significativos.",
    "author": "James Clear"
  },
  {
    "text": "El movimiento no equivale a acción; estar ocupado no equivale a ser eficaz.",
    "author": "James Clear"
  },
  {
    "text": "La forma en que empleas tus días es la forma en que empleas tu vida.",
    "author": "Annie Dillard"
  },
  {
    "text": "Hacer bien una cosa exige decidir qué no vas a hacer.",
    "author": "Peter F. Drucker"
  },
  {
    "text": "No leas para contradecir ni para creer a ciegas, sino para sopesar y considerar.",
    "author": "Francis Bacon"
  },
  {
    "text": "Algunos libros deben degustarse, otros tragarse y unos pocos masticarse y digerirse.",
    "author": "Francis Bacon"
  },
  {
    "text": "Los astutos desprecian los estudios, los simples los admiran y los sabios los utilizan.",
    "author": "Francis Bacon"
  },
  {
    "text": "No basta con tener una buena mente; lo importante es utilizarla bien.",
    "author": "René Descartes"
  },
  {
    "text": "Divide cada dificultad en tantas partes como sea posible y necesario para resolverla.",
    "author": "René Descartes"
  },
  {
    "text": "Leer buenos libros es como conversar con las mentes más destacadas de los siglos pasados.",
    "author": "René Descartes"
  },
  {
    "text": "Confía en ti mismo: cada corazón vibra con esa cuerda de hierro.",
    "author": "Ralph Waldo Emerson"
  },
  {
    "text": "La envidia es ignorancia; la imitación es suicidio.",
    "author": "Ralph Waldo Emerson"
  },
  {
    "text": "Insiste en ti mismo; nunca imites.",
    "author": "Ralph Waldo Emerson"
  },
  {
    "text": "Una coherencia tonta es el duende de las mentes pequeñas.",
    "author": "Ralph Waldo Emerson"
  },
  {
    "text": "La mayoría de los hombres lleva vidas de silenciosa desesperación.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "Si alguien no lleva el paso de sus compañeros, quizá oye un tambor diferente.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "Si has construido castillos en el aire, tu trabajo no tiene por qué perderse: ahora pon cimientos debajo de ellos.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "Quien camina con otros dos puede aprender de ambos: imitar lo bueno y corregir lo malo.",
    "author": "Confucio"
  },
  {
    "text": "La libertad consiste en poder actuar conforme a la razón.",
    "author": "Epicteto"
  },
  {
    "text": "Lo que no me mata me hace más fuerte.",
    "author": "Friedrich Nietzsche"
  },
  {
    "text": "Hay que tener caos dentro de uno para dar a luz una estrella danzante.",
    "author": "Friedrich Nietzsche"
  },
  {
    "text": "En medio del invierno descubrí que dentro de mí había un verano invencible.",
    "author": "Albert Camus"
  },
  {
    "text": "La lucha hacia las alturas basta para llenar el corazón de un hombre.",
    "author": "Albert Camus"
  },
  {
    "text": "Fracasa otra vez. Fracasa mejor.",
    "author": "Samuel Beckett"
  },
  {
    "text": "Es mejor atreverse a cosas grandes, aun con el riesgo del fracaso, que vivir sin haber conocido ni la victoria ni la derrota.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "Si puedes encontrarte con el triunfo y el desastre y tratar a ambos impostores por igual…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "Si puedes empezar de nuevo y no pronunciar una palabra sobre lo perdido…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "Si puedes seguir adelante cuando ya no queda nada en ti salvo la voluntad que dice: continúa…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "Quienes dicen apoyar la libertad pero condenan la agitación quieren cosechar sin arar la tierra.",
    "author": "Frederick Douglass"
  },
  {
    "text": "No todo lo que afrontamos puede cambiarse, pero nada cambia hasta que lo afrontamos.",
    "author": "James Baldwin"
  },
  {
    "text": "El obstáculo a la acción puede convertirse en material para la acción.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Por encima de todo, sé fiel a ti mismo.",
    "author": "William Shakespeare"
  },
  {
    "text": "La culpa, querido Bruto, no está en nuestras estrellas, sino en nosotros mismos.",
    "author": "William Shakespeare"
  },
  {
    "text": "Ningún legado es tan rico como la honestidad.",
    "author": "William Shakespeare"
  },
  {
    "text": "Sabemos lo que somos, pero no lo que podemos llegar a ser.",
    "author": "William Shakespeare"
  },
  {
    "text": "El hombre superior procura que sus palabras sean lentas y sus acciones rápidas.",
    "author": "Confucio"
  },
  {
    "text": "Lo que el hombre superior busca está en sí mismo; lo que el hombre inferior busca está en los demás.",
    "author": "Confucio"
  },
  {
    "text": "No te avergüences de necesitar ayuda.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Cuando te moleste la falta de otro, examina primero tus propios defectos.",
    "author": "Epicteto"
  },
  {
    "text": "No es quien te insulta quien te hiere, sino tu juicio acerca del insulto.",
    "author": "Epicteto"
  },
  {
    "text": "Ama a todos, confía en unos pocos y no hagas daño a nadie.",
    "author": "William Shakespeare"
  },
  {
    "text": "Una vida sin examen no merece ser vivida.",
    "author": "Sócrates"
  },
  {
    "text": "Lo importante no es simplemente vivir, sino vivir correctamente.",
    "author": "Sócrates"
  },
  {
    "text": "Quien no piensa y planifica a largo plazo encontrará problemas a su puerta.",
    "author": "Confucio"
  },
  {
    "text": "Quien quiera ser un hombre debe ser inconformista.",
    "author": "Ralph Waldo Emerson"
  },
  {
    "text": "El alma se tiñe del color de sus pensamientos.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Por naturaleza, todos los hombres desean saber.",
    "author": "Aristóteles"
  },
  {
    "text": "¿Acaso no es un placer aprender y practicar lo aprendido?",
    "author": "Confucio"
  },
  {
    "text": "Saber qué sabes y qué no sabes: eso es el verdadero conocimiento.",
    "author": "Confucio"
  },
  {
    "text": "Quien, revisando lo antiguo, descubre lo nuevo, puede ser un maestro.",
    "author": "Confucio"
  },
  {
    "text": "La lectura hace al hombre completo; la conversación, ágil; y la escritura, preciso.",
    "author": "Francis Bacon"
  },
  {
    "text": "El conocimiento mismo es poder.",
    "author": "Francis Bacon"
  },
  {
    "text": "La historia hace sabios a los hombres; la poesía, ingeniosos; las matemáticas, sutiles.",
    "author": "Francis Bacon"
  },
  {
    "text": "Es mejor tener una cabeza bien formada que una cabeza bien llena.",
    "author": "Michel de Montaigne"
  },
  {
    "text": "Me estudio a mí mismo más que cualquier otro asunto.",
    "author": "Michel de Montaigne"
  },
  {
    "text": "La excelencia moral se forma mediante hábitos, no aparece en nosotros por naturaleza ni contra ella.",
    "author": "Aristóteles"
  },
  {
    "text": "La prudencia consiste en deliberar bien sobre lo que es bueno y conveniente para vivir bien.",
    "author": "Aristóteles"
  },
  {
    "text": "Las mentes más grandes son capaces de los mayores vicios, así como de las mayores virtudes.",
    "author": "René Descartes"
  },
  {
    "text": "Si alguien puede refutarme y mostrarme mi error, cambiaré con gusto.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Los estudios sirven para aprender a juzgar y no solo para acumular información.",
    "author": "Michel de Montaigne"
  },
  {
    "text": "Un comienzo es la parte más importante de cualquier trabajo.",
    "author": "Platón"
  },
  {
    "text": "El cobarde muere muchas veces antes de su muerte; el valiente solo prueba la muerte una vez.",
    "author": "William Shakespeare"
  },
  {
    "text": "Solo mediante trabajo y esfuerzo doloroso avanzamos hacia cosas mejores.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "La mejor parte del valor es la prudencia.",
    "author": "William Shakespeare"
  },
  {
    "text": "Debes hacer aquello que crees que no puedes hacer.",
    "author": "Eleanor Roosevelt"
  },
  {
    "text": "El valor y la confianza llegan cada vez que te enfrentas de verdad al miedo.",
    "author": "Eleanor Roosevelt"
  },
  {
    "text": "Si puedes confiar en ti mismo cuando todos dudan de ti, sin dejar de comprender sus dudas…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "Si puedes hablar con multitudes y conservar tu virtud, o caminar con reyes sin perder el contacto con la gente común…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "Si puedes soñar sin convertirte en esclavo de tus sueños, y pensar sin hacer de tus pensamientos tu único objetivo…",
    "author": "Rudyard Kipling"
  },
  {
    "text": "No hay lucha sin riesgo, ni progreso sin esfuerzo.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "Por la libertad y la honra se puede y se debe aventurar la vida.",
    "author": "Miguel de Cervantes"
  },
  {
    "text": "Quienes quieren cosechar sin arar quieren resultados sin el trabajo que los hace posibles.",
    "author": "Frederick Douglass"
  },
  {
    "text": "La acción valiente no garantiza la victoria, pero la inacción te excluye del esfuerzo.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "La voluntad de prepararse es una parte esencial de la oportunidad.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "La preparación es todo.",
    "author": "William Shakespeare"
  },
  {
    "text": "Dime, ¿qué piensas hacer con tu única vida preciosa y salvaje?",
    "author": "Mary Oliver"
  },
  {
    "text": "Ten paciencia con todo lo que permanece sin resolver en tu corazón e intenta amar las preguntas mismas.",
    "author": "Rainer Maria Rilke"
  },
  {
    "text": "Recuerda que eres un actor en una representación, y que el papel te será asignado.",
    "author": "Epicteto"
  },
  {
    "text": "No hagas nada que no tenga un propósito.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Cultivemos nuestro jardín.",
    "author": "Voltaire"
  },
  {
    "text": "El trabajo mantiene alejados tres grandes males: el aburrimiento, el vicio y la necesidad.",
    "author": "Voltaire"
  },
  {
    "text": "Quise vivir profundamente y extraer toda la médula de la vida.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "El hombre superior está sereno y tranquilo; el hombre inferior, siempre preocupado y angustiado.",
    "author": "Confucio"
  },
  {
    "text": "Podrías abandonar la vida ahora mismo: deja que esa idea determine lo que haces, dices y piensas.",
    "author": "Marco Aurelio"
  },
  {
    "text": "La felicidad no consiste en placeres pasajeros, sino en vivir de acuerdo con la virtud.",
    "author": "Aristóteles"
  },
  {
    "text": "Confía en el tiempo, que suele dar dulces salidas a muchas amargas dificultades.",
    "author": "Miguel de Cervantes"
  },
  {
    "text": "El arte de vivir se parece más a la lucha que a la danza.",
    "author": "Marco Aurelio"
  },
  {
    "text": "El tiempo es nuestro bien más valioso: no lo entregues sin examinar a qué lo destinas.",
    "author": "Séneca"
  },
  {
    "text": "La pregunta no es cuánto tiempo tienes, sino qué haces con él.",
    "author": "Séneca"
  },
  {
    "text": "La vida bien empleada es más importante que la vida larga.",
    "author": "Séneca"
  },
  {
    "text": "Ningún hombre es libre si no es dueño de sí mismo.",
    "author": "Epicteto"
  },
  {
    "text": "Podrías hacer el bien hoy mismo, pero en lugar de eso eliges mañana.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Debemos sufrir uno de dos dolores: el dolor de la disciplina o el dolor del arrepentimiento. La diferencia es que la disciplina pesa onzas y el arrepentimiento pesa toneladas.",
    "author": "Jim Rohn"
  },
  {
    "text": "A nadie le importa. Trabaja más duro.",
    "author": "Cameron Hanes"
  },
  {
    "text": "Cuando tu mente te dice que estás acabado, que estás agotado y que no puedes dar un paso más, en realidad apenas estás al 40% de tu capacidad.",
    "author": "David Goggins"
  },
  {
    "text": "No eres tus intenciones; eres tus acciones.",
    "author": "Naval Ravikant"
  },
  {
    "text": "El primer paso hacia el cambio es la conciencia. El segundo paso es la aceptación. Nadie vendrá a salvarte.",
    "author": "Nathaniel Branden"
  },
  {
    "text": "Haz lo que debes hacer, cuando debes hacerlo, te guste o no.",
    "author": "Thomas Henry Huxley"
  },
  {
    "text": "Somos lo que hacemos día a día. De modo que la excelencia no es un acto, sino un hábito.",
    "author": "Will Durant"
  },
  {
    "text": "Si es soportable, entonces sopórtalo. Deja de quejarte.",
    "author": "Marco Aurelio"
  },
  {
    "text": "El éxito no se compra; se alquila, y el alquiler vence todos los días.",
    "author": "J.J. Watt"
  },
  {
    "text": "Un hombre que no ha pasado por la adversidad no conoce su propia fuerza.",
    "author": "Séneca"
  },
  {
    "text": "Exígete mucho a ti mismo y espera poco de los demás. Así te ahorrarás disgustos.",
    "author": "Confucio"
  },
  {
    "text": "Tus excusas no son más que las mentiras que te vende tu propio miedo.",
    "author": "Robin Sharma"
  },
  {
    "text": "Si no construyes tu sueño, alguien te contratará para que le ayudes a construir el suyo.",
    "author": "Dhirubhai Ambani"
  },
  {
    "text": "En los negocios y en la vida no obtienes lo que mereces, obtienes lo que negocias y trabajas.",
    "author": "Chester L. Karrass"
  },
  {
    "text": "No reces por una vida fácil, reza por tener la fuerza para soportar una difícil.",
    "author": "Bruce Lee"
  },
  {
    "text": "Eres el promedio de las cinco personas con las que pasas más tiempo.",
    "author": "Jim Rohn"
  },
  {
    "text": "No te digas a ti mismo que necesitas más motivación; lo que necesitas es dejar de romper las promesas que te haces.",
    "author": "Ed Mylett"
  },
  {
    "text": "El árbol más fuerte no crece en el suelo más cómodo, sino contra los vientos más fuertes.",
    "author": "J. Willard Marriott"
  },
  {
    "text": "Hasta que no te valores a ti mismo, no valorarás tu tiempo. Y hasta que no valores tu tiempo, no harás nada con él.",
    "author": "M. Scott Peck"
  },
  {
    "text": "Cuanto más sudes en el entrenamiento, menos sangrarás en el combate.",
    "author": "Richard Marcinko"
  },
  {
    "text": "¿Cuánto tiempo vas a esperar antes de exigir lo mejor para ti mismo?",
    "author": "Epicteto"
  },
  {
    "text": "Todo el mundo tiene un plan hasta que le dan un puñetazo en la boca.",
    "author": "Mike Tyson"
  },
  {
    "text": "Si trabajas duro cuando nadie te ve, el resultado hablará cuando todos te miren.",
    "author": "Kobe Bryant"
  },
  {
    "text": "Si siempre pones límites a todo lo que haces, física o mentalmente, se extenderá a tu trabajo y a tu vida.",
    "author": "Bruce Lee"
  },
  {
    "text": "Trata tu cuerpo con rigor para que no desobedezca a la mente.",
    "author": "Séneca"
  },
  {
    "text": "Si te entregas al esfuerzo continuo, el dolor pasará, pero el orgullo y el carácter permanecerán para siempre.",
    "author": "Musonio Rufo"
  },
  {
    "text": "La primera y mejor de las victorias es conquistarse a uno mismo; ser conquistado por uno mismo es, de todas las cosas, la más vergonzosa y vil.",
    "author": "Platón"
  },
  {
    "text": "La mayoría de la gente no quiere realmente la libertad, porque la libertad implica responsabilidad, y la mayoría de la gente tiene miedo de la responsabilidad.",
    "author": "Sigmund Freud"
  },
  {
    "text": "Asume la responsabilidad de tu propia vida. Date cuenta de que eres tú quien te llevará a donde quieres ir, nadie más.",
    "author": "Les Brown"
  },
  {
    "text": "Tu vida no mejora por casualidad, mejora por el cambio que provocas.",
    "author": "Jim Rohn"
  },
  {
    "text": "El precio de la grandeza es la responsabilidad sobre cada uno de tus pensamientos y actos.",
    "author": "Winston Churchill"
  },
  {
    "text": "No tienes derecho a las cartas que crees que deberían haberte repartido. Tienes la obligación de jugar al máximo las que tienes en la mano.",
    "author": "Cheryl Strayed"
  },
  {
    "text": "El hombre que se levanta a sí mismo después de caer es más fuerte que el que nunca ha caído.",
    "author": "Viktor Frankl"
  },
  {
    "text": "Si quieres hacer un cambio permanente, deja de centrarte en el tamaño de tus problemas y empieza a centrarte en tu propio tamaño.",
    "author": "T. Harv Eker"
  },
  {
    "text": "La comodidad es el peor tipo de esclavitud porque te hace creer que eres libre mientras te debilita.",
    "author": "Nassim Nicholas Taleb"
  },
  {
    "text": "La autodisciplina comienza con el dominio de tus pensamientos. Si no controlas lo que piensas, no puedes controlar lo que haces.",
    "author": "Napoleon Hill"
  },
  {
    "text": "El talento sin disciplina es como un pulpo en patines: hay mucho movimiento, pero nunca sabes si va hacia adelante, hacia atrás o hacia los lados.",
    "author": "H. Jackson Brown Jr."
  },
  {
    "text": "Nadie se vuelve grande haciendo solo lo que se le pide. La excelencia empieza donde termina la obligación.",
    "author": "Baltasar Gracián"
  },
  {
    "text": "Cada mañana tienes dos opciones: seguir durmiendo con tus sueños, o levantarte y perseguirlos.",
    "author": "Carmelo Anthony"
  },
  {
    "text": "El estándar que pasas por alto y toleras es el nuevo estándar que aceptas para tu vida.",
    "author": "David Morrison"
  },
  {
    "text": "No puedes cambiar tu destino de la noche a la mañana, pero puedes cambiar tu dirección de la noche a la mañana.",
    "author": "Jim Rohn"
  },
  {
    "text": "Es una vergüenza para un hombre envejecer sin ver la belleza y la fuerza de la que su cuerpo es capaz.",
    "author": "Sócrates"
  },
  {
    "text": "Compárate con quien eras ayer, no con quien es otra persona hoy.",
    "author": "Jordan B. Peterson"
  },
  {
    "text": "Di la verdad, o al menos no te mientas a ti mismo sobre tus propias debilidades.",
    "author": "Jordan B. Peterson"
  },
  {
    "text": "El problema es que crees que tienes tiempo.",
    "author": "Jack Kornfield"
  },
  {
    "text": "El tiempo perdido nunca se vuelve a encontrar.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "Un hombre que se atreve a desperdiciar una hora de su tiempo no ha descubierto el valor de la vida.",
    "author": "Charles Darwin"
  },
  {
    "text": "Puedes retrasarte, pero el tiempo no lo hará.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "El ayer es un cheque cancelado; el mañana es un pagaré; el hoy es el único efectivo que tienes, así que gástalo sabiamente.",
    "author": "Kay Lyons"
  },
  {
    "text": "La gente común solo piensa en cómo pasar el tiempo. Un hombre con talento intenta utilizarlo.",
    "author": "Arthur Schopenhauer"
  },
  {
    "text": "Si amas la vida, no malgastes el tiempo, porque el tiempo es el tejido del que está hecha la vida.",
    "author": "Benjamin Franklin"
  },
  {
    "text": "En lugar de decir 'no tengo tiempo', intenta decir 'no es una prioridad' y mira cómo se siente eso.",
    "author": "Laura Vanderkam"
  },
  {
    "text": "El tiempo es lo que más queremos, pero es lo que peor usamos.",
    "author": "William Penn"
  },
  {
    "text": "Dentro de un año desearás haber empezado hoy.",
    "author": "Karen Lamb"
  },
  {
    "text": "Tu tiempo es limitado, así que no lo malgastes viviendo la vida de otro.",
    "author": "Steve Jobs"
  },
  {
    "text": "El arrepentimiento por el tiempo perdido es más tiempo perdido.",
    "author": "Mason Cooley"
  },
  {
    "text": "Cualquier idiota puede enfrentar una crisis; es el desgaste del día a día sin propósito lo que te destruye.",
    "author": "Antón Chéjov"
  },
  {
    "text": "Nunca renuncies a una meta solo por el tiempo que te tomará lograrla. El tiempo pasará de todos modos.",
    "author": "Earl Nightingale"
  },
  {
    "text": "Vive como si fueras a morir mañana. Aprende como si fueras a vivir para siempre.",
    "author": "Mahatma Gandhi"
  },
  {
    "text": "Atrapa el día de hoy y no confíes lo más mínimo en el mañana.",
    "author": "Horacio"
  },
  {
    "text": "Los dos guerreros más poderosos son la paciencia y el tiempo.",
    "author": "León Tolstói"
  },
  {
    "text": "Cuidado con la esterilidad de una vida muy ocupada.",
    "author": "Sócrates"
  },
  {
    "text": "Todo tu dinero y todo tu esfuerzo no pueden comprar de vuelta ni un solo segundo de ayer.",
    "author": "Bob Proctor"
  },
  {
    "text": "Somos extremadamente celosos con nuestro dinero y nuestras propiedades, pero cuando se trata de perder el tiempo, en lo único donde la avaricia es honrosa, somos pródigos.",
    "author": "Séneca"
  },
  {
    "text": "Un día bien aprovechado nos da un buen sueño; una vida bien aprovechada nos da una muerte tranquila.",
    "author": "Leonardo da Vinci"
  },
  {
    "text": "El futuro tiene muchos nombres. Para los débiles es lo inalcanzable. Para los temerosos, lo desconocido. Para los valientes es la oportunidad.",
    "author": "Victor Hugo"
  },
  {
    "text": "Cada segundo es de un valor infinito, porque es el representante de toda una eternidad.",
    "author": "Johann Wolfgang von Goethe"
  },
  {
    "text": "No puedes matar el tiempo sin herir la eternidad.",
    "author": "Henry David Thoreau"
  },
  {
    "text": "La pérdida de tiempo es la más irreparable y la que menos nos preocupa.",
    "author": "Conde de Buffon"
  },
  {
    "text": "El espacio lo podemos recuperar; el tiempo, jamás.",
    "author": "Napoleón Bonaparte"
  },
  {
    "text": "Mañana es solo un adverbio de tiempo, pero para los flojos es una excusa eterna.",
    "author": "William Shakespeare"
  },
  {
    "text": "Recuerda que la vida no se mide por las veces que respiras, sino por lo que construyes antes de que se te acabe el aliento.",
    "author": "Baltasar Gracián"
  },
  {
    "text": "No somos dueños del mañana; quien pospone la rectitud de su vida es como el rústico que espera a que pase todo el río para cruzar, pero el río fluye y fluirá por toda la eternidad.",
    "author": "Horacio"
  },
  {
    "text": "Nada es realmente nuestro excepto el tiempo, del cual goza hasta quien no tiene morada.",
    "author": "Baltasar Gracián"
  },
  {
    "text": "Uno de estos días es ninguno de estos días.",
    "author": "Henry George Bohn"
  },
  {
    "text": "Quien no sabe aprovechar su tiempo, no sabe vivir; pasa por el mundo como una sombra sin dejar rastro.",
    "author": "Michel de Montaigne"
  },
  {
    "text": "Tu mayor recurso es tu tiempo; no lo inviertas en personas o batallas que no construyen tu futuro.",
    "author": "Brian Tracy"
  },
  {
    "text": "El hombre que espera a que las condiciones sean perfectas para actuar, morirá esperando.",
    "author": "Salomón"
  },
  {
    "text": "Acuéstate cada noche con la satisfacción de haber ganado el día, no con la culpa de haberlo sobrevivido.",
    "author": "Marco Aurelio"
  },
  {
    "text": "La procrastinación es el arte de mantenerse al día con el ayer.",
    "author": "Don Marquis"
  },
  {
    "text": "La procrastinación es la tumba donde se entierran las oportunidades.",
    "author": "Napoleon Hill"
  },
  {
    "text": "Lo único que realmente posees es este instante; si lo desperdicias en distracciones, te estás robando a ti mismo.",
    "author": "Epicteto"
  },
  {
    "text": "El reloj corre. ¿Te estás convirtiendo en la persona que dijiste que ibas a ser?",
    "author": "Greg Plitt"
  },
  {
    "text": "Cinco minutos bastan para soñar toda una vida, así de relativo es el tiempo; pero cinco minutos de indolencia bastan para arruinar un día.",
    "author": "Mario Benedetti"
  },
  {
    "text": "Aquel que no añade nada a sus conocimientos cada día, los disminuye.",
    "author": "Hillel el Viejo"
  },
  {
    "text": "El mejor momento para actuar fue ayer. El segundo mejor momento es ahora mismo.",
    "author": "Zig Ziglar"
  },
  {
    "text": "El tiempo descubre la verdad y desenmascara al hombre que solo hablaba pero no construía.",
    "author": "Séneca"
  },
  {
    "text": "Los aficionados se sientan y esperan la inspiración; el resto de nosotros simplemente nos levantamos y nos ponemos a trabajar.",
    "author": "Stephen King"
  },
  {
    "text": "Si pasas demasiado tiempo pensando en una cosa, nunca la harás.",
    "author": "Bruce Lee"
  },
  {
    "text": "Lo que no se define no se puede medir. Lo que no se mide, no se puede mejorar. Lo que no se mejora, se degrada siempre.",
    "author": "William Thomson Kelvin"
  },
  {
    "text": "Enfocarse no es decir sí a aquello en lo que debes concentrarte; es decir no a las otras cien buenas ideas que existen.",
    "author": "Steve Jobs"
  },
  {
    "text": "Nunca confundas movimiento con acción.",
    "author": "Ernest Hemingway"
  },
  {
    "text": "El trabajo se expande hasta llenar el tiempo disponible para su realización.",
    "author": "Cyril Northcote Parkinson"
  },
  {
    "text": "Trágate un sapo vivo a primera hora de la mañana y nada peor te ocurrirá durante el resto del día.",
    "author": "Nicolas Chamfort"
  },
  {
    "text": "La visión sin ejecución es solo una alucinación.",
    "author": "Thomas Alva Edison"
  },
  {
    "text": "Las ideas son fáciles. La implementación es lo difícil.",
    "author": "Guy Kawasaki"
  },
  {
    "text": "El guerrero exitoso es el hombre promedio, pero con un enfoque similar al de un láser.",
    "author": "Bruce Lee"
  },
  {
    "text": "El hombre que persigue dos conejos no atrapa ninguno.",
    "author": "Confucio"
  },
  {
    "text": "Nunca disminuyas tu meta. Aumenta tus acciones.",
    "author": "Grant Cardone"
  },
  {
    "text": "Estar siempre ocupado es una forma de pereza: pensamiento perezoso y acción indiscriminada.",
    "author": "Tim Ferriss"
  },
  {
    "text": "Haz primero las cosas difíciles. Las cosas fáciles se resolverán solas.",
    "author": "Dale Carnegie"
  },
  {
    "text": "La eficiencia es hacer las cosas bien; la efectividad es hacer las cosas correctas.",
    "author": "Peter Drucker"
  },
  {
    "text": "No necesitas más tiempo en tu día. Necesitas decidir.",
    "author": "Seth Godin"
  },
  {
    "text": "Una onza de acción vale más que una tonelada de teoría.",
    "author": "Friedrich Engels"
  },
  {
    "text": "No juzgues cada día por la cosecha que recoges, sino por las semillas que plantas.",
    "author": "Robert Louis Stevenson"
  },
  {
    "text": "Si no produces, no prosperarás, sin importar cuán hábil o talentoso seas.",
    "author": "Cal Newport"
  },
  {
    "text": "Concéntrate todos tus pensamientos en el trabajo que tienes entre manos. Los rayos del sol no queman hasta que se enfocan.",
    "author": "Alexander Graham Bell"
  },
  {
    "text": "La acción cura el miedo. La indecisión y el aplazamiento, en cambio, lo fertilizan.",
    "author": "David J. Schwartz"
  },
  {
    "text": "Si dedicas tu vida a intentar ser bueno en todo, nunca serás excelente en nada.",
    "author": "Tom Rath"
  },
  {
    "text": "No hay nada tan inútil como hacer con gran eficiencia algo que no debería haberse hecho en absoluto.",
    "author": "Peter Drucker"
  },
  {
    "text": "La diferencia entre las personas exitosas y las personas realmente exitosas es que las realmente exitosas dicen 'no' a casi todo.",
    "author": "Warren Buffett"
  },
  {
    "text": "Si tú mismo no diseñas tu propio plan de vida, lo más probable es que caigas en el plan de otra persona. Y adivina qué han planeado para ti: no mucho.",
    "author": "Jim Rohn"
  },
  {
    "text": "Un buen plan ejecutado con violencia hoy es mejor que un plan perfecto la próxima semana.",
    "author": "George S. Patton"
  },
  {
    "text": "La inspiración existe, pero tiene que encontrarte trabajando.",
    "author": "Pablo Picasso"
  },
  {
    "text": "No puedes construir una reputación sobre lo que vas a hacer.",
    "author": "Henry Ford"
  },
  {
    "text": "Los planes son inútiles, pero la planificación es indispensable.",
    "author": "Dwight D. Eisenhower"
  },
  {
    "text": "Estar en todas partes es no estar en ninguna.",
    "author": "Séneca"
  },
  {
    "text": "La sabiduría consiste en la eliminación de lo no esencial.",
    "author": "Lin Yutang"
  },
  {
    "text": "Hasta que todo tu esfuerzo no se convierta en compromiso real, solo hay vacilación y la posibilidad de echarse atrás.",
    "author": "William Hutchison Murray"
  },
  {
    "text": "El secreto para salir adelante es simplemente empezar; el secreto para empezar es dividir tus tareas complejas y abrumadoras en pequeñas tareas manejables y luego comenzar por la primera.",
    "author": "Mark Twain"
  },
  {
    "text": "El éxito extraordinario es secuencial, no simultáneo. Empieza de forma lineal y se vuelve geométrico.",
    "author": "Gary Keller"
  },
  {
    "text": "Si no pagas el precio del enfoque, pagarás el precio de la dispersión.",
    "author": "Greg McKeown"
  },
  {
    "text": "Dime a qué le prestas atención y te diré quién eres.",
    "author": "José Ortega y Gasset"
  },
  {
    "text": "La mayoría de los hombres fracasan no por falta de capacidad, sino por falta de dirección y compromiso con un solo objetivo.",
    "author": "Vince Lombardi"
  },
  {
    "text": "Haz menos cosas, pero hazlas con obsesión y maestría.",
    "author": "Morten T. Hansen"
  },
  {
    "text": "Cuando trabajes, trabaja; cuando descanses, descansa. La mediocridad vive en el punto intermedio donde no haces bien ninguna de las dos.",
    "author": "Séneca"
  },
  {
    "text": "Si quieres que un trabajo difícil parezca fácil, sigue postergándolo; pronto parecerá imposible.",
    "author": "George Horace Lorimer"
  },
  {
    "text": "La acción es la medida real de la inteligencia.",
    "author": "Napoleon Hill"
  },
  {
    "text": "No te quejes de los resultados que no obtuviste por el trabajo que no hiciste.",
    "author": "Ronda Rousey"
  },
  {
    "text": "El perfeccionismo es a menudo una excusa elegante para no terminar nada por miedo al juicio.",
    "author": "Elizabeth Gilbert"
  },
  {
    "text": "Corta las distracciones de raíz. Un hombre que es esclavo de sus impulsos inmediatos jamás construirá un imperio a largo plazo.",
    "author": "Robert Greene"
  },
  {
    "text": "Céntrate en ser productivo en lugar de estar ocupado.",
    "author": "Tim Ferriss"
  },
  {
    "text": "El esfuerzo solo libera toda su recompensa después de que una persona se niega a rendirse.",
    "author": "Napoleon Hill"
  },
  {
    "text": "Un barco en el puerto está seguro, pero no es para eso para lo que se construyen los barcos.",
    "author": "John A. Shedd"
  },
  {
    "text": "La medida definitiva de un hombre no es dónde se encuentra en momentos de comodidad, sino dónde se para en tiempos de desafío y controversia.",
    "author": "Martin Luther King Jr."
  },
  {
    "text": "He fallado más de 9,000 tiros en mi carrera. He perdido casi 300 juegos. He fallado una y otra vez en mi vida; y por eso he tenido éxito.",
    "author": "Michael Jordan"
  },
  {
    "text": "Las dificultades preparan a menudo a una persona común para un destino extraordinario.",
    "author": "C.S. Lewis"
  },
  {
    "text": "La adversidad tiene el efecto de despertar talentos que en circunstancias prósperas habrían continuado dormidos.",
    "author": "Horacio"
  },
  {
    "text": "Tu nivel de éxito rara vez superará tu nivel de desarrollo personal, porque el éxito es algo que atraes por la persona en la que te conviertes.",
    "author": "Jim Rohn"
  },
  {
    "text": "La riqueza no consiste en tener grandes posesiones, sino en tener pocas necesidades.",
    "author": "Epicteto"
  },
  {
    "text": "No te detengas cuando estés cansado. Detente cuando hayas terminado.",
    "author": "David Goggins"
  },
  {
    "text": "La mente lo es todo. En lo que piensas, en eso te conviertes.",
    "author": "Siddhartha Gautama"
  },
  {
    "text": "Sufrimos más a menudo en la imaginación que en la realidad.",
    "author": "Séneca"
  },
  {
    "text": "Un hombre debe ser lo suficientemente grande como para admitir sus errores, lo suficientemente inteligente como para aprovecharlos y lo suficientemente fuerte como para corregirlos.",
    "author": "John C. Maxwell"
  },
  {
    "text": "Es duro fracasar, pero es todavía peor no haber intentado nunca triunfar.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "No es el crítico quien cuenta, ni el que señala cómo el hombre fuerte tropieza... El crédito pertenece al hombre que está realmente en la arena, con el rostro desfigurado por el polvo, el sudor y la sangre.",
    "author": "Theodore Roosevelt"
  },
  {
    "text": "Haz todos los días algo que te dé miedo.",
    "author": "Eleanor Roosevelt"
  },
  {
    "text": "El dolor es temporal. Puede durar un minuto, una hora, un día o un año, pero al final se acabará y otra cosa tomará su lugar. Si me rindo, en cambio, durará para siempre.",
    "author": "Lance Armstrong"
  },
  {
    "text": "No desperdicies más tiempo argumentando acerca de lo que debe ser un buen hombre. Sé uno.",
    "author": "Marco Aurelio"
  },
  {
    "text": "No hay nada fuera de ti que pueda permitirte ser mejor, más fuerte, más rico, más rápido o más inteligente. Todo está dentro. No busques nada fuera de ti mismo.",
    "author": "Miyamoto Musashi"
  },
  {
    "text": "En medio del caos, también hay oportunidad.",
    "author": "Sun Tzu"
  },
  {
    "text": "No mido el éxito de un hombre por lo alto que escala, sino por lo alto que rebota cuando toca fondo.",
    "author": "George S. Patton"
  },
  {
    "text": "El dolor y el sufrimiento son siempre inevitables para una gran inteligencia y un corazón profundo.",
    "author": "Fiódor Dostoyevski"
  },
  {
    "text": "Un mar en calma nunca hizo a un marinero experto.",
    "author": "Franklin D. Roosevelt"
  },
  {
    "text": "No son las cosas que nos pasan las que nos perturban, sino nuestras opiniones sobre las cosas que nos pasan.",
    "author": "Epicteto"
  },
  {
    "text": "El coraje no es la ausencia de miedo, sino el triunfo sobre él. El hombre valiente no es el que no siente miedo, sino el que conquista ese miedo.",
    "author": "Nelson Mandela"
  },
  {
    "text": "Si te derrumbas en el día de la angustia, tu fuerza es realmente pequeña.",
    "author": "Salomón"
  },
  {
    "text": "Sé como el promontorio contra el que rompen continuamente las olas; se mantiene firme y doma la furia del agua a su alrededor.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Nadie puede herirte sin tu consentimiento; el daño real comienza en el momento en que tú decides sentirte herido.",
    "author": "Marco Aurelio"
  },
  {
    "text": "Las mentes grandes tienen propósitos; las demás solo tienen deseos.",
    "author": "Washington Irving"
  },
  {
    "text": "Prefiero morir de pie que vivir siempre arrodillado ante mis propios miedos.",
    "author": "Emiliano Zapata"
  },
  {
    "text": "La cueva en la que temes entrar contiene el tesoro que buscas.",
    "author": "Joseph Campbell"
  },
  {
    "text": "La resistencia se construye en soledad, cuando no hay aplausos y tu único testigo es tu propia conciencia.",
    "author": "David Goggins"
  },
  {
    "text": "Lo que niegas te somete. Lo que aceptas te transforma.",
    "author": "Carl Gustav Jung"
  },
  {
    "text": "La paciencia y la perseverancia tienen un efecto mágico ante el cual las dificultades desaparecen y los obstáculos se desvanecen.",
    "author": "John Quincy Adams"
  },
  {
    "text": "Nunca te quejes, nunca des explicaciones. Resuelve el problema y sigue adelante.",
    "author": "Benjamin Disraeli"
  },
  {
    "text": "El carácter no se puede desarrollar en la facilidad y la tranquilidad. Solo a través de la experiencia de la prueba y el sufrimiento se puede fortalecer el alma.",
    "author": "Helen Keller"
  },
  {
    "text": "Un guerrero acepta la derrota como una lección, jamás como una identidad.",
    "author": "Miyamoto Musashi"
  },
  {
    "text": "El pesimista se queja del viento; el optimista espera que cambie; el realista ajusta las velas.",
    "author": "William Arthur Ward"
  },
  {
    "text": "Domina tus pasiones para que tus pasiones no te destruyan a ti.",
    "author": "Epicteto"
  },
  {
    "text": "El talento sin trabajo duro no es nada.",
    "author": "Cristiano Ronaldo"
  },
  {
    "text": "La fuerza no proviene de ganar. Tus luchas desarrollan tus fortalezas. Cuando atraviesas dificultades y decides no rendirte, eso es fuerza.",
    "author": "Arnold Schwarzenegger"
  },
  {
    "text": "El futuro pertenece a aquellos que aprenden más habilidades y las combinan de maneras creativas.",
    "author": "Robert Greene"
  },
  {
    "text": "El dolor más reflexión es igual a progreso.",
    "author": "Ray Dalio"
  },
  {
    "text": "Solo los paranoicos sobreviven. La complacencia es el preludio de la caída.",
    "author": "Andrew S. Grove"
  },
  {
    "text": "En cinco años serás exactamente la misma persona que eres hoy, excepto por los libros que leas, las personas de las que te rodees y los hábitos que adoptes.",
    "author": "Charlie 'Tremendous' Jones"
  },
  {
    "text": "Si no te da vergüenza quién eras el año pasado, no estás aprendiendo ni creciendo lo suficiente.",
    "author": "Alain de Botton"
  },
  {
    "text": "Juega juegos a largo plazo con personas a largo plazo. Todos los retornos en la vida, ya sea en riqueza, relaciones o conocimiento, provienen del interés compuesto.",
    "author": "Naval Ravikant"
  },
  {
    "text": "Las cadenas de los malos hábitos son generalmente demasiado pequeñas para sentirlas hasta que son demasiado fuertes para romperlas.",
    "author": "Samuel Johnson"
  },
  {
    "text": "Quien quiere aprender a volar un día, debe primero aprender a ponerse de pie, caminar, correr y trepar; no se puede volar de golpe.",
    "author": "Friedrich Nietzsche"
  },
  {
    "text": "Ningún hombre puede mandar bien si antes no ha aprendido a obedecer con disciplina.",
    "author": "Aristóteles"
  },
  {
    "text": "El verdadero liderazgo no trata de títulos, cargos o jerarquías. Trata de una vida que influye en otra a través del ejemplo.",
    "author": "John C. Maxwell"
  },
  {
    "text": "El ego es el enemigo de lo que quieres y de lo que tienes: de dominar un oficio, de la verdadera visión creativa, de trabajar bien con los demás, de construir lealtad y apoyo.",
    "author": "Ryan Holiday"
  },
  {
    "text": "Si eres la persona más inteligente de la habitación, estás en la habitación equivocada.",
    "author": "Richard Feynman"
  },
  {
    "text": "Acostúmbrate a hacer las cosas bien incluso cuando nadie esté auditando tu trabajo; la integridad es el cimiento de la maestría.",
    "author": "Henry Ford"
  },
  {
    "text": "Los ganadores no tienen miedo de perder. Pero los perdedores sí. El fracaso es parte del proceso del éxito; la gente que evita el fracaso también evita el éxito.",
    "author": "Robert Kiyosaki"
  },
  {
    "text": "La única forma de ganar una discusión es evitándola; la única forma de ganar respeto es demostrándolo con hechos.",
    "author": "Dale Carnegie"
  },
  {
    "text": "Cuanto más aprendes, más ganas; pero primero debes pagar el precio de la ignorancia vencida.",
    "author": "Warren Buffett"
  },
  {
    "text": "Aquel que no es lo suficientemente valiente como para tomar riesgos no logrará nada en la vida.",
    "author": "Muhammad Ali"
  },
  {
    "text": "La mediocridad no conoce nada superior a sí misma, pero el talento reconoce instantáneamente al genio y al esfuerzo.",
    "author": "Arthur Conan Doyle"
  },
  {
    "text": "No tengas miedo de ir despacio; ten miedo únicamente de quedarte quieto.",
    "author": "Confucio"
  },
  {
    "text": "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el valor para continuar.",
    "author": "Winston Churchill"
  },
  {
    "text": "La educación formal te dará para ganarte la vida; la autoeducación te dará una fortuna y libertad.",
    "author": "Jim Rohn"
  },
  {
    "text": "Acuéstate cada día siendo un poco más sabio de lo que eras cuando te despertaste.",
    "author": "Charlie Munger"
  },
  {
    "text": "La preparación rigurosa vence al talento improvisado nueve de cada diez veces.",
    "author": "Bill Belichick"
  },
  {
    "text": "Si quieres conquistar el miedo, no te quedes sentado en casa pensando en ello. Sal y ponte en acción.",
    "author": "Dale Carnegie"
  },
  {
    "text": "Un hombre sin un propósito claro es como un barco sin timón: un vagabundo, una nada, un nadie.",
    "author": "Thomas Carlyle"
  },
  {
    "text": "Nunca subestimes el poder de la consistencia aburrida: hacer lo básico de manera impecable todos los días.",
    "author": "Alex Hormozi"
  },
  {
    "text": "No se trata de los recursos que tienes, sino de qué tan ingenioso eres con lo que tienes.",
    "author": "Tony Robbins"
  },
  {
    "text": "La suerte es lo que sucede cuando la preparación se encuentra con la oportunidad.",
    "author": "Séneca"
  },
  {
    "text": "Para alcanzar la maestría debes enamorarte del aburrimiento de repetir los fundamentos mil veces.",
    "author": "Robert Greene"
  },
  {
    "text": "Quien controla a otros puede ser poderoso, pero quien se ha dominado a sí mismo es aún más poderoso.",
    "author": "Lao-Tsé"
  },
  {
    "text": "Haz lo que pocos están dispuestos a hacer hoy, para poder vivir mañana como pocos pueden vivir.",
    "author": "Dave Ramsey"
  },
  {
    "text": "El hombre prudente busca lo que hay en él mismo; el necio busca la aprobación en los demás.",
    "author": "Confucio"
  },
  {
    "text": "La victoria está reservada para aquellos que están dispuestos a pagar su precio en sudor y estudio.",
    "author": "Sun Tzu"
  },
  {
    "text": "El hombre que teme al sufrimiento ya sufre por lo que teme.",
    "author": "Michel de Montaigne"
  },
  {
    "text": "La excelencia nunca es un accidente. Siempre es el resultado de una alta intención, un esfuerzo sincero y una ejecución inteligente.",
    "author": "Aristóteles"
  },
  {
    "text": "Nunca permitas que una buena crisis se desperdicie; es tu mejor campo de entrenamiento.",
    "author": "Winston Churchill"
  },
  {
    "text": "Si no estás dispuesto a arriesgar lo inusual, tendrás que conformarte con lo ordinario.",
    "author": "Jim Rohn"
  },
  {
    "text": "El verdadero fracaso no es caer, es quedarse en el suelo culpando a la piedra.",
    "author": "Baltasar Gracián"
  },
  {
    "text": "Trabaja en silencio, perfecciona tu técnica en las sombras y deja que tu competencia se entere cuando ya sea demasiado tarde para alcanzarte.",
    "author": "Robert Greene"
  },
  {
    "text": "Un líder es un repartidor de esperanza y un ejemplo viviente de disciplina bajo presión.",
    "author": "Napoleón Bonaparte"
  },
  {
    "text": "No le pidas a la vida que baje la montaña; pídele a tus piernas que aprendan a subirla.",
    "author": "Epicteto"
  },
  {
    "text": "El conocimiento no es poder hasta que se aplica con determinación.",
    "author": "Dale Carnegie"
  },
  {
    "text": "Cuando sientas ganas de rendirte, recuerda por qué empezaste y quién depende de que no falles.",
    "author": "Jocko Willink"
  },
  {
    "text": "La grandeza exige que sacrifiques lo que eres hoy por lo que puedes llegar a ser mañana.",
    "author": "Carl Gustav Jung"
  },
  {
    "text": "Descansa al final, no en la mitad del camino.",
    "author": "Kobe Bryant"
  },
  {
    "text": "Empieza de una vez a ser quien vas a ser.",
    "author": "Séneca"
  }
];
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

  function getRepeatWeekEndISO(baseIso = getTodayISO()) {
    const weekday = new Date(`${baseIso}T00:00:00`).getDay();
    return addDaysISO(baseIso, (7 - weekday) % 7);
  }

  function getTaskRepeatDays(task) {
    const selected = Array.isArray(task && task.repeatDays)
      ? Array.from(new Set(task.repeatDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b)
      : [];
    if (selected.length) return selected;
    if (task && task.frequency === "daily") return [0, 1, 2, 3, 4, 5, 6];
    if (task && task.frequency === "weekdays") return [1, 2, 3, 4, 5];
    if (task && task.frequency === "weekends") return [0, 6];
    return [];
  }

  function getNextRepeatDateOnOrAfter(baseIso, repeatDays, endIso = null) {
    const selected = Array.from(new Set((Array.isArray(repeatDays) ? repeatDays : [])
      .map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)));
    if (!selected.length) return null;
    for (let offset = 0; offset <= 7; offset++) {
      const candidate = addDaysISO(baseIso, offset);
      if (endIso && candidate > endIso) return null;
      const weekday = new Date(`${candidate}T00:00:00`).getDay();
      if (selected.includes(weekday)) return candidate;
    }
    return null;
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
      focusPlan: { date: "", byBox: {}, updatedAt: 0 },
      completionLog: [],
      dismissedTaskSuggestionsByBox: {},
      taskMemoryByBox: {},
      birthdays: [],
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
      learningGoals: { daily: {}, weekly: {} },
      focusPlan: { date: "", byBox: {}, updatedAt: 0 },
      completionLog: [],
      dismissedTaskSuggestionsByBox: {},
      birthdays: [],
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
    selectedTaskIds: new Set(),
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
    focusRevealTaskId: null,
    quotes: QUOTES_POOL.slice(),
    currentQuoteIndex: 0,
    quoteTimer: null,
    reschedulingTaskId: null,
    reschedulingTaskIds: [],
    repeatingTaskId: null,
    selectedRepeatDays: [],
    selectedRepeatDuration: "forever",
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
  let sharedAudioMasterGain = null;
  const UI_SOUND_VOLUME_BOOST = 1.0; // Neutral gain: let the device/browser media volume be the master control.
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
    // Route all effects through one master gain so overall volume is consistent.
    gain.connect(sharedAudioMasterGain || ctx.destination);

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
      if (!sharedAudioMasterGain) {
        sharedAudioMasterGain = ctx.createGain();
        sharedAudioMasterGain.gain.setValueAtTime(UI_SOUND_VOLUME_BOOST, ctx.currentTime);
        sharedAudioMasterGain.connect(ctx.destination);
      }

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

  function normalizeLearningGoalsData(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const normalizeRecords = (records, acceptedStatuses) => {
      const result = {};
      if (!records || typeof records !== "object" || Array.isArray(records)) return result;
      Object.entries(records).forEach(([key, value]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== "object") return;
        const goal = String(value.goal || "").trim().slice(0, 220);
        const notes = String(value.notes || "").slice(0, 1600);
        const status = acceptedStatuses.includes(value.status) ? value.status : "pending";
        if (!goal) return;
        result[key] = {
          date: key,
          goal,
          notes,
          status,
          updatedAt: Number(value.updatedAt || 0)
        };
      });
      return result;
    };
    return {
      daily: normalizeRecords(source.daily, ["pending", "completed", "missed"]),
      weekly: normalizeRecords(source.weekly, ["pending", "in_progress", "completed", "missed"])
    };
  }

  function normalizeFocusPlanData(raw, tasks = []) {
    const source = raw && typeof raw === "object" ? raw : {};
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(source.date || "")) ? String(source.date) : "";
    const taskById = new Map((Array.isArray(tasks) ? tasks : []).map(task => [String(task.id), task]));
    const byBox = {};

    const normalizeSlots = (rawSlots, boxId, fallbackUpdatedAt) => {
      const rawIds = Array.isArray(rawSlots) ? rawSlots
        : (rawSlots && Array.isArray(rawSlots.taskIds) ? rawSlots.taskIds : []);
      const seen = new Set();
      const taskIds = [0, 1, 2].map(index => {
        const id = String(rawIds[index] || "").trim();
        if (!id || seen.has(id)) return "";
        const task = taskById.get(id);
        if (task && String(task.boxId) !== String(boxId)) return "";
        seen.add(id);
        return id;
      });
      const updatedAt = rawSlots && !Array.isArray(rawSlots) && Number.isFinite(Number(rawSlots.updatedAt))
        ? Number(rawSlots.updatedAt) : fallbackUpdatedAt;
      return { taskIds, updatedAt };
    };

    const sourceByBox = source.byBox && typeof source.byBox === "object" && !Array.isArray(source.byBox)
      ? source.byBox : {};
    Object.entries(sourceByBox).forEach(([rawBoxId, rawSlots]) => {
      const boxId = String(rawBoxId || "").trim();
      if (!boxId) return;
      const normalized = normalizeSlots(rawSlots, boxId, Number(source.updatedAt) || 0);
      if (normalized.taskIds.some(Boolean) || normalized.updatedAt > 0) byBox[boxId] = normalized;
    });

    // Migrate the previous app-wide taskIds into each task's own casilla.
    if (Object.keys(sourceByBox).length === 0 && Array.isArray(source.taskIds)) {
      source.taskIds.slice(0, 3).forEach((rawId, slot) => {
        const id = String(rawId || "").trim();
        const task = taskById.get(id);
        if (!id || !task || !task.boxId) return;
        const boxId = String(task.boxId);
        const target = byBox[boxId] || { taskIds: ["", "", ""], updatedAt: 0 };
        if (!target.taskIds.includes(id) && !target.taskIds[slot]) target.taskIds[slot] = id;
        target.updatedAt = Math.max(target.updatedAt, Number(source.updatedAt) || 0);
        byBox[boxId] = target;
      });
    }

    return {
      date,
      byBox,
      updatedAt: Math.max(
        Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : 0,
        ...Object.values(byBox).map(entry => Number(entry.updatedAt) || 0),
        0
      )
    };
  }

  function mergeFocusPlanData(leftRaw, rightRaw, leftTasks = [], rightTasks = []) {
    const left = normalizeFocusPlanData(leftRaw, leftTasks);
    const right = normalizeFocusPlanData(rightRaw, rightTasks);
    if (!left.date) return right;
    if (!right.date) return left;
    if (left.date !== right.date) return left.date > right.date ? left : right;

    const byBox = {};
    const boxIds = new Set([...Object.keys(left.byBox), ...Object.keys(right.byBox)]);
    boxIds.forEach(boxId => {
      const a = left.byBox[boxId], b = right.byBox[boxId];
      if (!a) byBox[boxId] = b;
      else if (!b) byBox[boxId] = a;
      else byBox[boxId] = Number(b.updatedAt || 0) > Number(a.updatedAt || 0) ? b : a;
    });
    return {
      date: left.date,
      byBox,
      updatedAt: Math.max(Number(left.updatedAt) || 0, Number(right.updatedAt) || 0)
    };
  }

  // Durable completion ledger: it keeps a snapshot even when a one-off task is later removed
  // or a recurring task resets at midnight.
  const COMPLETION_LOG_LIMIT = 2000;

  function completionEventId(taskId, date) {
    return `${String(taskId || "")}::${String(date || "")}`;
  }

  function normalizeCompletionLog(raw) {
    const byId = new Map();
    (Array.isArray(raw) ? raw : []).forEach(entry => {
      if (!entry || typeof entry !== "object") return;
      const taskId = String(entry.taskId || "").trim();
      const completedDate = String(entry.completedDate || "").slice(0, 10);
      if (!taskId || !/^\d{4}-\d{2}-\d{2}$/.test(completedDate)) return;
      const id = String(entry.id || completionEventId(taskId, completedDate));
      const fallbackTime = new Date(`${completedDate}T12:00:00`).getTime();
      const rawCompletedAt = Number(entry.completedAt);
      const rawUpdatedAt = Number(entry.updatedAt);
      const event = {
        id,
        taskId,
        title: String(entry.title || "Tarea sin título"),
        boxId: String(entry.boxId || ""),
        boxName: String(entry.boxName || "Casilla no disponible"),
        completedDate,
        completedAt: Number.isFinite(rawCompletedAt) && rawCompletedAt > 0 ? rawCompletedAt : fallbackTime,
        updatedAt: Number.isFinite(rawUpdatedAt) && rawUpdatedAt > 0
          ? rawUpdatedAt
          : (Number.isFinite(rawCompletedAt) && rawCompletedAt > 0 ? rawCompletedAt : fallbackTime),
        frequency: String(entry.frequency || "once"),
        reversed: Boolean(entry.reversed),
        timeKnown: entry.timeKnown !== false
      };
      const previous = byId.get(id);
      if (!previous || event.updatedAt >= previous.updatedAt) byId.set(id, event);
    });
    return Array.from(byId.values())
      .sort((a, b) => Number(b.completedAt || 0) - Number(a.completedAt || 0))
      .slice(0, COMPLETION_LOG_LIMIT);
  }

  function mergeCompletionLogs(primaryRaw, secondaryRaw) {
    // When the same task/day record exists on both devices, the latest edit wins.
    return normalizeCompletionLog([
      ...normalizeCompletionLog(secondaryRaw),
      ...normalizeCompletionLog(primaryRaw)
    ]);
  }

  function normalizeSuggestionMatch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeDismissedTaskSuggestions(raw) {
    const result = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
    Object.entries(raw).forEach(([rawKey, rawTitles]) => {
      const key = String(rawKey || "").trim();
      if (!key || !Array.isArray(rawTitles)) return;
      const seen = new Set();
      const titles = [];
      rawTitles.forEach(rawTitle => {
        const title = String(rawTitle || "").trim();
        const normalized = normalizeSuggestionMatch(title);
        if (!title || !normalized || seen.has(normalized)) return;
        seen.add(normalized);
        titles.push(title);
      });
      if (titles.length) result[key] = titles.slice(-500);
    });
    return result;
  }

  function mergeDismissedTaskSuggestions(primaryRaw, secondaryRaw) {
    const merged = {};
    [secondaryRaw, primaryRaw].forEach(raw => {
      const clean = normalizeDismissedTaskSuggestions(raw);
      Object.entries(clean).forEach(([key, titles]) => {
        if (!merged[key]) merged[key] = [];
        const seen = new Set(merged[key].map(normalizeSuggestionMatch));
        titles.forEach(title => {
          const normalized = normalizeSuggestionMatch(title);
          if (normalized && !seen.has(normalized)) {
            merged[key].push(title);
            seen.add(normalized);
          }
        });
        if (merged[key].length > 500) merged[key] = merged[key].slice(-500);
      });
    });
    return merged;
  }

  // View preferences (expand/collapse) belong to this device, never to the shared task dataset.
  function readLocalViewState() {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.VIEW_STATE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        version: 1,
        collapsedByBoxId: parsed.collapsedByBoxId && typeof parsed.collapsedByBoxId === "object"
          ? parsed.collapsedByBoxId
          : {},
        completedBoxCollapsed: Boolean(parsed.completedBoxCollapsed)
      };
    } catch (e) {
      return null;
    }
  }

  function persistLocalViewState() {
    const collapsedByBoxId = {};
    (appState.data.boxes || []).forEach(box => {
      collapsedByBoxId[String(box.id)] = Boolean(box.collapsed);
    });
    safeStorage.setItem(STORAGE_KEYS.VIEW_STATE, JSON.stringify({
      version: 1,
      collapsedByBoxId,
      completedBoxCollapsed: Boolean(appState.data.completedBoxCollapsed)
    }));
  }

  function applyLocalViewStateToData(data, fallbackData = null, initializeFromData = false) {
    if (!data || !Array.isArray(data.boxes)) return data;
    let viewState = readLocalViewState();
    if (!viewState) {
      const seed = initializeFromData ? data : fallbackData;
      if (seed && Array.isArray(seed.boxes)) {
        const collapsedByBoxId = {};
        seed.boxes.forEach(box => {
          collapsedByBoxId[String(box.id)] = Boolean(box.collapsed);
        });
        viewState = {
          version: 1,
          collapsedByBoxId,
          completedBoxCollapsed: Boolean(seed.completedBoxCollapsed)
        };
        safeStorage.setItem(STORAGE_KEYS.VIEW_STATE, JSON.stringify(viewState));
      }
    }

    if (viewState) {
      data.boxes.forEach(box => {
        const id = String(box.id);
        box.collapsed = Object.prototype.hasOwnProperty.call(viewState.collapsedByBoxId, id)
          ? Boolean(viewState.collapsedByBoxId[id])
          : false;
      });
      data.completedBoxCollapsed = Boolean(viewState.completedBoxCollapsed);
    }
    return data;
  }

  function buildSyncPayload(rawData) {
    const source = rawData && typeof rawData === "object" ? rawData : {};
    const { completedBoxCollapsed, ...syncableData } = source;
    return {
      ...syncableData,
      boxes: (Array.isArray(source.boxes) ? source.boxes : []).map(box => {
        const { collapsed, ...syncableBox } = box || {};
        return syncableBox;
      })
    };
  }

  function normalizeBirthdayRecord(raw, index = 0) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || `birthday_${Date.now()}_${index}`).trim();
    const name = String(raw.name || "").trim().slice(0, 100);
    const month = Number(raw.month);
    const day = Number(raw.day);
    const maxDay = month === 2 ? 29 : (month >= 1 && month <= 12 ? new Date(2024, month, 0).getDate() : 0);
    if (!id || !name || !Number.isInteger(month) || month < 1 || month > 12 ||
        !Number.isInteger(day) || day < 1 || day > maxDay) return null;
    const yearInput = raw.birthYear === "" || raw.birthYear == null ? null : Number(raw.birthYear);
    const birthYear = Number.isInteger(yearInput) && yearInput >= 1000 && yearInput <= 9999 ? yearInput : null;
    return {
      id,
      name,
      month,
      day,
      birthYear,
      notes: String(raw.notes || "").trim().slice(0, 500),
      createdAt: Number(raw.createdAt || raw.updatedAt || 0),
      updatedAt: Number(raw.updatedAt || 0),
      deleted: Boolean(raw.deleted)
    };
  }

  function normalizeBirthdays(raw) {
    const byId = new Map();
    (Array.isArray(raw) ? raw : []).forEach((entry, index) => {
      const birthday = normalizeBirthdayRecord(entry, index);
      if (!birthday) return;
      const previous = byId.get(birthday.id);
      if (!previous || birthday.updatedAt >= previous.updatedAt) byId.set(birthday.id, birthday);
    });
    return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  function mergeBirthdays(primaryRaw, secondaryRaw) {
    const merged = new Map();
    // Apply secondary first; the primary record wins timestamp ties.
    normalizeBirthdays(secondaryRaw).forEach(entry => merged.set(entry.id, entry));
    normalizeBirthdays(primaryRaw).forEach(entry => {
      const current = merged.get(entry.id);
      if (!current || Number(entry.updatedAt || 0) >= Number(current.updatedAt || 0)) merged.set(entry.id, entry);
    });
    return Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  function normalizeDataPayload(raw) {
    if (!raw || typeof raw !== "object") return null;
    const today = getTodayISO();
    const boxesRaw = Array.isArray(raw.boxes) ? raw.boxes : [];
    const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : [];

    // A box ID must render only once. Older sync merges could store two names for
    // the same ID after a rename, causing the same tasks to appear in two cards.
    const boxesById = new Map();
    boxesRaw.forEach((b, idx) => {
      const box = {
        ...b,
        id: String(b.id || `box_${Date.now()}_${idx}`),
        name: String(b.name || b.title || "CASILLA").trim().toUpperCase(),
        color: String(b.color || "#2563eb"),
        emoji: String(b.emoji || "").trim().slice(0, 16),
        collapsed: Boolean(b.collapsed),
        order: typeof b.order === "number" ? b.order : idx
      };
      const existing = boxesById.get(box.id);
      if (!existing) {
        boxesById.set(box.id, box);
        return;
      }
      const existingKey = canonicalBoxKey(existing.name);
      const candidateKey = canonicalBoxKey(box.name);
      let preferred = existing;
      if (existingKey === "oficina" && candidateKey === "asesortelefonico") {
        preferred = box;
      } else if (candidateKey === "oficina" && existingKey === "asesortelefonico") {
        preferred = existing;
      } else if (Number(box.updatedAt || 0) > Number(existing.updatedAt || 0)) {
        preferred = box;
      } else if (Number(existing.updatedAt || 0) > Number(box.updatedAt || 0)) {
        preferred = existing;
      } else if (existing.bootstrapSeed === true && box.bootstrapSeed !== true) {
        preferred = box;
      } else if (box.bootstrapSeed === true && existing.bootstrapSeed !== true) {
        preferred = existing;
      }
      if (preferred === box) boxesById.set(box.id, box);
    });
    const boxes = Array.from(boxesById.values());

    const tasks = tasksRaw.map((t, idx) => {
      const due = String(t.dueDate || today);
      const freq = String(t.frequency || "once");
      // A future date on an ordinary task is a reschedule. A recurring task can also
      // have its next planned occurrence in the future without becoming a reprogrammed task.
      const isResched = Boolean(due > today && (Boolean(t.isRescheduled) || freq === "once"));
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
        noDeadline: Boolean(t.noDeadline && freq === "once"),
        frequency: freq,
        repeatDays: repDays,
        skippedDates: Array.isArray(t.skippedDates)
          ? Array.from(new Set(t.skippedDates.map(value => String(value || "").slice(0, 10)).filter(value => /^\\d{4}-\\d{2}-\\d{2}$/.test(value))))
          : [],
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
      learningGoals: normalizeLearningGoalsData(raw.learningGoals),
      focusPlan: normalizeFocusPlanData(raw.focusPlan, tasks),
      completionLog: normalizeCompletionLog(raw.completionLog),
      dismissedTaskSuggestionsByBox: normalizeDismissedTaskSuggestions(raw.dismissedTaskSuggestionsByBox),
      birthdays: normalizeBirthdays(raw.birthdays),
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

  function dismissTaskSuggestion(title, boxId) {
    const cleanTitle = String(title || "").trim();
    if (!cleanTitle || !boxId) return;
    const key = getBoxMemoryKey(boxId);
    const dismissed = normalizeDismissedTaskSuggestions(appState.data.dismissedTaskSuggestionsByBox);
    const existing = Array.isArray(dismissed[key]) ? dismissed[key] : [];
    if (!existing.some(item => normalizeSuggestionMatch(item) === normalizeSuggestionMatch(cleanTitle))) {
      dismissed[key] = [...existing, cleanTitle].slice(-500);
    }
    appState.data.dismissedTaskSuggestionsByBox = dismissed;
    saveData(true, `Ocultó la sugerencia «${cleanTitle}»`);
    showToast("Sugerencia eliminada");
  }

  function getTaskSuggestions(queryText, boxId) {
    const q = String(queryText || "").trim().toLowerCase();
    if (!q || !boxId) return [];

    const key = getBoxMemoryKey(boxId);
    const boxList = (appState.taskMemory && Array.isArray(appState.taskMemory[key]))
      ? appState.taskMemory[key]
      : [];
    const dismissedTitles = new Set(
      (appState.data.dismissedTaskSuggestionsByBox && Array.isArray(appState.data.dismissedTaskSuggestionsByBox[key])
        ? appState.data.dismissedTaskSuggestionsByBox[key]
        : []).map(normalizeSuggestionMatch)
    );

    const prefixMatches = [];
    const containsMatches = [];
    const seen = new Set();

    boxList.forEach(item => {
      const text = String(item || "").trim();
      const lower = text.toLowerCase();
      if (!text || dismissedTitles.has(normalizeSuggestionMatch(text)) || lower === q || seen.has(lower)) return;
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
    appState.data = applyLocalViewStateToData(normalizeDataPayload(JSON.parse(last.snap)), appState.data);
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
    appState.data = applyLocalViewStateToData(normalizeDataPayload(JSON.parse(next.snap)), appState.data);
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
  let syncRecoveryIntervalId = null;
  let lastSyncCatchupAt = 0;
  let lastCloudPullCompletedAt = 0;
  let lastCloudBootstrapError = "";
  let syncBroadcastChannel = null;
  let realtimeSyncStatus = "Canal pendiente de conexión";
  function setRealtimeSyncStatus(status) {
    realtimeSyncStatus = String(status || "Estado desconocido");
    const details = document.getElementById("sync-realtime-status-details");
    if (details) details.textContent = `Canal en tiempo real: ${realtimeSyncStatus}`;
  }
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
      cc: 0,
      sv: 1,
      dt: Array.isArray(d.deletedTaskIds) ? d.deletedTaskIds : [],
      db: Array.isArray(d.deletedBoxIds) ? d.deletedBoxIds : [],
      lg: normalizeLearningGoalsData(d.learningGoals),
      fp: normalizeFocusPlanData(d.focusPlan, d.tasks),
      cl: normalizeCompletionLog(d.completionLog),
      ds: normalizeDismissedTaskSuggestions(d.dismissedTaskSuggestionsByBox),
      bd: normalizeBirthdays(d.birthdays),
      b: d.boxes.map(x => [x.id, String(x.name || "").toUpperCase(), x.color || "#2563eb", 0, x.order || 0, String(x.emoji || ""), Number(x.updatedAt || 0)]),
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
        x.order || 0,
        x.repeatUntil || "",
        x.overdueSince || "",
        x.overdueCarryDate || "",
        Array.isArray(x.skippedDates) ? x.skippedDates : [],
        Number(x.updatedAt || 0),
        x.noDeadline ? 1 : 0
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
        collapsed: false,
        order: typeof arr[4] === "number" ? arr[4] : idx,
        emoji: String(arr[5] || ""),
        updatedAt: Number(arr[6] || 0)
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
        order: typeof arr[10] === "number" ? arr[10] : idx,
        repeatUntil: arr[11] || null,
        overdueSince: arr[12] || null,
        overdueCarryDate: arr[13] || null,
        skippedDates: Array.isArray(arr[14]) ? arr[14] : [],
        updatedAt: Number(arr[15] || 0),
        noDeadline: Boolean(arr[16])
      }));
      return normalizeDataPayload({
        boxes,
        tasks,
        monthlyCompletedBase: Number(parsed.m || 66),
        completedBoxCollapsed: false,
        deletedTaskIds: Array.isArray(parsed.dt) ? parsed.dt : [],
        deletedBoxIds: Array.isArray(parsed.db) ? parsed.db : [],
        learningGoals: normalizeLearningGoalsData(parsed.lg),
        focusPlan: normalizeFocusPlanData(parsed.fp, tasks),
        completionLog: normalizeCompletionLog(parsed.cl),
        dismissedTaskSuggestionsByBox: normalizeDismissedTaskSuggestions(parsed.ds),
        birthdays: normalizeBirthdays(parsed.bd),
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
      boxes: d.boxes.map(box => {
        const { collapsed, ...syncableBox } = box;
        return syncableBox;
      }),
      tasks: d.tasks,
      deletedTaskIds: d.deletedTaskIds.slice().sort(),
      deletedBoxIds: d.deletedBoxIds.slice().sort(),
      monthlyCompletedBase: d.monthlyCompletedBase,
      taskMemoryByBox: d.taskMemoryByBox || {},
      learningGoals: normalizeLearningGoalsData(d.learningGoals),
      focusPlan: normalizeFocusPlanData(d.focusPlan, d.tasks),
      history: d.history || {},
      completionLog: normalizeCompletionLog(d.completionLog),
      dismissedTaskSuggestionsByBox: normalizeDismissedTaskSuggestions(d.dismissedTaskSuggestionsByBox),
      birthdays: normalizeBirthdays(d.birthdays),
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

  function mergeLearningGoalsData(primaryRaw, secondaryRaw) {
    const primary = normalizeLearningGoalsData(primaryRaw);
    const secondary = normalizeLearningGoalsData(secondaryRaw);
    const mergeRecords = (first, second) => {
      const merged = { ...second };
      Object.entries(first).forEach(([key, record]) => {
        const other = merged[key];
        if (!other || Number(record.updatedAt || 0) >= Number(other.updatedAt || 0)) merged[key] = record;
      });
      return merged;
    };
    return {
      daily: mergeRecords(primary.daily, secondary.daily),
      weekly: mergeRecords(primary.weekly, secondary.weekly)
    };
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
    const primaryTime = Number(primary.updatedAt || 0);
    const secondaryTime = Number(secondary.updatedAt || 0);

    const ignoreUnversionedSecondary = primaryTime > 0 && secondaryTime <= 0;
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

    // Stable box IDs are the source of truth. Names can change on one device before
    // another device has pulled the edit; matching by name first creates two cards
    // with the same ID, which makes every task appear twice.
    function chooseSameIdentityBox(existing, candidate, existingSourceUpdatedAt = 0, candidateSourceUpdatedAt = 0) {
      const existingKey = canonicalBoxKey(existing && existing.name);
      const candidateKey = canonicalBoxKey(candidate && candidate.name);
      // The user confirmed that ASESOR TELEFÓNICO is the renamed OFICINA box.
      if (existingKey === "oficina" && candidateKey === "asesortelefonico") return candidate;
      if (candidateKey === "oficina" && existingKey === "asesortelefonico") return existing;
      const existingUpdatedAt = Number(existing && existing.updatedAt || existingSourceUpdatedAt || 0);
      const candidateUpdatedAt = Number(candidate && candidate.updatedAt || candidateSourceUpdatedAt || 0);
      if (existingUpdatedAt !== candidateUpdatedAt) return candidateUpdatedAt > existingUpdatedAt ? candidate : existing;
      if (existing && existing.bootstrapSeed === true && candidate && candidate.bootstrapSeed !== true) return candidate;
      if (candidate && candidate.bootstrapSeed === true && existing && existing.bootstrapSeed !== true) return existing;
      return existing || candidate;
    }

    const primaryBoxesById = new Map();
    (primary.boxes || []).forEach(box => {
      if (!box || box.id == null) return;
      const id = String(box.id);
      if (deletedBoxes.has(id)) return;
      const existing = primaryBoxesById.get(id);
      primaryBoxesById.set(id, existing ? chooseSameIdentityBox(existing, box, primaryTime, primaryTime) : box);
    });
    const secondaryBoxesById = new Map();
    (secondary.boxes || []).forEach(box => {
      if (!box || box.id == null) return;
      const id = String(box.id);
      if (deletedBoxes.has(id)) return;
      const existing = secondaryBoxesById.get(id);
      secondaryBoxesById.set(id, existing ? chooseSameIdentityBox(existing, box, secondaryTime, secondaryTime) : box);
    });

    const canonicalBoxesById = new Map();
    const primaryIdToCanonical = new Map();
    const secondaryIdToCanonical = new Map();

    // First reconcile boxes that share the exact same permanent ID, even when their names differ.
    primaryBoxesById.forEach((box, id) => {
      const other = secondaryBoxesById.get(id);
      const chosen = other ? chooseSameIdentityBox(box, other, primaryTime, secondaryTime) : box;
      canonicalBoxesById.set(id, chosen);
      primaryIdToCanonical.set(id, id);
      if (other) secondaryIdToCanonical.set(id, id);
    });

    // Preserve the legacy name-based reconciliation only for different IDs with the same name.
    // This still folds duplicate bootstrap casillas created independently on older devices.
    const unmatchedPrimaryByName = new Map();
    primaryBoxesById.forEach((box, id) => {
      if (secondaryBoxesById.has(id)) return;
      const key = canonicalBoxKey(box.name);
      if (!unmatchedPrimaryByName.has(key)) unmatchedPrimaryByName.set(key, box);
    });
    const unmatchedSecondaryByName = new Map();
    secondaryBoxesById.forEach((box, id) => {
      if (primaryBoxesById.has(id)) return;
      const key = canonicalBoxKey(box.name);
      if (!unmatchedSecondaryByName.has(key)) unmatchedSecondaryByName.set(key, box);
    });

    unmatchedPrimaryByName.forEach((primaryBox, key) => {
      const secondaryBox = unmatchedSecondaryByName.get(key);
      if (!secondaryBox) return;
      let chosen = primaryBox;
      if (primaryBox.bootstrapSeed === true && secondaryBox.bootstrapSeed !== true && !secondaryIsSeed) chosen = secondaryBox;
      else chosen = chooseSameIdentityBox(primaryBox, secondaryBox, primaryTime, secondaryTime);
      const canonicalId = String(chosen.id);
      canonicalBoxesById.delete(String(primaryBox.id));
      canonicalBoxesById.delete(String(secondaryBox.id));
      canonicalBoxesById.set(canonicalId, chosen);
      primaryIdToCanonical.set(String(primaryBox.id), canonicalId);
      secondaryIdToCanonical.set(String(secondaryBox.id), canonicalId);
    });

    // Keep unmatched secondary boxes unless they are unversioned seed data that should be ignored.
    secondaryBoxesById.forEach((box, id) => {
      if (primaryBoxesById.has(id)) return;
      if (unmatchedPrimaryByName.has(canonicalBoxKey(box.name))) return;
      if (ignoreUnversionedSecondary) return;
      if (box.bootstrapSeed === true && !primaryIsSeed) return;
      if (!canonicalBoxesById.has(id)) canonicalBoxesById.set(id, box);
      secondaryIdToCanonical.set(id, id);
    });

    // Any primary box that was not paired by name retains its own ID.
    primaryBoxesById.forEach((box, id) => {
      if (!primaryIdToCanonical.has(id)) primaryIdToCanonical.set(id, id);
      if (!canonicalBoxesById.has(id) && !deletedBoxes.has(id)) canonicalBoxesById.set(id, box);
    });

    // Ensure both datasets resolve to the surviving stable box ID.
    secondaryBoxesById.forEach((box, id) => {
      if (!secondaryIdToCanonical.has(id) && canonicalBoxesById.has(id)) secondaryIdToCanonical.set(id, id);
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
        let chosenItem = useOtherAuthoritativeItem ? otherItem : item;
        if (otherItem && !useOtherAuthoritativeItem) {
          const primaryItemVersion = Number(item.updatedAt || primaryTime || 0);
          const secondaryItemVersion = Number(otherItem.updatedAt || secondaryTime || 0);
          if (secondaryItemVersion > primaryItemVersion) chosenItem = otherItem;
        }
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
      task => Array.from(canonicalBoxesById.values()).some(box => String(box.id) === String(task.boxId))
    );

    const usedCanonicalBoxIds = new Set(tasks.map(task => String(task.boxId)));
    const boxes = Array.from(canonicalBoxesById.values()).filter(box =>
      !deletedBoxes.has(String(box.id)) &&
      (usedCanonicalBoxIds.has(String(box.id)) || !box.bootstrapSeed || canonicalBoxesById.size <= 7)
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
      completionLog: mergeCompletionLogs(primary.completionLog, secondary.completionLog),
      dismissedTaskSuggestionsByBox: mergeDismissedTaskSuggestions(
        primary.dismissedTaskSuggestionsByBox,
        secondary.dismissedTaskSuggestionsByBox
      ),
      birthdays: mergeBirthdays(primary.birthdays, secondary.birthdays),
      settings: { ...(secondary.settings || {}), ...(primary.settings || {}) },
      learningGoals: mergeLearningGoalsData(primary.learningGoals, secondary.learningGoals),
      focusPlan: mergeFocusPlanData(primary.focusPlan, secondary.focusPlan, primary.tasks, secondary.tasks),
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
    let merged;
    try {
      merged = mergeSyncDatasets(local, norm);
    } catch (error) {
      setRealtimeSyncStatus(`Error al conciliar: ${String(error && error.message || error).slice(0, 150)}`);
      return false;
    }
    if (!merged) return false;
    applyLocalViewStateToData(merged, local);

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
    renderLearningGoalsPanel();
    // Keep the count fresh even with the calendar closed; redraw its contents when it is open.
    renderBirthdayUpcomingList();
    const birthdayModal = document.getElementById("modal-birthdays");
    if (birthdayModal && birthdayModal.classList.contains("open")) renderBirthdayCalendar();
    const mergedMatchesIncoming = syncFingerprint(merged) === syncFingerprint(norm);
    const syncText = document.getElementById("sync-status-text");
    if (syncText) syncText.textContent = mergedMatchesIncoming ? "Sincronizado" : "Conciliando…";
    if (!mergedMatchesIncoming) pushCloudSync(false);
    if (showNotification) showToast("🔄 Datos fusionados sin perder tareas");
    return true;
  }

  let cloudPushTimer = null;
  let cloudPushInFlight = false;
  let cloudPushPending = false;
  let cloudPushPendingToast = false;
  let incomingSyncVerifyTimer = null;
  function scheduleIncomingSyncVerification() {
    if (incomingSyncVerifyTimer) clearTimeout(incomingSyncVerifyTimer);
    incomingSyncVerifyTimer = window.setTimeout(() => {
      incomingSyncVerifyTimer = null;
      if (cloudPullInFlight) {
        scheduleIncomingSyncVerification();
        return;
      }
      pullCloudSync(false, true);
    }, 450);
  }
  function pushCloudSync(forceImmediateToast = false) {
    if (!cloudSyncReady || cloudSyncReadyConfig !== getCloudSyncConfigKey()) {
      if (forceImmediateToast) showToast("Sincronización bloqueada por seguridad: primero hay que verificar la nube o usar «Rescatar y Subir Todo a Firebase».");
      const blockedSyncText = document.getElementById("sync-status-text");
      if (blockedSyncText) blockedSyncText.textContent = "Sin verificar";
      return;
    }
    if (syncBroadcastChannel) {
      try {
        syncBroadcastChannel.postMessage({
          deviceId: appState.deviceId,
          payload: buildSyncPayload(appState.data)
        });
      } catch (e) {}
    }
    if (!isCloudNetworkAllowed()) {
      const offlineSyncText = document.getElementById("sync-status-text");
      if (offlineSyncText) offlineSyncText.textContent = "Sin conexión";
      if (forceImmediateToast) showToast("Guardado localmente (Firebase en espera de red)");
      return;
    }
    const pendingSyncText = document.getElementById("sync-status-text");
    if (pendingSyncText) pendingSyncText.textContent = "Sincronizando…";
    if (cloudPushTimer) clearTimeout(cloudPushTimer);
    cloudPushTimer = window.setTimeout(async () => {
      cloudPushTimer = null;
      if (cloudPushInFlight) {
        cloudPushPending = true;
        cloudPushPendingToast = cloudPushPendingToast || forceImmediateToast;
        return;
      }
      cloudPushInFlight = true;
      try {
      const fullPayload = {
        ...buildSyncPayload(appState.data),
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
      let firestoreWriteStatus = "No se intentó la escritura";
      let rtdbWriteStatus = "URL no configurada";
      let streamWriteStatus = "No comprobado";
      const describeResponseError = raw => {
        const source = String(raw || "").trim();
        if (!source) return "";
        try {
          const parsed = JSON.parse(source);
          const error = parsed && parsed.error;
          if (error) {
            return [error.status, error.message].filter(Boolean).join(": ").slice(0, 180);
          }
        } catch (e) {}
        return source.replace(/\s+/g, " ").slice(0, 180);
      };
      const bytesOf = value => {
        try { return new Blob([value]).size; } catch (e) { return String(value).length; }
      };
      const updateWriteDiagnostic = () => {
        const details = document.getElementById("sync-write-diagnostic-details");
        if (!details) return;
        details.textContent = `Última escritura — Firestore: ${firestoreWriteStatus} · Realtime Database: ${rtdbWriteStatus} · Canal auxiliar: ${streamWriteStatus}`;
      };
      const firestoreBytes = (() => {
        const fsBody = {
          fields: {
            payloadJson: { stringValue: JSON.stringify(fullPayload) },
            compactEnvelope: { stringValue: compactStr },
            updatedAt: { integerValue: String(fullPayload.updatedAt) },
            deviceId: { stringValue: String(appState.deviceId) }
          }
        };
        return { url: getFirebaseFirestoreUrl(), body: JSON.stringify(fsBody) };
      })();
      const writePayloadBytes = bytesOf(firestoreBytes.body);
      let streamPromise;
      try {
        streamPromise = window.fetch(getCloudTopicUrl(""), {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8", "Cache": "yes" },
          body: compactStr
        }).then(response => ({ response })).catch(error => ({ error }));
      } catch (error) {
        streamPromise = Promise.resolve({ error });
      }

      // 1. Push to Firestore. Do not set keepalive: true for large sync payloads:
      // Fetch keepalive bodies are limited to 64 KiB and can throw before reaching Firebase.
      try {
        const res = await window.fetch(firestoreBytes.url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: firestoreBytes.body
        });
        if (res && res.ok) {
          firebaseSaved = true;
          firestoreWriteStatus = `OK (HTTP ${res.status}; ${(writePayloadBytes / 1024).toFixed(1)} KiB)`;
        } else {
          const responseText = res ? await res.text().catch(() => "") : "";
          const detail = describeResponseError(responseText);
          firestoreWriteStatus = `HTTP ${res ? res.status : "sin respuesta"}${detail ? ` · ${detail}` : ""}`;
        }
      } catch (e) {
        firestoreWriteStatus = `Error de red · ${String(e && e.message || e).slice(0, 180)} (${(writePayloadBytes / 1024).toFixed(1)} KiB)`;
      }
      updateWriteDiagnostic();

      // 2. Realtime Database is optional; try it only if its exact URL was configured.
      try {
        const rtdbUrl = getFirebaseRtdbUrl();
        if (rtdbUrl) {
          const rtdbBody = JSON.stringify(fullPayload);
          const resRt = await window.fetch(rtdbUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: rtdbBody
          });
          if (resRt && resRt.ok) {
            firebaseSaved = true;
            rtdbWriteStatus = `OK (HTTP ${resRt.status})`;
          } else {
            const responseText = resRt ? await resRt.text().catch(() => "") : "";
            const detail = describeResponseError(responseText);
            rtdbWriteStatus = `HTTP ${resRt ? resRt.status : "sin respuesta"}${detail ? ` · ${detail}` : ""}`;
          }
        }
      } catch (e) {
        rtdbWriteStatus = `Error de red · ${String(e && e.message || e).slice(0, 180)}`;
      }
      updateWriteDiagnostic();

      // 3. Read the auxiliary transport result. Its POST was started in parallel with Firestore.
      // ntfy accelerates device-to-device updates but never counts as durable Firebase confirmation.
      const streamResult = await streamPromise;
      if (streamResult && streamResult.response) {
        const streamResponse = streamResult.response;
        streamWriteStatus = streamResponse.ok ? `OK (HTTP ${streamResponse.status}; transporte auxiliar)` : `HTTP ${streamResponse.status}`;
      } else {
        const error = streamResult && streamResult.error;
        streamWriteStatus = `No disponible · ${String(error && error.message || error || "sin respuesta").slice(0, 120)}`;
      }
      updateWriteDiagnostic();

      const syncText = document.getElementById("sync-status-text");
      // Show "Sincronizado" only after Firebase confirms the remote write.
      if (syncText) syncText.textContent = firebaseSaved ? "Sincronizado" : "Sin confirmar";
      const modalSyncTime = document.getElementById("modal-sync-last-time");
      if (modalSyncTime) {
        const now = new Date();
        modalSyncTime.textContent = firebaseSaved
          ? `${now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} (escritura confirmada en Firebase ${appState.firebaseConfig.projectId || "Cloud"})`
          : "No se confirmó la escritura remota; los datos locales se conservaron. Consulta el diagnóstico de escritura para ver el motivo.";
      }
      if (forceImmediateToast) {
        showToast(
          firebaseSaved
            ? "🔥 Escritura confirmada en Firebase"
            : `⚠️ No se confirmó el guardado remoto. ${firestoreWriteStatus}. Revisa Diagnóstico de escritura.`,
          !firebaseSaved
        );
      }
      } catch (error) {
        const message = String(error && error.message || error).slice(0, 160);
        setRealtimeSyncStatus(`Error de escritura: ${message}`);
        const syncText = document.getElementById("sync-status-text");
        if (syncText) syncText.textContent = "Error de sincronización";
        if (forceImmediateToast) showToast(`No se pudo completar la escritura en la nube: ${message}`, true);
      } finally {
        cloudPushInFlight = false;
        if (cloudPushPending) {
          const showPendingToast = cloudPushPendingToast;
          cloudPushPending = false;
          cloudPushPendingToast = false;
          pushCloudSync(showPendingToast);
        }
      }
    }, forceImmediateToast ? 10 : 80);
  }

  const TASKY_BUILD_ID = "20261031-double-click-responsive-1";

  function renderSyncDiagnostics(statuses) {
    const entries = [
      ["Firestore", statuses.firestore || "sin respuesta"],
      ["Realtime Database", statuses.rtdb || "sin respuesta"],
      ["ntfy (canal auxiliar)", statuses.ntfy || "no comprobado"]
    ];
    const fullText = entries.map(([name, value]) => `${name}: ${value}`).join(" · ");
    const details = document.getElementById("sync-diagnostic-details");
    if (details) details.textContent = fullText;
    setRealtimeSyncStatus(realtimeSyncStatus);

    const localDetails = document.getElementById("sync-device-diagnostic-details");
    if (localDetails) {
      const cfg = appState.firebaseConfig || {};
      const local = normalizeDataPayload(appState.data);
      const projectId = String(cfg.projectId || "sin proyecto").trim();
      const docPath = String(cfg.docPath || "sin ruta").split("/").filter(Boolean).join("/");
      const pendingCount = local ? local.tasks.filter(task => !task.done).length : 0;
      const lastPull = lastCloudPullCompletedAt
        ? new Date(lastCloudPullCompletedAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "aún no realizada";
      localDetails.textContent = `Este dispositivo · versión ${TASKY_BUILD_ID} · destino ${projectId}/${docPath} · ${local ? local.boxes.length : 0} casillas · ${local ? local.tasks.length : 0} tareas (${pendingCount} pendientes) · revisión local ${local ? local.updatedAt : 0} · última lectura remota ${lastPull} · dispositivo ${String(appState.deviceId || "").slice(0, 18)}`;
    }
    return fullText;
  }

  function compactProviderStatus(value) {
    const match = String(value || "").match(/HTTP\s+\d+/i);
    if (match) return match[0].replace(/\s+/g, "");
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
        ...buildSyncPayload(appState.data),
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
        if (syncText) syncText.textContent = "Sincronizado";
        const modalSyncTime = document.getElementById("modal-sync-last-time");
        if (modalSyncTime) modalSyncTime.textContent = `Copia inicial confirmada en Firestore a las ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`;
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

  let queuedManualPullPromise = null;
  let resolveQueuedManualPull = null;

  async function pullCloudSync(manual = false, quiet = false) {
    if (!isCloudNetworkAllowed()) {
      if (manual) showToast("Modo local activo");
      return "offline";
    }
    if (cloudPullInFlight) {
      if (!manual) return "busy";
      if (!queuedManualPullPromise) {
        queuedManualPullPromise = new Promise(resolve => {
          resolveQueuedManualPull = resolve;
        });
      }
      return queuedManualPullPromise;
    }
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
        ? `OK · ${norm.boxes.length} casillas, ${norm.tasks.length} tareas (${norm.tasks.filter(task => !task.done).length} pendientes) · revisión ${norm.updatedAt} · emisor ${String(norm.deviceId || "no indicado").slice(0, 22)}`
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
          const rows = responseText ? responseText.trim().split(/\r?\n/) : [];
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
        if (bootstrapResult === "created") return "syncing";
        if (bootstrapResult === "exists" || bootstrapResult === "busy") return "syncing";
      }

      if (durableCandidateCount === 0 || !candidates.length) {
        cloudSyncReady = false;
        cloudSyncReadyConfig = "";
        const summary = `Nube no verificada · FS ${compactProviderStatus(sourceStatus.firestore)} / RTDB ${compactProviderStatus(sourceStatus.rtdb)}`;
        const syncText = document.getElementById("sync-status-text");
        if (syncText) syncText.textContent = "Sin verificar";
        const modalSyncTime = document.getElementById("modal-sync-last-time");
        if (modalSyncTime) modalSyncTime.textContent = "No se encontró una copia remota persistente válida. No se subieron datos automáticamente.";
        if (manual) showToast("La nube no se pudo verificar. Abre el menú «…» y revisa el diagnóstico de Firestore y Realtime Database. Tus datos locales siguen protegidos.", true);
        return "unverified";
      }

      let cloudCandidate = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        cloudCandidate = mergeSyncDatasets(cloudCandidate, candidates[i]);
      }
      const cloudNeedsRepair = candidates.some(candidate => syncFingerprint(candidate) !== syncFingerprint(cloudCandidate));

      cloudSyncReady = true;
      cloudSyncReadyConfig = getCloudSyncConfigKey();
      const syncText = document.getElementById("sync-status-text");
      if (!quiet && syncText) syncText.textContent = "Sincronizando…";
      const modalSyncTime = document.getElementById("modal-sync-last-time");
      if (!quiet && modalSyncTime) {
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
      } else {
        const syncText = document.getElementById("sync-status-text");
        if (syncText) syncText.textContent = "Sincronizado";
        const modalSyncTime = document.getElementById("modal-sync-last-time");
        if (modalSyncTime) {
          modalSyncTime.textContent = `Sincronización verificada a las ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`;
        }
        if (manual) {
          showToast("Sincronización verificada; los cambios de tus dispositivos ya fueron conciliados.");
        }
        return "synced";
      }
      return "syncing";
    } catch (error) {
      setRealtimeSyncStatus(`Error de sincronización: ${String(error && error.message || error).slice(0, 150)}`);
      const syncText = document.getElementById("sync-status-text");
      if (syncText) syncText.textContent = "Error de sincronización";
      if (manual) showToast("No se pudo completar la sincronización. Revisa el diagnóstico del canal en tiempo real.", true);
      return "error";
    } finally {
      lastCloudPullCompletedAt = Date.now();
      cloudPullInFlight = false;
      if (queuedManualPullPromise) {
        const resolveQueued = resolveQueuedManualPull;
        queuedManualPullPromise = null;
        resolveQueuedManualPull = null;
        window.setTimeout(async () => {
          const queuedResult = await pullCloudSync(true, false);
          if (typeof resolveQueued === "function") resolveQueued(queuedResult);
        }, 80);
      }
    }
  }

  window.addEventListener("tasky:manual-refresh", async event => {
    let status = "error";
    try {
      status = await pullCloudSync(true, false) || "synced";
      // Always redraw after a manual pull so the visible board reflects the reconciled state.
      if (status === "synced" || status === "syncing") renderBoard();
    } catch (error) {
      status = "error";
    } finally {
      const complete = event && event.detail && event.detail.complete;
      if (typeof complete === "function") complete(status);
    }
  });

  function requestSyncCatchup() {
    if (!isCloudNetworkAllowed() || document.visibilityState === "hidden") return;
    const now = Date.now();
    if (now - lastSyncCatchupAt < 700) return;
    if (cloudPullInFlight) return;
    lastSyncCatchupAt = now;
    cleanupCompletedTasksFromPreviousDays();
    pullCloudSync(false, true);
  }

  function startCloudSyncRecovery() {
    if (syncRecoveryIntervalId) clearInterval(syncRecoveryIntervalId);
    // SSE is the instant path, not the only source of truth. A silent mobile stream can miss events.
    // Reconcile durable Firestore every 10s while connected; use a 6s fallback when SSE is down.
    syncRecoveryIntervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || !isCloudNetworkAllowed() || cloudPullInFlight) return;
      const streamConnected = Boolean(appState.cloudEventSource && appState.cloudEventSource.readyState === 1);
      const minimumInterval = streamConnected ? 10000 : 6000;
      if (Date.now() - lastCloudPullCompletedAt < minimumInterval) return;
      pullCloudSync(false, true);
    }, 6000);

    window.addEventListener("focus", requestSyncCatchup);
    window.addEventListener("pageshow", requestSyncCatchup);
    window.addEventListener("online", () => {
      startCloudSyncStream();
      requestSyncCatchup();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestSyncCatchup();
    });
  }

  function startCloudSyncStream() {
    if (!isCloudNetworkAllowed()) {
      setRealtimeSyncStatus("Sin conexión de red");
      return;
    }
    if (typeof window.EventSource === "undefined") {
      setRealtimeSyncStatus("Este WebView no ofrece EventSource; se usará recuperación periódica");
      return;
    }
    setRealtimeSyncStatus("Conectando…");
    try {
      if (appState.cloudEventSource) {
        appState.cloudEventSource.close();
      }
      const es = new window.EventSource(getCloudTopicUrl("/sse"));
      es.onopen = () => {
        setRealtimeSyncStatus("Conectado y escuchando cambios");
        requestSyncCatchup();
      };
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.message) {
            const parsed = JSON.parse(msg.message);
            if (parsed && parsed.d !== appState.deviceId && parsed.deviceId !== appState.deviceId) {
              const unpacked = unpackCompactEnvelope(parsed);
              if (unpacked) {
                if (cloudSyncReady && cloudSyncReadyConfig === getCloudSyncConfigKey()) {
                  const applied = applyIncomingSyncPayload(unpacked, false);
                  const syncText = document.getElementById("sync-status-text");
                  if (applied) {
                    if (syncText) syncText.textContent = "Recibiendo cambios…";
                    setRealtimeSyncStatus(`Cambio recibido a las ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
                  } else {
                    setRealtimeSyncStatus("Evento recibido; verificando la copia durable");
                  }
                } else {
                  setRealtimeSyncStatus("Evento recibido antes de verificar Firebase; conciliación en cola");
                }
                // Always schedule a durable pull, including events received during startup.
                scheduleIncomingSyncVerification();
              }
            }
          }
        } catch (error) {
          setRealtimeSyncStatus(`Error al procesar evento: ${String(error && error.message || error).slice(0, 130)}`);
        }
      };
      es.onerror = () => {
        // EventSource reconnects automatically; the fallback covers mobile WebViews.
        setRealtimeSyncStatus("Conexión interrumpida; reconectando…");
        requestSyncCatchup();
      };
      appState.cloudEventSource = es;
    } catch (error) {
      setRealtimeSyncStatus(`No se pudo abrir el canal: ${String(error && error.message || error).slice(0, 130)}`);
    }
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
        // Match the original stable ID first so a renamed casilla is never recreated under its old label.
        let targetBox = loaded.boxes.find(b => String(b.id) === String(baseBox.id)) ||
          loaded.boxes.find(b => b.name.trim().toUpperCase() === baseBox.name.trim().toUpperCase());
        if (!targetBox) {
          targetBox = { ...baseBox, order: loaded.boxes.length };
          loaded.boxes.push(targetBox);
        }
        const existingTasksInBox = loaded.tasks.filter(t => String(t.boxId) === String(targetBox.id));
        const existingTaskIdsInBox = new Set(existingTasksInBox.map(t => String(t.id)));
        const existingTitlesInBox = new Set(existingTasksInBox.map(t => t.title.trim().toLowerCase()));
        const baseTasksForBox = baseline.tasks.filter(t => t.boxId === baseBox.id);
        baseTasksForBox.forEach((bt) => {
          if (!existingTaskIdsInBox.has(String(bt.id)) &&
              !existingTitlesInBox.has(bt.title.trim().toLowerCase()) &&
              !(Array.isArray(loaded.deletedTaskIds) && loaded.deletedTaskIds.includes(String(bt.id)))) {
            loaded.tasks.push({
              ...bt,
              boxId: targetBox.id,
              order: loaded.tasks.filter(t => String(t.boxId) === String(targetBox.id)).length
            });
            existingTaskIdsInBox.add(String(bt.id));
            existingTitlesInBox.add(bt.title.trim().toLowerCase());
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
    appState.data = applyLocalViewStateToData(loaded, null, true);
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
    // Completion records are durable across recurring-task resets and sync. They prevent
    // catch-up from resurrecting an occurrence that was already completed on another device.
    const normalizedCompletionEvents = normalizeCompletionLog(appState.data.completionLog);
    const completionEventsByKey = new Map(normalizedCompletionEvents.map(entry => [
      `${String(entry.taskId)}::${String(entry.completedDate).slice(0, 10)}`,
      entry
    ]));
    const completedOccurrenceKeys = new Set(
      normalizedCompletionEvents
        .filter(entry => !entry.reversed)
        .map(entry => `${String(entry.taskId)}::${String(entry.completedDate).slice(0, 10)}`)
    );

    function getUncompletedOccurrenceDates(task, dates) {
      const skippedDates = new Set(
        (Array.isArray(task.skippedDates) ? task.skippedDates : [])
          .map(value => String(value || "").slice(0, 10))
      );
      return dates.filter(missedDate => {
        if (skippedDates.has(String(missedDate).slice(0, 10))) return false;
        const missedOccurrenceId = `${task.id}__missed__${missedDate.replace(/-/g, "")}`;
        const existingArchivedTask = appState.data.tasks.find(existing =>
          String(existing.id) === missedOccurrenceId
        );
        return !completedOccurrenceKeys.has(`${String(task.id)}::${missedDate}`) &&
          !completedOccurrenceKeys.has(`${missedOccurrenceId}::${missedDate}`) &&
          !(existingArchivedTask && existingArchivedTask.done);
      });
    }

    function archiveMissedOccurrence(task, missedDate) {
      const missedOccurrenceId = `${task.id}__missed__${missedDate.replace(/-/g, "")}`;
      if (appState.data.tasks.some(existing => String(existing.id) === missedOccurrenceId)) return;
      const archivedOccurrence = {
        ...task,
        id: missedOccurrenceId,
        dueDate: missedDate,
        done: false,
        completedDate: null,
        frequency: "once",
        repeatDays: [],
        repeatUntil: null,
        isRescheduled: false,
        rescheduledCount: 0,
        overdueCarryDate: null
      };
      delete archivedOccurrence.overdueSince;
      remaining.push(archivedOccurrence);
    }

    appState.data.tasks.forEach((task) => {
      // Reconcile a task snapshot with the durable completion ledger if the cloud merge left it stale.
      const currentDueDate = String(task.dueDate || "").slice(0, 10);
      const completedDateInTask = String(task.completedDate || currentDueDate).slice(0, 10);
      const taskLedgerKey = `${String(task.id)}::${completedDateInTask}`;
      const taskLedgerEvent = completionEventsByKey.get(taskLedgerKey);
      if (task.done && taskLedgerEvent && taskLedgerEvent.reversed) {
        // The latest ledger entry says this occurrence was reopened.
        task.done = false;
        task.completedDate = null;
        changed = true;
      } else if (!task.done && currentDueDate &&
          completedOccurrenceKeys.has(`${String(task.id)}::${currentDueDate}`)) {
        // Another device may have completed this exact occurrence while its task snapshot is stale.
        task.done = true;
        task.completedDate = currentDueDate;
        changed = true;
      }

      // Once a task assigned to today crosses midnight, its new missed date is its dueDate.
      // Remove the one-day carryover marker so overdue status naturally follows dueDate.
      if (task.overdueCarryDate && String(task.overdueCarryDate) < today) {
        delete task.overdueCarryDate;
        delete task.overdueSince;
        changed = true;
      }

      const completedDateForRollover = task.completedDate
        ? String(task.completedDate).slice(0, 10)
        : "";
      // Only roll over a completion that belongs to an earlier date. A task completed today
      // must not be reset just because the app's tracked-day marker was stale across midnight.
      const completedOnPastDay = Boolean(task.done && (
        completedDateForRollover
          ? completedDateForRollover < today
          : dayRolledOver
      ));
      const taskHasRecurringSchedule = task.frequency !== "once" ||
        (Array.isArray(task.repeatDays) && task.repeatDays.length > 0);
      // Do not expire a series before recovering missed occurrences after its last completion either.
      const needsMissedOccurrenceRecovery = taskHasRecurringSchedule && (
        (!task.done && task.dueDate && String(task.dueDate).slice(0, 10) < today) ||
        completedOnPastDay
      );
      if (task.repeatUntil && String(task.repeatUntil) < today && !needsMissedOccurrenceRecovery) {
        task.frequency = "once";
        task.repeatDays = [];
        delete task.repeatUntil;
        task.isRescheduled = Boolean(task.dueDate && task.dueDate > today);
        changed = true;
      }

      // If a rescheduled task's scheduled date has arrived (dueDate <= today), reactivate it in its Casilla!
      if (!task.done && task.isRescheduled && task.dueDate && task.dueDate <= today) {
        task.isRescheduled = false;
        changed = true;
      }

      // Preserve every missed occurrence of an unfinished recurring task.
      // The original due date is always an occurrence (including a manually rescheduled date);
      // later dates are occurrences only on selected repeat weekdays and before repeatUntil.
      // Then keep the recurring task on today's occurrence, the next future occurrence, or—if
      // the schedule has ended—the latest overdue occurrence. Deterministic IDs make this idempotent.
      const taskIsRecurring = task.frequency !== "once" ||
        (Array.isArray(task.repeatDays) && task.repeatDays.length > 0);
      let omitCurrentTaskAfterRecovery = false;
      if (!task.done && taskIsRecurring && task.dueDate && String(task.dueDate).slice(0, 10) < today) {
        const originalDueDate = String(task.dueDate).slice(0, 10);
        const originalDateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(originalDueDate) &&
          !Number.isNaN(new Date(`${originalDueDate}T00:00:00`).getTime());
        if (originalDateIsValid) {
          const repeatDays = getTaskRepeatDays(task);
          const repeatUntil = task.repeatUntil ? String(task.repeatUntil).slice(0, 10) : null;
          const scheduledMissedDates = [];
          let cursorDate = originalDueDate;
          let isFirstOccurrenceDate = true;

          while (cursorDate < today) {
            const isInsideRepeatWindow = !repeatUntil || cursorDate <= repeatUntil;
            const weekday = new Date(`${cursorDate}T00:00:00`).getDay();
            if (
              isFirstOccurrenceDate ||
              (isInsideRepeatWindow && repeatDays.includes(weekday))
            ) {
              scheduledMissedDates.push(cursorDate);
            }
            cursorDate = addDaysISO(cursorDate, 1);
            isFirstOccurrenceDate = false;
          }

          // Exclude dates already completed or already represented by a completed archived occurrence.
          const missedOccurrenceDates = getUncompletedOccurrenceDates(task, scheduledMissedDates);

          const todayWeekday = new Date(`${today}T00:00:00`).getDay();
          const hasOccurrenceToday = (!repeatUntil || today <= repeatUntil) &&
            repeatDays.includes(todayWeekday);
          const nextOccurrenceDate = hasOccurrenceToday
            ? today
            : getNextRepeatDateOnOrAfter(addDaysISO(today, 1), repeatDays, repeatUntil);

          // If another occurrence exists today or later, archive all past due occurrences separately.
          // If the series has ended, keep only the latest overdue occurrence on the original task.
          const datesToArchive = nextOccurrenceDate
            ? missedOccurrenceDates
            : missedOccurrenceDates.slice(0, -1);

          datesToArchive.forEach(missedDate => archiveMissedOccurrence(task, missedDate));

          if (nextOccurrenceDate) {
            // Keep the active recurring task reserved for today or the next scheduled day.
            task.dueDate = nextOccurrenceDate;
            task.isRescheduled = false;
            delete task.overdueSince;
            delete task.overdueCarryDate;
          } else {
            // No future occurrence remains. Keep the latest unresolved occurrence as one overdue task.
            // If every past occurrence was completed, remove the stale source instead of resurrecting it.
            const latestMissedDate = missedOccurrenceDates[missedOccurrenceDates.length - 1];
            if (!latestMissedDate) {
              omitCurrentTaskAfterRecovery = true;
            } else {
              const latestMissedId = `${task.id}__missed__${latestMissedDate.replace(/-/g, "")}`;
              const latestAlreadyArchived = appState.data.tasks.some(existing =>
                String(existing.id) === latestMissedId
              );
              if (latestAlreadyArchived ||
                  completedOccurrenceKeys.has(`${latestMissedId}::${latestMissedDate}`)) {
                // A previous device/version already preserved this occurrence; don't show the source twice.
                omitCurrentTaskAfterRecovery = true;
              } else {
                task.dueDate = latestMissedDate;
                task.frequency = "once";
                task.repeatDays = [];
                delete task.repeatUntil;
              }
            }
            task.isRescheduled = false;
            delete task.overdueSince;
            delete task.overdueCarryDate;
          }
          changed = true;
        }
      }

      // A completed occurrence is kept in the durable log. If several days passed while the app was closed,
      // recreate every scheduled-but-uncompleted day after it, then create today's or the next valid occurrence.
      if (completedOnPastDay) {
        changed = true;
        appState.data.monthlyCompletedBase = (appState.data.monthlyCompletedBase || 66) + 1;
        if (taskHasRecurringSchedule) {
          const completedDateCandidate = String(task.completedDate || task.dueDate || addDaysISO(today, -1)).slice(0, 10);
          const lastCompletedDate = /^\d{4}-\d{2}-\d{2}$/.test(completedDateCandidate) &&
            completedDateCandidate < today
            ? completedDateCandidate
            : addDaysISO(today, -1);
          const repeatDays = getTaskRepeatDays(task);
          const repeatUntil = task.repeatUntil ? String(task.repeatUntil).slice(0, 10) : null;
          const scheduledMissedDates = [];
          let cursorDate = addDaysISO(lastCompletedDate, 1);
          while (cursorDate < today) {
            const isInsideRepeatWindow = !repeatUntil || cursorDate <= repeatUntil;
            const weekday = new Date(`${cursorDate}T00:00:00`).getDay();
            if (isInsideRepeatWindow && repeatDays.includes(weekday)) scheduledMissedDates.push(cursorDate);
            cursorDate = addDaysISO(cursorDate, 1);
          }
          const missedOccurrenceDates = getUncompletedOccurrenceDates(task, scheduledMissedDates);
          const todayWeekday = new Date(`${today}T00:00:00`).getDay();
          const hasOccurrenceToday = (!repeatUntil || today <= repeatUntil) && repeatDays.includes(todayWeekday);
          const nextOccurrenceDate = hasOccurrenceToday
            ? today
            : getNextRepeatDateOnOrAfter(addDaysISO(today, 1), repeatDays, repeatUntil);
          const datesToArchive = nextOccurrenceDate
            ? missedOccurrenceDates
            : missedOccurrenceDates.slice(0, -1);
          datesToArchive.forEach(missedDate => archiveMissedOccurrence(task, missedDate));

          if (nextOccurrenceDate) {
            remaining.push({
              ...task,
              done: false,
              completedDate: null,
              dueDate: nextOccurrenceDate,
              isRescheduled: false,
              overdueSince: null,
              overdueCarryDate: null
            });
          } else {
            // The repeat schedule ended. Keep the latest unresolved missed occurrence, if any.
            const latestMissedDate = missedOccurrenceDates[missedOccurrenceDates.length - 1];
            if (latestMissedDate) {
              const latestMissedId = `${task.id}__missed__${latestMissedDate.replace(/-/g, "")}`;
              const latestAlreadyArchived = appState.data.tasks.some(existing =>
                String(existing.id) === latestMissedId
              );
              if (!latestAlreadyArchived &&
                  !completedOccurrenceKeys.has(`${latestMissedId}::${latestMissedDate}`)) {
                remaining.push({
                  ...task,
                  done: false,
                  completedDate: null,
                  dueDate: latestMissedDate,
                  frequency: "once",
                  repeatDays: [],
                  repeatUntil: null,
                  isRescheduled: false,
                  overdueSince: null,
                  overdueCarryDate: null
                });
              }
            }
          }
        }
        // Completed one-off tasks and completed series with no remaining occurrences stay in the completion log.
      } else {
        if (task.done && !task.completedDate) {
          task.completedDate = today;
        }
        if (!omitCurrentTaskAfterRecovery) remaining.push(task);
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

    // Compare only synchronized content; local view preferences must never create cloud changes.
    const previousSyncFingerprint = previousData ? syncFingerprint(previousData) : "";

    // When a casilla loses its final pending task for today, fold it as it moves
    // out of the active section. This is a device-local view preference, not task data.
    const previousPendingTodayBoxIds = new Set(
      (Array.isArray(previousData && previousData.tasks) ? previousData.tasks : [])
        .filter(task => task && !task.done && isTaskForToday(task))
        .map(task => String(task.boxId))
    );
    const currentPendingTodayBoxIds = new Set(
      (Array.isArray(appState.data.tasks) ? appState.data.tasks : [])
        .filter(task => task && !task.done && isTaskForToday(task))
        .map(task => String(task.boxId))
    );
    let autoFoldedClearedBox = false;
    (appState.data.boxes || []).forEach(box => {
      const boxId = String(box.id);
      if (previousPendingTodayBoxIds.has(boxId) &&
          !currentPendingTodayBoxIds.has(boxId) &&
          !box.collapsed) {
        box.collapsed = true;
        autoFoldedClearedBox = true;
      }
    });
    if (autoFoldedClearedBox) persistLocalViewState();

    const previousTasksById = new Map((Array.isArray(previousData && previousData.tasks) ? previousData.tasks : [])
      .filter(task => task && task.id != null).map(task => [String(task.id), task]));
    const previousBoxesById = new Map((Array.isArray(previousData && previousData.boxes) ? previousData.boxes : [])
      .filter(box => box && box.id != null).map(box => [String(box.id), box]));
    const recordChangeTime = Date.now();
    const boxSyncValue = value => {
      const { collapsed, ...syncableBox } = value || {};
      return JSON.stringify(syncableBox);
    };
    (appState.data.tasks || []).forEach(task => {
      const previous = previousTasksById.get(String(task.id));
      if (task.bootstrapSeed && previous && JSON.stringify(task) !== JSON.stringify(previous)) delete task.bootstrapSeed;
      const changed = !previous || JSON.stringify(task) !== JSON.stringify(previous);
      if (changed) {
        task.updatedAt = Math.max(recordChangeTime, Number(task.updatedAt || 0) + 1, Number(previous && previous.updatedAt || 0) + 1);
      }
    });
    (appState.data.boxes || []).forEach(box => {
      const previous = previousBoxesById.get(String(box.id));
      if (box.bootstrapSeed && previous && JSON.stringify(box) !== JSON.stringify(previous)) delete box.bootstrapSeed;
      // The collapsed flag is stored per device and is not a real box modification.
      const changed = !previous || boxSyncValue(box) !== boxSyncValue(previous);
      if (changed) {
        box.updatedAt = Math.max(recordChangeTime, Number(box.updatedAt || 0) + 1, Number(previous && previous.updatedAt || 0) + 1);
      }
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
    const syncContentChanged = !previousData || previousSyncFingerprint !== syncFingerprint(appState.data);
    if (syncContentChanged) {
      appState.data.updatedAt = Math.max(Date.now(), Number(appState.data.updatedAt || 0) + 1);
    }
    const payloadStr = JSON.stringify(appState.data);
    const ok = safeStorage.setItem(STORAGE_KEYS.DATA, payloadStr);
    // Persist every local save, but contact the cloud only when synchronized data changed.
    if (syncContentChanged) pushCloudSync();

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
    if (el) {
      const now = new Date();
      const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      el.textContent = `${DAY_FULL_NAMES[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
    }
    renderDateBirthdayShortcut();
  }

  function renderDateBirthdayShortcut() {
    const button = document.getElementById("btn-date-birthday-shortcut");
    if (!button) return;

    const today = getTodayISO();
    const todayMonth = today.slice(5, 7);
    const todayDay = today.slice(8, 10);
    const hasBirthdayToday = getActiveBirthdays().some(entry =>
      String(entry.month).padStart(2, "0") === todayMonth &&
      String(entry.day).padStart(2, "0") === todayDay
    );

    // Show only the cake icon when there is at least one birthday today.
    // Never expose names or future birthdays in the home-screen shortcut.
    button.hidden = !hasBirthdayToday;
    button.classList.toggle("has-today-birthday", hasBirthdayToday);
    button.setAttribute("aria-label", hasBirthdayToday ? "Abrir registro de cumpleaños: hay cumpleaños hoy" : "Cumpleaños");
    button.dataset.tipTitle = "Cumpleaños hoy";
    button.dataset.tipDesc = "Pulsa para abrir el registro completo de cumpleaños.";
  }

  function getLearningWeekStartISO(baseIso = getTodayISO()) {
    const date = new Date(`${baseIso}T00:00:00`);
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatLearningDate(iso, options = {}) {
    if (!iso) return "";
    const date = new Date(`${iso}T00:00:00`);
    return date.toLocaleDateString("es-PE", {
      day: "numeric", month: "short", ...(options.year ? { year: "numeric" } : {})
    });
  }

  function getLearningStatusLabel(status, isWeekly = false) {
    if (status === "completed") return "Cumplida";
    if (status === "missed") return "No cumplida";
    if (status === "in_progress") return "En curso";
    return isWeekly ? "En curso" : "Pendiente de revisión";
  }

  function renderLearningGoalsPanel() {
    const section = document.getElementById("learning-goals-section");
    if (!section) return;
    const goals = normalizeLearningGoalsData(appState.data.learningGoals);
    appState.data.learningGoals = goals;
    const focusedElement = document.activeElement;
    const preserveDraft = Boolean(focusedElement && focusedElement.matches(
      "#input-learning-daily-goal, #input-learning-daily-notes, #input-learning-weekly-goal, #input-learning-weekly-notes"
    ));
    const today = getTodayISO();
    const yesterday = addDaysISO(today, -1);
    const weekStart = getLearningWeekStartISO(today);
    const weekEnd = addDaysISO(weekStart, 6);
    const todayRecord = goals.daily[today];
    const yesterdayRecord = goals.daily[yesterday];
    const weekRecord = goals.weekly[weekStart];

    document.getElementById("learning-today-date").textContent = formatLearningDate(today);
    document.getElementById("learning-yesterday-date").textContent = formatLearningDate(yesterday);
    document.getElementById("learning-week-range").textContent = `${formatLearningDate(weekStart)} – ${formatLearningDate(weekEnd)}`;
    document.getElementById("learning-summary-today-date").textContent = `Hoy · ${formatLearningDate(today)}`;
    document.getElementById("learning-summary-week-range").textContent = `${formatLearningDate(weekStart)} – ${formatLearningDate(weekEnd)}`;

    const dailySummaryGoal = document.getElementById("learning-daily-summary-goal");
    dailySummaryGoal.textContent = todayRecord ? todayRecord.goal : "Todavía no has registrado la meta de hoy.";
    const dailySummaryStatus = document.getElementById("learning-daily-summary-status");
    dailySummaryStatus.textContent = !todayRecord
      ? "Sin registrar"
      : (todayRecord.status === "pending" ? "Pendiente" : getLearningStatusLabel(todayRecord.status));
    dailySummaryStatus.dataset.status = todayRecord ? todayRecord.status : "empty";

    const weeklySummaryGoal = document.getElementById("learning-weekly-summary-goal");
    weeklySummaryGoal.textContent = weekRecord ? weekRecord.goal : "Todavía no has registrado el tema de esta semana.";
    const weeklySummaryStatus = document.getElementById("learning-weekly-summary-status");
    weeklySummaryStatus.textContent = weekRecord ? getLearningStatusLabel(weekRecord.status, true) : "Sin registrar";
    weeklySummaryStatus.dataset.status = weekRecord ? weekRecord.status : "empty";

    if (!preserveDraft) {
      document.getElementById("input-learning-daily-goal").value = todayRecord ? todayRecord.goal : "";
      document.getElementById("input-learning-daily-notes").value = todayRecord ? todayRecord.notes : "";
      document.getElementById("input-learning-weekly-goal").value = weekRecord ? weekRecord.goal : "";
      document.getElementById("input-learning-weekly-notes").value = weekRecord ? weekRecord.notes : "";
    }

    const getTodayDailyStatusLabel = (record) => {
      if (!record) return "Sin registrar";
      return record.status === "pending" ? "Pendiente" : getLearningStatusLabel(record.status);
    };

    const dailyStatus = document.getElementById("learning-daily-status");
    dailyStatus.textContent = getTodayDailyStatusLabel(todayRecord);
    dailyStatus.dataset.status = todayRecord ? todayRecord.status : "empty";

    // The current-day goal can be marked immediately; yesterday's review is handled separately below.
    const todayCheckinDate = document.getElementById("learning-today-checkin-date");
    if (todayCheckinDate) todayCheckinDate.textContent = formatLearningDate(today);
    const todayCheckinStatus = document.getElementById("learning-today-checkin-status");
    if (todayCheckinStatus) {
      todayCheckinStatus.textContent = getTodayDailyStatusLabel(todayRecord);
      todayCheckinStatus.dataset.status = todayRecord ? todayRecord.status : "empty";
    }
    const todayButtons = document.querySelectorAll('#learning-details-panel [data-learning-action="mark-today"]');
    todayButtons.forEach(button => {
      button.disabled = !todayRecord || todayRecord.status === button.dataset.learningStatus;
      if (button.dataset.learningStatus === "completed") {
        button.textContent = todayRecord && todayRecord.status === "completed" ? "✓ Ya la cumplí" : "✓ Sí, la cumplí";
      } else if (button.dataset.learningStatus === "pending") {
        button.textContent = todayRecord && todayRecord.status === "pending" ? "Aún en curso" : "↩ Cambiar a pendiente";
      }
    });

    const weeklyStatus = document.getElementById("learning-weekly-status");
    weeklyStatus.textContent = weekRecord ? getLearningStatusLabel(weekRecord.status, true) : "Sin registrar";
    weeklyStatus.dataset.status = weekRecord ? weekRecord.status : "empty";

    const yesterdayGoal = document.getElementById("learning-yesterday-goal");
    const yesterdayStatus = document.getElementById("learning-yesterday-status");
    const yesterdayButtons = document.querySelectorAll('#learning-details-panel [data-learning-action="mark-yesterday"]');
    if (yesterdayRecord) {
      yesterdayGoal.textContent = yesterdayRecord.goal;
      yesterdayStatus.textContent = getLearningStatusLabel(yesterdayRecord.status);
      yesterdayStatus.dataset.status = yesterdayRecord.status;
    } else {
      yesterdayGoal.textContent = "Aún no hay una meta diaria registrada para ayer.";
      yesterdayStatus.textContent = "Sin meta registrada";
      yesterdayStatus.dataset.status = "empty";
    }
    yesterdayButtons.forEach(button => { button.disabled = !yesterdayRecord; });

    const weeklyButtons = document.querySelectorAll('#learning-details-panel [data-learning-action="mark-weekly"]');
    weeklyButtons.forEach(button => { button.disabled = !weekRecord; });

    const dailyHistory = Object.values(goals.daily).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    document.getElementById("learning-daily-history").innerHTML = dailyHistory.length
      ? dailyHistory.map(record => `<div class="learning-history-item">
          <div class="learning-history-item-heading"><strong>${escapeHtml(formatLearningDate(record.date, { year: true }))}</strong><span class="learning-status-chip" data-status="${escapeHtml(record.status)}">${escapeHtml(getLearningStatusLabel(record.status))}</span></div>
          <p>${escapeHtml(record.goal)}</p>
          ${record.notes ? `<small>${escapeHtml(record.notes)}</small>` : ""}
        </div>`).join("")
      : '<p class="learning-empty-history">Tus metas diarias guardadas aparecerán aquí.</p>';

    const weeklyHistory = Object.values(goals.weekly).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
    document.getElementById("learning-weekly-history").innerHTML = weeklyHistory.length
      ? weeklyHistory.map(record => `<div class="learning-history-item">
          <div class="learning-history-item-heading"><strong>Semana del ${escapeHtml(formatLearningDate(record.date, { year: true }))}</strong><span class="learning-status-chip" data-status="${escapeHtml(record.status)}">${escapeHtml(getLearningStatusLabel(record.status, true))}</span></div>
          <p>${escapeHtml(record.goal)}</p>
          ${record.notes ? `<small>${escapeHtml(record.notes)}</small>` : ""}
        </div>`).join("")
      : '<p class="learning-empty-history">Tus metas semanales guardadas aparecerán aquí.</p>';
  }

  function saveDailyLearningGoal() {
    const goal = document.getElementById("input-learning-daily-goal").value.trim();
    const notes = document.getElementById("input-learning-daily-notes").value.trim();
    if (!goal) {
      showToast("Escribe qué quieres aprender hoy", true);
      document.getElementById("input-learning-daily-goal").focus();
      return;
    }
    const today = getTodayISO();
    const goals = normalizeLearningGoalsData(appState.data.learningGoals);
    const previous = goals.daily[today];
    goals.daily[today] = {
      date: today,
      goal,
      notes,
      status: previous && previous.goal === goal ? previous.status : "pending",
      updatedAt: Date.now()
    };
    appState.data.learningGoals = goals;
    saveData(true, "Guardó la meta diaria de aprendizaje");
    renderLearningGoalsPanel();
    showToast("Meta diaria de aprendizaje guardada");
    playUiSound("complete");
  }

  function saveWeeklyLearningGoal() {
    const goal = document.getElementById("input-learning-weekly-goal").value.trim();
    const notes = document.getElementById("input-learning-weekly-notes").value.trim();
    if (!goal) {
      showToast("Escribe qué tema quieres profundizar esta semana", true);
      document.getElementById("input-learning-weekly-goal").focus();
      return;
    }
    const weekStart = getLearningWeekStartISO();
    const goals = normalizeLearningGoalsData(appState.data.learningGoals);
    const previous = goals.weekly[weekStart];
    goals.weekly[weekStart] = {
      date: weekStart,
      goal,
      notes,
      status: previous && previous.status !== "pending" ? previous.status : "in_progress",
      updatedAt: Date.now()
    };
    appState.data.learningGoals = goals;
    saveData(true, "Guardó la meta semanal de aprendizaje");
    renderLearningGoalsPanel();
    showToast("Meta semanal de aprendizaje guardada");
    playUiSound("complete");
  }

  function markLearningGoalStatus(action, status) {
    const goals = normalizeLearningGoalsData(appState.data.learningGoals);
    if (action === "mark-today") {
      const date = getTodayISO();
      const record = goals.daily[date];
      if (!record) {
        showToast("Primero guarda tu meta diaria de hoy", true);
        return;
      }
      if (status !== "completed" && status !== "pending") return;
      record.status = status;
      record.updatedAt = Date.now();
      goals.daily[date] = record;
    } else if (action === "mark-yesterday") {
      const date = addDaysISO(getTodayISO(), -1);
      const record = goals.daily[date];
      if (!record) {
        showToast("Ayer no hay una meta diaria registrada", true);
        return;
      }
      record.status = status;
      record.updatedAt = Date.now();
      goals.daily[date] = record;
    } else if (action === "mark-weekly") {
      const weekStart = getLearningWeekStartISO();
      const record = goals.weekly[weekStart];
      if (!record) {
        showToast("Primero guarda tu meta semanal", true);
        return;
      }
      record.status = status;
      record.updatedAt = Date.now();
      goals.weekly[weekStart] = record;
    } else {
      return;
    }
    appState.data.learningGoals = goals;
    saveData(true, "Actualizó el resultado de una meta de aprendizaje");
    renderLearningGoalsPanel();
    const confirmationMessage = status === "completed"
      ? "Meta marcada como cumplida"
      : (status === "pending" ? "Meta diaria sigue pendiente" : "Meta marcada como no cumplida");
    showToast(confirmationMessage);
    playUiSound(status === "completed" ? "complete" : "tap");
  }

  // Persistent shuffled deck: every quote appears once per cycle, without adjacent authors repeating.
  // Store the next position so refreshes continue the current cycle.
  const QUOTE_DECK_STORAGE_KEY = "tasky_quote_deck_v1";
  let quoteDeckState = null;

  function quoteAuthorKeyAt(index) {
    const quote = (appState.quotes || [])[index];
    return quote ? getDisplayQuoteAuthor(quote.author) : "";
  }

  function isValidQuoteDeckState(candidate, quoteCount) {
    if (!candidate || candidate.version !== 1 || candidate.quoteCount !== quoteCount) return false;
    if (!Array.isArray(candidate.order) || candidate.order.length !== quoteCount) return false;
    if (!Number.isInteger(candidate.next) || candidate.next < 0 || candidate.next > quoteCount) return false;
    const seen = new Set();
    let previousAuthor = "";
    for (const index of candidate.order) {
      if (!Number.isInteger(index) || index < 0 || index >= quoteCount || seen.has(index)) return false;
      const author = quoteAuthorKeyAt(index);
      if (!author || author === previousAuthor) return false;
      previousAuthor = author;
      seen.add(index);
    }
    return candidate.last === -1 || (Number.isInteger(candidate.last) && candidate.last >= 0 && candidate.last < quoteCount);
  }

  function createQuoteDeck(quoteCount, previousLastIndex = -1) {
    const groups = new Map();
    for (let index = 0; index < quoteCount; index++) {
      const author = quoteAuthorKeyAt(index);
      if (!author) continue; // Unattributed quotes must never enter the deck.
      if (!groups.has(author)) groups.set(author, []);
      groups.get(author).push(index);
    }

    // Shuffle individual quotes inside each author's group.
    for (const indices of groups.values()) {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }

    // A greedy randomized choice with a feasibility check prevents dead ends.
    // The remaining count for the preceding author may occupy only every other slot.
    const order = [];
    let previousAuthor = previousLastIndex >= 0 && previousLastIndex < quoteCount
      ? quoteAuthorKeyAt(previousLastIndex)
      : "";

    while (order.length < quoteCount) {
      const slotsAfterChoice = quoteCount - order.length - 1;
      const eligibleAuthors = [];

      for (const [author, indices] of groups) {
        if (!indices.length || author === previousAuthor) continue;
        let feasible = true;

        for (const [remainingAuthor, remainingIndices] of groups) {
          const remainingCount = remainingIndices.length - (remainingAuthor === author ? 1 : 0);
          const limit = remainingAuthor === author
            ? Math.floor(slotsAfterChoice / 2)
            : Math.ceil(slotsAfterChoice / 2);
          if (remainingCount > limit) {
            feasible = false;
            break;
          }
        }

        if (feasible) eligibleAuthors.push({ author, indices });
      }

      const choices = [];
      for (const group of eligibleAuthors) {
        for (const index of group.indices) choices.push({ author: group.author, index });
      }
      if (!choices.length) {
        throw new Error("No se pudo crear una baraja de frases sin autores consecutivos");
      }

      const chosen = choices[Math.floor(Math.random() * choices.length)];
      const group = groups.get(chosen.author);
      group.splice(group.indexOf(chosen.index), 1);
      order.push(chosen.index);
      previousAuthor = chosen.author;
    }

    return { version: 1, quoteCount, order, next: 0, last: previousLastIndex };
  }

  function saveQuoteDeckState() {
    try {
      if (typeof localStorage !== "undefined" && quoteDeckState) {
        localStorage.setItem(QUOTE_DECK_STORAGE_KEY, JSON.stringify(quoteDeckState));
      }
    } catch (_) {
      // Continue with the in-memory deck if storage is unavailable.
    }
  }

  function ensureQuoteDeckState() {
    const quoteCount = (appState.quotes || []).length;
    if (!quoteCount) return null;
    if (isValidQuoteDeckState(quoteDeckState, quoteCount)) return quoteDeckState;

    let saved = null;
    try {
      if (typeof localStorage !== "undefined") {
        saved = JSON.parse(localStorage.getItem(QUOTE_DECK_STORAGE_KEY) || "null");
      }
    } catch (_) {
      saved = null;
    }

    if (isValidQuoteDeckState(saved, quoteCount)) {
      quoteDeckState = saved;
    } else {
      // Index positions changed when unattributed quotes were removed, so only reuse
      // a previous last index when it belongs to a deck with the same quote count.
      const previousLast = saved && saved.quoteCount === quoteCount &&
        Number.isInteger(saved.last) && saved.last >= 0 && saved.last < quoteCount
        ? saved.last
        : -1;
      quoteDeckState = createQuoteDeck(quoteCount, previousLast);
    }
    return quoteDeckState;
  }

  function getNextQuoteIndex() {
    const deck = ensureQuoteDeckState();
    if (!deck) return 0;

    if (deck.next >= deck.order.length) {
      const previousLast = deck.last;
      quoteDeckState = createQuoteDeck(deck.quoteCount, previousLast);
    }

    const activeDeck = quoteDeckState;
    const nextIndex = activeDeck.order[activeDeck.next];
    activeDeck.next += 1;
    activeDeck.last = nextIndex;
    saveQuoteDeckState();
    return nextIndex;
  }

  // Display the author's name only; omit works, source notes, and attribution labels.
  function getDisplayQuoteAuthor(author) {
    let name = String(author || "").split("·")[0].trim();
    if (/^Eclesiast[eé]s\s*\(Atribuido a Salom[oó]n\)$/i.test(name)) return "Salomón";
    if (/^Talmud\s*\(Atribuido a Hillel el Viejo\)$/i.test(name)) return "Hillel el Viejo";
    if (/^Salom[oó]n\s*\(Libro de los Proverbios\)$/i.test(name)) return "Salomón";
    if (/^S[oó]crates,\s*seg[uú]n Plat[oó]n$/i.test(name)) return "Sócrates";
    return name;
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
        authorEl.textContent = `— ${getDisplayQuoteAuthor(quote.author)}`;
        box.style.opacity = "1";
        box.style.transform = "translateY(0)";
      }, 260);
    } else {
      textEl.textContent = quote.text;
      authorEl.textContent = `— ${getDisplayQuoteAuthor(quote.author)}`;
    }
  }

  function startQuoteRotation() {
    if (appState.quoteTimer) clearInterval(appState.quoteTimer);
    appState.quoteTimer = setInterval(() => {
      appState.currentQuoteIndex = getNextQuoteIndex();
      renderQuote(true);
    }, 75000);
  }

  function isTaskRescheduledFuture(task) {
    const today = getTodayISO();
    return !task.done && Boolean(task.dueDate && task.dueDate > today && task.isRescheduled);
  }

  function isTaskCarriedToTodayFromOverdue(task) {
    const today = getTodayISO();
    return Boolean(task && !task.done &&
      task.overdueCarryDate === today &&
      task.overdueSince && task.overdueSince < today &&
      task.dueDate === today);
  }

  function isTaskOverdue(task) {
    const today = getTodayISO();
    // A task explicitly moved to today is no longer overdue today.
    // Keep overdueSince/overdueCarryDate separately so its original due date
    // can be remembered and the task can become overdue again only after it
    // remains unfinished past today's date.
    return Boolean(task && !task.done && !task.noDeadline && task.dueDate && task.dueDate < today);
  }

  function isTaskWithoutDeadlinePending(task) {
    const today = getTodayISO();
    return Boolean(task && !task.done && task.noDeadline && task.dueDate && task.dueDate < today);
  }

  function getTaskOverdueDisplayDate(task) {
    return isTaskCarriedToTodayFromOverdue(task) && task.overdueSince
      ? task.overdueSince
      : (task && task.dueDate) || "";
  }

  function isTaskUpcomingRepeat(task) {
    const today = getTodayISO();
    return Boolean(task && !task.done && task.frequency !== "once" &&
      task.dueDate && task.dueDate > today && !task.isRescheduled);
  }

  function isRecurringTask(task) {
    return Boolean(task && (
      task.frequency !== "once" ||
      (Array.isArray(task.repeatDays) && task.repeatDays.length > 0)
    ));
  }

  function isTaskForToday(task) {
    const today = getTodayISO();
    if (!task) return false;

    // Unfinished missed work remains visible on any day until it is resolved,
    // even when today is not one of the task's recurring weekdays.
    if (isTaskOverdue(task)) return true;

    // Once its planned day passes, a task without a deadline remains pending
    // but no longer counts as today's scheduled workload.
    if (isTaskWithoutDeadlinePending(task)) return false;

    // Future-dated tasks never count toward today's planned workload.
    if (task.dueDate && task.dueDate > today) return false;

    // New recurring occurrences belong only to their selected weekdays.
    if (isRecurringTask(task)) {
      const weekday = new Date(`${today}T00:00:00`).getDay();
      if (!getTaskRepeatDays(task).includes(weekday)) return false;
    }

    return true;
  }

  // Format Repeat Schedule Label (Point 8)
  function formatRepeatBadgeLabel(task) {
    const days = getTaskRepeatDays(task);
    let label = "";
    if (task.frequency === "daily" || days.length === 7) {
      label = "🔁 Diario";
    } else if (task.frequency === "weekdays" || (days.length === 5 && days.join(",") === "1,2,3,4,5")) {
      label = "🔁 Lunes a viernes";
    } else if (task.frequency === "weekends" || (days.length === 2 && days.join(",") === "0,6")) {
      label = "🔁 Fines de semana";
    } else if (days.length === 1) {
      label = `🔁 Solo ${DAY_FULL_NAMES[days[0]]}`;
    } else if (days.length > 1) {
      const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0];
      const orderedDays = mondayFirstOrder.filter(day => days.includes(day));
      label = `🔁 ${orderedDays.map(d => DAY_SHORT_NAMES[d]).join(", ")}`;
    }
    if (label && task.repeatUntil) label += " · esta semana";
    return label;
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
    activeGroupIds: [],
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
      dragEngine.activeGroupIds = [String(id)];

      if (type === "task" && appState.selectedTaskIds &&
          appState.selectedTaskIds.has(String(id)) && appState.selectedTaskIds.size > 1) {
        const selectedIds = new Set(Array.from(appState.selectedTaskIds).map(String));
        const visibleTaskIds = Array.from(document.querySelectorAll("#boxes-container .task-item[data-task-id]"))
          .map(row => String(row.dataset.taskId));
        const orderedGroup = visibleTaskIds.filter(taskId => selectedIds.has(taskId));
        if (orderedGroup.includes(String(id)) && orderedGroup.length > 1) {
          dragEngine.activeGroupIds = orderedGroup;
          orderedGroup.forEach(taskId => {
            const row = Array.from(document.querySelectorAll("#boxes-container .task-item[data-task-id]"))
              .find(candidate => String(candidate.dataset.taskId) === taskId);
            if (row) row.classList.add("is-multi-drag-source");
          });
        }
      }

      dragEngine.justDragged = true;
      element.classList.add("is-held-dragging");
      playUiSound("dragReady");

      // Point 9: Transparent live clone of the exact task or Casilla being dragged
      const clone = element.cloneNode(true);
      clone.classList.remove("is-held-dragging", "is-charging", "boot-animate", "is-multi-drag-source", "multi-selected");
      clone.classList.add("drop-ghost-clone");
      clone.removeAttribute("data-task-id");
      clone.removeAttribute("data-box-id");
      dragEngine.previewSlot = clone;
      if (dragEngine.activeGroupIds.length > 1) {
        const textWrap = clone.querySelector(".task-text-wrap");
        if (textWrap) {
          const groupBadge = document.createElement("span");
          groupBadge.className = "multi-drag-preview-badge";
          groupBadge.textContent = `Moviendo ${dragEngine.activeGroupIds.length} tareas`;
          textWrap.appendChild(groupBadge);
        }
      }
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
          persistLocalViewState();
        }
        playUiSound("unfold");
        showToast(`📂 ${targetBoxObj ? targetBoxObj.name.toUpperCase() : "Casilla"} desplegada`);
      }

      const activeGroup = new Set((dragEngine.activeGroupIds || []).map(String));
      const overSelectedTask = hitElements.find(
        el => el.classList && el.classList.contains("task-item") &&
          !el.classList.contains("drop-ghost-clone") &&
          activeGroup.has(String(el.dataset.taskId))
      );
      // Do not let a selected source row become the destination while moving the group.
      if (overSelectedTask) return;

      const overTask = hitElements.find(
        el => el.classList && el.classList.contains("task-item") &&
          !el.classList.contains("drop-ghost-clone") &&
          !activeGroup.has(String(el.dataset.taskId))
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
          const groupIds = Array.from(new Set((dragEngine.activeGroupIds || [activeId]).map(String)));
          if (groupIds.length > 1) {
            const board = document.getElementById("boxes-container");
            const visibleRows = board ? Array.from(board.querySelectorAll(".task-item[data-task-id]")) : [];
            const groupRows = groupIds.map(taskId =>
              visibleRows.find(row => String(row.dataset.taskId) === taskId)
            ).filter(Boolean);
            const groupTasks = groupIds.map(taskId =>
              appState.data.tasks.find(task => String(task.id) === taskId)
            ).filter(Boolean);

            if (groupRows.length > 1 && groupTasks.length === groupRows.length && groupRows.some(row => row === activeEl)) {
              const oldBoxIds = new Set(groupTasks.map(task => String(task.boxId)));
              const boxChanged = groupTasks.some(task => String(task.boxId) !== String(targetBoxId));
              pushUndoSnapshot(`Mover ${groupRows.length} tareas seleccionadas`);

              // Remove every selected row first so the placeholder's destination remains stable,
              // then insert all rows together in the order they appeared in the board.
              groupRows.forEach(row => {
                row.classList.remove("is-multi-drag-source", "is-held-dragging");
                if (row.parentNode) row.parentNode.removeChild(row);
              });
              groupTasks.forEach(task => { task.boxId = String(targetBoxId); });
              groupRows.forEach(row => listEl.insertBefore(row, previewSlot));
              previewSlot.remove();

              const affectedBoxIds = new Set([...oldBoxIds, String(targetBoxId)]);
              affectedBoxIds.forEach(boxId => {
                const affectedList = board && Array.from(board.querySelectorAll(".tasks-list"))
                  .find(candidate => String(candidate.dataset.boxList) === boxId);
                if (!affectedList) return;
                Array.from(affectedList.querySelectorAll(".task-item[data-task-id]")).forEach((row, index) => {
                  const task = appState.data.tasks.find(entry => String(entry.id) === String(row.dataset.taskId));
                  if (task) task.order = index;
                });
              });

              playUiSound("drop");
              clearTaskSelection();
              saveData(true, `Movió ${groupRows.length} tareas seleccionadas`);
              if (boxChanged) renderBoard();
              else updateMetrics();
              showToast(boxChanged
                ? `${groupRows.length} tareas movidas a otra casilla`
                : `${groupRows.length} tareas reordenadas`);
            } else {
              // Fallback to the original single-task behavior if the whole group is not available in the board.
              const task = appState.data.tasks.find(t => String(t.id) === String(activeId));
              if (task) {
                pushUndoSnapshot(`Mover tarea: ${task.title}`);
                const boxChanged = String(task.boxId) !== String(targetBoxId);
                task.boxId = String(targetBoxId);
                previewSlot.parentNode.insertBefore(activeEl, previewSlot);
                previewSlot.remove();
                Array.from(listEl.querySelectorAll(".task-item[data-task-id]")).forEach((row, index) => {
                  const tObj = appState.data.tasks.find(entry => String(entry.id) === String(row.dataset.taskId));
                  if (tObj) tObj.order = index;
                });
                playUiSound("drop");
                saveData(true, `Movió tarea: ${task.title}`);
                if (boxChanged) renderBoard();
                else updateMetrics();
                showToast("Tarea reubicada");
              }
            }
          } else {
            const task = appState.data.tasks.find(t => String(t.id) === String(activeId));
            if (task) {
              pushUndoSnapshot(`Mover tarea: ${task.title}`);
              const boxChanged = String(task.boxId) !== String(targetBoxId);
              task.boxId = String(targetBoxId);
              previewSlot.parentNode.insertBefore(activeEl, previewSlot);
              previewSlot.remove();
              const siblingIds = Array.from(listEl.querySelectorAll(".task-item[data-task-id]")).map(el => el.dataset.taskId);
              siblingIds.forEach((id, idx) => {
                const tObj = appState.data.tasks.find(x => String(x.id) === String(id));
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

    (dragEngine.activeGroupIds || []).forEach(taskId => {
      const row = Array.from(document.querySelectorAll("#boxes-container .task-item[data-task-id]"))
        .find(candidate => String(candidate.dataset.taskId) === String(taskId));
      if (row) row.classList.remove("is-multi-drag-source", "is-held-dragging");
    });

    setTimeout(() => {
      dragEngine.justDragged = false;
    }, 80);

    dragEngine.activeType = null;
    dragEngine.activeId = null;
    dragEngine.activeEl = null;
    dragEngine.previewSlot = null;
    dragEngine.activeGroupIds = [];
  }

  function getFocusPlanForToday() {
    const plan = normalizeFocusPlanData(appState.data.focusPlan, appState.data.tasks);
    const today = getTodayISO();
    if (plan.date !== today) return { date: today, byBox: {}, updatedAt: 0 };
    return plan;
  }

  function getFocusBoxPlanForToday(boxId) {
    const plan = getFocusPlanForToday();
    const boxPlan = plan.byBox[String(boxId)] || { taskIds: ["", "", ""], updatedAt: 0 };
    return { date: plan.date, taskIds: boxPlan.taskIds.slice(), updatedAt: Number(boxPlan.updatedAt) || 0 };
  }

  function saveFocusBoxPlan(boxId, taskIds, today = getTodayISO()) {
    const current = getFocusPlanForToday();
    const byBox = { ...current.byBox };
    byBox[String(boxId)] = {
      taskIds: [0, 1, 2].map(index => String(taskIds[index] || "")),
      updatedAt: Date.now()
    };
    appState.data.focusPlan = { date: today, byBox, updatedAt: Date.now() };
  }

  function getFocusPriorityLevel(taskId) {
    const id = String(taskId || "");
    if (!id) return 0;
    const task = (appState.data.tasks || []).find(entry => String(entry.id) === id);
    if (!task || task.done) return 0;
    const plan = getFocusBoxPlanForToday(task.boxId);
    const index = plan.taskIds.findIndex(selectedId => selectedId && String(selectedId) === id);
    return index >= 0 ? index + 1 : 0;
  }

  function removeCompletedFocusPriority(taskId, today) {
    const task = (appState.data.tasks || []).find(entry => String(entry.id) === String(taskId));
    if (!task) return false;
    const plan = getFocusBoxPlanForToday(task.boxId);
    const completedIndex = plan.taskIds.findIndex(id => id && String(id) === String(taskId));
    if (completedIndex < 0) return false;

    const remainingIds = plan.taskIds.slice();
    remainingIds.splice(completedIndex, 1);
    const compactedIds = remainingIds.filter(Boolean).slice(0, 3);
    while (compactedIds.length < 3) compactedIds.push("");
    saveFocusBoxPlan(task.boxId, compactedIds, today);
    return true;
  }

  function renderFocusTaskSuggestions(boxId, slot, rawQuery, inputElement) {
    const card = inputElement && inputElement.closest(".focus-priority-card");
    const suggestions = card && card.querySelector(".focus-priority-suggestions");
    if (!suggestions) return;

    const query = String(rawQuery || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    suggestions.innerHTML = "";
    suggestions.dataset.activeIndex = "-1";
    if (!query) {
      suggestions.hidden = true;
      return;
    }

    const normalizedBoxId = String(boxId || "");
    const plan = getFocusBoxPlanForToday(normalizedBoxId);
    const selectedElsewhere = new Set(plan.taskIds.filter((id, index) => id && index !== slot));
    const matchingTasks = (appState.data.tasks || [])
      .filter(task => {
        const id = String(task.id);
        if (String(task.boxId) !== normalizedBoxId || task.done || !isTaskForToday(task) || selectedElsewhere.has(id)) return false;
        const box = appState.data.boxes.find(entry => String(entry.id) === normalizedBoxId);
        const haystack = `${task.title || ""} ${box ? box.name : ""}`
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")) || (a.order || 0) - (b.order || 0));

    if (!matchingTasks.length) {
      const empty = document.createElement("div");
      empty.className = "focus-search-no-results";
      empty.textContent = "No encontré tareas pendientes de esta casilla que coincidan.";
      suggestions.appendChild(empty);
      suggestions.hidden = false;
      return;
    }

    matchingTasks.slice(0, 8).forEach(task => {
      const box = appState.data.boxes.find(entry => String(entry.id) === normalizedBoxId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "focus-priority-suggestion";
      button.dataset.focusAction = "choose-task";
      button.dataset.focusBoxId = normalizedBoxId;
      button.dataset.focusSlot = String(slot);
      button.dataset.taskId = String(task.id);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      button.addEventListener("mousedown", event => event.preventDefault());

      const title = document.createElement("span");
      title.className = "focus-suggestion-title";
      title.textContent = task.title;
      button.appendChild(title);

      const metadata = document.createElement("span");
      metadata.className = "focus-suggestion-meta";
      const dueLabel = task.dueDate && task.dueDate < getTodayISO()
        ? `Atrasada · ${formatSpanishDateLong(task.dueDate)}`
        : "Para hoy";
      metadata.textContent = `${box ? box.name + " · " : ""}${dueLabel}`;
      button.appendChild(metadata);
      suggestions.appendChild(button);
    });

    if (matchingTasks.length > 8) {
      const more = document.createElement("div");
      more.className = "focus-search-more";
      more.textContent = `Escribe más para afinar la búsqueda · ${matchingTasks.length} coincidencias`;
      suggestions.appendChild(more);
    }
    suggestions.hidden = false;
  }

  function setFocusModeVisibility(isOpen) {
    const focusPanel = document.getElementById("focus-mode-panel");
    const focusToggle = document.getElementById("btn-toggle-focus-mode");
    if (focusPanel) focusPanel.hidden = !isOpen;
    if (focusToggle) focusToggle.setAttribute("aria-expanded", String(isOpen));
    const label = document.getElementById("focus-mode-toggle-label");
    if (label) label.textContent = isOpen ? "Cerrar enfoque" : "Modo Enfoque";
    document.body.classList.toggle("focus-mode-open", isOpen);

    if (!isOpen && focusPanel) {
      focusPanel.querySelectorAll(".focus-priority-suggestions").forEach(list => {
        list.hidden = true;
        list.dataset.activeIndex = "-1";
      });
    }
  }

  function renderFocusModePanel() {
    const panel = document.getElementById("focus-mode-panel");
    const list = document.getElementById("focus-mode-priorities");
    if (!panel || !list) return;

    let plan = getFocusPlanForToday();
    const taskById = new Map((appState.data.tasks || []).map(task => [String(task.id), task]));
    const validBoxIds = new Set((appState.data.boxes || []).map(box => String(box.id)));
    const cleanedByBox = {};

    Object.entries(plan.byBox).forEach(([boxId, boxPlan]) => {
      if (!validBoxIds.has(String(boxId))) return;
      const taskIds = boxPlan.taskIds.map(id => {
        if (!id) return "";
        const task = taskById.get(String(id));
        return task && !task.done && String(task.boxId) === String(boxId) ? String(id) : "";
      });
      if (taskIds.some(Boolean)) cleanedByBox[boxId] = { taskIds, updatedAt: boxPlan.updatedAt };
    });
    const dirty = JSON.stringify(cleanedByBox) !== JSON.stringify(plan.byBox);
    if (dirty) {
      plan = { ...plan, byBox: cleanedByBox, updatedAt: Date.now() };
      appState.data.focusPlan = plan;
      saveData(false, "Limpió prioridades de tareas que ya no están pendientes");
    }

    const boxById = new Map((appState.data.boxes || []).map(box => [String(box.id), box]));
    const entriesByPriority = [[], [], []];
    Object.entries(plan.byBox).forEach(([boxId, boxPlan]) => {
      boxPlan.taskIds.forEach((taskId, slot) => {
        if (!taskId) return;
        const task = taskById.get(String(taskId));
        if (!task || task.done || String(task.boxId) !== String(boxId)) return;
        entriesByPriority[slot].push({
          task,
          box: boxById.get(String(boxId)) || null,
          boxId: String(boxId),
          slot
        });
      });
    });
    entriesByPriority.forEach(entries => {
      entries.sort((a, b) =>
        (a.box ? Number(a.box.order) || 0 : 0) - (b.box ? Number(b.box.order) || 0 : 0) ||
        (Number(a.task.order) || 0) - (Number(b.task.order) || 0)
      );
    });

    const selectedCount = entriesByPriority.reduce((total, entries) => total + entries.length, 0);
    const countBadge = document.getElementById("focus-mode-count");
    const progress = document.getElementById("focus-mode-progress");
    const dateLabel = document.getElementById("focus-mode-date");
    const emptyNote = document.getElementById("focus-mode-empty");
    if (countBadge) countBadge.textContent = String(selectedCount);
    if (progress) progress.textContent = selectedCount
      ? selectedCount + " tarea" + (selectedCount === 1 ? "" : "s") + " prioritaria" + (selectedCount === 1 ? "" : "s")
      : "Aún sin prioridades asignadas";
    if (dateLabel) dateLabel.textContent = formatLearningDate(getTodayISO());

    list.innerHTML = "";
    const priorityColors = ["Rojo", "Amarillo", "Verde"];
    entriesByPriority.forEach((entries, slot) => {
      const priority = slot + 1;
      const group = document.createElement("section");
      group.className = "focus-priority-group focus-priority-group-p" + priority;
      group.dataset.priority = "P" + priority;

      const heading = document.createElement("div");
      heading.className = "focus-priority-group-heading focus-priority-group-heading-p" + priority;

      const headingLeft = document.createElement("div");
      headingLeft.className = "focus-priority-group-title-wrap";
      const number = document.createElement("span");
      number.className = "focus-priority-group-number";
      number.textContent = "P" + priority;
      const titleWrap = document.createElement("div");
      titleWrap.className = "focus-priority-group-title-text";
      const title = document.createElement("strong");
      title.textContent = "Prioridad " + priority;
      const subtitle = document.createElement("span");
      subtitle.textContent = priorityColors[slot];
      titleWrap.append(title, subtitle);
      headingLeft.append(number, titleWrap);

      const count = document.createElement("span");
      count.className = "focus-priority-group-count";
      count.textContent = entries.length + (entries.length === 1 ? " tarea" : " tareas");
      heading.append(headingLeft, count);
      group.appendChild(heading);

      const taskList = document.createElement("div");
      taskList.className = "focus-priority-task-list";
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "focus-priority-group-empty";
        empty.textContent = "No hay tareas asignadas a P" + priority + ". Puedes asignarla con clic derecho sobre una tarea de su casilla.";
        taskList.appendChild(empty);
      }

      entries.forEach(entry => {
        const task = entry.task;
        const row = document.createElement("article");
        row.className = "focus-priority-task-entry focus-priority-entry-p" + priority;

        const content = document.createElement("div");
        content.className = "focus-priority-task-content";
        const taskTitle = document.createElement("strong");
        taskTitle.className = "focus-priority-title";
        taskTitle.textContent = task.title || "Tarea sin título";
        const meta = document.createElement("span");
        meta.className = "focus-priority-context";
        const dueLabel = task.dueDate
          ? (task.dueDate > getTodayISO()
            ? "Programada para " + formatSpanishDateLong(task.dueDate)
            : (task.dueDate < getTodayISO() ? "Atrasada · " + formatSpanishDateLong(task.dueDate) : "Programada para hoy"))
          : "Sin fecha específica";
        meta.textContent = (entry.box ? entry.box.name + " · " : "") + dueLabel;
        content.append(taskTitle, meta);

        const actions = document.createElement("div");
        actions.className = "focus-priority-task-actions";
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "focus-priority-open";
        openButton.dataset.focusAction = "jump-task";
        openButton.dataset.taskId = String(task.id);
        openButton.textContent = "Ver en tablero";
        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.className = "focus-priority-clear";
        clearButton.dataset.focusAction = "clear-task";
        clearButton.dataset.focusBoxId = entry.boxId;
        clearButton.dataset.focusSlot = String(slot);
        clearButton.textContent = "Quitar";
        clearButton.setAttribute("aria-label", "Quitar " + task.title + " de P" + priority);
        actions.append(openButton, clearButton);
        row.append(content, actions);
        taskList.appendChild(row);
      });

      group.appendChild(taskList);
      list.appendChild(group);
    });

    if (emptyNote) {
      emptyNote.hidden = selectedCount > 0;
      emptyNote.textContent = "Asigna P1, P2 o P3 desde el clic derecho de una tarea. Las prioridades de cada casilla aparecerán aquí agrupadas por nivel.";
    }
  }

  function setFocusPriority(boxId, slot, taskId) {
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return;
    const normalizedBoxId = String(boxId || "");
    const today = getTodayISO();
    const current = getFocusBoxPlanForToday(normalizedBoxId);
    const normalizedId = String(taskId || "");
    if (normalizedId) {
      const task = appState.data.tasks.find(entry => String(entry.id) === normalizedId);
      if (!task || String(task.boxId) !== normalizedBoxId || task.done || !isTaskForToday(task)) {
        showToast("Elige una tarea pendiente de esta casilla, programada para hoy o atrasada", true);
        renderFocusModePanel();
        return;
      }
      if (current.taskIds.some((id, index) => index !== slot && String(id) === normalizedId)) {
        showToast("Esta tarea ya ocupa otra prioridad de la misma casilla", true);
        renderFocusModePanel();
        return;
      }
    }
    const nextIds = current.taskIds.slice();
    nextIds[slot] = normalizedId;
    saveFocusBoxPlan(normalizedBoxId, nextIds, today);
    saveData(false, "Actualizó prioridades de casilla en Modo Enfoque");
    renderBoard();
    playUiSound("tap");
  }

  function jumpToFocusTask(taskId) {
    const task = appState.data.tasks.find(entry => String(entry.id) === String(taskId));
    if (!task) {
      showToast("Esta tarea ya no está disponible", true);
      renderFocusModePanel();
      return;
    }

    // Close focus-only view before revealing the task on the board.
    setFocusModeVisibility(false);

    // Reset filters and open the source box so the task can always be revealed.
    appState.searchQuery = "";
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear-btn");
    if (searchInput) searchInput.value = "";
    if (searchClear) searchClear.style.display = "none";

    const sourceBox = appState.data.boxes.find(box => String(box.id) === String(task.boxId));
    if (sourceBox && sourceBox.collapsed) {
      sourceBox.collapsed = false;
      persistLocalViewState();
    }

    const targetTab = task.done ? "completed" : "all";
    appState.activeTab = targetTab;
    document.querySelectorAll("[data-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.tab === targetTab);
    });

    // A task may have been rescheduled after it was chosen as a priority.
    // Temporarily include it in the board so the jump still has a visible target.
    appState.focusRevealTaskId = String(task.id);
    if (sourceBox) saveData(false, "Abrió la casilla de una prioridad");
    renderBoard();

    const reveal = () => {
      const rows = Array.from(document.querySelectorAll(".task-item[data-task-id]"));
      const row = rows.find(element => String(element.dataset.taskId) === String(task.id));
      appState.focusRevealTaskId = null;
      if (!row) {
        showToast("No encontré la tarea en el tablero. Vuelve a abrir Modo Enfoque e inténtalo otra vez.", true);
        return;
      }

      if (typeof row.scrollIntoView === "function") {
        row.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        const top = row.getBoundingClientRect().top + (window.pageYOffset || 0);
        window.scrollTo(0, Math.max(0, top - window.innerHeight / 2));
      }
      row.classList.add("focus-mode-highlight");
      window.setTimeout(() => row.classList.remove("focus-mode-highlight"), 1800);
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
    } else {
      reveal();
    }
  }

  function areAllBoxesCollapsed() {
    const boxes = Array.isArray(appState.data.boxes) ? appState.data.boxes : [];
    if (!boxes.length) return false;
    const hasCompletedSummary = appState.activeTab !== "completed" &&
      appState.data.tasks.some(task => task.done && matchesSearch(task, "Tareas completadas"));
    return boxes.every(box => Boolean(box.collapsed)) &&
      (!hasCompletedSummary || Boolean(appState.data.completedBoxCollapsed));
  }

  function updateAllBoxesToggleButton() {
    const button = document.getElementById("btn-toggle-all-boxes");
    if (!button) return;
    const allCollapsed = areAllBoxesCollapsed();
    const actionLabel = allCollapsed ? "Desplegar todas las casillas" : "Plegar todas las casillas";
    button.setAttribute("aria-label", actionLabel);
    button.setAttribute("aria-expanded", allCollapsed ? "false" : "true");
    button.dataset.tipTitle = actionLabel;
    button.dataset.tipDesc = allCollapsed
      ? "Vuelve a mostrar las tareas de todas las casillas."
      : "Pliega todas las casillas de una vez, sin modificar ni eliminar sus tareas.";
    button.classList.toggle("is-collapsed", allCollapsed);
    button.classList.toggle("is-expanded", !allCollapsed);
    const icon = document.getElementById("all-boxes-toggle-icon");
    if (icon) icon.innerHTML = allCollapsed
      ? '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="m8 16 4-3 4 3"/>'
      : '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="m8 13 4 3 4-3"/>';
  }

  function toggleAllBoxes() {
    const shouldCollapse = !areAllBoxesCollapsed();
    (appState.data.boxes || []).forEach(box => {
      box.collapsed = shouldCollapse;
    });
    appState.data.completedBoxCollapsed = shouldCollapse;
    persistLocalViewState();
    playUiSound(shouldCollapse ? "fold" : "unfold");
    renderBoard();
    updateAllBoxesToggleButton();
    showToast(shouldCollapse ? "Todas las casillas se plegaron" : "Todas las casillas se desplegaron");
  }

  function renderBoard() {
    // Save the viewport before rebuilding cards; detached controls can otherwise make mobile browsers jump.
    const viewportScrollX = Number.isFinite(window.scrollX) ? window.scrollX : (window.pageXOffset || 0);
    const viewportScrollY = Number.isFinite(window.scrollY) ? window.scrollY : (window.pageYOffset || 0);
    updateMetrics();
    const container = document.getElementById("boxes-container");
    if (!container) return;
    container.innerHTML = "";

    const sortedBoxes = appState.data.boxes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    // Preserve manual order inside each section: work due today first, then the completion summary,
    // then fully completed casillas and blue casillas with no unfinished task due today.
    const activeBoxesList = [];
    const completedBoxesList = [];
    const noTasksTodayBoxesList = [];
    const emptyBoxesList = [];
    sortedBoxes.forEach(box => {
      const boxTasks = appState.data.tasks.filter(task => String(task.boxId) === String(box.id));
      if (boxTasks.length === 0) {
        emptyBoxesList.push(box);
        return;
      }
      if (boxTasks.every(task => task.done)) {
        completedBoxesList.push(box);
        return;
      }

      const pendingTasks = boxTasks.filter(task => !task.done);
      const hasPendingToday = pendingTasks.some(task => isTaskForToday(task));

      // Section membership depends on unfinished work due today (including genuine overdue work).
      // A task completed today or a future focus/repeat task alone must not keep a blue box above the summary.
      if (hasPendingToday) {
        activeBoxesList.push(box);
      } else {
        noTasksTodayBoxesList.push(box);
      }
    });

    function renderSingleBoxCard(box, isEmptyStandby) {
      const boxTasksAll = appState.data.tasks
        .filter(t => t.boxId === box.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const pendingBoxTasks = boxTasksAll.filter(t => !t.done);
      const recurringTasksInBox = boxTasksAll.filter(t => isRecurringTaskRecord(t));
      const doneBoxTasks = boxTasksAll.filter(t => t.done);
      const doneTodayBoxTasks = doneBoxTasks.filter(t => isTaskForToday(t));

      // Rescheduled tasks disappear from the Casilla and live in Tareas Reprogramadas until their dueDate arrives
      let visibleTasks = [];
      if (appState.activeTab === "completed") {
        visibleTasks = doneBoxTasks.filter(t =>
          matchesSearch(t, box.name) || String(t.id) === String(appState.focusRevealTaskId || "")
        );
      } else {
        visibleTasks = pendingBoxTasks.filter(t =>
          (
            isTaskForToday(t) ||
            isTaskWithoutDeadlinePending(t) ||
            (!isRecurringTask(t) && getFocusPriorityLevel(t.id) > 0) ||
            String(t.id) === String(appState.focusRevealTaskId || "")
          ) &&
          matchesSearch(t, box.name)
        );
      }

      // Manual order is authoritative. Recurrence and focus priority stay visible as badges,
      // but must never override the sequence the user chose by dragging tasks.
      visibleTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

      if (appState.searchQuery && visibleTasks.length === 0 && !box.name.toLowerCase().includes(appState.searchQuery.toLowerCase())) {
        return;
      }

      const reschedInBox = pendingBoxTasks.filter(t => isTaskRescheduledFuture(t));
      const todayInBox = pendingBoxTasks.filter(t => isTaskForToday(t));
      const totalTodayBox = todayInBox.length + doneTodayBoxTasks.length;
      const pctTodayBox = totalTodayBox > 0 ? Math.round((doneTodayBoxTasks.length / totalTodayBox) * 100) : 0;

      // A task completed ahead of schedule is complete, but does not inflate today's planned progress.
      const isAllTasksRescheduled = boxTasksAll.length > 0 && todayInBox.length === 0 && doneTodayBoxTasks.length === 0 && reschedInBox.length > 0;
      const isFullyCompletedBox = boxTasksAll.length > 0 && pendingBoxTasks.length === 0;
      // Empty for today should share the calm blue theme even when tasks remain scheduled for later dates.
      const isNoTasksToday = todayInBox.length === 0 && doneTodayBoxTasks.length === 0;
      const isTodayFullyCompletedBox = totalTodayBox > 0 && todayInBox.length === 0 && doneTodayBoxTasks.length === totalTodayBox;

      const card = document.createElement("section");
      card.className = `box-card ${!appState.hasBootRendered ? "boot-animate" : ""} ${box.collapsed ? "collapsed" : ""} ${isFullyCompletedBox ? "box-fully-completed-theme" : ""} ${isTodayFullyCompletedBox && !isFullyCompletedBox ? "box-today-completed-theme" : ""} ${isEmptyStandby ? "box-empty-theme" : ""} ${isNoTasksToday ? "box-no-tasks-today-theme" : ""}`;
      card.dataset.boxId = box.id;

      // Point 2: No "X pendientes" pill in badgesHtml — replaced by the 34x34 colored number square in .box-header-actions!
      let badgesHtml = "";
      if (isEmptyStandby) {
        badgesHtml = `
          <span class="box-pill neutral">📭 Sin tareas registradas</span>
          <span class="box-pill blue">Casilla disponible</span>
        `;
      } else if (isFullyCompletedBox) {
        badgesHtml = `
          <span class="box-pill green">✓ Todas completadas</span>
          <span class="box-pill neutral">${doneBoxTasks.length} tarea${doneBoxTasks.length === 1 ? "" : "s"} finalizada${doneBoxTasks.length === 1 ? "" : "s"}</span>
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

      const rightLabel = (todayInBox.length === 0 && doneTodayBoxTasks.length === 0)
        ? "—"
        : `${doneTodayBoxTasks.length}/${totalTodayBox} hoy`;

      const barFillWidth = pctTodayBox;

      // Point 2: Colored 34x34px square badge showing ONLY the pending count number, same size as collapse/delete buttons
      const countSquareClass = todayInBox.length === 0
        ? "box-pending-count-box zero-count"
        : "box-pending-count-box";
      const countSquareNumber = todayInBox.length;
      const countSquareTipTitle = `📌 ${countSquareNumber} tarea${countSquareNumber === 1 ? "" : "s"} pendiente${countSquareNumber === 1 ? "" : "s"}`;
      const countSquareTipDesc = isAllTasksRescheduled
        ? `Todas las tareas de esta casilla (${reschedInBox.length}) están reprogramadas para otros días.`
        : `Número de tareas pendientes para hoy en ${box.name.toUpperCase()}.`;
      const recurringAuditButtonHtml = recurringTasksInBox.length
        ? '<button type="button" class="box-ctrl-btn recurring-audit-btn" data-box-action="recurring-audit" aria-label="Ver registro de tareas repetidas en ' + escapeHtml(box.name) + '" data-tip-title="Registro de tareas repetidas" data-tip-desc="Consulta las tareas recurrentes de esta casilla, los días configurados y las ocurrencias atrasadas."><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg><span class="recurring-audit-count">' + recurringTasksInBox.length + '</span></button>'
        : "";

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
              <h2 class="box-name" data-tip-title="✏️ Editar casilla" data-tip-desc="Haz clic para modificar el nombre o el emoji de esta casilla de trabajo.">${box.emoji ? `<span class="box-emoji" aria-hidden="true">${escapeHtml(box.emoji)}</span>` : ""}<span class="box-name-text">${escapeHtml(box.name.toUpperCase())}</span></h2>
            </div>
            <div class="box-badges-row">${badgesHtml}</div>
          </div>

          <div class="box-header-actions">
            <span class="${countSquareClass}" data-tip-title="${escapeHtml(countSquareTipTitle)}" data-tip-desc="${escapeHtml(countSquareTipDesc)}">${countSquareNumber}</span>
            ${recurringAuditButtonHtml}
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
              <textarea class="inline-add-input" rows="1" maxlength="10000" placeholder="Escribe una tarea o pega una lista (una tarea por línea; al pegar se registra automáticamente)." autocomplete="off"></textarea>
              <label class="inline-add-no-deadline-option" title="La tarea conserva su día programado, pero no se marcará como vencida.">
                <input type="checkbox" class="inline-add-no-deadline" />
                <span>Sin fecha límite</span>
              </label>
              <button type="submit" class="btn-primary" style="padding:7px 14px;font-size:0.8rem;">Guardar</button>
              <button type="button" class="btn-secondary" data-box-action="cancel-inline-add" style="padding:7px 11px;font-size:0.8rem;">✕</button>
            </form>
            <div class="task-memory-suggestions" aria-label="Sugerencias de tareas"></div>
          </div>
        </div>
      `;

      // Hold-to-Drag on Box Header (Point 7) & immediate fold/unfold gestures.
      const boxTopRow = card.querySelector(".box-top-row");
      let lastBoxPointerType = "";
      let pendingCardTap = null;
      let pendingBoxNameTap = null;
      const boxNameDoubleTapWindow = 500;

      // Detect the pointer actually used, not whether this device merely has a touch screen.
      // Hybrid laptops must keep mouse double-click enabled.
      card.addEventListener("pointerdown", event => {
        lastBoxPointerType = String(event.pointerType || "mouse").toLowerCase();
      }, true);

      const toggleBoxCollapsed = () => {
        cancelHoldCharge();
        box.collapsed = !box.collapsed;
        card.classList.toggle("collapsed", box.collapsed);
        playUiSound(box.collapsed ? "fold" : "unfold");
        persistLocalViewState();
        showToast(box.collapsed ? "Casilla plegada" : "Casilla desplegada");
      };

      boxTopRow.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button") || e.target.closest(".box-name")) return;
        beginHoldDrag("box", box.id, card, e.clientX, e.clientY);
      });

      // Touch screens do not reliably emit a native dblclick. Recognize a quick
      // second tap on the non-interactive card surface without affecting task controls.
      card.addEventListener("click", event => {
        if (lastBoxPointerType !== "touch") return;
        const target = event.target instanceof Element ? event.target : null;
        if (!target || target.closest(".box-name, button, input, textarea, select, a, .task-item, [contenteditable='true']")) return;
        if (pendingCardTap !== null) {
          clearTimeout(pendingCardTap);
          pendingCardTap = null;
          toggleBoxCollapsed();
        } else {
          pendingCardTap = window.setTimeout(() => {
            pendingCardTap = null;
          }, boxNameDoubleTapWindow);
        }
      });

      // Desktop mouse double-click toggles immediately. Ignore touch here because
      // its second tap is handled by the click recognizer above.
      card.addEventListener("dblclick", event => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || lastBoxPointerType === "touch" ||
            target.closest("button, input, textarea, select, a, .task-item, [contenteditable='true'], .box-name")) return;
        event.preventDefault();
        toggleBoxCollapsed();
      });

      const recurringAuditBtn = card.querySelector('[data-box-action="recurring-audit"]');
      if (recurringAuditBtn) recurringAuditBtn.addEventListener("click", () => {
        playUiSound("tap");
        openBoxRecurringAudit(box.id);
      });

      const copyBoxBtn = card.querySelector('[data-box-action="copy-box"]');
      if (copyBoxBtn) {
        copyBoxBtn.addEventListener("click", () => {
          const pendingTasksInBox = appState.data.tasks
            .filter(t => t.boxId === box.id && !t.done)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          const lines = [
            `${box.emoji ? box.emoji + " " : ""}${box.name.toUpperCase()}`,
            ""
          ];
          if (pendingTasksInBox.length === 0) {
            lines.push("(Sin tareas pendientes)");
          } else {
            pendingTasksInBox.forEach((t) => {
              lines.push(`• ${t.title}`);
            });
          }
          copyTextToClipboard(
            lines.join("\n"),
            `📋 Copiado: ${box.name.toUpperCase()} (${pendingTasksInBox.length} tarea${pendingTasksInBox.length === 1 ? "" : "s"} pendientes)`,
            copyBoxBtn
          );
        });
      }

      card.querySelector('[data-box-action="collapse"]').addEventListener("click", () => {
        toggleBoxCollapsed();
      });

      const boxNameElement = card.querySelector(".box-name");
      boxNameElement.addEventListener("click", () => {
        // Defer opening the editor briefly so a second click/tap can fold the box.
        // This works consistently with mouse, trackpad, touch and hybrid devices.
        if (pendingBoxNameTap !== null) {
          clearTimeout(pendingBoxNameTap);
          pendingBoxNameTap = null;
          toggleBoxCollapsed();
          return;
        }
        pendingBoxNameTap = window.setTimeout(() => {
          pendingBoxNameTap = null;
          playUiSound("modalOpen");
          openBoxModal(box.id);
        }, boxNameDoubleTapWindow);
      });

      function moveBoxWithinVisibleSection(direction) {
        // Up/down controls move a casilla within its current visible section.
        const sectionLists = [activeBoxesList, completedBoxesList, noTasksTodayBoxesList, emptyBoxesList];
        const section = sectionLists.find(list => list.some(entry => String(entry.id) === String(box.id)));
        if (!section) {
          showToast("No pude identificar la sección de esta casilla", true);
          return;
        }
        const currentIndex = section.findIndex(entry => String(entry.id) === String(box.id));
        const targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= section.length) {
          showToast(direction < 0
            ? "Esta casilla ya está al inicio de su sección"
            : "Esta casilla ya está al final de su sección");
          return;
        }

        const neighbor = section[targetIndex];
        const oldOrder = Number(box.order) || 0;
        box.order = Number(neighbor.order) || 0;
        neighbor.order = oldOrder;
        playUiSound("tap");
        saveData(false);
        renderBoard();
        showToast(direction < 0 ? "Casilla movida arriba" : "Casilla movida abajo");
      }

      card.querySelector('[data-box-action="move-up"]').addEventListener("click", () => {
        moveBoxWithinVisibleSection(-1);
      });

      card.querySelector('[data-box-action="move-down"]').addEventListener("click", () => {
        moveBoxWithinVisibleSection(1);
      });

      card.querySelector('[data-box-action="delete"]').addEventListener("click", () => {
        playUiSound("modalOpen");
        confirmDeleteBox(box.id);
      });

      const addBarBtn = card.querySelector('[data-box-action="show-inline-add"]');
      const inlineForm = card.querySelector(".inline-add-form");
      const inlineInput = card.querySelector(".inline-add-input");
      const inlineNoDeadlineInput = card.querySelector(".inline-add-no-deadline");
      const suggestionsBox = card.querySelector(".task-memory-suggestions");
      let activeSuggestionIdx = -1;

      autoCapitalizeInputEl(inlineInput);

      function resizeInlineInput() {
        if (!inlineInput) return;
        inlineInput.style.height = "auto";
        const minHeight = Number.parseFloat(getComputedStyle(inlineInput).minHeight) || 44;
        inlineInput.style.height = `${Math.max(minHeight, inlineInput.scrollHeight)}px`;
      }

      function closeInlineAddBox() {
        appState.keepInlineAddOpenBoxId = null;
        inlineForm.classList.remove("open");
        suggestionsBox.classList.remove("open");
        suggestionsBox.innerHTML = "";
        addBarBtn.style.display = "flex";
        inlineInput.value = "";
        resizeInlineInput();
        inlineInput.blur();
      }

      function renderInlineSuggestions() {
        if (/\r?\n/.test(inlineInput.value)) {
          activeSuggestionIdx = -1;
          suggestionsBox.classList.remove("open");
          suggestionsBox.innerHTML = "";
          return;
        }
        const matches = getTaskSuggestions(inlineInput.value, box.id);
        activeSuggestionIdx = -1;
        if (!matches.length) {
          suggestionsBox.classList.remove("open");
          suggestionsBox.innerHTML = "";
          return;
        }
        suggestionsBox.innerHTML = "";
        matches.forEach((suggestionText, sIdx) => {
          const row = document.createElement("div");
          row.className = "memory-suggestion-item";
          row.setAttribute("role", "option");
          row.setAttribute("aria-selected", "false");

          const chooseButton = document.createElement("button");
          chooseButton.type = "button";
          chooseButton.className = "memory-suggestion-select";
          chooseButton.innerHTML = `
            <span class="memory-suggestion-label">💡 ${escapeHtml(suggestionText)}</span>
            <span class="memory-suggestion-hint">Clic o Tab</span>
          `;
          chooseButton.addEventListener("mousedown", ev => {
            // Keep the input stable until the click handler saves the selected suggestion.
            ev.preventDefault();
          });
          chooseButton.addEventListener("click", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            activeSuggestionIdx = -1;
            suggestionsBox.classList.remove("open");
            saveInlineTask(suggestionText);
          });

          const dismissButton = document.createElement("button");
          dismissButton.type = "button";
          dismissButton.className = "memory-suggestion-dismiss";
          dismissButton.textContent = "×";
          dismissButton.setAttribute("aria-label", `Eliminar «${suggestionText}» de las sugerencias`);
          dismissButton.title = "Quitar de las sugerencias";
          dismissButton.addEventListener("mousedown", ev => ev.preventDefault());
          dismissButton.addEventListener("click", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            dismissTaskSuggestion(suggestionText, box.id);
            activeSuggestionIdx = -1;
            renderInlineSuggestions();
            inlineInput.focus();
          });

          row.appendChild(chooseButton);
          row.appendChild(dismissButton);
          suggestionsBox.appendChild(row);
        });
        suggestionsBox.classList.add("open");
      }

      function saveInlineTask(rawTitle, options = {}) {
        const noDeadline = Boolean(inlineNoDeadlineInput && inlineNoDeadlineInput.checked);
        // A pasted list becomes one task per non-empty line. Strip common list
        // markers without damaging measurements such as "1.80 m × 3.5–4 cm".
        const taskTitles = String(rawTitle || "")
          .split(/\r?\n/)
          .map(line => line.trim()
            .replace(/^(?:(?:[-*•▪◦‣]|\[\s*[xX]?\s*\]|\d{1,3}[.)])\s*)+/, "")
            .trim())
          .filter(Boolean)
          .map(capitalizeFirst);

        if (!taskTitles.length) {
          inlineInput.classList.add("input-invalid");
          setTimeout(() => inlineInput.classList.remove("input-invalid"), 400);
          showToast("Escribe una tarea o pega una lista", true);
          return false;
        }

        const timestamp = Date.now();
        const nextOrder = appState.data.tasks
          .filter(task => String(task.boxId) === String(box.id))
          .reduce((max, task) => Math.max(max, Number(task.order) || 0), -1) + 1;

        pushUndoSnapshot(taskTitles.length === 1
          ? `Añadir tarea: ${taskTitles[0]}`
          : `Añadir ${taskTitles.length} tareas en ${box.name}`);

        taskTitles.forEach((title, index) => {
          learnTaskTitle(title, box.id);
          appState.data.tasks.push({
            id: `task_${timestamp}_${index}_${Math.random().toString(36).slice(2, 8)}`,
            boxId: box.id,
            title,
            done: false,
            completedDate: null,
            createdAt: timestamp + index,
            dueDate: getTodayISO(),
            noDeadline,
            frequency: "once",
            repeatDays: [],
            rescheduledCount: 0,
            isRescheduled: false,
            order: nextOrder + index
          });
        });

        appState.keepInlineAddOpenBoxId = options.closeAfterSave ? null : box.id;
        inlineInput.value = "";
        resizeInlineInput();
        suggestionsBox.classList.remove("open");
        suggestionsBox.innerHTML = "";
        activeSuggestionIdx = -1;
        playUiSound("addTask");
        saveData(true, taskTitles.length === 1
          ? `Añadió tarea en ${box.name}`
          : `Añadió ${taskTitles.length} tareas en ${box.name}`);
        renderBoard();
        showToast(taskTitles.length === 1
          ? "Tarea agregada"
          : `Se agregaron ${taskTitles.length} tareas a ${box.name}`);
        return true;
      }

      // A multiline paste is treated as a complete task list and saved immediately.
      // Single-line pastes remain editable in the input as before.
      inlineInput.addEventListener("paste", event => {
        const pastedText = event.clipboardData?.getData("text/plain") || "";
        const pastedLines = pastedText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (pastedLines.length < 2) return;

        event.preventDefault();
        saveInlineTask(pastedText, { closeAfterSave: true });
      });

      inlineInput.addEventListener("input", () => {
        resizeInlineInput();
        renderInlineSuggestions();
      });

      // Point 4 & Point 1: ESC closes the task input box; Tab / ArrowDown navigates memory suggestions
      inlineInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          ev.stopPropagation();
          playUiSound("fold");
          closeInlineAddBox();
          return;
        }
        if (ev.key === "Enter") {
          const hasMultipleLines = /\r?\n/.test(inlineInput.value);
          if (ev.ctrlKey || ev.metaKey) {
            ev.preventDefault();
            inlineForm.requestSubmit();
            return;
          }
          // Keep Enter-to-save for a single task. In a pasted/typed list, Enter
          // inserts another line; use the Save button or Ctrl/Cmd+Enter to add all.
          if (!ev.shiftKey && !hasMultipleLines) {
            ev.preventDefault();
            inlineForm.requestSubmit();
            return;
          }
        }
        const items = Array.from(suggestionsBox.querySelectorAll(".memory-suggestion-item"));
        if (!items.length || !suggestionsBox.classList.contains("open")) return;

        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          activeSuggestionIdx = (activeSuggestionIdx + 1) % items.length;
          items.forEach((el, idx) => {
            el.classList.toggle("active", idx === activeSuggestionIdx);
            el.setAttribute("aria-selected", idx === activeSuggestionIdx ? "true" : "false");
          });
        } else if (ev.key === "ArrowUp") {
          ev.preventDefault();
          activeSuggestionIdx = (activeSuggestionIdx - 1 + items.length) % items.length;
          items.forEach((el, idx) => {
            el.classList.toggle("active", idx === activeSuggestionIdx);
            el.setAttribute("aria-selected", idx === activeSuggestionIdx ? "true" : "false");
          });
        } else if (ev.key === "Tab") {
          ev.preventDefault();
          const chosenIdx = activeSuggestionIdx >= 0 ? activeSuggestionIdx : 0;
          const matches = getTaskSuggestions(inlineInput.value, box.id);
          if (matches[chosenIdx]) {
            activeSuggestionIdx = -1;
            suggestionsBox.classList.remove("open");
            saveInlineTask(matches[chosenIdx]);
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
            suggestionsBox.classList.remove("open");
            saveInlineTask(matches[activeSuggestionIdx]);
            return;
          }
        }
        saveInlineTask(inlineInput.value);
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
          resizeInlineInput();
          inlineForm.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 30);
      }

      container.appendChild(card);
    }

    // First render casillas that have pending work for today (or an explicitly assigned focus priority).
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
        persistLocalViewState();
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

    // Completed casillas appear before blue casillas with no work scheduled for today.
    completedBoxesList.forEach(box => renderSingleBoxCard(box, false));
    noTasksTodayBoxesList.forEach(box => renderSingleBoxCard(box, false));
    emptyBoxesList.forEach(box => renderSingleBoxCard(box, true));

    appState.hasBootRendered = true;
    updateMultiSelectUI();
    renderFocusModePanel();
    updateAllBoxesToggleButton();

    // Restore after the layout settles, for completion, deletion, reorder and remote-sync updates too.
    const restoreViewport = () => {
      const currentX = Number.isFinite(window.scrollX) ? window.scrollX : (window.pageXOffset || 0);
      const currentY = Number.isFinite(window.scrollY) ? window.scrollY : (window.pageYOffset || 0);
      if (Math.abs(currentX - viewportScrollX) > 1 || Math.abs(currentY - viewportScrollY) > 1) {
        window.scrollTo(viewportScrollX, viewportScrollY);
      }
    };
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => window.requestAnimationFrame(restoreViewport));
    } else {
      restoreViewport();
    }
  }

  // Blur detached action buttons before rendering; the central renderer restores the viewport for all callers.
  function renderBoardPreservingScroll() {
    const board = document.getElementById("boxes-container");
    const focusedElement = document.activeElement;
    if (board && focusedElement && board.contains(focusedElement) && typeof focusedElement.blur === "function") {
      focusedElement.blur();
    }
    renderBoard();
  }

  function updateMultiSelectUI() {
    if (!appState.selectedTaskIds) appState.selectedTaskIds = new Set();
    const currentIds = new Set((appState.data.tasks || []).filter(task => !task.done).map(task => String(task.id)));
    Array.from(appState.selectedTaskIds).forEach(id => {
      if (!currentIds.has(String(id))) appState.selectedTaskIds.delete(id);
    });

    const toolbar = document.getElementById("multi-select-toolbar");
    const countLabel = document.getElementById("multi-select-count");
    const deleteButton = document.getElementById("btn-multi-delete");
    const todayButton = document.getElementById("btn-multi-today");
    const count = appState.selectedTaskIds.size;
    if (toolbar) toolbar.style.display = count > 0 ? "flex" : "none";
    if (countLabel) countLabel.textContent = String(count);
    if (deleteButton) deleteButton.style.display = count > 1 ? "inline-flex" : "none";
    if (todayButton) todayButton.style.display = count > 1 ? "inline-flex" : "none";

    document.querySelectorAll(".task-item[data-task-id]").forEach(row => {
      const selected = appState.selectedTaskIds.has(String(row.dataset.taskId));
      row.classList.toggle("multi-selected", selected);
      row.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function toggleTaskSelection(taskId) {
    const id = String(taskId);
    const task = appState.data.tasks.find(item => String(item.id) === id);
    if (!task) return;
    if (task.done) {
      showToast("Para esta acción, selecciona tareas pendientes.", true);
      return;
    }
    if (appState.selectedTaskIds.has(id)) appState.selectedTaskIds.delete(id);
    else appState.selectedTaskIds.add(id);
    updateMultiSelectUI();
  }

  function clearTaskSelection() {
    appState.selectedTaskIds.clear();
    updateMultiSelectUI();
  }

  function confirmDeleteSelectedTasks() {
    const selectedIds = Array.from(appState.selectedTaskIds || []).map(String);
    const selectedIdSet = new Set(selectedIds);
    const selectedTasks = appState.data.tasks.filter(task =>
      selectedIdSet.has(String(task.id)) && !task.done
    );
    if (!selectedTasks.length) {
      clearTaskSelection();
      showToast("Selecciona al menos una tarea pendiente para eliminar.", true);
      return;
    }

    const count = selectedTasks.length;
    const title = document.getElementById("confirm-modal-title");
    const message = document.getElementById("confirm-modal-msg");
    if (!title || !message) return;

    title.textContent = count === 1
      ? "¿Eliminar la tarea seleccionada?"
      : `¿Eliminar las ${count} tareas seleccionadas?`;
    message.textContent = `Se eliminarán ${count === 1 ? "el registro seleccionado" : "los registros seleccionados"}. Las demás tareas y las otras ocurrencias de sus repeticiones se conservarán.`;

    appState.confirmCallback = () => {
      const idsToRemove = selectedIds.filter(id =>
        appState.data.tasks.some(task => String(task.id) === id && !task.done)
      );
      if (!idsToRemove.length) {
        clearTaskSelection();
        showToast("Las tareas seleccionadas ya no están disponibles.", true);
        return;
      }
      removeTaskRecords(
        idsToRemove,
        `Eliminar ${idsToRemove.length} tareas seleccionadas`,
        idsToRemove.length === 1
          ? "Se eliminó 1 tarea seleccionada"
          : `Se eliminaron ${idsToRemove.length} tareas seleccionadas`
      );
      clearTaskSelection();
    };
    document.getElementById("modal-confirm").classList.add("open");
  }

  function updateTaskActionModalsAfterBulkChange() {
    const rescheduledModal = document.getElementById("modal-rescheduled-list");
    if (rescheduledModal && rescheduledModal.classList.contains("open")) renderRescheduledModalList();
    const overdueModal = document.getElementById("modal-overdue-list");
    if (overdueModal && overdueModal.classList.contains("open")) renderOverdueModalList();
  }

  function rescheduleSelectedTasksToTomorrow() {
    const selectedIds = new Set(Array.from(appState.selectedTaskIds).map(String));
    const tasks = appState.data.tasks.filter(task => selectedIds.has(String(task.id)) && !task.done);
    if (!tasks.length) {
      showToast("Selecciona al menos una tarea pendiente.", true);
      return;
    }

    pushUndoSnapshot(`Pasar ${tasks.length} tareas seleccionadas para mañana`);
    const tomorrowIso = addDaysISO(getTodayISO(), 1);
    tasks.forEach(task => {
      task.dueDate = tomorrowIso;
      task.isRescheduled = true;
      task.rescheduledCount = (task.rescheduledCount || 0) + 1;
    });

    playUiSound("reschedule");
    saveData(true, `Pasó ${tasks.length} tareas seleccionadas para mañana`);
    clearTaskSelection();
    renderBoardPreservingScroll();
    updateTaskActionModalsAfterBulkChange();
    showToast(tasks.length === 1 ? "☀️ 1 tarea pasada para mañana" : `☀️ ${tasks.length} tareas pasadas para mañana`);
  }

  function closeTaskContextMenu() {
    const menu = document.getElementById("task-context-menu");
    if (menu) {
      menu.hidden = true;
      menu.innerHTML = "";
      menu.dataset.taskId = "";
    }
  }

  function ensureTaskContextMenu() {
    let menu = document.getElementById("task-context-menu");
    if (menu) return menu;

    menu = document.createElement("div");
    menu.id = "task-context-menu";
    menu.className = "task-context-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Opciones de tarea");
    menu.hidden = true;
    document.body.appendChild(menu);

    menu.addEventListener("click", event => {
      const button = event.target.closest("[data-context-action]");
      if (!button || button.disabled) return;
      const action = button.dataset.contextAction;
      const taskId = menu.dataset.taskId;
      const slot = button.dataset.prioritySlot === undefined
        ? -1
        : Number(button.dataset.prioritySlot) - 1;
      closeTaskContextMenu();
      handleTaskContextAction(action, taskId, slot);
    });

    document.addEventListener("pointerdown", event => {
      const currentMenu = document.getElementById("task-context-menu");
      if (currentMenu && !currentMenu.hidden && !currentMenu.contains(event.target)) {
        closeTaskContextMenu();
      }
    }, true);
    window.addEventListener("resize", closeTaskContextMenu);
    window.addEventListener("scroll", event => {
      const currentMenu = document.getElementById("task-context-menu");
      if (currentMenu && !currentMenu.hidden && !currentMenu.contains(event.target)) {
        closeTaskContextMenu();
      }
    }, true);
    return menu;
  }

  function addTaskContextMenuButton(menu, label, action, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `task-context-menu-item ${options.danger ? "is-danger" : ""} ${options.priorityClass || ""}`.trim();
    button.setAttribute("role", "menuitem");
    button.dataset.contextAction = action;
    button.textContent = label;
    if (options.prioritySlot !== undefined) button.dataset.prioritySlot = String(options.prioritySlot);
    if (options.disabled) button.disabled = true;
    if (options.title) button.title = options.title;
    menu.appendChild(button);
    return button;
  }

  function addTaskContextMenuDivider(menu) {
    const divider = document.createElement("div");
    divider.className = "task-context-menu-divider";
    divider.setAttribute("role", "separator");
    menu.appendChild(divider);
  }

  function openTaskContextMenu(taskId, x, y) {
    const task = appState.data.tasks.find(entry => String(entry.id) === String(taskId));
    if (!task) return;
    const menu = ensureTaskContextMenu();
    menu.innerHTML = "";
    menu.dataset.taskId = String(task.id);

    const heading = document.createElement("div");
    heading.className = "task-context-menu-heading";
    const headingLabel = document.createElement("span");
    headingLabel.textContent = "OPCIONES DE TAREA";
    const headingTitle = document.createElement("strong");
    headingTitle.textContent = task.title || "Tarea sin título";
    headingTitle.title = task.title || "Tarea sin título";
    heading.append(headingLabel, headingTitle);
    menu.appendChild(heading);

    addTaskContextMenuButton(menu, task.done ? "↩ Reabrir tarea" : "✓ Marcar como completada", "toggle-done");
    addTaskContextMenuButton(menu, "✏️ Editar tarea", "edit");
    addTaskContextMenuButton(menu, "📋 Copiar texto", "copy");
    if (!isRecurringTask(task)) {
      addTaskContextMenuButton(
        menu,
        task.noDeadline ? "⏳ Volver a activar fecha límite" : "∞ Sin fecha límite",
        "toggle-no-deadline",
        { title: "Conserva el día programado, pero evita marcar la tarea como vencida si no la completas ese día." }
      );
    }
    if (!task.done && isTaskOverdue(task)) {
      addTaskContextMenuButton(menu, "☀️ Pasar para hoy", "move-today", {
        title: "Mueve esta tarea atrasada a la lista de hoy y conserva su fecha de vencimiento original."
      });
    }
    if (!task.done) addTaskContextMenuButton(menu, "☀️ Pasar para mañana", "tomorrow");
    addTaskContextMenuButton(menu, "📅 Reprogramar fecha", "reschedule");
    addTaskContextMenuButton(menu, "🔁 Configurar repetición", "repeat");

    addTaskContextMenuDivider(menu);
    const box = appState.data.boxes.find(entry => String(entry.id) === String(task.boxId));
    const priorityHeading = document.createElement("div");
    priorityHeading.className = "task-context-menu-section-label";
    priorityHeading.textContent = `PRIORIDADES DE ${box ? box.name : "ESTA CASILLA"}`;
    menu.appendChild(priorityHeading);

    const plan = getFocusBoxPlanForToday(task.boxId);
    const currentPriorityIndex = plan.taskIds.findIndex(id => id && String(id) === String(task.id));
    const eligibleForPriority = !task.done && isTaskForToday(task);
    const priorityNames = [
      { number: 1, color: "Rojo", css: "p1" },
      { number: 2, color: "Amarillo", css: "p2" },
      { number: 3, color: "Verde", css: "p3" }
    ];

    priorityNames.forEach(priority => {
      const slotIndex = priority.number - 1;
      const occupiedId = plan.taskIds[slotIndex] || "";
      const owner = occupiedId
        ? appState.data.tasks.find(entry => String(entry.id) === String(occupiedId))
        : null;
      const occupiedByOther = Boolean(occupiedId && String(occupiedId) !== String(task.id));
      let label;
      let disabled = false;
      let title = "";

      if (occupiedByOther) {
        label = `P${priority.number} · Ocupada: ${owner ? owner.title : "otra tarea"}`;
        disabled = true;
        title = owner ? `Esta prioridad ya corresponde a: ${owner.title}` : "Esta prioridad ya está ocupada.";
      } else if (occupiedId && String(occupiedId) === String(task.id)) {
        label = `✓ P${priority.number} · Ya asignada`;
        disabled = true;
        title = "Esta tarea ya ocupa esta prioridad.";
      } else if (!eligibleForPriority) {
        label = `P${priority.number} · Solo hoy o atrasadas`;
        disabled = true;
        title = "Solo se pueden priorizar tareas pendientes para hoy o atrasadas.";
      } else {
        label = currentPriorityIndex >= 0
          ? `Mover a P${priority.number} · ${priority.color}`
          : `Asignar P${priority.number} · ${priority.color}`;
      }

      addTaskContextMenuButton(menu, label, "assign-priority", {
        prioritySlot: priority.number,
        priorityClass: `task-context-menu-priority-${priority.css}`,
        disabled,
        title
      });
    });

    if (currentPriorityIndex >= 0) {
      addTaskContextMenuButton(menu, `Quitar prioridad actual (P${currentPriorityIndex + 1})`, "clear-priority");
    }

    addTaskContextMenuDivider(menu);
    addTaskContextMenuButton(menu, "🗑️ Eliminar tarea", "delete", { danger: true });

    menu.hidden = false;
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 280))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - 420))}px`;
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;

    // Do not autofocus an item here: some browsers scroll focused buttons into view,
    // which would trigger the menu's scroll-to-dismiss handler immediately.
  }

  function assignTaskToFocusPriority(taskId, slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return;
    const task = appState.data.tasks.find(entry => String(entry.id) === String(taskId));
    if (!task || task.done || !isTaskForToday(task)) {
      showToast("Solo puedes priorizar tareas pendientes para hoy o atrasadas", true);
      return;
    }

    const today = getTodayISO();
    const plan = getFocusBoxPlanForToday(task.boxId);
    const currentTargetId = plan.taskIds[slot] || "";
    if (currentTargetId && String(currentTargetId) !== String(task.id)) {
      const occupiedTask = appState.data.tasks.find(entry => String(entry.id) === String(currentTargetId));
      showToast(`P${slot + 1} de esta casilla ya está ocupada${occupiedTask ? `: ${occupiedTask.title}` : ""}`, true);
      return;
    }

    const previousSlot = plan.taskIds.findIndex(id => id && String(id) === String(task.id));
    if (previousSlot === slot) {
      showToast(`Esta tarea ya es P${slot + 1} de su casilla`);
      return;
    }

    const nextIds = plan.taskIds.slice();
    if (previousSlot >= 0) nextIds[previousSlot] = "";
    nextIds[slot] = String(task.id);
    saveFocusBoxPlan(task.boxId, nextIds, today);
    saveData(false, `Asignó P${slot + 1} en su casilla: ${task.title}`);
    playUiSound("tap");
    renderBoard();
    showToast(previousSlot >= 0
      ? `Tarea movida a P${slot + 1} de su casilla`
      : `Tarea asignada como P${slot + 1} en su casilla`);
  }

  function toggleTaskNoDeadline(taskId) {
    const task = appState.data.tasks.find(entry => String(entry.id) === String(taskId));
    if (!task) return;
    if (isRecurringTask(task)) {
      showToast("Esta opción está disponible para tareas sin repetición.", true);
      return;
    }

    pushUndoSnapshot(task.noDeadline
      ? `Activar fecha límite: ${task.title}`
      : `Quitar fecha límite: ${task.title}`);
    task.noDeadline = !Boolean(task.noDeadline);
    if (task.noDeadline) {
      delete task.overdueSince;
      delete task.overdueCarryDate;
    }
    saveData(true, task.noDeadline
      ? `Quitó la fecha límite: ${task.title}`
      : `Reactivó la fecha límite: ${task.title}`);
    playUiSound("tap");
    renderBoardPreservingScroll();
    showToast(task.noDeadline
      ? "∞ Sin fecha límite: se conserva el día programado"
      : "Fecha límite activada: la tarea podrá marcarse como atrasada");
  }

  function handleTaskContextAction(action, taskId, slot = -1) {
    const task = appState.data.tasks.find(entry => String(entry.id) === String(taskId));
    if (!task) {
      showToast("Esta tarea ya no está disponible", true);
      return;
    }

    switch (action) {
      case "toggle-done": {
        const row = Array.from(document.querySelectorAll(".task-item[data-task-id]"))
          .find(element => String(element.dataset.taskId) === String(task.id));
        toggleTaskDone(task.id, row ? row.querySelector(".task-check-circle") : null);
        break;
      }
      case "edit":
        playUiSound("modalOpen");
        openEditTaskTitleModal(task.id);
        break;
      case "copy":
        copyTextToClipboard(task.title, "📋 Tarea copiada al portapapeles");
        break;
      case "toggle-no-deadline":
        toggleTaskNoDeadline(task.id);
        break;
      case "move-today": {
        scheduleOverdueTaskOrSelectedGroup(task);
        break;
      }
      case "tomorrow": {
        if (task.done) return;
        // If this task belongs to a Ctrl/Cmd selection, apply tomorrow to every selected task.
        if (appState.selectedTaskIds && appState.selectedTaskIds.size > 1 &&
            appState.selectedTaskIds.has(String(task.id))) {
          rescheduleSelectedTasksToTomorrow();
          break;
        }
        pushUndoSnapshot(`Pasar para mañana: ${task.title}`);
        task.dueDate = addDaysISO(getTodayISO(), 1);
        task.isRescheduled = true;
        task.rescheduledCount = (task.rescheduledCount || 0) + 1;
        playUiSound("reschedule");
        saveData(true, `Pasó para mañana: ${task.title}`);
        renderBoardPreservingScroll();
        showToast("Pasada para mañana ☀️");
        break;
      }
      case "reschedule":
        playUiSound("tap");
        openDatePickerModal(task.id);
        break;
      case "repeat":
        playUiSound("tap");
        openRepeatPickerModal(task.id);
        break;
      case "assign-priority":
        assignTaskToFocusPriority(task.id, slot);
        break;
      case "clear-priority": {
        const plan = getFocusBoxPlanForToday(task.boxId);
        const index = plan.taskIds.findIndex(id => id && String(id) === String(task.id));
        if (index >= 0) setFocusPriority(task.boxId, index, "");
        break;
      }
      case "delete":
        playUiSound("tap");
        deleteTask(task.id);
        break;
      default:
        break;
    }
  }

  function createTaskRowElement(task, box, showOriginBox = false) {
    const item = document.createElement("div");
    const focusPriority = getFocusPriorityLevel(task.id);
    item.className = `task-item ${task.done ? "done" : ""} ${appState.selectedTaskIds && appState.selectedTaskIds.has(String(task.id)) ? "multi-selected" : ""} ${focusPriority ? `focus-priority-task focus-priority-${focusPriority}` : ""}`;
    item.dataset.taskId = task.id;
    if (focusPriority) item.dataset.focusPriority = `P${focusPriority}`;

    const isResched = isTaskRescheduledFuture(task);
    const isOverdue = isTaskOverdue(task);
    const isCarriedToTodayFromOverdue = isTaskCarriedToTodayFromOverdue(task);
    const isUpcomingRepeat = isTaskUpcomingRepeat(task);
    const repeatLabel = formatRepeatBadgeLabel(task);
    const hasRepeat = Boolean(repeatLabel);

    let subBadges = "";
    if (focusPriority) {
      subBadges += `<span class="task-focus-priority-badge task-focus-priority-badge-p${focusPriority}">P${focusPriority} · PRIORIDAD ${focusPriority}</span>`;
    }
    if (hasRepeat) {
      subBadges += `<span class="task-daily-pill">${escapeHtml(repeatLabel)}</span>`;
    }
    if (task.noDeadline) {
      const plannedDateLabel = task.dueDate ? ` · Programada ${formatSpanishDateLong(task.dueDate)}` : "";
      subBadges += `<span class="task-no-deadline-tag" title="Conserva su día programado, pero nunca se marcará como vencida.">∞ Sin fecha límite${escapeHtml(plannedDateLabel)}</span>`;
    }
    if (isUpcomingRepeat) {
      subBadges += `<span class="task-upcoming-tag">🗓️ Próxima · ${escapeHtml(formatSpanishDateLong(task.dueDate))}</span>`;
    }
    if (isCarriedToTodayFromOverdue) {
      const originalOverdueDate = task.overdueSince || getTaskOverdueDisplayDate(task);
      subBadges += `<span class="task-carried-today-tag" title="Esta tarea estaba atrasada y fue trasladada a la lista de hoy.">↪ Venía atrasada · Pasada para hoy · Vencía el ${escapeHtml(formatSpanishDateLong(originalOverdueDate))}</span>`;
    } else if (isOverdue) {
      subBadges += `<span class="task-overdue-tag">⚠️ Atrasada · ${escapeHtml(formatSpanishDateLong(getTaskOverdueDisplayDate(task)))}</span>`;
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
        <button type="button" class="task-check-circle" ${isUpcomingRepeat ? "disabled" : ""} aria-label="${isUpcomingRepeat ? `Disponible el ${escapeHtml(formatSpanishDateLong(task.dueDate))}` : "Completar tarea"}" data-tip-title="✓ Marcar como completada" data-tip-desc="${isUpcomingRepeat ? `Estará disponible el ${escapeHtml(formatSpanishDateLong(task.dueDate))}.` : "Registra el cumplimiento de esta tarea y actualiza tu progreso diario."}">
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
        ${isOverdue ? `
        <button type="button" class="task-act-btn overdue-today-btn" data-task-action="move-today" aria-label="Pasar tarea atrasada para hoy" data-tip-title="☀️ Pasar para hoy" data-tip-desc="Mueve esta tarea atrasada a tu lista de hoy. Se conserva su fecha de vencimiento original.">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="17" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
            <path d="m8.5 15 2.2 2.2 4.8-4.8"/>
          </svg>
        </button>
        ` : ""}
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
        <button type="button" class="task-act-btn task-mobile-more" aria-label="Más opciones de tarea" data-task-action="mobile-more">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
        </button>
      </div>
    `;

    // Point 8: Hold-to-Drag works on any blank space of the task or even holding on the row
    item.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.target.closest("button") || e.target.closest("input")) return;
      beginHoldDrag("task", task.id, item, e.clientX, e.clientY);
    });

    item.addEventListener("contextmenu", event => {
      event.preventDefault();
      event.stopPropagation();
      openTaskContextMenu(task.id, event.clientX, event.clientY);
    });

    // Ctrl-click (Windows/Linux) or Cmd-click (macOS) toggles selection without editing or dragging.
    item.addEventListener("click", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.target.closest("button, input, select, textarea, a, .drag-handle")) return;
      e.preventDefault();
      e.stopPropagation();
      toggleTaskSelection(task.id);
    }, true);

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

    const moveOverdueToTodayButton = item.querySelector('[data-task-action="move-today"]');
    if (moveOverdueToTodayButton) {
      moveOverdueToTodayButton.addEventListener("click", event => {
        event.stopPropagation();
        scheduleOverdueTaskOrSelectedGroup(task);
      });
    }

    // Point 3: Sun button on task row passes the task to Tomorrow (Mañana)
    item.querySelector('[data-task-action="today"]').addEventListener("click", () => {
      // A row action on a selected task acts on the whole Ctrl/Cmd-selected group.
      if (appState.selectedTaskIds && appState.selectedTaskIds.size > 1 &&
          appState.selectedTaskIds.has(String(task.id))) {
        rescheduleSelectedTasksToTomorrow();
        return;
      }
      pushUndoSnapshot(`Pasar para mañana: ${task.title}`);
      playUiSound("reschedule");
      const tomorrowIso = addDaysISO(getTodayISO(), 1);
      task.dueDate = tomorrowIso;
      task.isRescheduled = true;
      task.rescheduledCount = (task.rescheduledCount || 0) + 1;
      saveData(true, `Pasó para mañana: ${task.title}`);
      renderBoardPreservingScroll();
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
      playUiSound("tap");
      deleteTask(task.id);
    });
    const mobileMoreButton = item.querySelector('[data-task-action="mobile-more"]');
    if (mobileMoreButton) mobileMoreButton.addEventListener("click", event => {
      event.stopPropagation();
      playUiSound("tap");
      const rect = mobileMoreButton.getBoundingClientRect();
      openTaskContextMenu(task.id, rect.left, rect.bottom + 8);
    });

    return item;
  }

  function recordTaskCompletionEvent(task, completed, date = getTodayISO(), options = {}) {
    if (!task) return;
    const id = completionEventId(task.id, date);
    const existingLog = normalizeCompletionLog(appState.data.completionLog);
    const existingIndex = existingLog.findIndex(entry => entry.id === id);
    const box = appState.data.boxes.find(entry => String(entry.id) === String(task.boxId));
    const now = Date.now();
    const completedAt = Number(options.completedAt || now);
    const event = {
      id,
      taskId: String(task.id),
      title: String(task.title || "Tarea sin título"),
      boxId: String(task.boxId || ""),
      boxName: box ? String(box.name || "CASILLA") : "Casilla no disponible",
      completedDate: date,
      completedAt,
      updatedAt: now,
      frequency: String(task.frequency || "once"),
      reversed: !completed,
      timeKnown: options.timeKnown !== false
    };
    if (existingIndex >= 0) existingLog[existingIndex] = event;
    else existingLog.push(event);
    appState.data.completionLog = normalizeCompletionLog(existingLog);
  }

  function ensureCompletionLogIncludesCurrentDoneTasks() {
    const records = normalizeCompletionLog(appState.data.completionLog);
    const knownIds = new Set(records.map(entry => entry.id));
    let changed = false;
    const today = getTodayISO();

    appState.data.tasks.filter(task => task && task.done).forEach(task => {
      const date = String(task.completedDate || today).slice(0, 10);
      const id = completionEventId(task.id, date);
      if (knownIds.has(id)) return;
      const box = appState.data.boxes.find(entry => String(entry.id) === String(task.boxId));
      const estimatedTime = date === today
        ? Date.now()
        : new Date(`${date}T12:00:00`).getTime();
      records.push({
        id,
        taskId: String(task.id),
        title: String(task.title || "Tarea sin título"),
        boxId: String(task.boxId || ""),
        boxName: box ? String(box.name || "CASILLA") : "Casilla no disponible",
        completedDate: date,
        completedAt: estimatedTime,
        updatedAt: Date.now(),
        frequency: String(task.frequency || "once"),
        reversed: false,
        timeKnown: false
      });
      knownIds.add(id);
      changed = true;
    });

    if (changed) {
      appState.data.completionLog = normalizeCompletionLog(records);
      saveData(false, "Registró tareas completadas previamente");
    }
  }

  let completionHistoryPeriod = "today";

  function renderCompletionHistory() {
    const list = document.getElementById("completion-history-list");
    const summary = document.getElementById("completion-history-summary");
    const rangeLabel = document.getElementById("completion-history-range");
    if (!list || !summary || !rangeLabel) return;

    const today = getTodayISO();
    const weekStart = getLearningWeekStartISO(today);
    const weekEnd = addDaysISO(weekStart, 6);
    const allEvents = normalizeCompletionLog(appState.data.completionLog).filter(event => !event.reversed);
    const visibleEvents = allEvents.filter(event => completionHistoryPeriod === "today"
      ? event.completedDate === today
      : event.completedDate >= weekStart && event.completedDate <= weekEnd);

    rangeLabel.textContent = completionHistoryPeriod === "today"
      ? `Hoy · ${formatLearningDate(today)}`
      : `${formatLearningDate(weekStart)} – ${formatLearningDate(weekEnd)}`;
    summary.textContent = visibleEvents.length
      ? `${visibleEvents.length} tarea${visibleEvents.length === 1 ? "" : "s"} completada${visibleEvents.length === 1 ? "" : "s"} ${completionHistoryPeriod === "today" ? "hoy" : "esta semana"}`
      : `Todavía no hay tareas registradas como completadas ${completionHistoryPeriod === "today" ? "hoy" : "esta semana"}.`;
    list.innerHTML = "";

    if (!visibleEvents.length) {
      const empty = document.createElement("div");
      empty.className = "completion-history-empty";
      empty.textContent = "Cuando marques una tarea como completada, aparecerá aquí con su casilla y fecha.";
      list.appendChild(empty);
      return;
    }

    const groups = new Map();
    visibleEvents.forEach(event => {
      if (!groups.has(event.completedDate)) groups.set(event.completedDate, []);
      groups.get(event.completedDate).push(event);
    });
    Array.from(groups.keys()).sort((a, b) => b.localeCompare(a)).forEach(date => {
      if (completionHistoryPeriod === "week") {
        const heading = document.createElement("h4");
        heading.className = "completion-history-day-heading";
        heading.textContent = date === today ? `Hoy · ${formatLearningDate(date, { year: true })}` : formatLearningDate(date, { year: true });
        list.appendChild(heading);
      }
      const group = document.createElement("div");
      group.className = "completion-history-day-list";
      groups.get(date).sort((a, b) => Number(b.completedAt || 0) - Number(a.completedAt || 0)).forEach(event => {
        const row = document.createElement("article");
        row.className = "completion-history-item";

        const check = document.createElement("span");
        check.className = "completion-history-check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = "✓";

        const details = document.createElement("div");
        details.className = "completion-history-details";
        const title = document.createElement("strong");
        title.className = "completion-history-task-title";
        title.textContent = event.title;
        const metadata = document.createElement("span");
        metadata.className = "completion-history-task-box";
        metadata.textContent = event.boxName;
        const time = document.createElement("span");
        time.className = "completion-history-task-time";
        time.textContent = event.timeKnown
          ? new Date(Number(event.completedAt)).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
          : "Hora no registrada";
        details.appendChild(title);
        details.appendChild(metadata);
        details.appendChild(time);
        row.appendChild(check);
        row.appendChild(details);
        group.appendChild(row);
      });
      list.appendChild(group);
    });
  }

  const BIRTHDAY_MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const BIRTHDAY_WEEKDAY_NAMES = ["L", "M", "X", "J", "V", "S", "D"];
  let birthdayCalendarYear = new Date().getFullYear();
  let birthdayCalendarMonth = new Date().getMonth();
  let birthdayCalendarMode = "year";
  let birthdayUpcomingExpanded = false;
  let birthdayUpcomingTodayOnly = false;

  function getActiveBirthdays() {
    return normalizeBirthdays(appState.data.birthdays).filter(entry => !entry.deleted);
  }

  function getBirthdayMonthDayKey(birthday) {
    return String(birthday.month).padStart(2, "0") + "-" + String(birthday.day).padStart(2, "0");
  }

  function getNextBirthdayOccurrence(birthday, fromDate = getTodayISO()) {
    const currentYear = Number(String(fromDate).slice(0, 4));
    for (let offset = 0; offset <= 8; offset++) {
      const year = currentYear + offset;
      const candidate = `${year}-${String(birthday.month).padStart(2, "0")}-${String(birthday.day).padStart(2, "0")}`;
      const candidateDate = new Date(`${candidate}T12:00:00`);
      if (candidateDate.getMonth() + 1 !== birthday.month || candidateDate.getDate() !== birthday.day) continue;
      if (candidate >= fromDate) return candidate;
    }
    return "";
  }

  function getBirthdayDayDifference(fromDate, toDate) {
    const from = new Date(`${String(fromDate).slice(0, 10)}T12:00:00`);
    const to = new Date(`${String(toDate).slice(0, 10)}T12:00:00`);
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  function formatBirthdayAge(birthday, occurrenceDate) {
    if (!birthday.birthYear) return "";
    const age = Number(String(occurrenceDate).slice(0, 4)) - Number(birthday.birthYear);
    return age >= 0 ? `Cumple ${age}` : "";
  }

  function groupBirthdaysByDay(month, year) {
    const grouped = new Map();
    getActiveBirthdays().forEach(birthday => {
      const maxDay = month === 2 ? 29 : new Date(2024, month, 0).getDate();
      if (birthday.month !== month || birthday.day < 1 || birthday.day > maxDay) return;
      const list = grouped.get(birthday.day) || [];
      list.push(birthday);
      grouped.set(birthday.day, list);
    });
    grouped.forEach(list => list.sort((a, b) => a.name.localeCompare(b.name, "es")));
    return grouped;
  }

  function getBirthdayBalloonInitial(birthday) {
    const name = String(birthday && birthday.name || "").trim();
    if (!name) return "?";
    const tokens = name.split(/\s+/).filter(Boolean);
    const normalizeToken = token => String(token || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toLocaleLowerCase("es");
    // Relationship labels describe the person; use the actual name that follows.
    const roleLabels = new Set([
      "hermanito", "hermanita", "hermano", "hermana", "hermanos",
      "mama", "papa", "abuela", "abuelo", "abuelita", "abuelito",
      "tia", "tio", "tita", "tito", "prima", "primo",
      "sobrina", "sobrino", "madrina", "padrino", "madrinita", "padrinito",
      "bebe", "nene", "nena", "hijito", "hijita", "hijo", "hija"
    ]);
    const firstName = tokens.find(token => !roleLabels.has(normalizeToken(token))) || tokens[0];
    const key = normalizeToken(firstName);
    // "Cati" is shown as K, as requested for this calendar.
    const initialOverrides = { cati: "K" };
    if (initialOverrides[key]) return initialOverrides[key];
    const letters = firstName.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-zA-Z0-9]/);
    return letters ? letters[0].toLocaleUpperCase("es") : "?";
  }

  function buildBirthdayMonthHtml(year, zeroBasedMonth, compact = false) {
    const month = zeroBasedMonth + 1;
    const firstDay = (new Date(year, zeroBasedMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, zeroBasedMonth + 1, 0).getDate();
    const birthdaysByDay = groupBirthdaysByDay(month, year);
    const today = getTodayISO();
    const monthTitle = BIRTHDAY_MONTH_NAMES[zeroBasedMonth];

    let html = `<div class="birthday-month-weekdays" aria-hidden="true">${BIRTHDAY_WEEKDAY_NAMES.map(day => `<span>${day}</span>`).join("")}</div><div class="birthday-month-days ${compact ? "is-compact" : "is-expanded"}">`;
    for (let blank = 0; blank < firstDay; blank++) html += `<span class="birthday-day-blank" aria-hidden="true"></span>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const birthdays = birthdaysByDay.get(day) || [];
      const isToday = dateIso === today;
      const names = birthdays.map(item => item.name).join(", ");
      const visibleBirthdays = birthdays.slice(0, 3);
      const birthdayBalloons = birthdays.length
        ? `<span class="birthday-day-balloons ${compact ? "is-compact" : "is-expanded"}">${visibleBirthdays.map((item, index) => {
            const initial = getBirthdayBalloonInitial(item);
            return `<span class="birthday-balloon birthday-balloon--${index % 8}" title="${escapeHtml(item.name)}" aria-label="${escapeHtml(item.name)}"><span class="birthday-balloon-initial" aria-hidden="true">${escapeHtml(initial)}</span><i></i></span>`;
          }).join("")}${birthdays.length > visibleBirthdays.length ? `<span class="birthday-balloons-overflow">+${birthdays.length - visibleBirthdays.length}</span>` : ""}</span>`
        : "";
      html += `<button type="button" class="birthday-day-cell ${birthdays.length ? "has-birthday" : ""} ${isToday ? "is-today" : ""} ${compact ? "is-compact" : "is-expanded"}" data-birthday-date="${dateIso}" title="${escapeHtml(names ? `${names} · Agregar cumpleaños en esta fecha` : `Agregar cumpleaños el ${day} de ${monthTitle.toLowerCase()}`)}" aria-label="${escapeHtml(`${day} de ${monthTitle.toLowerCase()} de ${year}${names ? `: ${names}` : ""}`)}"><span class="birthday-day-number">${day}</span>${birthdayBalloons}</button>`;
    }
    html += "</div>";
    return html;
  }

  function renderBirthdayMonthEvents() {
    const list = document.getElementById("birthday-month-events-list");
    const title = document.getElementById("birthday-month-events-title");
    const count = document.getElementById("birthday-month-events-count");
    if (!list || !title || !count) return;
    const birthdays = getActiveBirthdays()
      .filter(entry => entry.month === birthdayCalendarMonth + 1)
      .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, "es"));
    title.textContent = `Cumpleaños de ${BIRTHDAY_MONTH_NAMES[birthdayCalendarMonth]}`;
    count.textContent = String(birthdays.length);
    if (!birthdays.length) {
      list.innerHTML = `<div class="birthday-empty-state"><span>🌷</span><strong>No hay cumpleaños este mes</strong><p>Pulsa un día del calendario o «Agregar cumpleaños» para registrar uno.</p></div>`;
      return;
    }
    list.innerHTML = birthdays.map(entry => {
      const occurrence = `${birthdayCalendarYear}-${String(entry.month).padStart(2, "0")}-${String(entry.day).padStart(2, "0")}`;
      const dateLabel = new Date(`${occurrence}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "long" });
      return `<button type="button" class="birthday-event-row" data-birthday-edit-id="${escapeHtml(entry.id)}">
        <span class="birthday-event-day"><strong>${entry.day}</strong><small>${BIRTHDAY_MONTH_NAMES[entry.month - 1].slice(0, 3)}</small></span>
        <span class="birthday-event-copy"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(dateLabel)}${entry.birthYear ? ` · Nació en ${entry.birthYear}` : ""}</span>${entry.notes ? `<small>${escapeHtml(entry.notes)}</small>` : ""}</span>
        <span class="birthday-event-edit" aria-hidden="true">Editar ›</span>
      </button>`;
    }).join("");
  }

  function renderBirthdayUpcomingList() {
    const list = document.getElementById("birthday-upcoming-list");
    const total = document.getElementById("birthday-total-count");
    const toggle = document.getElementById("btn-toggle-birthday-upcoming");
    const buttonCount = document.getElementById("birthday-count");
    const highlightTitle = document.getElementById("birthday-upcoming-title");
    const highlightSubtitle = document.getElementById("birthday-upcoming-subtitle");
    if (!list || !total || !buttonCount || !highlightTitle || !highlightSubtitle) return;
    list.hidden = !birthdayUpcomingExpanded;
    if (toggle) {
      toggle.setAttribute("aria-expanded", birthdayUpcomingExpanded ? "true" : "false");
      toggle.classList.toggle("is-expanded", birthdayUpcomingExpanded);
    }

    const today = getTodayISO();
    const upcoming = getActiveBirthdays().map(entry => ({
      ...entry,
      nextDate: getNextBirthdayOccurrence(entry, today)
    })).filter(entry => entry.nextDate)
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.name.localeCompare(b.name, "es"));
    const visibleBirthdays = birthdayUpcomingTodayOnly
      ? upcoming.filter(entry => entry.nextDate === today)
      : upcoming;

    renderDateBirthdayShortcut();
    total.textContent = String(visibleBirthdays.length);
    buttonCount.textContent = String(upcoming.length);
    const toggleTitle = toggle && toggle.querySelector(".birthday-upcoming-toggle-copy strong");
    const toggleSubtitle = toggle && toggle.querySelector(".birthday-upcoming-toggle-copy small");
    if (toggleTitle) toggleTitle.textContent = birthdayUpcomingTodayOnly ? "Cumpleaños de hoy" : "Próximos cumpleaños";
    if (toggleSubtitle) toggleSubtitle.textContent = birthdayUpcomingTodayOnly
      ? "Personas que cumplen años hoy"
      : "Consulta las siguientes fechas importantes";

    if (!visibleBirthdays.length) {
      highlightTitle.textContent = birthdayUpcomingTodayOnly
        ? "No hay cumpleaños registrados para hoy"
        : "Todavía no hay cumpleaños registrados";
      highlightSubtitle.textContent = birthdayUpcomingTodayOnly
        ? "No hay cumpleaños para mostrar en esta fecha."
        : "Agrega el primero para empezar tu calendario.";
      list.innerHTML = birthdayUpcomingTodayOnly
        ? `<div class="birthday-empty-state"><span>🎈</span><strong>Hoy no hay cumpleaños registrados</strong><p>Cuando exista uno, aparecerá aquí.</p></div>`
        : `<div class="birthday-empty-state"><span>🎈</span><strong>Tu calendario está esperando sus primeras fechas</strong><p>Registra un nombre y su cumpleaños para verlo cada año.</p></div>`;
      return;
    }

    const next = visibleBirthdays[0];
    const daysUntil = getBirthdayDayDifference(today, next.nextDate);
    const nextLabel = new Date(`${next.nextDate}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
    highlightTitle.textContent = next.name;
    highlightSubtitle.textContent = daysUntil === 0
      ? `¡Hoy es su cumpleaños! · ${nextLabel}`
      : `${nextLabel} · ${daysUntil === 1 ? "Mañana" : `Faltan ${daysUntil} días`}`;

    list.innerHTML = visibleBirthdays.map(entry => {
      const daysUntilEntry = getBirthdayDayDifference(today, entry.nextDate);
      const dateLabel = new Date(`${entry.nextDate}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
      const ageLabel = formatBirthdayAge(entry, entry.nextDate);
      const status = daysUntilEntry === 0 ? "Hoy 🎉" : (daysUntilEntry === 1 ? "Mañana" : `En ${daysUntilEntry} días`);
      return `<button type="button" class="birthday-upcoming-row" data-birthday-edit-id="${escapeHtml(entry.id)}">
        <span class="birthday-upcoming-avatar" aria-hidden="true">🎂</span>
        <span class="birthday-upcoming-details"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(dateLabel)}${ageLabel ? ` · ${escapeHtml(ageLabel)}` : ""}</span>${entry.notes ? `<small>${escapeHtml(entry.notes)}</small>` : ""}</span>
        <span class="birthday-upcoming-status ${daysUntilEntry === 0 ? "is-today" : ""}">${escapeHtml(status)}</span>
      </button>`;
    }).join("");
    renderDateBirthdayShortcut();
  }

  function renderBirthdayHistory() {
    const list = document.getElementById("birthday-history-list");
    const count = document.getElementById("birthday-history-count");
    const searchInput = document.getElementById("birthday-history-search");
    if (!list || !count) return;

    const query = String(searchInput ? searchInput.value : "").trim().toLocaleLowerCase("es");
    const allBirthdays = getActiveBirthdays().slice().sort((a, b) =>
      Number(b.createdAt || 0) - Number(a.createdAt || 0) || a.name.localeCompare(b.name, "es")
    );
    count.textContent = `${allBirthdays.length} ${allBirthdays.length === 1 ? "cumpleaños registrado" : "cumpleaños registrados"}`;

    const filtered = allBirthdays.filter(entry => {
      if (!query) return true;
      const monthName = BIRTHDAY_MONTH_NAMES[entry.month - 1] || "";
      const dateLabel = `${String(entry.day).padStart(2, "0")}/${String(entry.month).padStart(2, "0")}`;
      return [entry.name, entry.notes, monthName, dateLabel, entry.birthYear || ""]
        .some(value => String(value).toLocaleLowerCase("es").includes(query));
    });

    if (!filtered.length) {
      list.innerHTML = query
        ? `<div class="birthday-empty-state"><span>🔎</span><strong>No encontramos coincidencias</strong><p>Prueba con otro nombre, mes o nota.</p></div>`
        : `<div class="birthday-empty-state"><span>📚</span><strong>Tu historial está listo para comenzar</strong><p>Cada cumpleaños que registres quedará en esta lista y se conservará al cambiar de año.</p></div>`;
      return;
    }

    const today = getTodayISO();
    list.innerHTML = filtered.map(entry => {
      const nextDate = getNextBirthdayOccurrence(entry, today);
      const birthdayDate = new Date(2000, entry.month - 1, entry.day, 12);
      const dateLabel = birthdayDate.toLocaleDateString("es-PE", { day: "numeric", month: "long" });
      const nextLabel = nextDate
        ? new Date(`${nextDate}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })
        : "";
      const registered = Number(entry.createdAt || 0) > 0
        ? new Date(entry.createdAt).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })
        : "Registro anterior";
      const age = nextDate ? formatBirthdayAge(entry, nextDate) : "";
      return `<button type="button" class="birthday-history-row" data-birthday-edit-id="${escapeHtml(entry.id)}">
        <span class="birthday-history-date"><strong>${entry.day}</strong><small>${BIRTHDAY_MONTH_NAMES[entry.month - 1].slice(0, 3)}</small></span>
        <span class="birthday-history-copy">
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${escapeHtml(dateLabel)} cada año${age ? ` · ${escapeHtml(age)}` : ""}</span>
          ${entry.notes ? `<small>${escapeHtml(entry.notes)}</small>` : ""}
          <small class="birthday-history-registered">Registrado el ${escapeHtml(registered)}</small>
        </span>
        <span class="birthday-history-next"><small>Próxima fecha</small><strong>${escapeHtml(nextLabel || "—")}</strong><span>Editar ›</span></span>
      </button>`;
    }).join("");
  }

  function exportBirthdaysCsv() {
    const entries = getActiveBirthdays().slice().sort((a, b) =>
      a.month - b.month || a.day - b.day || a.name.localeCompare(b.name, "es")
    );
    if (!entries.length) {
      showToast("No hay cumpleaños para exportar.", true);
      return;
    }
    const escapeCsv = value => `"${String(value == null ? "" : value).replace(/"/g, '""')}"`;
    const rows = [
      ["Nombre", "Día", "Mes", "Año de nacimiento", "Notas", "Fecha de registro"],
      ...entries.map(entry => [
        entry.name,
        entry.day,
        BIRTHDAY_MONTH_NAMES[entry.month - 1],
        entry.birthYear || "",
        entry.notes || "",
        entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("es-PE") : ""
      ])
    ];
    const csv = "\uFEFF" + rows.map(row => row.map(escapeCsv).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tasky-cumpleanos-${getTodayISO()}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("📥 Lista de cumpleaños exportada");
  }

  function renderBirthdayCalendar() {
    const modal = document.getElementById("modal-birthdays");
    if (!modal) return;
    const period = document.getElementById("birthday-period-label");
    const hint = document.getElementById("birthday-period-hint");
    const yearView = document.getElementById("birthday-year-view");
    const monthView = document.getElementById("birthday-single-month-view");
    const historyView = document.getElementById("birthday-history-view");
    const highlight = document.getElementById("birthday-upcoming-highlight");
    const upcomingSection = document.getElementById("birthday-upcoming-section");
    const yearButton = document.getElementById("btn-birthday-year-view");
    const monthButton = document.getElementById("btn-birthday-month-view-toggle");
    const historyButton = document.getElementById("btn-birthday-history-view");
    const prev = document.getElementById("btn-birthday-prev-period");
    const next = document.getElementById("btn-birthday-next-period");
    if (!period || !hint || !yearView || !monthView || !historyView || !yearButton || !monthButton || !historyButton || !prev || !next) return;

    const isYear = birthdayCalendarMode === "year";
    const isMonth = birthdayCalendarMode === "month";
    const isHistory = birthdayCalendarMode === "history";
    yearView.hidden = !isYear;
    monthView.hidden = !isMonth;
    historyView.hidden = !isHistory;
    if (highlight) highlight.hidden = isHistory;
    if (upcomingSection) upcomingSection.hidden = isHistory;

    yearButton.classList.toggle("is-active", isYear);
    yearButton.setAttribute("aria-pressed", isYear ? "true" : "false");
    monthButton.classList.toggle("is-active", isMonth);
    monthButton.setAttribute("aria-pressed", isMonth ? "true" : "false");
    historyButton.classList.toggle("is-active", isHistory);
    historyButton.setAttribute("aria-pressed", isHistory ? "true" : "false");

    if (isYear) {
      period.textContent = String(birthdayCalendarYear);
      hint.textContent = "Vista anual · 12 meses";
      prev.hidden = false;
      next.hidden = false;
      yearView.innerHTML = BIRTHDAY_MONTH_NAMES.map((name, index) => {
        const activeCount = getActiveBirthdays().filter(entry => entry.month === index + 1).length;
        return `<article class="birthday-month-card">
          <div class="birthday-mini-month-header">
            <button type="button" data-birthday-open-month="${index}" aria-label="Ver ${name} de ${birthdayCalendarYear}">${name}</button>
            <span>${activeCount || ""}</span>
          </div>
          ${buildBirthdayMonthHtml(birthdayCalendarYear, index, true)}
        </article>`;
      }).join("");
    } else if (isMonth) {
      period.textContent = `${BIRTHDAY_MONTH_NAMES[birthdayCalendarMonth]} ${birthdayCalendarYear}`;
      hint.textContent = "Vista mensual · toca un día para registrar";
      prev.hidden = false;
      next.hidden = false;
      document.getElementById("birthday-single-month-grid").innerHTML = `
        <div class="birthday-single-month-heading">
          <span>${BIRTHDAY_MONTH_NAMES[birthdayCalendarMonth]} ${birthdayCalendarYear}</span>
          <small>Los días con 🎂 tienen cumpleaños registrados</small>
        </div>
        ${buildBirthdayMonthHtml(birthdayCalendarYear, birthdayCalendarMonth, false)}
      `;
      renderBirthdayMonthEvents();
    } else {
      period.textContent = "Registro completo";
      hint.textContent = "Historial permanente · no se reinicia al cambiar de año";
      prev.hidden = true;
      next.hidden = true;
      renderBirthdayHistory();
    }

    prev.setAttribute("aria-label", isYear ? "Año anterior" : "Mes anterior");
    next.setAttribute("aria-label", isYear ? "Año siguiente" : "Mes siguiente");
    renderBirthdayUpcomingList();
  }

  function openBirthdayEditor({ month = birthdayCalendarMonth + 1, day = 1, birthday = null } = {}) {
    const form = document.getElementById("birthday-editor");
    if (!form) return;
    const record = birthday || null;
    document.getElementById("birthday-edit-id").value = record ? record.id : "";
    document.getElementById("birthday-name").value = record ? record.name : "";
    document.getElementById("birthday-month").value = String(record ? record.month : month);
    updateBirthdayDayOptions(record ? record.month : month, record ? record.day : day);
    document.getElementById("birthday-year").value = record && record.birthYear ? String(record.birthYear) : "";
    document.getElementById("birthday-notes").value = record ? record.notes : "";
    document.getElementById("birthday-editor-title").textContent = record ? "Editar cumpleaños" : "Nuevo cumpleaños";
    document.getElementById("btn-birthday-save").textContent = record ? "Guardar cambios" : "Guardar cumpleaños";
    document.getElementById("btn-birthday-delete").hidden = !record;
    form.hidden = false;
    form.classList.add("is-open");
    document.getElementById("birthday-name").focus();
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function updateBirthdayDayOptions(month, selectedDay = 1) {
    const daySelect = document.getElementById("birthday-day");
    if (!daySelect) return;
    const normalizedMonth = Number(month);
    const maxDay = normalizedMonth === 2 ? 29 : new Date(2024, normalizedMonth, 0).getDate();
    daySelect.innerHTML = Array.from({ length: maxDay }, (_, index) => {
      const day = index + 1;
      return `<option value="${day}">${day}</option>`;
    }).join("");
    daySelect.value = String(Math.min(Math.max(1, Number(selectedDay) || 1), maxDay));
  }

  function closeBirthdayEditor() {
    const form = document.getElementById("birthday-editor");
    if (!form) return;
    form.hidden = true;
    form.classList.remove("is-open");
    form.reset();
    document.getElementById("birthday-edit-id").value = "";
  }

  function openBirthdayCalendarModal(options = {}) {
    const now = new Date();
    birthdayUpcomingExpanded = Boolean(options.expandUpcoming);
    birthdayUpcomingTodayOnly = Boolean(options.todayOnly);
    birthdayCalendarYear = now.getFullYear();
    birthdayCalendarMonth = now.getMonth();
    birthdayCalendarMode = "year";
    renderBirthdayCalendar();
    document.getElementById("modal-birthdays").classList.add("open");
  }

  function handleBirthdayCalendarClick(event) {
    const openMonth = event.target.closest("[data-birthday-open-month]");
    if (openMonth) {
      birthdayCalendarMonth = Number(openMonth.dataset.birthdayOpenMonth);
      birthdayCalendarMode = "month";
      renderBirthdayCalendar();
      return;
    }
    const dateButton = event.target.closest("[data-birthday-date]");
    if (dateButton) {
      const parts = String(dateButton.dataset.birthdayDate).split("-");
      birthdayCalendarYear = Number(parts[0]);
      birthdayCalendarMonth = Number(parts[1]) - 1;
      birthdayCalendarMode = "month";
      renderBirthdayCalendar();
      openBirthdayEditor({ month: Number(parts[1]), day: Number(parts[2]) });
      return;
    }
    const editButton = event.target.closest("[data-birthday-edit-id]");
    if (editButton) {
      const birthday = getActiveBirthdays().find(entry => entry.id === editButton.dataset.birthdayEditId);
      if (birthday) openBirthdayEditor({ birthday });
    }
  }

  function handleBirthdayFormSubmit(event) {
    event.preventDefault();
    const id = String(document.getElementById("birthday-edit-id").value || "");
    const name = String(document.getElementById("birthday-name").value || "").trim();
    const month = Number(document.getElementById("birthday-month").value);
    const day = Number(document.getElementById("birthday-day").value);
    const yearText = String(document.getElementById("birthday-year").value || "").trim();
    const birthYear = yearText ? Number(yearText) : null;
    const notes = String(document.getElementById("birthday-notes").value || "").trim();
    const maxDay = month === 2 ? 29 : new Date(2024, month, 0).getDate();

    if (!name || !Number.isInteger(month) || month < 1 || month > 12 ||
        !Number.isInteger(day) || day < 1 || day > maxDay) {
      showToast("Completa el nombre y una fecha válida.", true);
      return;
    }
    if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1000 || birthYear > new Date().getFullYear())) {
      showToast("Revisa el año de nacimiento o déjalo vacío.", true);
      return;
    }

    const existing = id ? appState.data.birthdays.find(entry => entry.id === id) : null;
    const birthday = normalizeBirthdayRecord({
      ...(existing || {}),
      id: id || `birthday_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      month,
      day,
      birthYear,
      notes,
      createdAt: existing ? Number(existing.createdAt || existing.updatedAt || Date.now()) : Date.now(),
      deleted: false,
      updatedAt: Date.now()
    });
    if (!birthday) {
      showToast("No se pudo validar ese cumpleaños.", true);
      return;
    }
    const list = normalizeBirthdays(appState.data.birthdays);
    const index = list.findIndex(entry => entry.id === birthday.id);
    if (index >= 0) list[index] = birthday;
    else list.push(birthday);
    appState.data.birthdays = normalizeBirthdays(list);
    saveData(true, `${id ? "Actualizó" : "Registró"} cumpleaños: ${name}`);
    closeBirthdayEditor();
    renderBirthdayCalendar();
    showToast(id ? "🎉 Cumpleaños actualizado" : "🎂 Cumpleaños registrado");
  }

  function deleteEditingBirthday() {
    const id = String(document.getElementById("birthday-edit-id").value || "");
    const birthday = appState.data.birthdays.find(entry => entry.id === id && !entry.deleted);
    if (!birthday) return;
    const confirmed = window.confirm(`¿Eliminar el cumpleaños de ${birthday.name}? Esta acción se sincronizará con tus dispositivos.`);
    if (!confirmed) return;
    appState.data.birthdays = normalizeBirthdays(appState.data.birthdays.map(entry =>
      entry.id === id ? { ...entry, deleted: true, updatedAt: Date.now() } : entry
    ));
    saveData(true, `Eliminó cumpleaños: ${birthday.name}`);
    closeBirthdayEditor();
    renderBirthdayCalendar();
    showToast("Cumpleaños eliminado");
  }

  function openCompletionHistoryModal() {
    ensureCompletionLogIncludesCurrentDoneTasks();
    renderCompletionHistory();
    const modal = document.getElementById("modal-completion-history");
    if (modal) modal.classList.add("open");
  }

  function toggleTaskDone(taskId, checkBtnEl) {
    const task = appState.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!task.done && isTaskUpcomingRepeat(task)) {
      showToast(`Esta repetición estará disponible el ${formatSpanishDateLong(task.dueDate)}.`, true);
      return;
    }
    pushUndoSnapshot(`${task.done ? "Reabrir" : "Completar"}: ${task.title}`);
    task.done = !task.done;
    const today = getTodayISO();
    if (task.done) {
      task.completedDate = today;
      recordTaskCompletionEvent(task, true, today);
      const shiftedFocusPriority = removeCompletedFocusPriority(task.id, today);
      playUiSound("complete");
      spawnCompletionParticles(checkBtnEl);
      appState.history[today] = (appState.history[today] || 0) + 1;
      showToast(shiftedFocusPriority
        ? "Prioridad completada; las siguientes avanzaron"
        : "Tarea completada");
    } else {
      // Undo the completion on the date it was originally recorded, not on the date of reopening.
      // This lets recurring catch-up correctly restore a missed occurrence that was reopened later.
      const reopenedDate = String(task.completedDate || today).slice(0, 10);
      task.completedDate = null;
      recordTaskCompletionEvent(task, false, reopenedDate);
      playUiSound("uncomplete");
      if (Number(appState.history[reopenedDate] || 0) > 0) {
        appState.history[reopenedDate]--;
      }
      showToast("Tarea reabierta");
    }
    saveData(true, `${task.done ? "Completó" : "Reabrió"}: ${task.title}`);
    renderBoard();
  }

  const RECURRING_AUDIT_DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const RECURRING_AUDIT_DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const RECURRING_AUDIT_WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const RECURRING_AUDIT_FILTER_DAYS = [
    { day: 1, label: "Lun" }, { day: 2, label: "Mar" }, { day: 3, label: "Mié" },
    { day: 4, label: "Jue" }, { day: 5, label: "Vie" }, { day: 6, label: "Sáb" },
    { day: 0, label: "Dom" }
  ];
  let recurringAuditSelectedDays = new Set();

  function describeRepeatDays(days) {
    const selected = Array.from(new Set((Array.isArray(days) ? days : []).map(Number)
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
    if (!selected.length) return "Sin días de repetición configurados";
    if (selected.length === 7) return "Diario";
    if (selected.join(",") === "1,2,3,4,5") return "De lunes a viernes";
    if (selected.join(",") === "0,6") return "Fines de semana";
    return RECURRING_AUDIT_WEEK_ORDER.filter(day => selected.includes(day))
      .map(day => RECURRING_AUDIT_DAY_NAMES[day]).join(", ");
  }

  function renderBoxRecurringAudit(boxId) {
    const box = appState.data.boxes.find(item => String(item.id) === String(boxId));
    const summaryTitle = document.getElementById("recurring-audit-summary-title");
    const summaryText = document.getElementById("recurring-audit-summary-text");
    const weekdayLoad = document.getElementById("recurring-audit-weekday-load");
    const taskList = document.getElementById("recurring-audit-task-list");
    const taskCount = document.getElementById("recurring-audit-task-count");
    if (!box || !summaryTitle || !summaryText || !weekdayLoad || !taskList || !taskCount) return;

    const tasks = appState.data.tasks
      .filter(task => String(task.boxId) === String(box.id) && isRecurringTaskRecord(task))
      // Show the most frequent habits first. Keep alphabetical order for ties.
      .sort((a, b) => getTaskRepeatDays(b).length - getTaskRepeatDays(a).length ||
        String(a.title || "").localeCompare(String(b.title || ""), "es"));
    const weekdayCounts = Array(7).fill(0);
    tasks.forEach(task => getTaskRepeatDays(task).forEach(day => { weekdayCounts[day]++; }));
    const maxDayCount = Math.max(0, ...weekdayCounts);
    const busyDayNames = RECURRING_AUDIT_WEEK_ORDER
      .filter(day => maxDayCount > 0 && weekdayCounts[day] === maxDayCount)
      .map(day => RECURRING_AUDIT_DAY_NAMES[day]);

    document.getElementById("recurring-audit-title").textContent = "Repeticiones · " + box.name;
    document.getElementById("recurring-audit-subtitle").textContent =
      tasks.length + (tasks.length === 1 ? " tarea recurrente en esta casilla" : " tareas recurrentes en esta casilla");
    summaryTitle.textContent = tasks.length
      ? tasks.length + " tareas con programación semanal"
      : "No hay tareas recurrentes";
    summaryText.textContent = tasks.length
      ? (busyDayNames.length
        ? "Mayor carga: " + busyDayNames.join(" y ") + " (" + maxDayCount + (maxDayCount === 1 ? " tarea" : " tareas") + " cada día)."
        : "Distribución de las tareas por día de la semana.")
      : "Cuando configures una tarea para que se repita, aparecerá aquí.";
    taskCount.textContent = String(tasks.length);

    weekdayLoad.innerHTML = RECURRING_AUDIT_WEEK_ORDER.map(day => {
      const count = weekdayCounts[day];
      const isMostLoaded = count > 0 && count === maxDayCount;
      const width = maxDayCount > 0 ? Math.max(count > 0 ? 8 : 0, Math.round((count / maxDayCount) * 100)) : 0;
      return `<div class="recurring-audit-day-card ${isMostLoaded ? "is-most-loaded" : ""}">
        <div class="recurring-audit-day-top"><span>${RECURRING_AUDIT_DAY_SHORT[day]}</span><strong>${count}</strong></div>
        <div class="recurring-audit-day-track"><span style="width:${width}%"></span></div>
        <small>${isMostLoaded ? "Más cargado" : count === 0 ? "Sin tareas" : count === 1 ? "1 tarea" : count + " tareas"}</small>
      </div>`;
    }).join("");

    const dayFilterContainer = document.getElementById("recurring-audit-day-filters");
    if (dayFilterContainer) {
      dayFilterContainer.innerHTML = `
        <button type="button" class="recurring-audit-day-filter ${recurringAuditSelectedDays.size ? "" : "is-active"}"
          data-recurring-audit-day="all" aria-pressed="${recurringAuditSelectedDays.size ? "false" : "true"}">
          <span>Todos</span><strong>${tasks.length}</strong>
        </button>
        ${RECURRING_AUDIT_FILTER_DAYS.map(({ day, label }) => {
          const count = weekdayCounts[day];
          const active = recurringAuditSelectedDays.has(day);
          return `<button type="button" class="recurring-audit-day-filter ${active ? "is-active" : ""}"
            data-recurring-audit-day="${day}" aria-pressed="${active ? "true" : "false"}"
            title="Filtrar tareas de los ${RECURRING_AUDIT_DAY_NAMES[day]}s" ${count ? "" : "disabled"}>
            <span>${label}</span><strong>${count}</strong>
          </button>`;
        }).join("")}
      `;
    }

    const searchInput = document.getElementById("recurring-audit-search");
    const searchClear = document.getElementById("recurring-audit-search-clear");
    const searchResultCount = document.getElementById("recurring-audit-search-result-count");
    const normalizeAuditSearch = value => String(value || "")
      .normalize("NFKD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[\\u200B-\\u200D\\uFEFF\\u2060\\u00AD]/g, "")
      .toLowerCase()
      .replace(/\\s+/g, " ")
      .trim();
    const searchQuery = normalizeAuditSearch(searchInput ? searchInput.value : "");
    const filteredTasks = tasks.filter(task => {
      const days = getTaskRepeatDays(task);
      const matchesSelectedDay = !recurringAuditSelectedDays.size ||
        days.some(day => recurringAuditSelectedDays.has(day));
      if (!matchesSelectedDay) return false;
      if (!searchQuery) return true;
      const searchable = [
        task.title,
        describeRepeatDays(days),
        ...days.map(day => RECURRING_AUDIT_DAY_NAMES[day])
      ].join(" ");
      return normalizeAuditSearch(searchable).includes(searchQuery);
    });

    if (searchClear) searchClear.hidden = !searchQuery;
    const selectedDayLabels = RECURRING_AUDIT_WEEK_ORDER
      .filter(day => recurringAuditSelectedDays.has(day))
      .map(day => RECURRING_AUDIT_DAY_SHORT[day]);
    if (searchResultCount) {
      const activeFilters = [];
      if (searchQuery) activeFilters.push(`Búsqueda: "${searchInput.value.trim()}"`);
      if (selectedDayLabels.length) activeFilters.push(`Días: ${selectedDayLabels.join(", ")}`);
      searchResultCount.textContent = activeFilters.length
        ? `${filteredTasks.length} de ${tasks.length} tareas · ${activeFilters.join(" · ")}`
        : `Ordenadas por frecuencia · ${tasks.length} tareas`;
    }
    taskCount.textContent = filteredTasks.length === tasks.length
      ? String(tasks.length)
      : `${filteredTasks.length}/${tasks.length}`;

    if (!filteredTasks.length) {
      const hasAnyFilter = Boolean(searchQuery || recurringAuditSelectedDays.size);
      taskList.innerHTML = tasks.length
        ? `<div class="recurring-audit-empty"><span aria-hidden="true">🔎</span><strong>No encontré tareas que coincidan</strong><p>Prueba con otro nombre o selecciona otros días. Puedes pulsar “Todos” para quitar el filtro por día.</p></div>`
        : `<div class="recurring-audit-empty"><span aria-hidden="true">🗓️</span><strong>Esta casilla no tiene tareas repetidas</strong><p>Abre la configuración de repetición de una tarea para elegir los días de la semana.</p></div>`;
      return;
    }

    const today = getTodayISO();
    taskList.innerHTML = filteredTasks.map(task => {
      const days = getTaskRepeatDays(task);
      const until = task.repeatUntil ? String(task.repeatUntil).slice(0, 10) : null;
      const nextDate = getNextRepeatDateOnOrAfter(today, days, until);
      const nextLabel = nextDate ? formatSpanishDateLong(nextDate) : "Sin próximas fechas programadas";
      const endLabel = until ? "Termina el " + formatSpanishDateLong(until) : "Sin fecha de finalización";
      const daysHtml = days.length === 7
        ? `<span class="recurring-audit-weekday-chip is-selected">Diario</span>`
        : RECURRING_AUDIT_WEEK_ORDER.filter(day => days.includes(day))
          .map(day => `<span class="recurring-audit-weekday-chip is-selected">${RECURRING_AUDIT_DAY_NAMES[day]}</span>`).join("");
      return `<article class="recurring-audit-task-card">
        <div class="recurring-audit-task-heading">
          <div class="recurring-audit-task-emoji" aria-hidden="true">🔁</div>
          <div class="recurring-audit-task-title-wrap"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(describeRepeatDays(days))}</span></div>
          <span class="recurring-audit-days-count">${days.length}/7 días</span>
          <div class="recurring-audit-actions">
            <button type="button" class="btn-secondary recurring-audit-edit-btn" data-repeat-audit-edit-title-task="${escapeHtml(task.id)}">Editar tarea</button>
            <button type="button" class="btn-secondary recurring-audit-edit-btn" data-repeat-audit-edit-task="${escapeHtml(task.id)}">Editar días</button>
          </div>
        </div>
        <div class="recurring-audit-weekday-chips">${daysHtml}</div>
        <div class="recurring-audit-task-details">
          <span><strong>Próxima:</strong> ${escapeHtml(nextLabel)}</span>
          <span>${escapeHtml(endLabel)}</span>
        </div>
      </article>`;
    }).join("");
  }

  function openBoxRecurringAudit(boxId) {
    appState.recurringAuditBoxId = String(boxId);
    recurringAuditSelectedDays.clear();
    const searchInput = document.getElementById("recurring-audit-search");
    if (searchInput) searchInput.value = "";
    renderBoxRecurringAudit(boxId);
    const modal = document.getElementById("modal-recurring-audit");
    if (modal) modal.classList.add("open");
  }

  function closeBoxRecurringAudit() {
    const modal = document.getElementById("modal-recurring-audit");
    if (modal) modal.classList.remove("open");
    appState.recurringAuditBoxId = null;
  }

  let pendingTaskDeletionId = null;
  let pendingTaskDeletionSeriesRootId = null;

  function isRecurringTaskRecord(task) {
    return Boolean(task && (task.frequency !== "once" ||
      (Array.isArray(task.repeatDays) && task.repeatDays.length > 0)));
  }

  function getTaskRecurringSeriesRoot(task) {
    if (!task) return null;
    if (isRecurringTaskRecord(task)) return task;
    const match = String(task.id || "").match(/^(.*)__missed__\d{8}$/);
    if (!match) return null;
    const root = appState.data.tasks.find(item => String(item.id) === match[1]);
    return isRecurringTaskRecord(root) ? root : null;
  }

  function openDeleteTaskDialog(taskId) {
    const task = appState.data.tasks.find(item => String(item.id) === String(taskId));
    if (!task) return;

    pendingTaskDeletionId = String(task.id);
    const seriesRoot = getTaskRecurringSeriesRoot(task);
    pendingTaskDeletionSeriesRootId = seriesRoot ? String(seriesRoot.id) : null;
    const recurring = Boolean(seriesRoot);
    const isArchivedOccurrence = recurring && String(task.id) !== String(seriesRoot.id);

    const summaryName = document.getElementById("delete-task-name");
    const summaryDate = document.getElementById("delete-task-date");
    const options = document.getElementById("delete-task-recurring-options");
    const singleWarning = document.getElementById("delete-task-single-warning");
    const weekdayPanel = document.getElementById("delete-task-weekdays-panel");
    const weekdayList = document.getElementById("delete-task-weekday-list");
    const weekdayChoice = document.getElementById("delete-task-weekdays-choice");
    const intro = document.getElementById("delete-task-intro");
    const confirmButton = document.getElementById("btn-confirm-delete-task");
    if (!summaryName || !summaryDate || !options || !singleWarning || !weekdayPanel || !weekdayList || !confirmButton) return;

    summaryName.textContent = task.title;
    summaryDate.textContent = task.dueDate ? formatSpanishDateLong(String(task.dueDate).slice(0, 10)) : "Sin fecha específica";
    options.hidden = !recurring;
    singleWarning.hidden = recurring;
    weekdayPanel.hidden = true;
    if (weekdayChoice) weekdayChoice.hidden = !recurring || isArchivedOccurrence;
    if (intro) {
      intro.textContent = isArchivedOccurrence
        ? "Esta tarea pertenece a una repetición. Elige si quieres quitar solo esta fecha, terminar la serie desde aquí o eliminar todas sus ocurrencias pendientes."
        : "Esta tarea tiene una repetición. Elige qué debe eliminarse. Las tareas ya completadas se conservarán en tu historial.";
    }

    const defaultRadio = document.querySelector('input[name="delete-task-mode"][value="occurrence"]');
    if (defaultRadio) defaultRadio.checked = true;
    confirmButton.textContent = recurring ? "Eliminar solo esta ocurrencia" : "Eliminar esta tarea";

    const days = recurring ? getTaskRepeatDays(seriesRoot) : [];
    const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const occurrenceWeekday = task.dueDate ? new Date(`${String(task.dueDate).slice(0, 10)}T00:00:00`).getDay() : -1;
    const defaultDay = days.includes(occurrenceWeekday) ? occurrenceWeekday : days[0];
    weekdayList.innerHTML = days.map(day => `
      <label class="delete-task-day-chip">
        <input type="checkbox" data-delete-weekday value="${day}" ${day === defaultDay ? "checked" : ""} />
        <span>${dayNames[day].charAt(0).toLocaleUpperCase("es") + dayNames[day].slice(1)}</span>
      </label>
    `).join("");

    const modal = document.getElementById("modal-delete-task");
    if (modal) modal.classList.add("open");
  }

  function closeDeleteTaskDialog() {
    const modal = document.getElementById("modal-delete-task");
    if (modal) modal.classList.remove("open");
    pendingTaskDeletionId = null;
    pendingTaskDeletionSeriesRootId = null;
  }

  function getTaskSeriesRecordIds(task) {
    const rootId = String(task.id);
    return appState.data.tasks
      .filter(item => String(item.id) === rootId || String(item.id).startsWith(`${rootId}__missed__`))
      .map(item => String(item.id));
  }

  function getTaskSeriesRecordIdsFromDate(task, cutoffDate) {
    const rootId = String(task.id);
    const cutoff = String(cutoffDate || "").slice(0, 10);
    return appState.data.tasks
      .filter(item => {
        const id = String(item.id);
        if (id === rootId) return true;
        if (!id.startsWith(`${rootId}__missed__`)) return false;
        const occurrenceDate = String(item.dueDate || "").slice(0, 10);
        return Boolean(occurrenceDate && occurrenceDate >= cutoff);
      })
      .map(item => String(item.id));
  }

  function removeTaskRecords(taskIds, actionLabel, toastLabel, snapshotAlreadyTaken = false) {
    const ids = Array.from(new Set((taskIds || []).map(id => String(id))));
    if (!ids.length) return;
    const idSet = new Set(ids);
    const existing = appState.data.tasks.filter(task => idSet.has(String(task.id)));
    if (!existing.length) return;
    if (!snapshotAlreadyTaken) pushUndoSnapshot(actionLabel);
    appState.data.tasks = appState.data.tasks.filter(task => !idSet.has(String(task.id)));
    appState.data.deletedTaskIds = Array.from(new Set([
      ...(Array.isArray(appState.data.deletedTaskIds) ? appState.data.deletedTaskIds : []),
      ...ids
    ]));
    saveData(true, actionLabel);
    renderBoard();
    showToast(toastLabel);
  }

  function confirmDeleteTask() {
    const task = appState.data.tasks.find(item => String(item.id) === String(pendingTaskDeletionId));
    if (!task) { closeDeleteTaskDialog(); return; }

    const seriesRoot = pendingTaskDeletionSeriesRootId
      ? appState.data.tasks.find(item => String(item.id) === pendingTaskDeletionSeriesRootId)
      : getTaskRecurringSeriesRoot(task);
    const recurring = Boolean(seriesRoot && isRecurringTaskRecord(seriesRoot));
    const isSelectedSeriesRoot = recurring && String(task.id) === String(seriesRoot.id);
    const radio = document.querySelector('input[name="delete-task-mode"]:checked');
    const mode = recurring ? String(radio && radio.value || "occurrence") : "occurrence";
    const occurrenceDate = String(task.dueDate || getTodayISO()).slice(0, 10);
    const repeatDays = recurring ? getTaskRepeatDays(seriesRoot) : [];
    const repeatUntil = recurring && seriesRoot.repeatUntil ? String(seriesRoot.repeatUntil).slice(0, 10) : null;

    if (!recurring) {
      const taskId = String(task.id);
      closeDeleteTaskDialog();
      removeTaskRecords([taskId], `Eliminar tarea: ${task.title}`, `Tarea eliminada: ${task.title}`);
      return;
    }

    if (mode === "series") {
      const ids = getTaskSeriesRecordIds(seriesRoot);
      closeDeleteTaskDialog();
      removeTaskRecords(ids, `Eliminar repetición completa: ${task.title}`, `Se eliminó toda la repetición y sus ocurrencias pendientes: ${task.title}. El historial completado se conserva.`);
      return;
    }

    if (mode === "future") {
      const ids = getTaskSeriesRecordIdsFromDate(seriesRoot, occurrenceDate);
      if (!ids.length) {
        showToast("No encontré ocurrencias de esta repetición para eliminar.", true);
        return;
      }
      closeDeleteTaskDialog();
      removeTaskRecords(
        ids,
        `Eliminar repetición desde ${occurrenceDate}: ${task.title}`,
        `Se eliminó esta ocurrencia y las siguientes desde ${formatSpanishDateLong(occurrenceDate)}. Las anteriores y el historial completado se conservaron.`
      );
      return;
    }

    // A missed occurrence is stored as an independent child record. Deleting
    // only that occurrence must not advance or alter the active recurring root.
    if (mode === "occurrence" && !isSelectedSeriesRoot) {
      const taskId = String(task.id);
      closeDeleteTaskDialog();
      removeTaskRecords(
        [taskId],
        `Eliminar solo esta ocurrencia: ${task.title}`,
        `Se eliminó solo la ocurrencia del ${formatSpanishDateLong(occurrenceDate)}; la repetición continúa.`
      );
      return;
    }

    if (mode === "weekdays") {
      if (!isSelectedSeriesRoot) {
        showToast("Para cambiar los días, abre la tarea principal de esta repetición.", true);
        return;
      }
      const daysToRemove = Array.from(document.querySelectorAll("#delete-task-weekday-list [data-delete-weekday]:checked"))
        .map(input => Number(input.value)).filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
      if (!daysToRemove.length) {
        showToast("Selecciona al menos un día que quieras quitar.", true);
        return;
      }
      const remainingDays = repeatDays.filter(day => !daysToRemove.includes(day));
      if (!remainingDays.length) {
        const ids = getTaskSeriesRecordIds(seriesRoot);
        closeDeleteTaskDialog();
        removeTaskRecords(ids, `Eliminar todos los días de repetición: ${task.title}`, `Se eliminó la repetición de ${task.title}`);
        return;
      }
      pushUndoSnapshot(`Cambiar días de repetición: ${task.title}`);
      seriesRoot.repeatDays = remainingDays;
      const currentWeekday = new Date(`${occurrenceDate}T00:00:00`).getDay();
      if (daysToRemove.includes(currentWeekday)) {
        seriesRoot.skippedDates = Array.from(new Set([...(Array.isArray(seriesRoot.skippedDates) ? seriesRoot.skippedDates : []), occurrenceDate]));
        const nextDate = getNextRepeatDateOnOrAfter(addDaysISO(occurrenceDate, 1), remainingDays, repeatUntil);
        if (nextDate) {
          seriesRoot.dueDate = nextDate;
          seriesRoot.isRescheduled = false;
          seriesRoot.done = false;
          seriesRoot.completedDate = null;
          delete seriesRoot.overdueSince;
          delete seriesRoot.overdueCarryDate;
        } else {
          closeDeleteTaskDialog();
          removeTaskRecords([String(seriesRoot.id)], `Eliminar última ocurrencia: ${task.title}`, `Se quitó la última ocurrencia de ${task.title}`, true);
          return;
        }
      }
      closeDeleteTaskDialog();
      saveData(true, `Quitó días de repetición de ${task.title}`);
      renderBoard();
      showToast(`Se quitaron los días seleccionados de la repetición de ${task.title}`);
      return;
    }

    // Default: skip only this date while keeping the recurrence intact.
    if (!isSelectedSeriesRoot) {
      showToast("No pude identificar la ocurrencia principal de esta repetición.", true);
      return;
    }
    const nextDate = getNextRepeatDateOnOrAfter(addDaysISO(occurrenceDate, 1), repeatDays, repeatUntil);
    if (!nextDate) {
      closeDeleteTaskDialog();
      removeTaskRecords([String(seriesRoot.id)], `Eliminar última ocurrencia: ${task.title}`, `Se eliminó esta ocurrencia de ${task.title}`);
      return;
    }
    pushUndoSnapshot(`Eliminar solo esta ocurrencia: ${task.title}`);
    seriesRoot.skippedDates = Array.from(new Set([...(Array.isArray(seriesRoot.skippedDates) ? seriesRoot.skippedDates : []), occurrenceDate]));
    seriesRoot.dueDate = nextDate;
    seriesRoot.done = false;
    seriesRoot.completedDate = null;
    seriesRoot.isRescheduled = false;
    delete seriesRoot.overdueSince;
    delete seriesRoot.overdueCarryDate;
    closeDeleteTaskDialog();
    saveData(true, `Eliminó una ocurrencia de: ${task.title}`);
    renderBoard();
    showToast(`Se eliminó solo la ocurrencia del ${formatSpanishDateLong(occurrenceDate)}`);
  }

  function deleteTask(taskId) {
    const id = String(taskId);
    const selectedIds = appState.selectedTaskIds;
    if (selectedIds && selectedIds.size > 1 && selectedIds.has(id)) {
      confirmDeleteSelectedTasks();
      return;
    }
    openDeleteTaskDialog(taskId);
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
    } else if (task.frequency === "weekdays") {
      appState.selectedRepeatDays = [1, 2, 3, 4, 5];
    } else if (task.frequency === "weekends") {
      appState.selectedRepeatDays = [0, 6];
    } else {
      appState.selectedRepeatDays = [];
    }

    appState.selectedRepeatDuration = task.repeatUntil && String(task.repeatUntil) >= getTodayISO()
      ? "thisWeek"
      : "forever";
    syncRepeatWeekdayChipsUI();
    syncRepeatDurationUI();
    document.getElementById("modal-repeat-picker").classList.add("open");
  }

  function syncRepeatDurationUI() {
    const selected = appState.selectedRepeatDuration === "thisWeek" ? "thisWeek" : "forever";
    document.querySelectorAll("[data-repeat-duration]").forEach(button => {
      const active = button.dataset.repeatDuration === selected;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const help = document.getElementById("repeat-duration-help");
    if (help) {
      help.textContent = selected === "thisWeek"
        ? `La repetición termina el domingo ${formatLearningDate(getRepeatWeekEndISO(), { year: true })}. Si no completas la tarea, seguirá pendiente como atrasada y no volverá a repetirse la próxima semana.`
        : "La tarea seguirá repitiéndose en los días elegidos cada semana, hasta que cambies su frecuencia.";
    }
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

    const today = getTodayISO();
    const days = Array.from(new Set((Array.isArray(daysArray) ? daysArray : [])
      .map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
    const isRepeating = freqType !== "once" && days.length > 0;
    const duration = appState.selectedRepeatDuration === "thisWeek" ? "thisWeek" : "forever";
    const repeatUntil = isRepeating && duration === "thisWeek" ? getRepeatWeekEndISO(today) : null;
    let nextDate = null;

    if (isRepeating) {
      nextDate = getNextRepeatDateOnOrAfter(today, days, repeatUntil);
      if (!nextDate && duration === "thisWeek") {
        showToast("Ya no quedan días seleccionados esta semana. Elige otros días o «Todas las semanas».", true);
        return;
      }
      if (!nextDate) {
        showToast("No se pudo calcular el próximo día de repetición.", true);
        return;
      }
    }

    task.frequency = isRepeating ? freqType : "once";
    task.repeatDays = isRepeating ? days : [];
    if (repeatUntil) task.repeatUntil = repeatUntil;
    else delete task.repeatUntil;
    if (nextDate) {
      task.dueDate = nextDate;
      task.isRescheduled = false;
    }

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
  function openDatePickerModal(taskIdOrIds) {
    // Clicking the calendar on a selected task should apply the same date to the full selection.
    const useSelectedGroup = !Array.isArray(taskIdOrIds) &&
      appState.selectedTaskIds &&
      appState.selectedTaskIds.size > 1 &&
      appState.selectedTaskIds.has(String(taskIdOrIds));
    const isBulk = Array.isArray(taskIdOrIds) || Boolean(useSelectedGroup);
    const requestedIds = Array.isArray(taskIdOrIds)
      ? Array.from(new Set(taskIdOrIds.map(id => String(id))))
      : (useSelectedGroup
        ? Array.from(new Set(Array.from(appState.selectedTaskIds).map(id => String(id))))
        : [String(taskIdOrIds)]);
    let tasks = appState.data.tasks.filter(task => requestedIds.includes(String(task.id)));
    if (isBulk) tasks = tasks.filter(task => !task.done);
    if (!tasks.length) return;

    if (!isBulk) clearTaskSelection();
    appState.reschedulingTaskIds = tasks.map(task => String(task.id));
    appState.reschedulingTaskId = tasks.length === 1 ? tasks[0].id : null;

    const dateTitle = document.getElementById("date-modal-title");
    const taskName = document.getElementById("resched-task-name");
    if (dateTitle) dateTitle.textContent = tasks.length === 1 ? "Reprogramar tarea" : `Reprogramar ${tasks.length} tareas`;
    if (taskName) {
      taskName.textContent = tasks.length === 1
        ? tasks[0].title
        : `Se aplicará la misma fecha a ${tasks.length} tareas seleccionadas.`;
    }

    const todayIso = getTodayISO();
    const tomorrowIso = addDaysISO(todayIso, 1);
    const dateInput = document.getElementById("input-resched-date");
    // Display today as the reference date, but min prevents it from being selected as a due date.
    dateInput.min = tomorrowIso;
    dateInput.value = todayIso;

    const noDeadlineInput = document.getElementById("input-resched-no-deadline");
    const noDeadlineHelp = document.getElementById("resched-no-deadline-help");
    if (noDeadlineInput) {
      const isSingleEligibleTask = tasks.length === 1 && !isRecurringTask(tasks[0]);
      noDeadlineInput.checked = isSingleEligibleTask && Boolean(tasks[0].noDeadline);
      noDeadlineInput.disabled = !isSingleEligibleTask;
      if (noDeadlineHelp) {
        noDeadlineHelp.textContent = isSingleEligibleTask
          ? "Se conserva el día programado, pero la tarea no aparecerá como vencida si no la completas ese día."
          : "Disponible al planificar una sola tarea que no tenga repetición.";
      }
    }

    const parts = todayIso.split("-");
    calState.viewYear = Number(parts[0]) || new Date().getFullYear();
    calState.viewMonth = (Number(parts[1]) || (new Date().getMonth() + 1)) - 1;
    calState.selectedIso = todayIso;
    renderProVisualCalendar();

    document.getElementById("modal-date-picker").classList.add("open");
  }

  function applyTaskRescheduleDate(newDateIso, moveToToday = false) {
    const requestedIds = Array.isArray(appState.reschedulingTaskIds) && appState.reschedulingTaskIds.length
      ? Array.from(new Set(appState.reschedulingTaskIds.map(id => String(id))))
      : (appState.reschedulingTaskId != null ? [String(appState.reschedulingTaskId)] : []);
    const tasks = appState.data.tasks.filter(task => requestedIds.includes(String(task.id)));
    if (!tasks.length) return;
    const isBulk = tasks.length > 1;
    const today = getTodayISO();

    if (!moveToToday && (!newDateIso || newDateIso <= today)) {
      showToast("Elige una fecha futura (desde mañana) para reprogramar", true);
      return;
    }

    const actionLabel = isBulk
      ? `Reprogramó ${tasks.length} tareas seleccionadas`
      : `Reprogramó: ${tasks[0].title}`;
    pushUndoSnapshot(isBulk ? `Reprogramar ${tasks.length} tareas` : `Reprogramar: ${tasks[0].title}`);

    const noDeadlineInput = document.getElementById("input-resched-no-deadline");
    const applyNoDeadline = !isBulk && tasks.length === 1 &&
      noDeadlineInput && !noDeadlineInput.disabled && Boolean(noDeadlineInput.checked);

    tasks.forEach(task => {
      if (!isRecurringTask(task)) {
        task.noDeadline = Boolean(applyNoDeadline);
      } else {
        delete task.noDeadline;
      }
      if (moveToToday) {
        task.dueDate = today;
        task.isRescheduled = false;
        task.rescheduledCount = 0;
      } else {
        task.dueDate = newDateIso;
        task.isRescheduled = true;
        task.rescheduledCount = (task.rescheduledCount || 0) + 1;
      }
    });

    playUiSound("reschedule");
    document.getElementById("modal-date-picker").classList.remove("open");
    appState.reschedulingTaskIds = [];
    appState.reschedulingTaskId = null;
    if (isBulk) clearTaskSelection();
    saveData(true, actionLabel);
    renderBoardPreservingScroll();
    updateTaskActionModalsAfterBulkChange();
    if (moveToToday) {
      showToast(tasks.length === 1 ? "☀️ Tarea programada para hoy" : `☀️ ${tasks.length} tareas programadas para hoy`);
    } else {
      showToast(tasks.length === 1
        ? `Reprogramada · ${formatSpanishDateLong(newDateIso)}`
        : `📅 ${tasks.length} tareas reprogramadas · ${formatSpanishDateLong(newDateIso)}`);
    }
  }

  function scheduleSelectedTasksForToday() {
    const selectedIds = Array.from(appState.selectedTaskIds || []).map(String);
    const selectedIdSet = new Set(selectedIds);
    const selectedTasks = appState.data.tasks.filter(task =>
      selectedIdSet.has(String(task.id)) && !task.done
    );
    if (!selectedTasks.length) {
      clearTaskSelection();
      showToast("Selecciona al menos una tarea pendiente para pasarla a hoy.", true);
      return;
    }
    clearTaskSelection();
    scheduleTaskIdsForToday(
      selectedTasks.map(task => String(task.id)),
      `Pasó ${selectedTasks.length} tareas seleccionadas para hoy`
    );
  }

  function scheduleOverdueTaskOrSelectedGroup(task) {
    if (!task || task.done || !isTaskOverdue(task)) return;
    const selectedIds = appState.selectedTaskIds;
    if (selectedIds && selectedIds.size > 1 && selectedIds.has(String(task.id))) {
      scheduleSelectedTasksForToday();
      return;
    }
    scheduleTaskIdsForToday([String(task.id)], `Pasar atrasada para hoy: ${task.title}`);
  }

  function scheduleTaskIdsForToday(taskIds, actionDescription = "Programó tareas para hoy") {
    const idsSet = new Set((Array.isArray(taskIds) ? taskIds : []).map(id => String(id)));
    if (idsSet.size === 0) return;
    pushUndoSnapshot(actionDescription);
    const today = getTodayISO();
    let movedCount = 0;

    appState.data.tasks.forEach((task) => {
      if (idsSet.has(String(task.id))) {
        const wasOverdue = isTaskOverdue(task);
        const originalOverdueDate = String(task.overdueSince || task.dueDate || "");
        task.dueDate = today;
        task.isRescheduled = false;
        task.rescheduledCount = 0;
        if (wasOverdue && originalOverdueDate && originalOverdueDate < today) {
          task.overdueSince = originalOverdueDate;
          task.overdueCarryDate = today;
        } else {
          delete task.overdueSince;
          delete task.overdueCarryDate;
        }
        movedCount++;
      }
    });

    if (movedCount > 0) {
      playUiSound("complete");
      saveData(true, `${actionDescription} (${movedCount})`);
      renderBoardPreservingScroll();
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
      card.dataset.taskId = String(task.id);
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
    const searchInput = document.getElementById("rescheduled-global-search");
    if (searchInput) searchInput.value = "";
    renderRescheduledModalList();
    document.getElementById("modal-rescheduled-list").classList.add("open");
  }

  function renderRescheduledTaskSearchResults(rawQuery) {
    const input = document.getElementById("rescheduled-global-search");
    const clearButton = document.getElementById("rescheduled-global-search-clear");
    const resultsContainer = document.getElementById("rescheduled-search-results");
    const rescheduledContainer = document.getElementById("rescheduled-modal-items");
    if (!resultsContainer || !rescheduledContainer) return;

    const query = String(rawQuery || "").trim();
    const normalize = value => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const normalizedQuery = normalize(query);

    if (clearButton) clearButton.hidden = !query;
    resultsContainer.innerHTML = "";

    if (!normalizedQuery) {
      resultsContainer.hidden = true;
      rescheduledContainer.hidden = false;
      return;
    }

    resultsContainer.hidden = false;
    rescheduledContainer.hidden = true;

    const matches = appState.data.tasks.filter(task => {
      const box = appState.data.boxes.find(entry => String(entry.id) === String(task.boxId));
      const boxName = box ? box.name : "";
      const status = task.done
        ? "completada"
        : isTaskRescheduledFuture(task)
          ? "reprogramada"
          : isTaskOverdue(task)
            ? "atrasada"
            : isTaskForToday(task)
              ? "pendiente hoy"
              : "pendiente";
      const haystack = [task.title, boxName, task.dueDate, task.id, status].map(normalize).join(" ");
      return haystack.includes(normalizedQuery);
    });

    const summary = document.createElement("div");
    summary.className = "rescheduled-search-summary";
    summary.textContent = matches.length
      ? `${matches.length} resultado${matches.length === 1 ? "" : "s"} en todas tus tareas`
      : "No encontré tareas que coincidan con tu búsqueda.";
    resultsContainer.appendChild(summary);

    matches.forEach(task => {
      const box = appState.data.boxes.find(entry => String(entry.id) === String(task.boxId));
      const boxName = box ? box.name : "Casilla no disponible";
      let statusLabel = "Pendiente";
      let statusClass = "neutral";
      if (task.done) {
        statusLabel = "Completada";
        statusClass = "complete";
      } else if (isTaskRescheduledFuture(task)) {
        statusLabel = task.dueDate
          ? `Reprogramada · ${formatSpanishDateLong(task.dueDate)}`
          : "Reprogramada";
        statusClass = "rescheduled";
      } else if (isTaskOverdue(task)) {
        statusLabel = "Atrasada";
        statusClass = "overdue";
      } else if (isTaskForToday(task)) {
        statusLabel = "Pendiente hoy";
        statusClass = "today";
      } else if (task.dueDate) {
        statusLabel = `Programada · ${formatSpanishDateLong(task.dueDate)}`;
      }

      const card = document.createElement("article");
      card.className = "rescheduled-search-result";
      const info = document.createElement("div");
      info.className = "rescheduled-search-result-info";
      const title = document.createElement("div");
      title.className = "rescheduled-search-result-title";
      title.textContent = String(task.title || "Tarea sin título");
      const metadata = document.createElement("div");
      metadata.className = "rescheduled-search-result-meta";
      metadata.textContent = boxName;
      const status = document.createElement("span");
      status.className = `rescheduled-search-status ${statusClass}`;
      status.textContent = statusLabel;
      info.appendChild(title);
      info.appendChild(metadata);
      info.appendChild(status);

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "btn-primary rescheduled-search-open";
      openButton.textContent = "Ver tarea";
      openButton.addEventListener("click", () => {
        playUiSound("tap");
        const modal = document.getElementById("modal-rescheduled-list");
        if (modal) modal.classList.remove("open");
        jumpToFocusTask(task.id);
      });

      card.appendChild(info);
      card.appendChild(openButton);
      resultsContainer.appendChild(card);
    });
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
    const searchInput = document.getElementById("rescheduled-global-search");
    renderRescheduledTaskSearchResults(searchInput ? searchInput.value : "");
  }

  // Point 1: Dedicated Overdue Tasks Modal (shows ONLY overdue tasks, never future rescheduled tasks!)
  function openOverdueModal() {
    appState.selectedOverdueIds.clear();
    const searchInput = document.getElementById("overdue-global-search");
    if (searchInput) searchInput.value = "";
    renderOverdueModalList();
    const modal = document.getElementById("modal-overdue-list");
    if (modal) modal.classList.add("open");
  }

  function renderOverdueModalList() {
    const allOverdueTasks = appState.data.tasks.filter(t =>
      isTaskOverdue(t) && !isTaskCarriedToTodayFromOverdue(t)
    );
    const searchInput = document.getElementById("overdue-global-search");
    const query = String(searchInput ? searchInput.value : "").trim();

    // Search the exact visible text rendered in each overdue card.
    // This avoids mismatches between the stored title and its displayed text,
    // while normalizing case, accents, whitespace and invisible Unicode marks.
    const normalizeSearchText = value => String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    const normalizedQuery = normalizeSearchText(query);
    const clearButton = document.getElementById("overdue-global-search-clear");
    if (clearButton) clearButton.hidden = !normalizedQuery;

    const listOptions = {
      containerId: "overdue-modal-items",
      tasksList: allOverdueTasks,
      selectedSet: appState.selectedOverdueIds,
      emptyMessage: "🎉 ¡Excelente! No tienes ninguna tarea atrasada pendiente.",
      datePrefixLabel: "⚠️ Venció el",
      isOverdueStyle: true
    };

    // First render the real overdue cards; their textContent is the source of truth
    // for what the user can actually see and search.
    renderInteractiveTaskModalList(listOptions);
    if (!normalizedQuery) return;

    const container = document.getElementById("overdue-modal-items");
    if (!container) return;
    const renderedCards = Array.from(container.querySelectorAll(".resched-modal-card"));
    const matchingIds = new Set(
      renderedCards
        .filter(card => normalizeSearchText(card.textContent).includes(normalizedQuery))
        .map(card => String(card.dataset.taskId || ""))
        .filter(Boolean)
    );

    const matchingTasks = allOverdueTasks.filter(task => matchingIds.has(String(task.id)));
    renderInteractiveTaskModalList({
      ...listOptions,
      tasksList: matchingTasks,
      emptyMessage: "No encontré tareas atrasadas que coincidan con tu búsqueda."
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

  function syncBoxEmojiPickerUI() {
    const input = document.getElementById("input-box-emoji");
    const selected = String(input ? input.value : "").trim();
    document.querySelectorAll("[data-box-emoji]").forEach(button => {
      const active = selected === button.dataset.boxEmoji;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function openBoxModal(boxId = null) {
    appState.editingBoxId = boxId;
    const modal = document.getElementById("modal-box");
    const titleEl = document.getElementById("modal-box-title");
    const nameInput = document.getElementById("input-box-name");
    const emojiInput = document.getElementById("input-box-emoji");

    if (boxId) {
      const box = appState.data.boxes.find(b => b.id === boxId);
      if (!box) return;
      titleEl.textContent = "Editar casilla";
      nameInput.value = box.name.toUpperCase();
      if (emojiInput) emojiInput.value = String(box.emoji || "");
    } else {
      titleEl.textContent = "Nueva casilla";
      nameInput.value = "";
      if (emojiInput) emojiInput.value = "";
    }
    syncBoxEmojiPickerUI();
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
      lines.push(`${box.emoji ? box.emoji + " " : "🗂️ "}*${box.name}*`);
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
            appState.data = applyLocalViewStateToData(normalizeDataPayload(bkp.data), appState.data);
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
    const todayIso = getTodayISO();
    const todayTasks = tasks.filter(t => isTaskForToday(t));
    const doneForTodayPlan = todayTasks.filter(t => t.done).length;
    const pendingToday = todayTasks.filter(t => !t.done).length;
    const completedTodayActual = tasks.filter(t => t.done && t.completedDate === todayIso).length;
    const rate = todayTasks.length > 0 ? Math.round((doneForTodayPlan / todayTasks.length) * 100) : 0;
    const reschedCount = tasks.filter(t => isTaskRescheduledFuture(t)).length;
    const recurringCount = tasks.filter(t => t.frequency !== "once" || (t.repeatDays && t.repeatDays.length > 0)).length;
    const focusScore = tasks.length > 0 ? Math.round(((tasks.length - reschedCount) / tasks.length) * 100) : 100;
    const monthlyTotal = (appState.data.monthlyCompletedBase || 66) + tasks.filter(t => t.done).length;

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

    // Chart 1: only use recorded history; a missing prior-day value remains blank.
    const labels7 = [];
    const values7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${day}`;
      labels7.push(`${DAY_SHORT_NAMES[d.getDay()]} ${d.getDate()}`);

      const hasRecordedValue = Object.prototype.hasOwnProperty.call(appState.history || {}, iso) &&
        appState.history[iso] !== null &&
        appState.history[iso] !== "" &&
        Number.isFinite(Number(appState.history[iso])) &&
        Number(appState.history[iso]) >= 0;

      if (hasRecordedValue) {
        values7.push(Number(appState.history[iso]));
      } else if (iso === todayIso) {
        // Today's actual completion count can be recovered from the saved task records.
        values7.push(completedTodayActual);
      } else {
        values7.push(null);
      }
    }

    const historyNote = document.getElementById("chart-productivity-history-note");
    if (historyNote) {
      const recordedDays = values7.filter(value => value !== null).length;
      historyNote.textContent = recordedDays === 7
        ? "Historial real registrado para los últimos siete días."
        : recordedDays === 1
          ? "Solo hay un día con datos reales. Los demás días quedan vacíos; no se estiman cifras."
          : `Datos reales disponibles para ${recordedDays} de los últimos 7 días. Los días vacíos no tienen historial guardado.`;
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
              spanGaps: false,
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
            data: [pendingToday, reschedCount, recurringCount, completedTodayActual],
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
    const toggleAllBoxesButton = document.getElementById("btn-toggle-all-boxes");
    if (toggleAllBoxesButton) toggleAllBoxesButton.addEventListener("click", toggleAllBoxes);

    // Global pointer listeners for Hold-to-Drag & Auto-Scroll (Point 7)
    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true });
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear-btn");

    const focusToggle = document.getElementById("btn-toggle-focus-mode");
    const focusPanel = document.getElementById("focus-mode-panel");
    focusToggle.addEventListener("click", () => {
      const nextExpanded = focusToggle.getAttribute("aria-expanded") !== "true";
      setFocusModeVisibility(nextExpanded);
      playUiSound("tap");
      if (nextExpanded) renderFocusModePanel();
    });
    focusPanel.addEventListener("input", event => {
      const input = event.target.closest("[data-focus-search-slot]");
      if (!input) return;
      renderFocusTaskSuggestions(input.dataset.focusBoxId, Number(input.dataset.focusSearchSlot), input.value, input);
    });
    focusPanel.addEventListener("keydown", event => {
      const input = event.target.closest("[data-focus-search-slot]");
      if (!input) return;
      const slot = Number(input.dataset.focusSearchSlot);
      const suggestions = input.closest(".focus-priority-card")?.querySelector(".focus-priority-suggestions");
      if (!suggestions) return;

      if (event.key === "Escape") {
        suggestions.hidden = true;
        suggestions.dataset.activeIndex = "-1";
        return;
      }
      const options = Array.from(suggestions.querySelectorAll(".focus-priority-suggestion"));
      if (!options.length || suggestions.hidden) {
        if (event.key === "Enter") event.preventDefault();
        return;
      }
      let activeIndex = Number(suggestions.dataset.activeIndex || -1);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex = event.key === "ArrowDown"
          ? (activeIndex + 1) % options.length
          : (activeIndex - 1 + options.length) % options.length;
        suggestions.dataset.activeIndex = String(activeIndex);
        options.forEach((option, index) => {
          option.classList.toggle("active", index === activeIndex);
          option.setAttribute("aria-selected", String(index === activeIndex));
        });
      } else if (event.key === "Enter") {
        event.preventDefault();
        const chosen = activeIndex >= 0 ? options[activeIndex] : options[0];
        if (chosen) chosen.click();
      }
    });
    focusPanel.addEventListener("focusout", event => {
      if (event.relatedTarget && event.relatedTarget.closest && event.relatedTarget.closest(".focus-priority-search-wrap")) return;
      focusPanel.querySelectorAll(".focus-priority-suggestions").forEach(list => { list.hidden = true; });
    });
    focusPanel.addEventListener("click", event => {
      const clear = event.target.closest('[data-focus-action="clear-task"]');
      if (clear) {
        setFocusPriority(clear.dataset.focusBoxId, Number(clear.dataset.focusSlot), "");
        return;
      }
      const choose = event.target.closest('[data-focus-action="choose-task"]');
      if (choose) {
        setFocusPriority(choose.dataset.focusBoxId, Number(choose.dataset.focusSlot), choose.dataset.taskId);
        return;
      }
      const jump = event.target.closest('[data-focus-action="jump-task"]');
      if (jump) jumpToFocusTask(jump.dataset.taskId);
    });

    const learningSection = document.getElementById("learning-goals-section");
    const learningModal = document.getElementById("learning-details-panel");
    const openLearningModal = () => {
      renderLearningGoalsPanel();
      learningModal.classList.add("open");
      playUiSound("tap");
      const dialog = learningModal.querySelector(".learning-modal-dialog");
      if (dialog) dialog.focus({ preventScroll: true });
    };

    learningSection.addEventListener("click", event => {
      const trigger = event.target.closest("[data-learning-open]");
      if (trigger) openLearningModal();
    });
    learningSection.addEventListener("keydown", event => {
      const trigger = event.target.closest("[data-learning-open]");
      if (!trigger || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      openLearningModal();
    });
    learningModal.addEventListener("click", event => {
      if (event.target === learningModal) learningModal.classList.remove("open");
    });

    document.getElementById("btn-save-daily-learning").addEventListener("click", saveDailyLearningGoal);
    document.getElementById("btn-save-weekly-learning").addEventListener("click", saveWeeklyLearningGoal);
    learningModal.addEventListener("click", (event) => {
      const button = event.target.closest("[data-learning-action]");
      if (!button || button.disabled) return;
      playUiSound("tap");
      markLearningGoalStatus(button.dataset.learningAction, button.dataset.learningStatus);
    });


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
        const taskMenu = document.getElementById("task-context-menu");
        if (taskMenu && !taskMenu.hidden) {
          closeTaskContextMenu();
          e.preventDefault();
          return;
        }

        // ESC closes Modo Enfoque and restores the board without clearing saved priorities.
        const focusPanel = document.getElementById("focus-mode-panel");
        if (focusPanel && !focusPanel.hidden) {
          if (document.activeElement && focusPanel.contains(document.activeElement)) {
            document.activeElement.blur();
          }
          setFocusModeVisibility(false);
          playUiSound("tap");
        }

        // ESC also cancels Ctrl/Cmd multi-selection and hides the bulk action toolbar.
        if (appState.selectedTaskIds && appState.selectedTaskIds.size > 0) {
          clearTaskSelection();
        }

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

    const quoteContainer = document.getElementById("quote-container");
    let quoteClickTimeout = null;
    const quoteClickDelay = 350;

    const copyCurrentQuote = () => {
      const quote = appState.quotes[appState.currentQuoteIndex % appState.quotes.length];
      if (!quote) return;
      copyTextToClipboard(`${quote.text}\n— ${getDisplayQuoteAuthor(quote.author)}`, "📋 Frase y autor copiados", quoteContainer);
    };

    const advanceToNextQuote = () => {
      appState.currentQuoteIndex = getNextQuoteIndex();
      renderQuote(true);
      startQuoteRotation();
      playUiSound("tap");
    };

    quoteContainer.addEventListener("click", (e) => {
      // Keyboard activation is handled in keydown so its synthetic click must not copy twice.
      if (e.detail === 0) return;
      // The second click of a double-click cancels the pending copy.
      if (e.detail > 1) {
        if (quoteClickTimeout !== null) clearTimeout(quoteClickTimeout);
        quoteClickTimeout = null;
        return;
      }

      if (quoteClickTimeout !== null) clearTimeout(quoteClickTimeout);
      quoteClickTimeout = setTimeout(() => {
        quoteClickTimeout = null;
        copyCurrentQuote();
      }, quoteClickDelay);
    });

    quoteContainer.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (quoteClickTimeout !== null) clearTimeout(quoteClickTimeout);
      quoteClickTimeout = null;
      advanceToNextQuote();
    });

    quoteContainer.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (quoteClickTimeout !== null) clearTimeout(quoteClickTimeout);
      quoteClickTimeout = null;
      copyCurrentQuote();
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

    const rescheduledGlobalSearch = document.getElementById("rescheduled-global-search");
    const rescheduledGlobalSearchClear = document.getElementById("rescheduled-global-search-clear");
    if (rescheduledGlobalSearch) {
      rescheduledGlobalSearch.addEventListener("input", () => {
        renderRescheduledTaskSearchResults(rescheduledGlobalSearch.value);
      });
    }
    if (rescheduledGlobalSearchClear) {
      rescheduledGlobalSearchClear.addEventListener("click", () => {
        if (rescheduledGlobalSearch) {
          rescheduledGlobalSearch.value = "";
          renderRescheduledTaskSearchResults("");
          rescheduledGlobalSearch.focus();
        }
      });
    }

    document.getElementById("btn-open-productivity").addEventListener("click", () => {
      playUiSound("tap");
      openProductivityModal();
    });

    const birthdayOpenButton = document.getElementById("btn-open-birthdays");
    if (birthdayOpenButton) birthdayOpenButton.addEventListener("click", () => {
      playUiSound("tap");
      openBirthdayCalendarModal();
    });
    const dateBirthdayShortcut = document.getElementById("btn-date-birthday-shortcut");
    if (dateBirthdayShortcut) dateBirthdayShortcut.addEventListener("click", () => {
      playUiSound("tap");
      openBirthdayCalendarModal({ expandUpcoming: true, todayOnly: false });
    });
    const birthdayYearViewButton = document.getElementById("btn-birthday-year-view");
    if (birthdayYearViewButton) birthdayYearViewButton.addEventListener("click", () => {
      birthdayCalendarMode = "year";
      playUiSound("tap");
      renderBirthdayCalendar();
    });
    const birthdayMonthViewButton = document.getElementById("btn-birthday-month-view-toggle");
    if (birthdayMonthViewButton) birthdayMonthViewButton.addEventListener("click", () => {
      birthdayCalendarMode = "month";
      playUiSound("tap");
      renderBirthdayCalendar();
    });
    const birthdayHistoryViewButton = document.getElementById("btn-birthday-history-view");
    if (birthdayHistoryViewButton) birthdayHistoryViewButton.addEventListener("click", () => {
      birthdayCalendarMode = "history";
      playUiSound("tap");
      renderBirthdayCalendar();
    });
    const birthdayHistoryList = document.getElementById("birthday-history-list");
    if (birthdayHistoryList) birthdayHistoryList.addEventListener("click", handleBirthdayCalendarClick);
    const birthdayHistorySearch = document.getElementById("birthday-history-search");
    if (birthdayHistorySearch) birthdayHistorySearch.addEventListener("input", renderBirthdayHistory);
    const birthdayExportButton = document.getElementById("btn-birthday-export");
    if (birthdayExportButton) birthdayExportButton.addEventListener("click", exportBirthdaysCsv);
    const birthdayPrevButton = document.getElementById("btn-birthday-prev-period");
    if (birthdayPrevButton) birthdayPrevButton.addEventListener("click", () => {
      if (birthdayCalendarMode === "year") birthdayCalendarYear--;
      else {
        birthdayCalendarMonth--;
        if (birthdayCalendarMonth < 0) {
          birthdayCalendarMonth = 11;
          birthdayCalendarYear--;
        }
      }
      playUiSound("tap");
      renderBirthdayCalendar();
    });
    const birthdayNextButton = document.getElementById("btn-birthday-next-period");
    if (birthdayNextButton) birthdayNextButton.addEventListener("click", () => {
      if (birthdayCalendarMode === "year") birthdayCalendarYear++;
      else {
        birthdayCalendarMonth++;
        if (birthdayCalendarMonth > 11) {
          birthdayCalendarMonth = 0;
          birthdayCalendarYear++;
        }
      }
      playUiSound("tap");
      renderBirthdayCalendar();
    });
    const birthdayYearGrid = document.getElementById("birthday-year-view");
    const birthdaySingleMonthGrid = document.getElementById("birthday-single-month-grid");
    if (birthdayYearGrid) birthdayYearGrid.addEventListener("click", handleBirthdayCalendarClick);
    if (birthdaySingleMonthGrid) birthdaySingleMonthGrid.addEventListener("click", handleBirthdayCalendarClick);
    const birthdayMonthEventsList = document.getElementById("birthday-month-events-list");
    if (birthdayMonthEventsList) birthdayMonthEventsList.addEventListener("click", handleBirthdayCalendarClick);
    const birthdayUpcomingList = document.getElementById("birthday-upcoming-list");
    if (birthdayUpcomingList) birthdayUpcomingList.addEventListener("click", handleBirthdayCalendarClick);
    const birthdayUpcomingToggle = document.getElementById("btn-toggle-birthday-upcoming");
    if (birthdayUpcomingToggle) birthdayUpcomingToggle.addEventListener("click", () => {
      birthdayUpcomingExpanded = !birthdayUpcomingExpanded;
      playUiSound("tap");
      renderBirthdayUpcomingList();
    });
    const birthdayMonthSelect = document.getElementById("birthday-month");
    if (birthdayMonthSelect) birthdayMonthSelect.addEventListener("change", () => {
      const oldDay = Number(document.getElementById("birthday-day").value) || 1;
      updateBirthdayDayOptions(Number(birthdayMonthSelect.value), oldDay);
    });
    const birthdayForm = document.getElementById("birthday-editor");
    if (birthdayForm) birthdayForm.addEventListener("submit", handleBirthdayFormSubmit);
    const birthdayCancelButton = document.getElementById("btn-birthday-editor-cancel");
    if (birthdayCancelButton) birthdayCancelButton.addEventListener("click", closeBirthdayEditor);
    const birthdayDeleteButton = document.getElementById("btn-birthday-delete");
    if (birthdayDeleteButton) birthdayDeleteButton.addEventListener("click", deleteEditingBirthday);

    const recurringAuditModal = document.getElementById("modal-recurring-audit");
    const recurringAuditClose = document.getElementById("btn-close-recurring-audit");
    const recurringAuditCloseFooter = document.getElementById("btn-close-recurring-audit-footer");
    const recurringAuditTaskList = document.getElementById("recurring-audit-task-list");
    const recurringAuditSearch = document.getElementById("recurring-audit-search");
    const recurringAuditSearchClear = document.getElementById("recurring-audit-search-clear");
    const recurringAuditDayFilters = document.getElementById("recurring-audit-day-filters");
    if (recurringAuditDayFilters) recurringAuditDayFilters.addEventListener("click", event => {
      const button = event.target.closest("[data-recurring-audit-day]");
      if (!button || button.disabled || !appState.recurringAuditBoxId) return;
      const value = button.dataset.recurringAuditDay;
      if (value === "all") {
        recurringAuditSelectedDays.clear();
      } else {
        const day = Number(value);
        if (!Number.isInteger(day) || day < 0 || day > 6) return;
        if (recurringAuditSelectedDays.has(day)) recurringAuditSelectedDays.delete(day);
        else recurringAuditSelectedDays.add(day);
      }
      playUiSound("tap");
      renderBoxRecurringAudit(appState.recurringAuditBoxId);
    });
    if (recurringAuditSearch) recurringAuditSearch.addEventListener("input", () => {
      if (appState.recurringAuditBoxId) renderBoxRecurringAudit(appState.recurringAuditBoxId);
    });
    if (recurringAuditSearchClear) recurringAuditSearchClear.addEventListener("click", () => {
      if (recurringAuditSearch) {
        recurringAuditSearch.value = "";
        recurringAuditSearch.focus();
      }
      if (appState.recurringAuditBoxId) renderBoxRecurringAudit(appState.recurringAuditBoxId);
    });
    if (recurringAuditClose) recurringAuditClose.addEventListener("click", closeBoxRecurringAudit);
    if (recurringAuditCloseFooter) recurringAuditCloseFooter.addEventListener("click", closeBoxRecurringAudit);
    if (recurringAuditModal) recurringAuditModal.addEventListener("click", event => {
      if (event.target === recurringAuditModal) closeBoxRecurringAudit();
    });
    if (recurringAuditTaskList) recurringAuditTaskList.addEventListener("click", event => {
      const daysEditButton = event.target.closest("[data-repeat-audit-edit-task]");
      const titleEditButton = event.target.closest("[data-repeat-audit-edit-title-task]");
      if (!daysEditButton && !titleEditButton) return;

      const taskId = String((titleEditButton || daysEditButton).dataset.repeatAuditEditTitleTask ||
        (titleEditButton || daysEditButton).dataset.repeatAuditEditTask || "");
      const task = appState.data.tasks.find(item => String(item.id) === taskId);
      if (!task) return;

      closeBoxRecurringAudit();
      if (titleEditButton) {
        openEditTaskTitleModal(task.id);
      } else {
        openRepeatPickerModal(task.id);
      }
    });

    const deleteTaskModal = document.getElementById("modal-delete-task");
    const deleteTaskCancel = document.getElementById("btn-cancel-delete-task");
    const deleteTaskClose = document.getElementById("btn-close-delete-task");
    const deleteTaskConfirm = document.getElementById("btn-confirm-delete-task");
    const deleteTaskWeekdaysPanel = document.getElementById("delete-task-weekdays-panel");
    document.querySelectorAll('input[name="delete-task-mode"]').forEach(input => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        if (deleteTaskWeekdaysPanel) deleteTaskWeekdaysPanel.hidden = input.value !== "weekdays";
        if (deleteTaskConfirm) {
          const labels = {
            occurrence: "Eliminar solo esta ocurrencia",
            future: "Eliminar esta y las siguientes",
            weekdays: "Aplicar cambios de repetición",
            series: "Eliminar toda la repetición"
          };
          deleteTaskConfirm.textContent = pendingTaskDeletionSeriesRootId
            ? labels[input.value] || "Confirmar eliminación"
            : "Eliminar esta tarea";
        }
      });
    });
    const deleteTaskWeekdayList = document.getElementById("delete-task-weekday-list");
    if (deleteTaskWeekdayList) deleteTaskWeekdayList.addEventListener("change", () => {
      const weekdaysMode = document.querySelector('input[name="delete-task-mode"][value="weekdays"]');
      if (weekdaysMode) weekdaysMode.checked = true;
      if (deleteTaskWeekdaysPanel) deleteTaskWeekdaysPanel.hidden = false;
      if (deleteTaskConfirm && pendingTaskDeletionSeriesRootId) {
        deleteTaskConfirm.textContent = "Aplicar cambios de repetición";
      }
    });
    if (deleteTaskCancel) deleteTaskCancel.addEventListener("click", closeDeleteTaskDialog);
    if (deleteTaskClose) deleteTaskClose.addEventListener("click", closeDeleteTaskDialog);
    if (deleteTaskConfirm) deleteTaskConfirm.addEventListener("click", confirmDeleteTask);
    if (deleteTaskModal) deleteTaskModal.addEventListener("click", event => {
      if (event.target === deleteTaskModal) closeDeleteTaskDialog();
    });

    const openCompletionHistoryButton = document.getElementById("btn-open-completion-history");
    if (openCompletionHistoryButton) {
      openCompletionHistoryButton.addEventListener("click", () => {
        playUiSound("tap");
        openCompletionHistoryModal();
      });
    }
    document.querySelectorAll("[data-completion-period]").forEach(button => {
      button.addEventListener("click", () => {
        completionHistoryPeriod = button.dataset.completionPeriod === "week" ? "week" : "today";
        document.querySelectorAll("[data-completion-period]").forEach(option => {
          option.classList.toggle("is-active", option === button);
          option.setAttribute("aria-pressed", option === button ? "true" : "false");
        });
        renderCompletionHistory();
        playUiSound("tap");
      });
    });

    document.getElementById("btn-filter-overdue").addEventListener("click", () => {
      playUiSound("tap");
      openOverdueModal();
    });

    const overdueSearchInput = document.getElementById("overdue-global-search");
    const overdueSearchClear = document.getElementById("overdue-global-search-clear");
    if (overdueSearchInput) {
      overdueSearchInput.addEventListener("input", renderOverdueModalList);
    }
    if (overdueSearchClear) {
      overdueSearchClear.addEventListener("click", () => {
        if (!overdueSearchInput) return;
        overdueSearchInput.value = "";
        renderOverdueModalList();
        overdueSearchInput.focus();
      });
    }

    const multiRescheduleBtn = document.getElementById("btn-multi-reschedule");
    if (multiRescheduleBtn) {
      multiRescheduleBtn.addEventListener("click", () => {
        const ids = Array.from(appState.selectedTaskIds);
        if (!ids.length) return;
        playUiSound("tap");
        openDatePickerModal(ids);
      });
    }
    const multiTodayBtn = document.getElementById("btn-multi-today");
    if (multiTodayBtn) multiTodayBtn.addEventListener("click", () => {
      playUiSound("tap");
      scheduleSelectedTasksForToday();
    });
    const multiTomorrowBtn = document.getElementById("btn-multi-tomorrow");
    if (multiTomorrowBtn) multiTomorrowBtn.addEventListener("click", rescheduleSelectedTasksToTomorrow);
    const multiDeleteBtn = document.getElementById("btn-multi-delete");
    if (multiDeleteBtn) multiDeleteBtn.addEventListener("click", () => {
      playUiSound("tap");
      confirmDeleteSelectedTasks();
    });
    const multiClearBtn = document.getElementById("btn-multi-clear");
    if (multiClearBtn) multiClearBtn.addEventListener("click", clearTaskSelection);

    // Point 8: Repeat Modal Events
    document.querySelectorAll("[data-repeat-duration]").forEach(button => {
      button.addEventListener("click", () => {
        appState.selectedRepeatDuration = button.dataset.repeatDuration === "thisWeek" ? "thisWeek" : "forever";
        syncRepeatDurationUI();
        playUiSound("tap");
      });
    });

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
      const todayIso = getTodayISO();
      const parts = todayIso.split("-");
      calState.viewYear = Number(parts[0]);
      calState.viewMonth = Number(parts[1]) - 1;
      calState.selectedIso = todayIso;
      document.getElementById("input-resched-date").value = todayIso;
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

    // Optional emoji for casillas: select from the quick gallery or paste an emoji directly.
    const boxEmojiInput = document.getElementById("input-box-emoji");
    if (boxEmojiInput) {
      boxEmojiInput.addEventListener("input", syncBoxEmojiPickerUI);
      document.querySelectorAll("[data-box-emoji]").forEach(button => {
        button.addEventListener("click", () => {
          boxEmojiInput.value = button.dataset.boxEmoji;
          syncBoxEmojiPickerUI();
          boxEmojiInput.focus();
          playUiSound("tap");
        });
      });
      const clearBoxEmojiButton = document.getElementById("btn-clear-box-emoji");
      if (clearBoxEmojiButton) {
        clearBoxEmojiButton.addEventListener("click", () => {
          boxEmojiInput.value = "";
          syncBoxEmojiPickerUI();
          boxEmojiInput.focus();
          playUiSound("tap");
        });
      }
    }

    // Box Form Submit
    document.getElementById("form-box").addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("input-box-name");
      const emojiInput = document.getElementById("input-box-emoji");
      const name = nameInput.value.trim().toUpperCase();
      const emoji = String(emojiInput ? emojiInput.value : "").trim().slice(0, 16);
      if (!name) {
        nameInput.classList.add("input-invalid");
        setTimeout(() => nameInput.classList.remove("input-invalid"), 400);
        showToast("Ingresa un nombre de casilla", true);
        return;
      }
      if (appState.editingBoxId) {
        const box = appState.data.boxes.find(b => b.id === appState.editingBoxId);
        if (box) {
          box.name = name;
          box.emoji = emoji;
          box.updatedAt = Date.now();
        }
        showToast("Casilla actualizada");
      } else {
        appState.data.boxes.push({
          id: `box_${Date.now()}`,
          name,
          emoji,
          color: "#2563eb",
          collapsed: false,
          order: appState.data.boxes.length,
          updatedAt: Date.now()
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

  function initMobileAppNavigation() {
    const setActive = activeId => {
      document.querySelectorAll(".mobile-app-nav-item").forEach(button => {
        const active = button.id === activeId;
        button.classList.toggle("is-active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
    };
    const todayButton = document.getElementById("mobile-nav-today");
    if (todayButton) todayButton.addEventListener("click", () => {
      setActive("mobile-nav-today");
      const todayTab = document.querySelector('.tab-btn[data-tab="today"]');
      if (todayTab) todayTab.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const boxesButton = document.getElementById("mobile-nav-boxes");
    if (boxesButton) boxesButton.addEventListener("click", () => {
      setActive("mobile-nav-boxes");
      const allTab = document.querySelector('.tab-btn[data-tab="all"]');
      if (allTab) allTab.click();
      const board = document.getElementById("boxes-container");
      if (board) board.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const searchButton = document.getElementById("mobile-nav-search");
    if (searchButton) searchButton.addEventListener("click", () => {
      setActive("mobile-nav-search");
      const search = document.getElementById("search-input");
      if (search) {
        search.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => search.focus(), 220);
      }
    });
    const progressButton = document.getElementById("mobile-nav-progress");
    if (progressButton) progressButton.addEventListener("click", () => {
      setActive("mobile-nav-progress");
      openProductivityModal();
    });
    const moreButton = document.getElementById("mobile-nav-more");
    if (moreButton) moreButton.addEventListener("click", () => {
      setActive("mobile-nav-more");
      const options = document.getElementById("btn-more-options");
      if (options) options.click();
    });
  }

  function boot() {
    initMobileAppNavigation();
    loadRegisteredData();
    cleanupCompletedTasksFromPreviousDays();
    // The midnight timeout and focus/visibility handlers cover date rollover.
    // Do not poll cleanup every 5 seconds: it can trigger repeated board renders.
    scheduleExactMidnightRollover();
    applyThemeAndSoundUI();
    renderHeroDate();
    // Resume the shuffled deck at its next unused quote, even after a page refresh.
    appState.currentQuoteIndex = getNextQuoteIndex();
    renderQuote(false);
    startQuoteRotation();
    initProTooltips();
    initEvents();
    renderBoard();
    renderLearningGoalsPanel();
    renderBirthdayUpcomingList();
    document.documentElement.classList.remove("tasky-booting");

    // Initial sync, real-time updates, and a quiet recovery poll for mobile WebViews.
    // Incoming payloads are fingerprinted before rendering, so unchanged data won't redraw the board.
    pullCloudSync(false);
    startCloudSyncStream();
    startCloudSyncRecovery();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
