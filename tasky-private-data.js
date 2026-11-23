export const PRIVATE_MODULE_IDS = Object.freeze({
  box_salud: "health",
  box_gastos: "expenses"
});

const PRIVATE_MODULE_ID_SET = new Set(Object.keys(PRIVATE_MODULE_IDS));

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function uniqueStrings(values) {
  return Array.from(new Set(asArray(values).map((value) => String(value || "")).filter(Boolean)));
}

function deletionTimes(values) {
  if (!values || typeof values !== "object" || Array.isArray(values)) return {};
  return Object.fromEntries(Object.entries(values).map(([id, value]) => [String(id), Number(value || 0)])
    .filter(([id, value]) => id && Number.isFinite(value) && value > 0));
}

function chooseNewest(first, second, getTime = (value) => Number(value && value.updatedAt || 0)) {
  if (!first) return second || null;
  if (!second) return first;
  return getTime(second) > getTime(first) ? second : first;
}

export function isPrivateModuleId(moduleId) {
  return PRIVATE_MODULE_ID_SET.has(String(moduleId || ""));
}

export function privateModuleMemoryKeys(moduleId, box = null, knownKeys = []) {
  if (!isPrivateModuleId(moduleId)) return [];
  const keys = new Set([String(moduleId), ...uniqueStrings(knownKeys)]);
  const name = String(box && box.name || "").trim();
  if (name) keys.add("box_mem_" + name.toUpperCase());
  // Keep prior known key variants when a private module was renamed.
  if (moduleId === "box_salud") keys.add("box_mem_SALUD Y CITAS");
  if (moduleId === "box_gastos") keys.add("box_mem_GASTOS RELACIONADOS CON LEAH");
  return Array.from(keys);
}

function selectMemoryEntries(source, keys) {
  const result = {};
  keys.forEach((key) => {
    if (Array.isArray(source[key])) result[key] = clone(source[key]);
  });
  return result;
}

export function moduleDataFromWorkspace(sourceRaw, moduleId, knownTaskIds = [], taskMemoryRaw = null, knownMemoryKeys = []) {
  if (!isPrivateModuleId(moduleId)) throw new Error("Módulo privado desconocido.");
  const source = asObject(sourceRaw);
  const box = asArray(source.boxes).find((item) => String(item && item.id) === moduleId);
  const tasks = asArray(source.tasks)
    .filter((item) => item && String(item.boxId) === moduleId)
    .map((item) => clone(item));
  const currentTaskIds = tasks.map((item) => String(item.id || "")).filter(Boolean);
  const sourceCompletionLog = asArray(source.completionLog);
  const privateCompletionLog = sourceCompletionLog.filter((entry) => entry && (
    String(entry.boxId || "") === moduleId ||
    uniqueStrings(knownTaskIds).includes(String(entry.taskId || "")) ||
    currentTaskIds.includes(String(entry.taskId || ""))
  ));
  const completionTaskIds = privateCompletionLog.map((entry) => String(entry.taskId || "")).filter(Boolean);
  const taskIds = uniqueStrings([...knownTaskIds, ...currentTaskIds, ...completionTaskIds]);
  const deletedTaskIds = uniqueStrings(source.deletedTaskIds).filter((id) => taskIds.includes(id));
  const deletedTaskUpdatedAt = Object.fromEntries(Object.entries(deletionTimes(source.deletedTaskUpdatedAt))
    .filter(([id]) => deletedTaskIds.includes(id)));
  const sourceMemory = { ...asObject(source.taskMemoryByBox), ...asObject(taskMemoryRaw) };
  const memoryKeys = privateModuleMemoryKeys(moduleId, box, knownMemoryKeys);
  const memory = selectMemoryEntries(sourceMemory, memoryKeys);
  const sourceFocus = asObject(source.focusPlan);
  const focusByBox = asObject(sourceFocus.byBox);
  const focusPlan = Object.prototype.hasOwnProperty.call(focusByBox, moduleId)
    ? {
        date: String(sourceFocus.date || ""),
        updatedAt: Number(sourceFocus.updatedAt || 0),
        byBox: { [moduleId]: clone(focusByBox[moduleId]) }
      }
    : { date: String(sourceFocus.date || ""), updatedAt: Number(sourceFocus.updatedAt || 0), byBox: {} };
  const dismissed = selectMemoryEntries(asObject(source.dismissedTaskSuggestionsByBox), memoryKeys);
  const completionLog = privateCompletionLog.map((entry) => clone(entry));

  return {
    moduleId,
    box: box ? clone(box) : null,
    tasks,
    taskIds,
    deletedTaskIds,
    deletedTaskUpdatedAt,
    deletedBoxIds: [],
    deletedBoxUpdatedAt: {},
    taskMemoryByBox: memory,
    memoryKeys,
    focusPlan,
    dismissedTaskSuggestionsByBox: dismissed,
    completionLog,
    updatedAt: Number(source.updatedAt || 0)
  };
}

