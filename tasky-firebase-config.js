/* Tasky Firebase environment selector.
 * Production stays on the existing project. The Firebase Hosting domain for
 * Tasky-Staging selects the isolated staging project. Local emulator mode is
 * available only on localhost when explicitly requested by the test fixture.
 */
(function initializeTaskyFirebaseEnvironment(root) {
  "use strict";

  const productionConfig = Object.freeze({
    apiKey: "AIzaSyBCiHv2iS76-q4y3WHgdrJ2zW5YrhvEcb8",
    authDomain: "tasky-7a30c.firebaseapp.com",
    projectId: "tasky-7a30c",
    storageBucket: "tasky-7a30c.firebasestorage.app",
    messagingSenderId: "505071526437",
    appId: "1:505071526437:web:6c9eb46dbb4fef296655cc6"
  });

  const stagingConfig = Object.freeze({
    apiKey: "AIzaSyDnx3xBJkp8E1hO5XMGn_l8awK9OvOtLRo",
    authDomain: "tasky-staging-82acb.firebaseapp.com",
    projectId: "tasky-staging-82acb",
    storageBucket: "tasky-staging-82acb.firebasestorage.app",
    messagingSenderId: "375885914636",
    appId: "1:375885914636:web:e3a93f8ac9533002aa0429"
  });

  const emulatorConfig = Object.freeze({
    apiKey: "tasky-emulator-api-key",
    authDomain: "localhost",
    projectId: "demo-tasky-auth",
    storageBucket: "demo-tasky-auth.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:tasky-auth-emulator"
  });

  const hostname = String(root.location && root.location.hostname || "").toLowerCase();
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const emulatorRequested = root.__TASKY_USE_FIREBASE_EMULATORS__ === true;

  if (emulatorRequested && !localHosts.has(hostname)) {
    throw new Error("Tasky Firebase Emulators solo se pueden usar desde localhost.");
  }

  const stagingHosts = new Set([
    "tasky-staging-82acb.web.app",
    "tasky-staging-82acb.firebaseapp.com"
  ]);
  const isEmulator = emulatorRequested && localHosts.has(hostname);
  const isStagingHost = stagingHosts.has(hostname) ||
    (hostname.startsWith("tasky-staging-82acb--") && hostname.endsWith(".web.app"));
  const isStaging = !isEmulator && isStagingHost;
  const config = isEmulator ? emulatorConfig : isStaging ? stagingConfig : productionConfig;

  root.TaskyFirebaseEnvironment = Object.freeze({
    name: isEmulator ? "emulator" : isStaging ? "staging" : "production",
    projectId: config.projectId,
    config: Object.freeze({ ...config }),
    isEmulator,
    isStaging,
    firestoreApiBase: isEmulator
      ? "http://127.0.0.1:8080/v1"
      : "https://firestore.googleapis.com/v1"
  });
})(window);
