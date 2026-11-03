import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "app.js"), "utf8");
const html = readFileSync(path.join(root, "index.html"), "utf8");

function extractFunction(name, nextMarker) {
  const start = app.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "function " + name + " must exist");
  const end = app.indexOf(nextMarker, start);
  assert.notEqual(end, -1, "end marker for " + name + " must exist");
  const source = app.slice(start, end).trim();
  assert.match(source, new RegExp("^function " + name + "\\("));
  return source;
}

function makeHasPendingLocalChanges() {
  const source = extractFunction(
    "hasPendingLocalCloudChanges",
    "\n  function markLocalCloudChangesPending"
  );
  const values = new Map();
  const safeStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const fn = new Function(
    "safeStorage",
    "STORAGE_KEYS",
    "getCurrentCloudFingerprint",
    "return (" + source + ");"
  )(
    safeStorage,
    { CLOUD_DIRTY: "dirty", CLOUD_BASELINE: "baseline" },
    () => "fingerprint-current"
  );
  return { fn, values };
}

function makeConditionalWriteUrl(updateTime, exists, base = "https://firestore.googleapis.com/v1/documents/tasky/main?key=test") {
  const source = extractFunction(
    "getFirebaseFirestoreConditionalWriteUrl",
    "\n  function packCompactEnvelope"
  );
  return new Function(
    "cloudFirestoreUpdateTime",
    "cloudFirestoreExists",
    "getFirebaseFirestoreUrl",
    "return (" + source + ");"
  )(updateTime, exists, () => base);
}

test("legacy device with an unchanged cache adopts the verified remote snapshot", () => {
  const source = extractFunction(
    "applyIncomingSyncPayload",
    "\n  let cloudPushTimer"
  );
  const local = {
    boxes: [{ id: "home", name: "CASA" }],
    tasks: Array.from({ length: 97 }, (_, index) => ({ id: "old-" + index }))
  };
  const remote = {
    boxes: [{ id: "home", name: "CASA" }],
    tasks: Array.from({ length: 78 }, (_, index) => ({ id: "task-" + index }))
  };
  const appState = { data: local };
  let adopted = 0;
  let merges = 0;
  const fn = new Function(
    "normalizeDataPayload",
    "appState",
    "hasPendingLocalCloudChanges",
    "adoptVerifiedCloudSnapshot",
    "showToast",
    "mergeSyncDatasets",
    "return (" + source + ");"
  )(
    value => value,
    appState,
    () => false,
    incoming => {
      adopted++;
      appState.data = incoming;
      return true;
    },
    () => {},
    () => {
      merges++;
      throw new Error("legacy unchanged cache must not be merged");
    }
  );

  assert.equal(fn(remote, false), true);
  assert.equal(adopted, 1);
  assert.equal(merges, 0);
  assert.equal(appState.data.tasks.length, 78);
});

test("an explicit local edit is preserved as pending even before the first baseline exists", () => {
  const { fn, values } = makeHasPendingLocalChanges();
  values.set("dirty", "1");
  assert.equal(fn({ tasks: [] }), true);
});

test("a clean legacy cache without a baseline is not allowed to outrank Firestore", () => {
  const { fn, values } = makeHasPendingLocalChanges();
  assert.equal(values.has("baseline"), false);
  assert.equal(fn({ tasks: [] }), false);
});

test("a clean cache matching its confirmed baseline is not pending", () => {
  const { fn, values } = makeHasPendingLocalChanges();
  values.set("baseline", "fingerprint-current");
  assert.equal(fn({ tasks: [] }), false);
});

test("a cache differing from its confirmed baseline is treated as pending", () => {
  const { fn, values } = makeHasPendingLocalChanges();
  values.set("baseline", "older-fingerprint");
  assert.equal(fn({ tasks: [] }), true);
});

test("normal writes require the exact Firestore updateTime revision", () => {
  const url = makeConditionalWriteUrl("2026-11-03T20:00:00.123456Z", true)();
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("currentDocument.updateTime"), "2026-11-03T20:00:00.123456Z");
});

test("creating a missing Firestore document is allowed only for an explicit rescue", () => {
  const allowed = makeConditionalWriteUrl("", false)(true);
  const denied = makeConditionalWriteUrl("", false)(false);
  assert.equal(new URL(allowed).searchParams.get("currentDocument.exists"), "false");
  assert.equal(denied, "");
});

test("a write without a verified Firestore revision is blocked", () => {
  assert.equal(makeConditionalWriteUrl("", true)(), "");
  assert.equal(makeConditionalWriteUrl("", null)(), "");
});

