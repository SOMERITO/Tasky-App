/* =========================================================
   TASKY · SERVICE WORKER V69
   =========================================================

   Objetivos:
   - Mantener Tasky disponible sin conexión.
   - Evitar que index.html quede atrapado en una versión antigua.
   - Mantener quotes.json actualizado.
   - Eliminar cachés antiguas de Tasky.
   - No interceptar Firebase ni recursos de otros dominios.
   ========================================================= */

const CACHE_NAME = "tasky-v69";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./quotes.json"
];

/* =========================================================
   INSTALACIÓN
   ========================================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

/* =========================================================
   ACTIVACIÓN
   ========================================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => {
        const oldCaches = keys.filter(
          key =>
            key.startsWith("tasky-") &&
            key !== CACHE_NAME
        );

        return Promise.all(
          oldCaches.map(key => {
            return caches.delete(key);
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

/* =========================================================
   NETWORK FIRST
   =========================================================

   Lo usamos para archivos que queremos mantener
   lo más actualizados posible.

   Orden:

   INTERNET
      ↓
   guardar en caché
      ↓
   devolver versión nueva

   Si no hay Internet:

   CACHÉ
      ↓
   devolver última versión disponible
   ========================================================= */

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(
        request,
        response.clone()
      );
    }

    return response;

  } catch (error) {

    const cachedResponse = await cache.match(
      request,
      {
        ignoreSearch: true
      }
    );

    if (cachedResponse) {
      return cachedResponse;
    }

    const fallback = await cache.match(
      "./index.html"
    );

    if (fallback) {
      return fallback;
    }

    return new Response(
      "Tasky no está disponible en este momento.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
}

/* =========================================================
   QUOTES FIRST
   =========================================================

   quotes.json necesita un tratamiento especial.

   1. Si existe una copia en caché, la usamos inmediatamente.
   2. Paralelamente intentamos obtener una versión nueva.
   3. Si Internet falla, mantenemos la copia anterior.
   ========================================================= */

async function quotesFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(
    request,
    {
      ignoreSearch: true
    }
  );

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {

      await cache.put(
        request,
        networkResponse.clone()
      );

      return networkResponse;
    }

  } catch (error) {
    // La caché será utilizada debajo.
  }

  if (cachedResponse) {
    return cachedResponse;
  }

  return new Response(
    JSON.stringify({
      schemaVersion: 1,
      libraryVersion: 69,
      quotes: []
    }),
    {
      status: 503,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}

/* =========================================================
   CACHE FIRST
   =========================================================

   Para recursos relativamente estables:

   CACHÉ
      ↓
   si existe → usarla

   si no existe:

   INTERNET
      ↓
   guardar
      ↓
   usar
   ========================================================= */

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(
    request,
    {
      ignoreSearch: true
    }
  );

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {

      await cache.put(
        request,
        networkResponse.clone()
      );
    }

    return networkResponse;

  } catch (error) {

    const fallback = await cache.match(
      "./index.html"
    );

    if (fallback) {
      return fallback;
    }

    return new Response(
      "",
      {
        status: 503
      }
    );
  }
}

/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  /*
     Solo manejamos solicitudes GET.
  */
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(
    request.url
  );

  /*
     Muy importante:

     Tasky NO intercepta solicitudes externas.

     Esto deja pasar directamente:
     - Firebase
     - Google
     - APIs
     - CDN
     - otros dominios
  */

  if (
    url.origin !==
    self.location.origin
  ) {
    return;
  }

  /* =======================================================
     INDEX / NAVEGACIÓN
     ======================================================= */

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(
      "/index.html"
    )
  ) {

    event.respondWith(
      networkFirst(request)
    );

    return;
  }

  /* =======================================================
     BIBLIOTECA DE FRASES
     ======================================================= */

  if (
    url.pathname.endsWith(
      "/quotes.json"
    )
  ) {

    event.respondWith(
      quotesFirst(request)
    );

    return;
  }

  /* =======================================================
     OTROS RECURSOS
     ======================================================= */

  event.respondWith(
    cacheFirst(request)
  );

});