export function mergePrivateModuleData(...rawEntries) {
  const entries = rawEntries.filter((entry) => entry && typeof entry === "object");
  if (!entries.length) return null;
  const moduleId = String(entries[0].moduleId || "");
  if (!isPrivateModuleId(moduleId) || entries.some((entry) => String(entry.moduleId || "") !== moduleId)) {
    throw new Error("No se pueden combinar datos de módulos privados distintos.");
  }

  let box = null;
  const tasksById = new Map();
  const deletedTaskIds = new Set();
  const taskIds = new Set();
  const deletedBoxIds = new Set();
  const deletedTaskUpdatedAt = {};
  const deletedBoxUpdatedAt = {};
  const taskMemoryByBox = {};
  const dismissedTaskSuggestionsByBox = {};
  const completionById = new Map();
  const primaryLegacyDeletions = new Set(uniqueStrings(entries[0] && entries[0].deletedTaskIds)
    .filter((id) => !(Number(deletionTimes(entries[0] && entries[0].deletedTaskUpdatedAt)[id] || 0) > 0)));
  let focusPlan = { date: "", updatedAt: 0, byBox: {} };
  let updatedAt = 0;

  entries.forEach((entry) => {
    box = chooseNewest(box, entry.box);
    updatedAt = Math.max(updatedAt, Number(entry.updatedAt || 0));
    uniqueStrings(entry.taskIds).forEach((id) => taskIds.add(id));
    uniqueStrings(entry.deletedTaskIds).forEach((id) => deletedTaskIds.add(id));
    uniqueStrings(entry.deletedBoxIds).forEach((id) => deletedBoxIds.add(id));
    Object.entries(deletionTimes(entry.deletedTaskUpdatedAt)).forEach(([id, value]) => {
      deletedTaskUpdatedAt[id] = Math.max(deletedTaskUpdatedAt[id] || 0, value);
    });
    Object.entries(deletionTimes(entry.deletedBoxUpdatedAt)).forEach(([id, value]) => {
      deletedBoxUpdatedAt[id] = Math.max(deletedBoxUpdatedAt[id] || 0, value);
    });

    asArray(entry.tasks).forEach((task) => {
      if (!task || task.id == null) return;
      const id = String(task.id);
      taskIds.add(id);
      tasksById.set(id, chooseNewest(tasksById.get(id), clone(task)));
    });

    const memory = asObject(entry.taskMemoryByBox);
    Object.entries(memory).forEach(([key, values]) => {
      if (!Array.isArray(values)) return;
      const merged = Array.isArray(taskMemoryByBox[key]) ? taskMemoryByBox[key] : [];
      const seen = new Set(merged.map((value) => String(value).toLowerCase()));
      values.forEach((value) => {
        const title = String(value || "").trim();
        if (title && !seen.has(title.toLowerCase())) {
          merged.push(title);
          seen.add(title.toLowerCase());
        }
      });
      taskMemoryByBox[key] = merged.slice(-500);
    });

    const dismissed = asObject(entry.dismissedTaskSuggestionsByBox);
    Object.entries(dismissed).forEach(([key, values]) => {
      if (!Array.isArray(values)) return;
      const merged = Array.isArray(dismissedTaskSuggestionsByBox[key])
        ? dismissedTaskSuggestionsByBox[key] : [];
      const seen = new Set(merged.map((value) => String(value).toLowerCase()));
      values.forEach((value) => {
        const title = String(value || "").trim();
        if (title && !seen.has(title.toLowerCase())) {
          merged.push(title);
          seen.add(title.toLowerCase());
        }
      });
      dismissedTaskSuggestionsByBox[key] = merged.slice(-500);
    });

    const entryFocus = asObject(entry.focusPlan);
    const entryByBox = asObject(entryFocus.byBox);
    if (entryByBox[moduleId]) {
      if (Number(entryFocus.updatedAt || 0) >= Number(focusPlan.updatedAt || 0)) {
        focusPlan = {
          date: String(entryFocus.date || ""),
          updatedAt: Number(entryFocus.updatedAt || 0),
          byBox: { [moduleId]: clone(entryByBox[moduleId]) }
        };
      }
    }

    asArray(entry.completionLog).forEach((event) => {
      if (!event || event.id == null) return;
      const id = String(event.id);
      completionById.set(id, chooseNewest(completionById.get(id), clone(event)));
    });
  });

  // An older device may carry an unversioned deletion. A remote/current primary
  // legacy tombstone remains authoritative; unversioned secondary cache tombstones
  // are ignored. Versioned tombstones lose only to a later explicit item revision.
  const taskVersions = new Map();
  entries.forEach((entry) => asArray(entry.tasks).forEach((task) => {
    if (!task || task.id == null) return;
    const id = String(task.id);
    taskVersions.set(id, Math.max(taskVersions.get(id) || 0, Number(task.updatedAt || 0)));
  }));
  Array.from(deletedTaskIds).forEach((id) => {
    const deletedAt = Number(deletedTaskUpdatedAt[id] || 0);
    if (deletedAt <= 0 && !primaryLegacyDeletions.has(id)) {
      deletedTaskIds.delete(id);
      return;
    }
    if (deletedAt > 0 && Number(taskVersions.get(id) || 0) > deletedAt) {
      deletedTaskIds.delete(id);
      delete deletedTaskUpdatedAt[id];
    }
  });

  const tasks = Array.from(tasksById.values())
    .filter((task) => !deletedTaskIds.has(String(task.id)))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const knownIds = uniqueStrings([...Array.from(taskIds), ...Array.from(tasksById.keys())]);

  return {
    moduleId,
    box: clone(box),
    tasks,
    taskIds: knownIds,
    deletedTaskIds: Array.from(deletedTaskIds),
    deletedTaskUpdatedAt: Object.fromEntries(Object.entries(deletedTaskUpdatedAt).filter(([id]) => deletedTaskIds.has(id))),
    deletedBoxIds: Array.from(deletedBoxIds),
    deletedBoxUpdatedAt: Object.fromEntries(Object.entries(deletedBoxUpdatedAt).filter(([id]) => deletedBoxIds.has(id))),
    taskMemoryByBox,
    focusPlan,
    dismissedTaskSuggestionsByBox,
    completionLog: Array.from(completionById.values()),
    updatedAt
  };
}

