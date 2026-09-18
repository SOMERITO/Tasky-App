/* =========================================================
   TASKY PRO · SERVICE WORKER V66

   Funciones:
   - Control de caché de Tasky.
   - Actualizaciones de index.html sin quedar atrapado
     en una versión antigua.
   - quotes.json actualizado desde red cuando sea posible.
   - Soporte offline mediante caché.
   - Eliminación automática de cachés antiguas de Tasky.
   ========================================================= */

const CACHE_NAME = "tasky-v66";

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
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* =========================================================
   ACTIVACIÓN
   ========================================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(
              key =>
                key.startsWith("tasky-") &&
                key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* =========================================================
   NETWORK FIRST
   =========================================================

   Primero intenta obtener el archivo desde Internet.

   Si Internet funciona:
      red → guardar copia → devolver archivo nuevo

   Si Internet falla:
      caché → devolver archivo anterior
   ========================================================= */

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;

  } catch (error) {

    return (
      await cache.match(
        request,
        { ignoreSearch: true }
      )
      ||
      await cache.match("./index.html")
    );
  }
}

/* =========================================================
   CACHE FIRST
   =========================================================

   Para recursos estáticos:

      caché → si existe
      red    → si no existe

   Esto evita descargar innecesariamente iconos y recursos
   que no cambian constantemente.
   ========================================================= */

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(
    request,
    { ignoreSearch: true }
  );

  if (cached) {
    return cached;
  }

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

    return cache.match("./index.html");
  }
}

/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  /*
     Solo manejamos solicitudes GET.

     POST, PUT, DELETE, etc. deben continuar directamente
     hacia Internet/Firebase.
  */
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(
    request.url
  );

  /*
     NO interceptar recursos externos.

     Esto incluye:
     - Firebase
     - Google
     - APIs externas
     - CDN
     - otros dominios
  */
  if (
    url.origin !== self.location.origin
  ) {
    return;
  }

  /* =======================================================
     HTML + QUOTES
     =======================================================

     Estos archivos son especialmente importantes porque
     cambian con las nuevas versiones.

     Por eso usamos NETWORK FIRST.
     ======================================================= */

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/quotes.json")
  ) {

    event.respondWith(
      networkFirst(request)
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
