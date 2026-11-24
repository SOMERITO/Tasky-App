import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "app.js"), "utf8");

function extractFunction(name, endMarker) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing ${name}`);
  const end = app.indexOf(endMarker, start);
  assert.notEqual(end, -1, `missing end marker for ${name}`);
  return app.slice(start, end).trim();
}

function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw, boxes: (raw.boxes || []).map((box, order) => ({ order, ...box })), tasks: (raw.tasks || []).map(task => ({ ...task })),
    deletedTaskIds: [...new Set(raw.deletedTaskIds || [])], deletedBoxIds: [...new Set(raw.deletedBoxIds || [])],
    deletedTaskUpdatedAt: Object.fromEntries(Object.entries(raw.deletedTaskUpdatedAt || {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])),
    deletedBoxUpdatedAt: Object.fromEntries(Object.entries(raw.deletedBoxUpdatedAt || {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])),
    taskMemoryByBox: raw.taskMemoryByBox || {}, history: raw.history || {}, settings: raw.settings || {},
    learningGoals: raw.learningGoals || { daily: {}, weekly: {} }, focusPlan: raw.focusPlan || { date: "", byBox: {}, updatedAt: 0 },
    completionLog: raw.completionLog || [], dismissedTaskSuggestionsByBox: raw.dismissedTaskSuggestionsByBox || {}, birthdays: raw.birthdays || [], updatedAt: Number(raw.updatedAt || 0)
  };
}

function merge(left, right, preferLeftAsRemote = false) {
  const source = extractFunction("mergeSyncDatasets", "\n  function applyIncomingSyncPayload");
  const fn = new Function("normalizeDataPayload", "canonicalBoxKey", "mergeCompletionLogs", "mergeDismissedTaskSuggestions", "mergeBirthdays",
    "normalizeLearningGoalsData", "mergeLearningGoalsData", "normalizeFocusPlanData", "mergeFocusPlanData", "normalizeCompletionLog",
    "normalizeDismissedTaskSuggestions", "normalizeBirthdays", "syncFingerprint", `return (${source});`)(
    normalize, value => String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""),
    (a = [], b = []) => [...a, ...b], (a = {}, b = {}) => ({ ...b, ...a }), (a = [], b = []) => [...b, ...a],
    value => value || { daily: {}, weekly: {} }, (a = {}, b = {}) => ({ ...b, ...a }),
    value => value || { date: "", byBox: {}, updatedAt: 0 }, (a, b) => a || b || { date: "", byBox: {}, updatedAt: 0 },
    value => value || [], value => value || {}, value => value || [],
    value => JSON.stringify({ boxes: value.boxes, tasks: value.tasks, deletedTaskIds: value.deletedTaskIds, deletedBoxIds: value.deletedBoxIds,
      deletedTaskUpdatedAt: value.deletedTaskUpdatedAt, deletedBoxUpdatedAt: value.deletedBoxUpdatedAt })
  );
  return fn(left, right, preferLeftAsRemote);
}

const box = { id: "home", name: "CASA", updatedAt: 20 };
const base = { boxes: [box], tasks: [], deletedTaskIds: [], deletedBoxIds: [], deletedTaskUpdatedAt: {}, deletedBoxUpdatedAt: {}, updatedAt: 100 };

test("two devices retain explicit edits and use item revisions instead of stale device clocks", () => {
  const firestore = { ...base, tasks: [{ id: "shared", boxId: "home", title: "Firestore latest", updatedAt: 200 }, { id: "remote-only", boxId: "home", title: "Remote", updatedAt: 180 }], updatedAt: 200 };
  const offlineDevice = { ...base, boxes: [box, { id: "new-box", name: "NUEVA", updatedAt: 300 }], tasks: [
    { id: "shared", boxId: "home", title: "Stale cache", updatedAt: 120 }, { id: "local-edit", boxId: "home", title: "Editada sin conexión", updatedAt: 250 },
    { id: "local-new", boxId: "new-box", title: "Nueva sin conexión", updatedAt: 251 }
  ], updatedAt: 9000 };
  const result = merge(firestore, offlineDevice, true);
  const tasks = new Map(result.tasks.map(task => [task.id, task]));
  assert.equal(tasks.get("shared").title, "Firestore latest"); assert.equal(tasks.get("local-edit").title, "Editada sin conexión");
  assert.equal(tasks.get("remote-only").title, "Remote"); assert.equal(tasks.get("local-new").title, "Nueva sin conexión");
});

test("offline delete tombstone removes its task; unversioned stale-cache tombstone cannot", () => {
  const firestore = { ...base, tasks: [{ id: "task-1", boxId: "home", title: "Actual", updatedAt: 100 }] };
  const staleCacheDelete = { ...base, tasks: [], deletedTaskIds: ["task-1"], updatedAt: 9999 };
  const ignored = merge(firestore, staleCacheDelete, true);
  assert.equal(ignored.tasks.some(task => task.id === "task-1"), true); assert.deepEqual(ignored.deletedTaskIds, []);
  const deleted = merge(firestore, { ...staleCacheDelete, deletedTaskUpdatedAt: { "task-1": 101 } }, true);
  assert.equal(deleted.tasks.some(task => task.id === "task-1"), false); assert.equal(deleted.deletedTaskUpdatedAt["task-1"], 101);
});

test("a newer recreation beats a tombstone; an old recreation cannot", () => {
  const tombstone = { ...base, deletedTaskIds: ["task-1"], deletedTaskUpdatedAt: { "task-1": 200 } };
  assert.equal(merge(tombstone, { ...base, tasks: [{ id: "task-1", boxId: "home", title: "Old", updatedAt: 150 }] }, true).tasks.some(task => task.id === "task-1"), false);
  const result = merge(tombstone, { ...base, tasks: [{ id: "task-1", boxId: "home", title: "Recreated", updatedAt: 250 }] }, true);
  assert.equal(result.tasks.find(task => task.id === "task-1").title, "Recreated"); assert.deepEqual(result.deletedTaskIds, []);
});

test("a stale box deletion cannot remove the box or a newer child task", () => {
  const firestore = { ...base, boxes: [{ ...box, updatedAt: 150 }], tasks: [{ id: "new-task", boxId: "home", title: "Reciente", updatedAt: 300 }] };
  const staleDelete = { ...base, boxes: [], tasks: [], deletedBoxIds: ["home"], updatedAt: 9000, deletedBoxUpdatedAt: { home: 200 } };
  const result = merge(firestore, staleDelete, true);
  assert.equal(result.boxes.some(item => item.id === "home"), true); assert.equal(result.tasks.some(item => item.id === "new-task"), true); assert.deepEqual(result.deletedBoxIds, []);
});

test("compact envelopes and fingerprints retain deletion revisions", () => {
  assert.match(app, /dta:\s*normalizeDeletionTimestamps\(d\.deletedTaskUpdatedAt\)/); assert.match(app, /dba:\s*normalizeDeletionTimestamps\(d\.deletedBoxUpdatedAt\)/);
  assert.match(app, /deletedTaskUpdatedAt:\s*normalizeDeletionTimestamps\(parsed\.dta\)/); assert.match(app, /deletedBoxUpdatedAt:\s*normalizeDeletionTimestamps\(parsed\.dba\)/);
  assert.match(app, /deletedTaskUpdatedAt:\s*normalizeDeletionTimestamps\(d\.deletedTaskUpdatedAt\)/); assert.match(app, /deletedBoxUpdatedAt:\s*normalizeDeletionTimestamps\(d\.deletedBoxUpdatedAt\)/);
});

test("a local delete gets a revision newer than its item; recreation clears its tombstone", () => {
  const source = extractFunction("buildVersionedDeletionTimestamps", "\n  // ========================================================================");
  const build = new Function("normalizeDeletionTimestamps", `return (${source});`)(raw => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).map(([id, value]) => [id, Number(value || 0)])
      .filter(([id, value]) => id && Number.isFinite(value) && value > 0));
  });
  assert.deepEqual(build(["task-1"], {}, [{ id: "task-1", updatedAt: 300 }], [], 250), { "task-1": 301 });
  assert.deepEqual(build(["task-1"], { "task-1": 400 }, [{ id: "task-1", updatedAt: 300 }], [], 500), { "task-1": 400 });
  assert.deepEqual(build(["task-1"], { "task-1": 400 }, [], ["task-1"], 500), {});
});

test("conflicts reread Firestore and a failed reconciliation blocks cloud writes", () => {
  assert.match(app, /Conflicto o rechazo de escritura; se releerá Firestore antes de reintentar/); assert.match(app, /scheduleIncomingSyncVerification\(\);/);
  const start = app.indexOf("async function pullCloudSync("); const end = app.indexOf('\n  window.addEventListener("tasky:manual-refresh"', start); const pull = app.slice(start, end);
  assert.ok(pull.indexOf("if (!reconciliation || !reconciliation.ok)") < pull.indexOf("if (reconciliation.needsPush")); assert.match(pull, /return "reconcile-error"/);
});

test("dirty local state is backed up before remote-first reconciliation; backup failure blocks it", () => {
  const source = extractFunction("applyIncomingSyncPayload", "\n  let cloudPushTimer");
  const local = { boxes: [{ id: "home", name: "CASA" }], tasks: [{ id: "local", title: "offline", updatedAt: 40 }] };
  const remote = { boxes: [{ id: "home", name: "CASA" }], tasks: [{ id: "remote", title: "cloud", updatedAt: 30 }] };
  const merged = { boxes: remote.boxes, tasks: [...remote.tasks, ...local.tasks] };
  const invoke = (backupOk) => {
    const calls = [];
    const appState = { data: local };
    const fn = new Function("normalizeDataPayload", "appState", "hasPendingLocalCloudChanges", "preserveLocalSnapshotBeforeCloudAdoption",
      "setRealtimeSyncStatus", "mergeSyncDatasets", "isLeahAdultWorkspace", "window", "privateModulesReady", "applyLocalViewStateToData",
      "syncFingerprint", "safeStorage", "STORAGE_KEYS", "cloudSyncFingerprint", "rebuildTaskMemoryFromTasks", "renderBoard",
      "renderLearningGoalsPanel", "renderBirthdayUpcomingList", "todayBirthdayPopupSchedulerReady", "checkTodayBirthdayPopup", "document",
      "showToast", `return (${source});`)(
      value => value, appState, () => true,
      () => { calls.push("backup"); return backupOk; },
      () => calls.push("error"), () => { calls.push("merge"); return merged; }, () => false, {}, false,
      value => value, value => JSON.stringify(value), { setItem: () => true }, { DATA: "data" },
      value => JSON.stringify(value.tasks.map(task => task.id).sort()), () => {}, () => {}, () => {}, () => {}, false, () => {},
      { getElementById: () => null }, () => {}
    );
    return { result: fn(remote, false), calls, appState };
  };
  const safe = invoke(true);
  assert.deepEqual(safe.calls, ["backup", "merge"]);
  assert.equal(safe.result.ok, true);
  assert.equal(safe.appState.data.tasks.length, 2);
  const blocked = invoke(false);
  assert.deepEqual(blocked.calls, ["backup", "error"]);
  assert.equal(blocked.result.ok, false);
  assert.equal(blocked.appState.data, local);
});

test("Jose 404 stays pending and backup import is staging-only, previewed, backed up and confirmed", () => {
  const pullStart = app.indexOf("async function pullCloudSync(");
  const pullEnd = app.indexOf('\n  window.addEventListener("tasky:manual-refresh"', pullStart);
  const pull = app.slice(pullStart, pullEnd);
  assert.match(pull, /activeWorkspaceId === "jose"[\s\S]{0,260}Migración pendiente/);
  assert.match(app, /environment\.name !== "staging"/);
  assert.match(app, /tasky:migration-recovery:jose/);
  assert.match(app, /window\.confirm\(confirmText\)/);
  assert.match(app, /currentDocument\.updateTime \|\| null/);
  assert.match(app, /La lectura confirmatoria no coincide/);
  assert.match(app, /if \(activeWorkspaceId === "jose"\)\s*\{\s*const imported = await importJoseBackupSafely/);
  assert.match(app, /if \(creatingNewFirestoreDocument\)\s*\{\s*const confirmation = await window\.fetch\(getFirebaseFirestoreUrl\(\)/);
  assert.match(app, /if \(response\.ok\) \{\s*const confirmation = await window\.fetch/);
});


test("Tasky backup round-trips separate history, settings, memory and durable task metadata", () => {
  const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
  const isRecordSource = extractFunction("isTaskyBackupRecord", "\\n  function buildTaskyBackupEnvelope");
  const buildSource = extractFunction("buildTaskyBackupEnvelope", "\\n  function normalizeTaskyBackupEnvelope");
  const normalizeSource = extractFunction("normalizeTaskyBackupEnvelope", "\\n  function exportJsonBackup");
  const predicate = new Function(`return (${isRecordSource});`)();
  const build = new Function("isTaskyBackupRecord", `return (${buildSource});`)(predicate);
  const normalizeDataPayloadForTest = raw => ({
    ...raw,
    boxes: Array.isArray(raw.boxes) ? raw.boxes : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    taskMemoryByBox: isRecord(raw.taskMemoryByBox) ? raw.taskMemoryByBox : {}
  });
  const normalize = new Function("isTaskyBackupRecord", "normalizeDataPayload", `return (${normalizeSource});`)(
    predicate, normalizeDataPayloadForTest
  );

  const source = {
    boxes: [{ id: "home", name: "CASA", updatedAt: 20 }],
    tasks: [{ id: "task-1", boxId: "home", title: "Tarea guardada", updatedAt: 30 }],
    deletedTaskIds: ["deleted-task"],
    deletedBoxIds: ["deleted-box"],
    deletedTaskUpdatedAt: { "deleted-task": 40 },
    deletedBoxUpdatedAt: { "deleted-box": 50 },
    learningGoals: { daily: { "2026-11-24": "Leer" }, weekly: {} },
    focusPlan: { date: "2026-11-24", byBox: { home: ["task-1"] }, updatedAt: 60 },
    completionLog: [{ taskId: "task-1", completedDate: "2026-11-23", updatedAt: 70 }],
    dismissedTaskSuggestionsByBox: { home: ["No repetir"] },
    birthdays: [{ id: "birthday-1", name: "Familiar", date: "2026-12-01" }],
    monthlyCompletedBase: 66,
    updatedAt: 80
  };
  const history = { "2026-11-23": 3, "2026-11-24": 1 };
  const settings = { theme: "dark", soundsEnabled: false, weekStartsOn: 1 };
  const taskMemoryByBox = { home: ["Comprar pan", "Llamar"] };

  const exported = build({ data: source, history, settings, taskMemoryByBox });
  const restored = normalize(JSON.parse(JSON.stringify(exported)));

  assert.deepEqual(restored.history, history);
  assert.deepEqual(restored.settings, settings);
  assert.deepEqual(restored.taskMemoryByBox, taskMemoryByBox);
  assert.deepEqual(restored.imported.boxes, source.boxes);
  assert.deepEqual(restored.imported.tasks, source.tasks);
  for (const key of [
    "deletedTaskIds", "deletedBoxIds", "deletedTaskUpdatedAt", "deletedBoxUpdatedAt",
    "learningGoals", "focusPlan", "completionLog", "dismissedTaskSuggestionsByBox",
    "birthdays", "monthlyCompletedBase"
  ]) assert.deepEqual(restored.imported[key], source[key], `round-trip failed for ${key}`);

  const importSource = extractFunction("importJoseBackupSafely", "\\n\\n  // Point 5:");
  assert.match(importSource, /document: currentRemoteDocument/);
  assert.match(importSource, /verifiedPayloadJson !== expectedPayloadJson/);
  assert.match(importSource, /STORAGE_KEYS\\.SETTINGS/);
  assert.match(importSource, /STORAGE_KEYS\\.MEMORY/);
});

test("legacy Tasky JSON backups keep embedded history, settings and task memory", () => {
  const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
  const isRecordSource = extractFunction("isTaskyBackupRecord", "\\n  function buildTaskyBackupEnvelope");
  const normalizeSource = extractFunction("normalizeTaskyBackupEnvelope", "\\n  function exportJsonBackup");
  const predicate = new Function(`return (${isRecordSource});`)();
  const normalizeDataPayloadForTest = raw => ({
    ...raw,
    boxes: Array.isArray(raw.boxes) ? raw.boxes : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    taskMemoryByBox: isRecord(raw.taskMemoryByBox) ? raw.taskMemoryByBox : {}
  });
  const normalize = new Function("isTaskyBackupRecord", "normalizeDataPayload", `return (${normalizeSource});`)(
    predicate, normalizeDataPayloadForTest
  );
  const legacy = {
    boxes: [{ id: "home", name: "CASA" }],
    tasks: [],
    history: { "2026-11-20": 2 },
    settings: { theme: "light" },
    taskMemoryByBox: { home: ["Lavar"] }
  };
  const restored = normalize(legacy);
  assert.deepEqual(restored.history, legacy.history);
  assert.deepEqual(restored.settings, legacy.settings);
  assert.deepEqual(restored.taskMemoryByBox, legacy.taskMemoryByBox);
  assert.deepEqual(restored.imported.boxes, legacy.boxes);
});
