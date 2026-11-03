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

function makeFirestorePrecondition(updateTime, exists, explicitRescue = false) {
  const source = extractFunction(
    "getFirebaseFirestoreWritePrecondition",
    "\n  function getFirebaseFirestoreConditionalWriteUrl"
  );
  return new Function(
    "cloudFirestoreUpdateTime",
    "cloudFirestoreExists",
    "return (" + source + ");"
  )(updateTime, exists)(explicitRescue);
}

function makeConditionalWriteUrl(
  updateTime,
  exists,
  commitUrl = "https://firestore.googleapis.com/v1/projects/tasky-7a30c/databases/(default)/documents:commit?key=test"
) {
  const source = extractFunction(
    "getFirebaseFirestoreConditionalWriteUrl",
    "\n  function packCompactEnvelope"
  );
  return new Function(
    "getFirebaseFirestoreWritePrecondition",
    "getFirebaseFirestoreCommitUrl",
    "return (" + source + ");"
  )(
    explicitRescue => makeFirestorePrecondition(updateTime, exists, explicitRescue),
    () => commitUrl
  );
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
      return { ok: true, changed: true };
    },
    () => {},
    () => {
      merges++;
      throw new Error("legacy unchanged cache must not be merged");
    }
  );

  const result = fn(remote, false);
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.needsPush, false);
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

test("normal writes require the exact Firestore updateTime precondition in the commit body", () => {
  const timestamp = "2026-11-03T20:00:00.123456Z";
  const precondition = makeFirestorePrecondition(timestamp, true);
  const url = makeConditionalWriteUrl(timestamp, true)();
  assert.deepEqual(precondition, { updateTime: timestamp });
  assert.equal(url, "https://firestore.googleapis.com/v1/projects/tasky-7a30c/databases/(default)/documents:commit?key=test");
});

test("creating a missing Firestore document is allowed only for an explicit rescue", () => {
  const allowed = makeConditionalWriteUrl("", false)(true);
  const denied = makeConditionalWriteUrl("", false)(false);
  assert.deepEqual(makeFirestorePrecondition("", false), null);
  assert.deepEqual(makeFirestorePrecondition("", false, true), { exists: false });
  assert.equal(allowed, "https://firestore.googleapis.com/v1/projects/tasky-7a30c/databases/(default)/documents:commit?key=test");
  assert.equal(denied, "");
});

test("a write without a verified Firestore revision is blocked", () => {
  assert.equal(makeConditionalWriteUrl("", true)(), "");
  assert.equal(makeConditionalWriteUrl("", null)(), "");
});

