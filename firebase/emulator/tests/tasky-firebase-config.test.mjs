import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../../tasky-firebase-config.js", import.meta.url), "utf8");

function resolveEnvironment(hostname, useEmulators = false) {
  const window = {
    location: { hostname },
    __TASKY_USE_FIREBASE_EMULATORS__: useEmulators
  };
  runInNewContext(source, { window });
  return window.TaskyFirebaseEnvironment;
}

test("production host keeps the existing Tasky Firebase project", () => {
  const environment = resolveEnvironment("somerito.github.io");
  assert.equal(environment.name, "production");
  assert.equal(environment.projectId, "tasky-7a30c");
  assert.equal(environment.isStaging, false);
});

test("Firebase Hosting staging domains select only Tasky-Staging", () => {
  for (const host of ["tasky-staging-82acb.web.app", "tasky-staging-82acb.firebaseapp.com"]) {
    const environment = resolveEnvironment(host);
    assert.equal(environment.name, "staging");
    assert.equal(environment.projectId, "tasky-staging-82acb");
    assert.equal(environment.isStaging, true);
  }
});

test("local emulator mode is explicit and uses emulator endpoints", () => {
  const environment = resolveEnvironment("localhost", true);
  assert.equal(environment.name, "emulator");
  assert.equal(environment.projectId, "demo-tasky-auth");
  assert.equal(environment.isEmulator, true);
  assert.equal(environment.firestoreApiBase, "http://127.0.0.1:8080/v1");
});

test("emulator mode is rejected on a non-local host", () => {
  assert.throws(
    () => resolveEnvironment("tasky-staging-82acb.web.app", true),
    /solo se pueden usar desde localhost/
  );
});