export function collectPrivateTaskIds(modulesRaw) {
  const modules = Array.isArray(modulesRaw) ? modulesRaw : Object.values(asObject(modulesRaw));
  const ids = new Set();
  modules.forEach((moduleData) => {
    if (!moduleData) return;
    uniqueStrings(moduleData.taskIds).forEach((id) => ids.add(id));
    uniqueStrings(moduleData.deletedTaskIds).forEach((id) => ids.add(id));
    asArray(moduleData.tasks).forEach((task) => {
      if (task && task.id != null) ids.add(String(task.id));
    });
  });
  return ids;
}

export function collectPrivateMemoryKeys(modulesRaw) {
  const modules = Array.isArray(modulesRaw) ? modulesRaw : Object.values(asObject(modulesRaw));
  const keys = new Set();
  modules.forEach((moduleData) => {
    if (!moduleData || !isPrivateModuleId(moduleData.moduleId)) return;
    privateModuleMemoryKeys(
      moduleData.moduleId,
      moduleData.box,
      [
        ...uniqueStrings(moduleData.memoryKeys),
        ...Object.keys(asObject(moduleData.taskMemoryByBox)),
        ...Object.keys(asObject(moduleData.dismissedTaskSuggestionsByBox))
      ]
    ).forEach((key) => keys.add(key));
  });
  return keys;
}

export function buildSharedTaskMemory(memoryRaw, modulesRaw = []) {
  const source = { ...asObject(memoryRaw) };
  collectPrivateMemoryKeys(modulesRaw).forEach((key) => delete source[key]);
  return source;
}

