/* ==========================================================================
   TASKY WORKSPACE PERSONALIZATION · Frases dedicadas para Leah y Camila
   Intercepta #quote-text / #quote-author sin modificar app.js.
   ========================================================================== */
(() => {
  "use strict";

  // Frases mágicas, dulces e inspiradoras de cuentos, libros y películas para una niña de 11 años
  const LEAH_QUOTES = [
    { text: "Lo esencial es invisible a los ojos; solo se ve bien con el corazón.", author: "El Principito" },
    { text: "Eres más valiente de lo que crees, más fuerte de lo que pareces y más inteligente de lo que piensas.", author: "Winnie the Pooh" },
    { text: "Los libros le dieron a Matilda un mensaje maravilloso: nunca estás sola cuando tienes historias contigo.", author: "Matilda · Roald Dahl" },
    { text: "A veces he creído hasta seis cosas imposibles antes del desayuno.", author: "Alicia en el País de las Maravillas" },
    { text: "En el momento en que dudas si puedes volar, dejas de poder hacerlo para siempre. ¡Confía en tus alas!", author: "Peter Pan" },
    { text: "En cada trabajo que hay que hacer hay un toque de diversión; encuentra lo divertido y ¡zas!, la tarea se vuelve un juego.", author: "Mary Poppins" },
    { text: "No es un día cualquiera cuando decides aprender algo nuevo y sorprendente.", author: "Ana de las Tejas Verdes" },
    { text: "Aventúrate más allá de lo conocido: las mejores recompensas esperan a quienes se atreven a explorar.", author: "Enredados" },
    { text: "No importa cuán grande parezca la montaña, siempre se sube dando un pequeño paso con alegría.", author: "Cuento de la Estrella Curiosa" },
    { text: "Tu magia no está en ser perfecta, sino en ser tú misma y brillar con tu propio don.", author: "Encanto" },
    { text: "A veces el mar te llama a descubrir hasta dónde puedes llegar, y la respuesta siempre te sorprenderá.", author: "Moana" },
    { text: "Son nuestras decisiones, mucho más que nuestras habilidades, las que muestran quiénes somos realmente.", author: "Albus Dumbledore · Harry Potter" },
    { text: "Cuando tienes una chispa de curiosidad, cada día se convierte en una aventura nueva.", author: "El Mago de Oz" },
    { text: "Los sueños grandes empiezan con ideas pequeñas guardadas en el corazón.", author: "Charlie y la Fábrica de Chocolate" },
    { text: "Una pequeña amabilidad puede iluminar el día entero de alguien más.", author: "El Jardín Secreto" },
    { text: "La imaginación es el puente mágico que nos lleva a cualquier lugar del universo.", author: "Las Crónicas de Narnia" },
    { text: "Cada error es solo una pista secreta que te acerca un poquito más a lograrlo.", author: "La Pequeña Inventora" },
    { text: "Incluso la estrella más pequeña brilla con luz propia en el cielo nocturno.", author: "Cuentos bajo la Luna" },
    { text: "Aprender es como coleccionar superpoderes invisibles que nadie te puede quitar.", author: "Matilda" },
    { text: "Sé siempre curiosa, haz muchas preguntas y nunca dejes de maravillarte con el mundo.", author: "Alicia" },
    { text: "Cuando pones amor y ganas en lo que haces, hasta las tareas chiquitas se vuelven especiales.", author: "Winnie the Pooh" },
    { text: "El corazón alegre encuentra tesoros donde otros solo ven días comunes.", author: "Ana de las Tejas Verdes" },
    { text: "Nunca subestimes lo lejos que puedes llegar cuando confías en tu esfuerzo y en tu creatividad.", author: "Valiente" },
    { text: "Tu sonrisa y tu esfuerzo son dos superpoderes que hacen el mundo más bonito.", author: "Tasky Leah ✨" },
    { text: "Las flores no compiten con la flor de al lado; simplemente florecen a su propio ritmo.", author: "El Jardín Secreto" },
    { text: "Leer un buen libro es como abrir una puerta secreta hacia mil mundos nuevos.", author: "La Historia Interminable" },
    { text: "Hoy es un gran día para descubrir algo nuevo, reír fuerte y sentirte orgullosa de ti.", author: "Tasky Leah ✨" },
    { text: "Los mejores cuentos empiezan cuando alguien se atreve a dar el primer paso.", author: "El Hobbit" }
  ];

  // Frases cálidas de mujeres empoderadas, brillantes, seguras y que construyen en amor y equipo
  const CAMILA_QUOTES = [
    { text: "Una mujer segura de su valor ilumina cada lugar al que llega y eleva a quienes caminan a su lado.", author: "Inspiración para Camila" },
    { text: "Cree en tu talento, confía en tu voz y atrévete a soñar en grande: tienes todo para lograrlo.", author: "Michelle Obama" },
    { text: "La verdadera fuerza de una mujer está en combinar una mente brillante con un corazón generoso.", author: "Marie Curie" },
    { text: "Cuando una mujer abraza su propósito con amor y determinación, no hay meta demasiado alta.", author: "Inspiración femenina" },
    { text: "Tu inteligencia, tu ternura y tu constancia son la fórmula más poderosa para construir la vida que sueñas.", author: "Tasky Cams ✨" },
    { text: "No temas brillar con toda tu luz; quienes te aman de verdad celebran cada uno de tus logros.", author: "Marianne Williamson" },
    { text: "Las mujeres que confían en su intuición y trabajan con pasión transforman su mundo y el de su familia.", author: "Isabel Allende" },
    { text: "El éxito sabe aún mejor cuando se construye con disciplina, alegría y amor compartido.", author: "Tasky Cams ✨" },
    { text: "Cada paso que das hacia tus metas demuestra la mujer extraordinaria y capaz que eres.", author: "Maya Angelou" },
    { text: "La elegancia de una mujer empoderada está en saber lo que vale y avanzar con calma, gracia y firmeza.", author: "Audrey Hepburn" },
    { text: "No necesitas ser perfecta para ser admirable; basta con ser auténtica, valiente y constante.", author: "Brené Brown" },
    { text: "Cuando inviertes en tus sueños y en tu crecimiento, todo lo que te rodea florece contigo.", author: "Oprah Winfrey" },
    { text: "Tu voz importa, tus ideas tienen fuerza y tu capacidad para crear cosas hermosas no tiene límites.", author: "Malala Yousafzai" },
    { text: "Ser fuerte también es saber descansar, disfrutar el presente y dejarte querer mientras conquistas tus metas.", author: "Tasky Cams ✨" },
    { text: "Detrás de cada mujer que avanza con confianza hay decisiones valientes tomadas con el corazón.", author: "Eleanor Roosevelt" },
    { text: "El liderazgo femenino más bonito nace de la empatía, la claridad y la pasión por hacer las cosas bien.", author: "Sheryl Sandberg" },
    { text: "Tienes el don de convertir retos en oportunidades y días ordinarios en recuerdos inolvidables.", author: "Tasky Cams ✨" },
    { text: "Confía en el proceso: cada pequeño avance de hoy está construyendo tu mejor versión.", author: "Arianna Huffington" },
    { text: "Una mujer con metas claras y un corazón lleno de amor es imparable.", author: "Inspiración para Camila" },
    { text: "Atrévete a ocupar tu lugar con orgullo: tu talento y tu esfuerzo merecen grandes resultados.", author: "Frida Kahlo" },
    { text: "La disciplina con cariño hacia ti misma es el puente más firme hacia todo lo que deseas alcanzar.", author: "Tasky Cams ✨" },
    { text: "Brillar no te aleja de nadie; al contrario, inspira y llena de orgullo a quienes te aman.", author: "Tasky Cams ✨" },
    { text: "Eres capaz de mucho más de lo que imaginas: confía en ti y da ese siguiente paso hoy.", author: "Melinda French Gates" },
    { text: "Construir tus sueños junto a una vida llena de amor es el verdadero significado del éxito.", author: "Tasky Cams ✨" }
  ];

  const POOLS = {
    leah: LEAH_QUOTES,
    camila: CAMILA_QUOTES
  };

  let activeWorkspace = "";
  let currentIndex = -1;
  let isOwnUpdate = false;
  let observer = null;

  function getWorkspaceId() {
    return String(document.documentElement.dataset.taskyWorkspace || activeWorkspace || "").toLowerCase();
  }

  function getActivePool() {
    return POOLS[getWorkspaceId()] || null;
  }

  function pickNextQuote(pool) {
    if (!pool || !pool.length) return null;
    if (currentIndex < 0) {
      currentIndex = Math.floor(Math.random() * pool.length);
    } else {
      currentIndex = (currentIndex + 1) % pool.length;
    }
    return pool[currentIndex];
  }

  function applyCustomQuote(forceNext = false) {
    const pool = getActivePool();
    if (!pool) return;

    const textEl = document.getElementById("quote-text");
    const authorEl = document.getElementById("quote-author");
    if (!textEl || !authorEl) return;

    const currentText = String(textEl.textContent || "").trim();
    const alreadyFromPool = pool.some(q => q.text === currentText);
    if (!forceNext && alreadyFromPool) return;

    const next = pickNextQuote(pool);
    if (!next) return;

    isOwnUpdate = true;
    try {
      textEl.textContent = next.text;
      authorEl.textContent = "— " + next.author;
    } finally {
      window.setTimeout(() => {
        isOwnUpdate = false;
      }, 30);
    }
  }

  function installQuoteInterceptor() {
    const textEl = document.getElementById("quote-text");
    if (!textEl) return;

    if (!observer) {
      observer = new MutationObserver(() => {
        if (isOwnUpdate) return;
        if (!getActivePool()) return;
        applyCustomQuote(true);
      });
      observer.observe(textEl, { childList: true, characterData: true, subtree: true });
    }

    applyCustomQuote(false);
  }

  window.addEventListener("tasky:workspace-ready", (event) => {
    const ws = event && event.detail && event.detail.workspaceId ? String(event.detail.workspaceId).toLowerCase() : "";
    if (ws) {
      activeWorkspace = ws;
      currentIndex = -1;
    }
    installQuoteInterceptor();
    window.setTimeout(() => applyCustomQuote(false), 250);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installQuoteInterceptor, { once: true });
  } else {
    installQuoteInterceptor();
  }
})();
