/* ==========================================================================
   TASKY WORKSPACE PERSONALIZATION · Frases Harry Potter (Leah), Camila y saludo papá José
   Intercepta #quote-text / #quote-author y el saludo en Tasky Leah sin modificar app.js.
   ========================================================================== */
(() => {
  "use strict";

  // Colección especial de Harry Potter para Leah (11 años, fan de Hogwarts ⚡)
  const LEAH_QUOTES = [
    { text: "La felicidad se puede hallar hasta en los más oscuros momentos, si somos capaces de usar bien la luz.", author: "Albus Dumbledore · Harry Potter" },
    { text: "Son nuestras decisiones, mucho más que nuestras habilidades, las que muestran quiénes somos realmente.", author: "Albus Dumbledore · Harry Potter" },
    { text: "No sirve de nada preocuparse. Lo que tenga que venir, vendrá, y lo enfrentaremos cuando llegue.", author: "Rubeus Hagrid · Harry Potter" },
    { text: "Las cosas que perdemos siempre encuentran el camino de regreso a nosotros, aunque no siempre de la forma que esperamos.", author: "Luna Lovegood · Harry Potter" },
    { text: "Eres igual de cuerdo que yo... ¡y la imaginación es un regalo maravilloso!", author: "Luna Lovegood · Harry Potter" },
    { text: "Libros e inteligencia: hay cosas mucho más importantes, como la amistad y la valentía.", author: "Hermione Granger · Harry Potter" },
    { text: "Cuando tengas dudas, ve a la biblioteca.", author: "Hermione Granger · Harry Potter" },
    { text: "Se necesita una gran valentía para enfrentarse a los enemigos, pero aún más para defender a los amigos.", author: "Albus Dumbledore · Harry Potter" },
    { text: "Trabajar duro es importante, pero hay algo que importa todavía más: creer en ti misma.", author: "Harry Potter" },
    { text: "No importa lo que alguien sea al nacer, sino en quién elige convertirse al crecer.", author: "Albus Dumbledore · Harry Potter" },
    { text: "Todo es posible si tienes suficiente valor.", author: "Ginny Weasley · Harry Potter" },
    { text: "Las palabras son, en mi no tan humilde opinión, nuestra fuente más inagotable de magia.", author: "Albus Dumbledore · Harry Potter" },
    { text: "Hogwarts siempre estará ahí para darte la bienvenida a casa.", author: "J. K. Rowling · Harry Potter" },
    { text: "La curiosidad no es un pecado, pero debemos aprender a usarla con sabiduría y alegría.", author: "Albus Dumbledore · Harry Potter" },
    { text: "Nunca te avergüences de ser diferente; la magia más auténtica nace de ser tú misma.", author: "Luna Lovegood · Harry Potter" },
    { text: "Juro solemnemente que mis intenciones son lograr todas mis tareas de hoy.", author: "Mapa del Merodeador ⚡" },
    { text: "¡Travesura realizada! Cada tarea terminada es un hechizo cumplido con éxito.", author: "Fred y George Weasley ⚡" },
    { text: "Preocuparse significa sufrir dos veces; respira hondo y da un paso a la vez.", author: "Newt Scamander · Mundo Mágico" },
    { text: "La verdadera magia no está solo en la varita, sino en la bondad de tu corazón.", author: "Dobby · Harry Potter" },
    { text: "Incluso un pequeño paso valiente puede cambiar el rumbo de toda una historia.", author: "Neville Longbottom · Harry Potter" },
    { text: "Nunca subestimes el poder de una mente curiosa y unas ganas enormes de aprender.", author: "Minerva McGonagall · Harry Potter" },
    { text: "Las personas que nos aman nunca nos dejan del todo; siempre están aquí, en nuestro corazón.", author: "Sirius Black · Harry Potter" },
    { text: "En Hogwarts siempre se ayudará a quienes lo pidan; nunca tengas miedo de preguntar.", author: "Albus Dumbledore · Harry Potter" },
    { text: "No es la perfección lo que hace grande a una maga, sino las ganas de intentarlo una y otra vez.", author: "Remus Lupin · Harry Potter" },
    { text: "¡Expecto Patronum! Piensa en tu recuerdo más feliz y llena tu día de luz.", author: "Harry Potter ⚡" },
    { text: "¡Lumos! Que hoy brille tu creatividad, tu alegría y tu esfuerzo en cada reto.", author: "Mundo Mágico de Leah ✨" },
    { text: "¡Wingardium Leviosa! Con calma, práctica y buena actitud, hasta lo difícil se vuelve ligero.", author: "Hermione Granger ⚡" },
    { text: "Una gran aventura te espera cada vez que abres un libro o aprendes algo nuevo.", author: "Hogwarts · Tasky Leah 🦉" },
    { text: "El coraje no significa no tener miedo, sino avanzar con el corazón firme y una sonrisa.", author: "Gryffindor · Mundo Mágico" },
    { text: "La lealtad, la paciencia y el esfuerzo constante siempre traen recompensas mágicas.", author: "Hufflepuff · Mundo Mágico" },
    { text: "Un ingenio sin medida es el mayor tesoro que puedes cultivar cada día.", author: "Ravenclaw · Mundo Mágico" },
    { text: "La carta de Hogwarts llega a quienes nunca dejan de creer en la magia de sus sueños.", author: "Tasky Leah ⚡🦉" }
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
  let activeRole = "";
  let currentIndex = -1;
  let isOwnQuoteUpdate = false;
  let isOwnGreetingUpdate = false;
  let quoteObserver = null;
  let greetingObserver = null;

  function getWorkspaceId() {
    return String(document.documentElement.dataset.taskyWorkspace || activeWorkspace || "").toLowerCase();
  }

  function getRole() {
    return String(document.documentElement.dataset.taskyRole || activeRole || "").toLowerCase();
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

    isOwnQuoteUpdate = true;
    try {
      textEl.textContent = next.text;
      authorEl.textContent = "— " + next.author;
    } finally {
      window.setTimeout(() => {
        isOwnQuoteUpdate = false;
      }, 30);
    }
  }

  // Personalizar saludo en Tasky Leah cuando entra papá José
  function applyPapaJoseGreeting() {
    if (getWorkspaceId() !== "leah") return;
    if (getRole() === "child") return;

    const containers = document.querySelectorAll(".tasky-welcome, .hero-workspace-welcome, .brand-workspace-welcome");
    if (!containers.length) return;

    isOwnGreetingUpdate = true;
    try {
      containers.forEach((root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const val = String(node.nodeValue || "");
          if (val && !/papá\s+José/i.test(val) && /José(\s+Carranza)?/i.test(val)) {
            node.nodeValue = val.replace(/José(\s+Carranza)?/gi, "papá José");
          }
          node = walker.nextNode();
        }
      });
    } finally {
      window.setTimeout(() => {
        isOwnGreetingUpdate = false;
      }, 30);
    }
  }

  function installInterceptors() {
    const textEl = document.getElementById("quote-text");
    if (textEl && !quoteObserver) {
      quoteObserver = new MutationObserver(() => {
        if (isOwnQuoteUpdate) return;
        if (!getActivePool()) return;
        applyCustomQuote(true);
      });
      quoteObserver.observe(textEl, { childList: true, characterData: true, subtree: true });
    }

    if (!greetingObserver && document.body) {
      greetingObserver = new MutationObserver(() => {
        if (isOwnGreetingUpdate) return;
        applyPapaJoseGreeting();
      });
      greetingObserver.observe(document.body, { childList: true, characterData: true, subtree: true });
    }

    applyCustomQuote(false);
    applyPapaJoseGreeting();
  }

  window.addEventListener("tasky:workspace-ready", (event) => {
    const detail = (event && event.detail) || {};
    const ws = detail.workspaceId ? String(detail.workspaceId).toLowerCase() : "";
    const role = detail.role ? String(detail.role).toLowerCase() : "";
    if (ws) {
      activeWorkspace = ws;
      currentIndex = -1;
    }
    if (role) activeRole = role;
    installInterceptors();
    window.setTimeout(() => {
      applyCustomQuote(false);
      applyPapaJoseGreeting();
    }, 250);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installInterceptors, { once: true });
  } else {
    installInterceptors();
  }
})();