export function preparePrivateModuleMigration({
  sharedPayload,
  existingModules = [],
  localData = {},
  taskMemory = {},
  moduleSpecs = []
} = {}) {
  if (sharedPayload != null &&
      (!Array.isArray(sharedPayload.boxes) || !Array.isArray(sharedPayload.tasks))) {
    throw new Error("El tablero compartido antiguo no contiene una copia válida.");
  }

  const legacySource = sharedPayload || {};
  const specs = Array.isArray(moduleSpecs) ? moduleSpecs : [];
  const existingEntries = Array.isArray(existingModules) ? existingModules : [];
  const modules = specs.map((spec, index) => {
    if (!spec || !isPrivateModuleId(spec.id)) {
      throw new Error("La migración contiene un módulo privado desconocido.");
    }
    const existing = existingEntries[index] || {
      moduleId: spec.id,
      box: null,
      tasks: [],
      taskIds: [],
      deletedTaskIds: [],
      deletedTaskUpdatedAt: {},
      deletedBoxIds: [],
      deletedBoxUpdatedAt: {},
      taskMemoryByBox: {},
      dismissedTaskSuggestionsByBox: {},
      focusPlan: { date: "", updatedAt: 0, byBox: {} },
      completionLog: [],
      updatedAt: 0
    };
    const knownMemoryKeys = [
      ...Object.keys(asObject(existing.taskMemoryByBox)),
      ...Object.keys(asObject(existing.dismissedTaskSuggestionsByBox))
    ];
    const legacy = moduleDataFromWorkspace(
      legacySource,
      spec.id,
      existing.taskIds,
      null,
      knownMemoryKeys
    );
    const local = moduleDataFromWorkspace(
      localData,
      spec.id,
      existing.taskIds,
      taskMemory,
      knownMemoryKeys
    );
    const merged = mergePrivateModuleData(existing, legacy, local);
    if (!merged.box) {
      merged.box = {
        id: spec.id,
        name: String(spec.name || spec.id),
        color: String(spec.color || "#A855F7"),
        emoji: String(spec.emoji || ""),
        order: Number(spec.order || 0),
        collapsed: false
      };
    }
    return merged;
  });

  return {
    modules,
    sanitizedSharedPayload: sharedPayload ? buildSharedWorkspacePayload(sharedPayload, modules) : null
  };
}

export function buildSharedWorkspacePayload(sourceRaw, modulesRaw = []) {
  const source = clone(asObject(sourceRaw)) || {};
  const privateModules = Array.isArray(modulesRaw) ? modulesRaw : Object.values(asObject(modulesRaw));
  const privateTaskIds = collectPrivateTaskIds(privateModules);
  const privateBoxIds = new Set(Object.keys(PRIVATE_MODULE_IDS));
  const privateMemoryKeys = collectPrivateMemoryKeys(privateModules);

  source.boxes = asArray(source.boxes)
    .filter((box) => box && !privateBoxIds.has(String(box.id)))
    .map((box) => clone(box));
  source.tasks = asArray(source.tasks)
    .filter((task) => task && !privateBoxIds.has(String(task.boxId)) && !privateTaskIds.has(String(task.id)))
    .map((task) => clone(task));
  source.deletedTaskIds = uniqueStrings(source.deletedTaskIds).filter((id) => !privateTaskIds.has(id));
  source.deletedBoxIds = uniqueStrings(source.deletedBoxIds).filter((id) => !privateBoxIds.has(id));
  source.deletedTaskUpdatedAt = Object.fromEntries(Object.entries(deletionTimes(source.deletedTaskUpdatedAt))
    .filter(([id]) => source.deletedTaskIds.includes(id)));
  source.deletedBoxUpdatedAt = Object.fromEntries(Object.entries(deletionTimes(source.deletedBoxUpdatedAt))
    .filter(([id]) => source.deletedBoxIds.includes(id)));

  const taskMemory = asObject(source.taskMemoryByBox);
  Object.keys(taskMemory).forEach((key) => {
    if (privateBoxIds.has(key) || privateMemoryKeys.has(key)) delete taskMemory[key];
  });
  source.taskMemoryByBox = taskMemory;

  const dismissed = asObject(source.dismissedTaskSuggestionsByBox);
  Object.keys(dismissed).forEach((key) => {
    if (privateBoxIds.has(key) || privateMemoryKeys.has(key)) delete dismissed[key];
  });
  source.dismissedTaskSuggestionsByBox = dismissed;

  const focusPlan = asObject(source.focusPlan);
  const focusByBox = asObject(focusPlan.byBox);
  Object.keys(focusByBox).forEach((key) => {
    if (privateBoxIds.has(key)) delete focusByBox[key];
  });
  source.focusPlan = { ...focusPlan, byBox: focusByBox };

  source.completionLog = asArray(source.completionLog)
    .filter((event) => event &&
      !privateBoxIds.has(String(event.boxId || "")) &&
      !privateTaskIds.has(String(event.taskId || ""))
    )
    .map((event) => clone(event));
  // Action history may contain private task titles. Keep it in the adult's local account only.
  delete source.history;
  return source;
}