test("the production Firestore PATCH uses the conditional URL and handles version conflicts", () => {
  assert.match(app, /window\.fetch\(conditionalWriteUrl,\s*\{\s*method:\s*"PATCH"/);
  assert.match(app, /currentDocument\.updateTime=/);
  assert.match(app, /firestorePreconditionConflict\s*=\s*true/);
  assert.match(app, /if \(firestoreWriteNeedsReconcile\)[\s\S]{0,300}pullCloudSync\(false,\s*true\)/);
  assert.match(app, /cloudFirestoreUpdateTime\s*=\s*savedDocument\.updateTime/);
});

test("a pending local merge is backed up before the merge is attempted", () => {
  const applySource = extractFunction(
    "applyIncomingSyncPayload",
    "\n  let cloudPushTimer"
  );
  const backupCall = applySource.indexOf("preserveLocalSnapshotBeforeCloudAdoption(");
  const mergeCall = applySource.indexOf("mergeSyncDatasets(norm, local, true)");
  assert.notEqual(backupCall, -1);
  assert.notEqual(mergeCall, -1);
  assert.ok(backupCall < mergeCall, "local recovery snapshot must be saved before reconciliation");
});

test("startup verifies Firestore before rollover cleanup", () => {
  assert.match(app, /pullCloudSync\(false\)\.finally\(\(\) => \{\s*if \(cloudSyncReady\) cleanupCompletedTasksFromPreviousDays\(\)/);
  assert.doesNotMatch(app, /loadRegisteredData\(\);\s*cleanupCompletedTasksFromPreviousDays\(\);/);
});

test("Firestore is the only remote sync store and public task transport is disabled", () => {
  assert.doesNotMatch(app, /getFirebaseRtdbUrl|ntfy\.sh|getCloudTopicUrl/);
  assert.doesNotMatch(app, /method:\s*"PUT"/);
  assert.match(app, /Desactivado: Firestore es la única fuente de verdad/);
  assert.match(app, /Desactivado por privacidad/);
});

test("cross-tab messages are refresh signals, never task snapshots", () => {
  assert.match(app, /type:\s*"firestore-write-confirmed"/);
  assert.doesNotMatch(app, /payload:\s*buildSyncPayload\(appState\.data\)/);
  assert.match(app, /ev\.data\.type === "firestore-write-confirmed"[\s\S]{0,450}pullCloudSync\(false,\s*true\)/);
  assert.doesNotMatch(app, /window\.addEventListener\("storage"/);
});

test("index.html loads the cache-busted app.js build", () => {
  assert.match(html, /app\.js\?v=20261103-sync-safety-3/);
});


test("a local edit made while a cloud write is in flight remains pending", () => {
  const source = extractFunction(
    "confirmCloudPayloadWritten",
    "\n  function preserveLocalSnapshotBeforeCloudAdoption"
  );
  const values = new Map();
  const safeStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  let currentFingerprint = "newer-local-edit";
  const fn = new Function(
    "syncFingerprint",
    "safeStorage",
    "STORAGE_KEYS",
    "getCurrentCloudFingerprint",
    "return (" + source + ");"
  )(
    payload => payload.fingerprint,
    safeStorage,
    { CLOUD_BASELINE: "baseline", CLOUD_DIRTY: "dirty" },
    () => currentFingerprint
  );

  fn({ fingerprint: "snapshot-that-was-uploaded" });
  assert.equal(values.get("baseline"), "snapshot-that-was-uploaded");
  assert.equal(values.get("dirty"), "1");

  currentFingerprint = "snapshot-that-was-uploaded";
  fn({ fingerprint: "snapshot-that-was-uploaded" });
  assert.equal(values.get("dirty"), "0");
});

test("offline edits are backed up and merged instead of discarded on first cloud read", () => {
  const source = extractFunction(
    "applyIncomingSyncPayload",
    "\n  let cloudPushTimer"
  );
  const local = {
    boxes: [{ id: "home", name: "CASA" }],
    tasks: [{ id: "offline-added-task", title: "Creada sin conexión" }]
  };
  const remote = {
    boxes: [{ id: "home", name: "CASA" }],
    tasks: [{ id: "remote-task", title: "Ya estaba en Firebase" }]
  };
  const merged = {
    boxes: remote.boxes,
    tasks: [...remote.tasks, ...local.tasks]
  };
  const appState = { data: local, backups: [] };
  const calls = [];
  const storage = { setItem: () => true };
  const fn = new Function(
    "normalizeDataPayload",
    "appState",
    "hasPendingLocalCloudChanges",
    "adoptVerifiedCloudSnapshot",
    "showToast",
    "preserveLocalSnapshotBeforeCloudAdoption",
    "syncFingerprint",
    "mergeSyncDatasets",
    "applyLocalViewStateToData",
    "setRealtimeSyncStatus",
    "safeStorage",
    "STORAGE_KEYS",
    "rebuildTaskMemoryFromTasks",
    "renderBoard",
    "renderLearningGoalsPanel",
    "renderBirthdayUpcomingList",
    "document",
    "pushCloudSync",
    "confirmCurrentCloudSnapshot",
    "return (" + source + ");"
  )(
    value => value,
    appState,
    () => true,
    () => {
      throw new Error("an explicit offline edit must not be discarded as an unchanged cache");
    },
    () => {},
    (_snapshot, label) => calls.push("backup:" + label),
    value => JSON.stringify(value.tasks.map(task => task.id).sort()),
    () => {
      calls.push("merge");
      return merged;
    },
    value => value,
    () => {},
    storage,
    { DATA: "tasky_data" },
    () => {},
    () => {},
    () => {},
    () => {},
    { getElementById: () => null },
    () => calls.push("push"),
    () => {}
  );

  assert.equal(fn(remote, false), true);
  assert.deepEqual(calls.map(value => value === "merge" ? value : value.split(":")[0]), [
    "backup",
    "merge",
    "push"
  ]);
  assert.deepEqual(
    appState.data.tasks.map(task => task.id).sort(),
    ["offline-added-task", "remote-task"]
  );
});


test("Firestore config identity ignores the retired Realtime Database URL", () => {
  const source = extractFunction(
    "getCloudSyncConfigKey",
    "\n  function loadSavedFirebaseConfig"
  );
  const fn = new Function(
    "appState",
    "return (" + source + ");"
  )({
    firebaseConfig: {
      projectId: "tasky-7a30c",
      docPath: "/tasky_sync/somerito_main/",
      databaseURL: "https://old-rtdb.example"
    }
  });
  assert.deepEqual(JSON.parse(fn()), {
    projectId: "tasky-7a30c",
    docPath: "tasky_sync/somerito_main"
  });
});


test("remote-first merge rejects stale unversioned tasks but keeps explicit offline edits", () => {
  const source = extractFunction(
    "mergeSyncDatasets",
    "\n  function applyIncomingSyncPayload"
  );
  const merge = new Function(
    "normalizeDataPayload",
    "canonicalBoxKey",
    "mergeCompletionLogs",
    "mergeDismissedTaskSuggestions",
    "mergeBirthdays",
    "normalizeLearningGoalsData",
    "mergeLearningGoalsData",
    "normalizeFocusPlanData",
    "mergeFocusPlanData",
    "normalizeCompletionLog",
    "normalizeDismissedTaskSuggestions",
    "normalizeBirthdays",
    "syncFingerprint",
    "return (" + source + ");"
  )(
    value => value,
    value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
    (primary, secondary) => [...(primary || []), ...(secondary || [])],
    (primary, secondary) => ({ ...(secondary || {}), ...(primary || {}) }),
    (primary, secondary) => [...(secondary || []), ...(primary || [])],
    value => value || { daily: {}, weekly: {} },
    (primary, secondary) => ({ ...(secondary || {}), ...(primary || {}) }),
    value => value || { date: "", byBox: {}, updatedAt: 0 },
    (primary, secondary) => primary || secondary || { date: "", byBox: {}, updatedAt: 0 },
    value => value || [],
    value => value || {},
    value => value || [],
    value => JSON.stringify({
      boxes: value.boxes,
      tasks: value.tasks,
      deletedTaskIds: value.deletedTaskIds || [],
      deletedBoxIds: value.deletedBoxIds || []
    })
  );

  const remote = {
    boxes: [{ id: "home", name: "CASA", updatedAt: 20 }],
    tasks: [
      { id: "existing-task", boxId: "home", title: "Versión actual de Firebase", updatedAt: 200 },
      { id: "edited-task", boxId: "home", title: "Título de Firebase", updatedAt: 100 }
    ],
    updatedAt: 200,
    deletedTaskIds: [],
    deletedBoxIds: []
  };
  const local = {
    boxes: [
      { id: "home", name: "CASA" },
      { id: "old-box", name: "CASILLA ANTIGUA" }
    ],
    tasks: [
      { id: "existing-task", boxId: "home", title: "Caché antigua sin versión" },
      { id: "edited-task", boxId: "home", title: "Edición offline legítima", updatedAt: 300 },
      { id: "new-offline-task", boxId: "old-box", title: "Nueva tarea sin conexión", updatedAt: 300 },
      { id: "stale-only-task", boxId: "old-box", title: "Tarea antigua sin versión" }
    ],
    updatedAt: 900,
    deletedTaskIds: [],
    deletedBoxIds: []
  };

  const result = merge(remote, local, true);
  const byId = new Map(result.tasks.map(task => [task.id, task]));

  assert.equal(byId.get("existing-task").title, "Versión actual de Firebase");
  assert.equal(byId.get("edited-task").title, "Edición offline legítima");
  assert.equal(byId.get("new-offline-task").title, "Nueva tarea sin conexión");
  assert.equal(byId.has("stale-only-task"), false);
  assert.ok(result.boxes.some(box => box.id === "old-box"));
});
