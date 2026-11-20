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
  buildSharedWorkspacePayload,
  collectPrivateTaskIds,
  mergePrivateModuleData,
  moduleDataFromWorkspace
} from "./tasky-private-data.js";

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
  return parseModuleDocument(snapshot, module) || makeDefaultModule(module);
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

function buildLegacyPrivateModule(sharedPayload, module, knownTaskIds) {
  if (!sharedPayload) return makeDefaultModule(module);
  const extracted = moduleDataFromWorkspace(sharedPayload, module.id, knownTaskIds);
  return withDefaultBox(extracted, module);
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
  if (!isGuardianContext(context)) {
    ready = false;
    currentUid = "";
    currentModules = [];
    return initialData;
  }

  const healthRef = moduleRef(MODULES[0]);
  const expensesRef = moduleRef(MODULES[1]);
  const boardRef = sharedRef();
  const localData = initialData && typeof initialData === "object" ? initialData : {};
  const localMemory = taskMemory && typeof taskMemory === "object" ? taskMemory : {};

  const result = await runTransaction(db, async (transaction) => {
    const [boardSnapshot, healthSnapshot, expensesSnapshot] = await Promise.all([
      transaction.get(boardRef),
      transaction.get(healthRef),
      transaction.get(expensesRef)
    ]);

    const legacyShared = parseSharedDocument(boardSnapshot);
    const existing = [
      moduleDataFromDocOrDefault(healthSnapshot, MODULES[0]),
      moduleDataFromDocOrDefault(expensesSnapshot, MODULES[1])
    ];

    const mergedModules = MODULES.map((module, index) => {
      const legacy = buildLegacyPrivateModule(legacyShared, module, existing[index].taskIds);
      const local = moduleDataFromWorkspace(localData, module.id, existing[index].taskIds, localMemory);
      const merged = mergePrivateModuleData(existing[index], legacy, withDefaultBox(local, module));
      return withDefaultBox(merged, module);
    });

    if (boardSnapshot && boardSnapshot.exists() && legacyShared) {
      const sanitized = buildSharedWorkspacePayload(legacyShared, mergedModules);
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
      const local = moduleDataFromWorkspace(data, module.id, existing.taskIds, memory);
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

function mergeSnapshotModules(data, remoteModules) {
  const localModules = MODULES.map((module) => {
    const known = currentModules.find((entry) => entry.moduleId === module.id);
    return moduleDataFromWorkspace(data, module.id, known ? known.taskIds : []);
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
  getPrivateTaskIds,
  mergeIntoWorkspace,
  startListeners,
  close,
  get ready() { return ready; }
};

window.dispatchEvent(new CustomEvent("tasky:private-modules-loaded"));