export function attachPrivateModulesToWorkspace(sharedRaw, modulesRaw = []) {
  const result = clone(asObject(sharedRaw)) || {};
  const modules = Array.isArray(modulesRaw) ? modulesRaw : Object.values(asObject(modulesRaw));
  const boxesById = new Map(asArray(result.boxes).map((box) => [String(box.id), box]));
  const tasksById = new Map(asArray(result.tasks).map((task) => [String(task.id), task]));
  const deletedTaskIds = new Set(uniqueStrings(result.deletedTaskIds));
  const deletedBoxIds = new Set(uniqueStrings(result.deletedBoxIds));
  const deletedTaskUpdatedAt = deletionTimes(result.deletedTaskUpdatedAt);
  const deletedBoxUpdatedAt = deletionTimes(result.deletedBoxUpdatedAt);
  const taskMemoryByBox = { ...asObject(result.taskMemoryByBox) };
  const dismissed = { ...asObject(result.dismissedTaskSuggestionsByBox) };
  const focusPlan = asObject(result.focusPlan);
  const focusByBox = { ...asObject(focusPlan.byBox) };
  const completionById = new Map(asArray(result.completionLog).map((event) => [String(event.id), event]));

  modules.forEach((moduleData) => {
    if (!moduleData || !isPrivateModuleId(moduleData.moduleId)) return;
    if (moduleData.box) boxesById.set(String(moduleData.box.id), clone(moduleData.box));
    asArray(moduleData.tasks).forEach((task) => {
      if (task && task.id != null) tasksById.set(String(task.id), clone(task));
    });
    uniqueStrings(moduleData.deletedTaskIds).forEach((id) => deletedTaskIds.add(id));
    uniqueStrings(moduleData.deletedBoxIds).forEach((id) => deletedBoxIds.add(id));
    Object.entries(deletionTimes(moduleData.deletedTaskUpdatedAt)).forEach(([id, value]) => {
      deletedTaskUpdatedAt[id] = Math.max(deletedTaskUpdatedAt[id] || 0, value);
    });
    Object.entries(deletionTimes(moduleData.deletedBoxUpdatedAt)).forEach(([id, value]) => {
      deletedBoxUpdatedAt[id] = Math.max(deletedBoxUpdatedAt[id] || 0, value);
    });

    const memory = asObject(moduleData.taskMemoryByBox);
    Object.entries(memory).forEach(([key, values]) => {
      if (Array.isArray(values)) taskMemoryByBox[key] = clone(values);
    });
    const privateDismissed = asObject(moduleData.dismissedTaskSuggestionsByBox);
    Object.entries(privateDismissed).forEach(([key, values]) => {
      if (Array.isArray(values)) dismissed[key] = clone(values);
    });
    const privateFocus = asObject(moduleData.focusPlan);
    const privateFocusByBox = asObject(privateFocus.byBox);
    if (privateFocusByBox[moduleData.moduleId]) focusByBox[moduleData.moduleId] = clone(privateFocusByBox[moduleData.moduleId]);
    asArray(moduleData.completionLog).forEach((event) => {
      if (event && event.id != null) completionById.set(String(event.id), clone(event));
    });
  });

  deletedTaskIds.forEach((id) => tasksById.delete(id));
  deletedBoxIds.forEach((id) => boxesById.delete(id));
  result.boxes = Array.from(boxesById.values()).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  result.tasks = Array.from(tasksById.values()).filter((task) => boxesById.has(String(task.boxId)));
  result.deletedTaskIds = Array.from(deletedTaskIds);
  result.deletedBoxIds = Array.from(deletedBoxIds);
  result.deletedTaskUpdatedAt = Object.fromEntries(Object.entries(deletedTaskUpdatedAt).filter(([id]) => deletedTaskIds.has(id)));
  result.deletedBoxUpdatedAt = Object.fromEntries(Object.entries(deletedBoxUpdatedAt).filter(([id]) => deletedBoxIds.has(id)));
  result.taskMemoryByBox = taskMemoryByBox;
  result.dismissedTaskSuggestionsByBox = dismissed;
  result.focusPlan = {
    ...focusPlan,
    byBox: focusByBox,
    updatedAt: Math.max(Number(focusPlan.updatedAt || 0), ...modules.map((item) => Number(item && item.focusPlan && item.focusPlan.updatedAt || 0)))
  };
  result.completionLog = Array.from(completionById.values());
  result.updatedAt = Math.max(Number(result.updatedAt || 0), ...modules.map((item) => Number(item && item.updatedAt || 0)));
  return result;
}
