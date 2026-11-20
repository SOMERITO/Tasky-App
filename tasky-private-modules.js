import { getApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getFirestore,
  doc,
  runTransaction,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import {
  PRIVATE_MODULE_IDS,
  attachPrivateModulesToWorkspace,
  buildSharedTaskMemory,
  buildSharedWorkspacePayload,
  collectPrivateTaskIds,
  mergePrivateModuleData,
  moduleDataFromWorkspace,
  preparePrivateModuleMigration
} from "./tasky-private-data.js?v=20261120-private-data-2";

const db = getFirestore(getApp("tasky-multi-workspace"));
const MODULES = [
  {
    id: "box_salud",
    documentId: "health",
    name: "SALUD Y CITAS",
    color: "#A855F7",
    emoji: "💗",
    order: 5
  },
  {
    id: "box_gastos",
    documentId: "expenses",
    name: "GASTOS RELACIONADOS CON LEAH",
    color: "#A855F7",
    emoji: "💜",
    order: 7
  }
];

const workspacePath = ["workspaces", "leah"];
let currentUid = "";
let ready = false;
let currentModules = [];
let listeners = [];
let snapshotGeneration = 0;

function moduleRef(module) {
  return doc(db, ...workspacePath, "adult_private", module.documentId);
}

function sharedRef() {
  return doc(db, "workspaces", "leah", "shared", "main");
}

function defaultBox(module) {
  return {
    id: module.id,
    name: module.name,
    color: module.color,
    emoji: module.emoji,
    order: module.order,
    collapsed: false
  };
}

function makeDefaultModule(module) {
  return {
    moduleId: module.id,
    box: defaultBox(module),
    tasks: [],
    taskIds: [],
    deletedTaskIds: [],
    deletedBoxIds: [],
    taskMemoryByBox: {},
    focusPlan: { date: "", updatedAt: 0, byBox: {} },
    dismissedTaskSuggestionsByBox: {},
    completionLog: [],
    updatedAt: 0
  };
}

function parseModuleDocument(snapshot, module) {
  if (!snapshot || !snapshot.exists()) return null;
  const data = snapshot.data() || {};
  const raw = data.payloadJson;
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.moduleId !== module.id) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function moduleDataFromDocOrDefault(snapshot, module) {
  if (!snapshot || !snapshot.exists()) return makeDefaultModule(module);
  const parsed = parseModuleDocument(snapshot, module);
  if (!parsed) {
    throw new Error("El documento privado " + module.documentId + " no tiene un formato válido; se bloqueó la migración para no sobrescribir datos.");
  }
  return parsed;
}

function parseSharedDocument(snapshot) {
  if (!snapshot || !snapshot.exists()) return null;
  const data = snapshot.data() || {};
  if (typeof data.payloadJson !== "string" || !data.payloadJson) return null;
  try {
    const parsed = JSON.parse(data.payloadJson);
    return parsed && Array.isArray(parsed.boxes) && Array.isArray(parsed.tasks) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function withDefaultBox(moduleData, module) {
  if (moduleData.box) return moduleData;
  return { ...moduleData, box: defaultBox(module) };
}

function encodeModuleDocument(moduleData) {
  return {
    moduleId: moduleData.moduleId,
    schemaVersion: 1,
    payloadJson: JSON.stringify(moduleData),
    updatedAt: Number(moduleData.updatedAt || Date.now()),
    deviceId: "tasky-private-modules"
  };
}

function isGuardianContext(context) {
  return Boolean(
    context &&
    context.workspaceId === "leah" &&
    context.uid &&
    ["guardian", "owner"].includes(context.role)
  );
}

async function initialize(initialData, taskMemory, context) {
  stopListeners();
  ready = false;
  currentUid = "";
  currentModules = [];
  if (!isGuardianContext(context)) {
    ready = false;
    currentUid = "";
    currentModules = [];
    return initialData;
  }

  const healthRef = moduleRef(MODULES[0]);
  const expensesRef = moduleRef(MODULES[1]);
  const boardRef = sharedRef();
  const migrationStateRef = doc(db, "workspaces", "leah", "access_control", "private_modules");
  const localData = initialData && typeof initialData === "object" ? initialData : {};
  const localMemory = taskMemory && typeof taskMemory === "object" ? taskMemory : {};

  const result = await runTransaction(db, async (transaction) => {
    const [boardSnapshot, healthSnapshot, expensesSnapshot, migrationStateSnapshot] = await Promise.all([
      transaction.get(boardRef),
      transaction.get(healthRef),
      transaction.get(expensesRef),
      transaction.get(migrationStateRef)
    ]);

    const legacyShared = parseSharedDocument(boardSnapshot);
    if (boardSnapshot && boardSnapshot.exists() && !legacyShared) {
      throw new Error("El documento shared/main existente no contiene una copia válida; la migración privada se detuvo sin habilitar el acceso infantil.");
    }
    const existing = [
      moduleDataFromDocOrDefault(healthSnapshot, MODULES[0]),
      moduleDataFromDocOrDefault(expensesSnapshot, MODULES[1])
    ];

    const migrationPlan = preparePrivateModuleMigration({
      sharedPayload: legacyShared,
      existingModules: existing,
      localData,
      taskMemory: localMemory,
      moduleSpecs: MODULES
    });
    const mergedModules = migrationPlan.modules;

    if (boardSnapshot && boardSnapshot.exists() && legacyShared) {
      const sanitized = migrationPlan.sanitizedSharedPayload;
      const payloadJson = JSON.stringify(sanitized);
      const oldPayload = String(boardSnapshot.data()?.payloadJson || "");
      const oldCompact = String(boardSnapshot.data()?.compactEnvelope || "");
      if (payloadJson !== oldPayload || oldCompact) {
        const updatedAt = Math.max(Date.now(), Number(boardSnapshot.data()?.updatedAt || 0) + 1);
        transaction.update(boardRef, {
          payloadJson,
          compactEnvelope: "",
          updatedAt,
          deviceId: "tasky-private-module-migration"
        });
      }
    }

    transaction.set(healthRef, encodeModuleDocument(mergedModules[0]));
    transaction.set(expensesRef, encodeModuleDocument(mergedModules[1]));
    transaction.set(migrationStateRef, {
      ready: true,
      schemaVersion: 1,
      updatedAt: Date.now(),
      migratedBy: String(context.uid),
      migrationVersion: "20261120-private-health-expenses-1"
    });
    return mergedModules;
  });

  currentUid = String(context.uid);
  currentModules = result;
  ready = true;
  return attachPrivateModulesToWorkspace(localData, result);
}

async function persistFromWorkspaceData(data, taskMemory, context) {
  if (!isGuardianContext(context) || !ready || currentUid !== String(context.uid)) {
    throw new Error("Los módulos privados de Leah no están inicializados para esta sesión.");
  }

  const refs = MODULES.map(moduleRef);
  const memory = taskMemory && typeof taskMemory === "object" ? taskMemory : {};
  const savedModules = await runTransaction(db, async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const nextModules = MODULES.map((module, index) => {
      const existing = moduleDataFromDocOrDefault(snapshots[index], module);
      const knownMemoryKeys = [
        ...Object.keys(existing.taskMemoryByBox || {}),
        ...Object.keys(existing.dismissedTaskSuggestionsByBox || {})
      ];
      const local = moduleDataFromWorkspace(data, module.id, existing.taskIds, memory, knownMemoryKeys);
      return withDefaultBox(mergePrivateModuleData(existing, local), module);
    });
    nextModules.forEach((moduleData, index) => {
      transaction.set(refs[index], encodeModuleDocument(moduleData));
    });
    return nextModules;
  });

  currentModules = savedModules;
  return savedModules;
}

function getPrivateTaskIds() {
  return collectPrivateTaskIds(currentModules);
}

function buildSharedPayload(data) {
  return buildSharedWorkspacePayload(data, currentModules);
}

function buildSharedTaskMemoryPayload(memory) {
  return buildSharedTaskMemory(memory, currentModules);
}

function mergeSnapshotModules(data, remoteModules) {
  const localModules = MODULES.map((module) => {
    const known = currentModules.find((entry) => entry.moduleId === module.id);
    const knownMemoryKeys = [
      ...Object.keys((known && known.taskMemoryByBox) || {}),
      ...Object.keys((known && known.dismissedTaskSuggestionsByBox) || {})
    ];
    return moduleDataFromWorkspace(data, module.id, known ? known.taskIds : [], null, knownMemoryKeys);
  });
  return MODULES.map((module, index) =>
    withDefaultBox(mergePrivateModuleData(localModules[index], remoteModules[index]), module)
  );
}

function mergeIntoWorkspace(data, remoteModules) {
  const merged = mergeSnapshotModules(data, remoteModules);
  currentModules = merged;
  return attachPrivateModulesToWorkspace(buildSharedWorkspacePayload(data, merged), merged);
}

function stopListeners() {
  listeners.forEach((unsubscribe) => {
    try { unsubscribe(); } catch (error) {}
  });
  listeners = [];
  snapshotGeneration += 1;
}

function startListeners(context) {
  stopListeners();
  if (!isGuardianContext(context) || !ready || currentUid !== String(context.uid)) return;
  const generation = snapshotGeneration;
  MODULES.forEach((module) => {
    const unsubscribe = onSnapshot(moduleRef(module), (snapshot) => {
      if (generation !== snapshotGeneration || !ready || currentUid !== String(context.uid)) return;
      const incoming = moduleDataFromDocOrDefault(snapshot, module);
      const previous = currentModules.find((item) => item.moduleId === module.id) || makeDefaultModule(module);
      const merged = withDefaultBox(mergePrivateModuleData(previous, incoming), module);
      currentModules = MODULES.map((item) => item.id === module.id
        ? merged
        : currentModules.find((entry) => entry.moduleId === item.id) || makeDefaultModule(item));
      window.dispatchEvent(new CustomEvent("tasky:private-modules-updated", {
        detail: { uid: currentUid, modules: currentModules }
      }));
    }, (error) => {
      window.console && window.console.error("Tasky private module listener failed:", error);
    });
    listeners.push(unsubscribe);
  });
}

function close(context) {
  if (context && currentUid && String(context.uid) !== currentUid) return;
  stopListeners();
  ready = false;
  currentUid = "";
  currentModules = [];
}

window.TaskyPrivateModules = {
  initialize,
  persistFromWorkspaceData,
  buildSharedPayload,
  buildSharedTaskMemory: buildSharedTaskMemoryPayload,
  getPrivateTaskIds,
  mergeIntoWorkspace,
  startListeners,
  close,
  get ready() { return ready; }
};

window.dispatchEvent(new CustomEvent("tasky:private-modules-loaded"));