test("the production Firestore Commit uses a conditional write and handles version conflicts", () => {
  assert.match(app, /window\.fetch\(firestoreBytes\.url,\s*\{\s*method:\s*"POST"/);
  assert.match(app, /writes:\s*\[\s*\{\s*update:\s*fsDocument,\s*currentDocument/);
  assert.match(app, /firestorePreconditionConflict\s*=\s*true/);
  assert.match(app, /if \(firestoreWriteNeedsReconcile\)[\s\S]{0,300}pullCloudSync\(false,\s*true\)/);
  assert.match(app, /writeResults\[0\]\.updateTime/);
  assert.match(app, /protocolVersion: \{ integerValue: String\(FIRESTORE_SYNC_PROTOCOL_VERSION\) \}/);
  assert.match(app, /const FIRESTORE_SYNC_PROTOCOL_VERSION = 2/);
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
  assert.match(html, /app\.js\?v=20261103-sync-safety-6/);
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
    (_snapshot, label) => {
      calls.push("backup:" + label);
      return true;
    },
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

  const result = fn(remote, false);
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.needsPush, true);
  assert.deepEqual(calls.map(value => value === "merge" ? value : value.split(":")[0]), [
    "backup",
    "merge"
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


test("two writers with the same Firestore revision cannot overwrite each other silently", () => {
  let document = {
    updateTime: "revision-1",
    payload: { title: "Original en Firestore" }
  };

  const patchWithPrecondition = (expectedUpdateTime, payload) => {
    if (expectedUpdateTime !== document.updateTime) {
      return { ok: false, status: 409, currentUpdateTime: document.updateTime };
    }
    const nextRevision = document.updateTime === "revision-1" ? "revision-2" : "revision-3";
    document = { updateTime: nextRevision, payload };
    return { ok: true, status: 200, updateTime: document.updateTime };
  };

  // Both devices read exactly the same cloud revision.
  const deviceARead = document.updateTime;
  const deviceBRead = document.updateTime;

  const deviceASave = patchWithPrecondition(deviceARead, {
    title: "Cambio del dispositivo A"
  });
  assert.equal(deviceASave.ok, true);
  assert.equal(document.payload.title, "Cambio del dispositivo A");

  // Device B's stale write must not replace A's newer cloud state.
  const deviceBStaleSave = patchWithPrecondition(deviceBRead, {
    title: "Caché antigua del dispositivo B"
  });
  assert.equal(deviceBStaleSave.ok, false);
  assert.equal(deviceBStaleSave.status, 409);
  assert.equal(document.payload.title, "Cambio del dispositivo A");

  // After re-reading the latest revision, B may submit a reconciled payload.
  const deviceBLatestRead = document.updateTime;
  const deviceBReconciledSave = patchWithPrecondition(deviceBLatestRead, {
    title: "Cambio A conciliado con cambio B"
  });
  assert.equal(deviceBReconciledSave.ok, true);
  assert.equal(document.payload.title, "Cambio A conciliado con cambio B");
});


test("legacy unversioned tombstones from a stale device cannot delete Firestore tasks", () => {
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
      deletedTaskUpdatedAt: value.deletedTaskUpdatedAt || {}
    })
  );

  const remoteBase = {
    boxes: [{ id: "home", name: "CASA", updatedAt: 10 }],
    tasks: [{ id: "task-1", boxId: "home", title: "Vigente en Firebase", updatedAt: 100 }],
    deletedTaskIds: [],
    deletedBoxIds: [],
    deletedTaskUpdatedAt: {},
    deletedBoxUpdatedAt: {},
    updatedAt: 100
  };

  const staleDeviceTombstone = merge(
    remoteBase,
    {
      boxes: remoteBase.boxes,
      tasks: [],
      deletedTaskIds: ["task-1"],
      deletedBoxIds: [],
      deletedTaskUpdatedAt: {},
      deletedBoxUpdatedAt: {},
      updatedAt: 900
    },
    true
  );
  assert.equal(staleDeviceTombstone.tasks.some(task => task.id === "task-1"), true);
  assert.deepEqual(staleDeviceTombstone.deletedTaskIds, []);

  const explicitOfflineDeletion = merge(
    remoteBase,
    {
      boxes: remoteBase.boxes,
      tasks: [],
      deletedTaskIds: ["task-1"],
      deletedBoxIds: [],
      deletedTaskUpdatedAt: { "task-1": 200 },
      deletedBoxUpdatedAt: {},
      updatedAt: 900
    },
    true
  );
  assert.equal(explicitOfflineDeletion.tasks.some(task => task.id === "task-1"), false);
  assert.ok(explicitOfflineDeletion.deletedTaskIds.includes("task-1"));

  const legacyRemoteDeletion = merge(
    {
      ...remoteBase,
      tasks: [],
      deletedTaskIds: ["task-1"],
      deletedTaskUpdatedAt: {}
    },
    {
      ...remoteBase,
      tasks: [{ id: "task-1", boxId: "home", title: "Caché antigua", updatedAt: 500 }],
      deletedTaskIds: [],
      deletedTaskUpdatedAt: {}
    },
    true
  );
  assert.equal(legacyRemoteDeletion.tasks.some(task => task.id === "task-1"), false);
  assert.ok(legacyRemoteDeletion.deletedTaskIds.includes("task-1"));

  const newerLocalRecreation = merge(
    {
      ...remoteBase,
      tasks: [],
      deletedTaskIds: ["task-1"],
      deletedTaskUpdatedAt: { "task-1": 200 }
    },
    {
      ...remoteBase,
      tasks: [{ id: "task-1", boxId: "home", title: "Recreada después", updatedAt: 300 }],
      deletedTaskIds: [],
      deletedTaskUpdatedAt: {}
    },
    true
  );
  assert.equal(newerLocalRecreation.tasks.some(task => task.id === "task-1"), true);
  assert.deepEqual(newerLocalRecreation.deletedTaskIds, []);
});

test("deletion timestamps are normalized and local deletions receive their own revision", () => {
  const source = extractFunction(
    "normalizeDeletionTimestamps",
    "\n  function normalizeDataPayload"
  );
  const normalize = new Function("return (" + source + ");")();
  assert.deepEqual(normalize({
    taskA: 123,
    taskB: "456",
    taskC: 0,
    taskD: "not-a-number",
    "": 789
  }), {
    taskA: 123,
    taskB: 456
  });

  assert.ok(app.includes("deletedTaskUpdatedAt[id] = Math.max(recordChangeTime"));
  assert.ok(app.includes("deletedBoxUpdatedAt[id] = Math.max(recordChangeTime"));
});


test("failed reconciliation never requests a cloud write", () => {
  const source = extractFunction(
    "applyIncomingSyncPayload",
    "\n  let cloudPushTimer"
  );
  const calls = [];
  const local = {
    boxes: [{ id: "home", name: "CASA" }],
    tasks: [{ id: "local-task", title: "Pending local edit", updatedAt: 200 }]
  };
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
    { data: local },
    () => true,
    () => ({ ok: true, changed: false }),
    () => {},
    () => true,
    value => JSON.stringify(value),
    () => { throw new Error("simulated reconciliation failure"); },
    value => value,
    () => calls.push("error"),
    { setItem: () => true },
    () => {},
    () => {},
    () => {},
    () => {},
    { getElementById: () => null },
    () => calls.push("cloud-write"),
    () => {}
  );

  const result = fn({
    boxes: [{ id: "home", name: "CASA" }],
    tasks: [{ id: "remote-task", title: "Remote task", updatedAt: 100 }]
  }, false);

  assert.equal(result.ok, false);
  assert.equal(result.needsPush, false);
  assert.ok(calls.includes("error"));
  assert.equal(calls.includes("cloud-write"), false);
});

test("pullCloudSync refuses to call pushCloudSync after failed reconciliation", () => {
  const start = app.indexOf("async function pullCloudSync(");
  assert.notEqual(start, -1);
  const end = app.indexOf(`\n  window.addEventListener("tasky:manual-refresh"`, start);
  assert.notEqual(end, -1);
  const pull = app.slice(start, end);
  const failedGuard = pull.indexOf("if (!reconciliation || !reconciliation.ok)");
  const pushAfterSuccess = pull.indexOf("if (reconciliation.needsPush)");
  assert.notEqual(failedGuard, -1);
  assert.notEqual(pushAfterSuccess, -1);
  assert.ok(failedGuard < pushAfterSuccess);
  assert.ok(pull.includes('return "reconcile-error"'));
  assert.equal(pull.includes("localHadPendingChanges"), false);
});


test("permissive emulator rules are isolated from the normal Firebase deploy config", () => {
  const firebaseConfig = JSON.parse(readFileSync(path.join(root, "firebase.json"), "utf8"));
  const emulatorConfig = JSON.parse(readFileSync(path.join(root, "firebase.emulator.json"), "utf8"));
  const emulatorRules = readFileSync(path.join(root, "firestore.emulator.rules"), "utf8");

  assert.equal(Object.prototype.hasOwnProperty.call(firebaseConfig, "firestore"), false);
  assert.equal(emulatorConfig.firestore.rules, "firestore.emulator.rules");
  assert.ok(emulatorRules.includes("request.resource.data.get('protocolVersion', 0) == 2"));
  assert.ok(emulatorRules.includes("match /sync_safety_test/{documentId}"));
  assert.equal(emulatorRules.includes("match /{document=**}"), false);
});
