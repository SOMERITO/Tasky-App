import assert from "node:assert/strict";
import test from "node:test";
import {
  attachPrivateModulesToWorkspace,
  buildSharedWorkspacePayload,
  mergePrivateModuleData,
  moduleDataFromWorkspace,
  buildSharedTaskMemory,
  preparePrivateModuleMigration,
  validateCompletedPrivateModuleSet
} from "../tasky-private-data.js";

const base = {
  boxes: [
    { id: "box_escolar", name: "ESCOLAR", updatedAt: 1 },
    { id: "box_salud", name: "SALUD Y CITAS", updatedAt: 3 },
    { id: "box_gastos", name: "GASTOS RELACIONADOS CON LEAH", updatedAt: 2 }
  ],
  tasks: [
    { id: "school-1", boxId: "box_escolar", title: "Leer" },
    { id: "health-1", boxId: "box_salud", title: "Cita médica", updatedAt: 5 },
    { id: "expense-1", boxId: "box_gastos", title: "Pago de terapia", updatedAt: 4 }
  ],
  deletedTaskIds: ["health-deleted", "school-deleted"],
  deletedBoxIds: [],
  deletedTaskUpdatedAt: { "health-deleted": 11, "school-deleted": 12 },
  deletedBoxUpdatedAt: {},
  taskMemoryByBox: {
    box_escolar: ["Leer"],
    "box_mem_SALUD Y CITAS": ["Pediatría"],
    "box_mem_GASTOS RELACIONADOS CON LEAH": ["Recibo"]
  },
  dismissedTaskSuggestionsByBox: {
    "box_mem_SALUD Y CITAS": ["Control médico"],
    "box_mem_GASTOS RELACIONADOS CON LEAH": ["Pago mensual"]
  },
  focusPlan: {
    date: "2026-11-20",
    updatedAt: 10,
    byBox: {
      box_escolar: { priorities: [["school-1"], [], []] },
      box_salud: { priorities: [["health-1"], [], []] },
      box_gastos: { priorities: [["expense-1"], [], []] }
    }
  },
  completionLog: [
    { id: "school-event", taskId: "school-1", title: "Leer" },
    { id: "health-event", taskId: "health-1", title: "Cita médica", boxId: "box_salud" },
    { id: "expense-event", taskId: "expense-1", title: "Pago de terapia", boxId: "box_gastos" },
    { id: "health-deleted-event", taskId: "health-deleted", title: "Evento histórico de salud", boxId: "box_salud" }
  ],
  updatedAt: 10
};

test("private migration plan rejects a corrupt legacy shared board", () => {
  assert.throws(
    () => preparePrivateModuleMigration({
      sharedPayload: { payloadJson: "{not valid JSON" },
      existingModules: [],
      localData: {},
      taskMemory: {},
      moduleSpecs: [
        { id: "box_salud", name: "SALUD Y CITAS" },
        { id: "box_gastos", name: "GASTOS RELACIONADOS CON LEAH" }
      ]
    }),
    /no contiene una copia válida/
  );
});

test("completed private marker requires both valid module documents", () => {
  const marker = { ready: true, schemaVersion: 1 };
  const moduleDoc = (moduleId) => ({ moduleId, schemaVersion: 1, payloadJson: JSON.stringify({
    moduleId, box: { id: moduleId }, tasks: [], taskIds: [], deletedTaskIds: [], deletedBoxIds: []
  }) });
  const documents = { health: moduleDoc("box_salud"), expenses: moduleDoc("box_gastos") };
  assert.deepEqual(Object.keys(validateCompletedPrivateModuleSet(marker, documents)), ["box_salud", "box_gastos"]);
  assert.throws(() => validateCompletedPrivateModuleSet(marker, { expenses: documents.expenses }), /falta health/);
  assert.throws(() => validateCompletedPrivateModuleSet(marker, { health: documents.health }), /falta expenses/);
  assert.throws(() => validateCompletedPrivateModuleSet(marker, { ...documents, health: { payloadJson: "{bad" } }), /corrupto/);
  assert.equal(validateCompletedPrivateModuleSet({ ready: false }, {}), null);
});

test("shared payload excludes private boxes, tasks, tombstones and related metadata", () => {
  const health = moduleDataFromWorkspace(base, "box_salud", ["health-deleted"]);
  const expenses = moduleDataFromWorkspace(base, "box_gastos");
  const shared = buildSharedWorkspacePayload(base, [health, expenses]);

  assert.deepEqual(shared.boxes.map((box) => box.id), ["box_escolar"]);
  assert.deepEqual(shared.tasks.map((task) => task.id), ["school-1"]);
  assert.deepEqual(shared.deletedTaskIds, ["school-deleted"]);
  assert.deepEqual(shared.deletedBoxIds, []);
  assert.deepEqual(shared.deletedTaskUpdatedAt, { "school-deleted": 12 });
  assert.deepEqual(shared.deletedBoxUpdatedAt, {});
  assert.deepEqual(Object.keys(shared.taskMemoryByBox), ["box_escolar"]);
  assert.deepEqual(Object.keys(shared.dismissedTaskSuggestionsByBox), []);
  assert.deepEqual(Object.keys(shared.taskMemoryByBox).filter((key) => key.includes("SALUD") || key.includes("GASTOS")), []);
  assert.deepEqual(Object.keys(buildSharedTaskMemory(base.taskMemoryByBox, [health, expenses])), ["box_escolar"]);
  assert.deepEqual(Object.keys(shared.focusPlan.byBox), ["box_escolar"]);
  assert.deepEqual(shared.completionLog.map((entry) => entry.taskId), ["school-1"]);
  assert.equal(Object.hasOwn(shared, "history"), false);
  assert.equal(health.taskIds.includes("health-deleted"), true);
  assert.deepEqual(health.deletedTaskUpdatedAt, { "health-deleted": 11 });
  assert.equal(health.completionLog.some((entry) => entry.id === "health-deleted-event"), true);
});

test("a deleted private task completion cannot leak from shared history without a private task index", () => {
  const shared = buildSharedWorkspacePayload({
    boxes: [{ id: "box_escolar", name: "ESCOLAR" }],
    tasks: [],
    completionLog: [
      { id: "event-secret", taskId: "already-deleted-private-task", boxId: "box_salud", title: "Detalle clínico antiguo" },
      { id: "event-school", taskId: "school-task", boxId: "box_escolar", title: "Tarea escolar" }
    ]
  }, []);

  assert.deepEqual(shared.completionLog.map((entry) => entry.id), ["event-school"]);
});

test("private module merge preserves newer task edits and explicit deletions", () => {
  const first = moduleDataFromWorkspace(base, "box_salud", ["health-deleted"]);
  const older = {
    ...first,
    tasks: [{ id: "health-1", boxId: "box_salud", title: "Old title", updatedAt: 2 }],
    taskIds: ["health-1", "health-deleted"],
    deletedTaskIds: []
  };
  const merged = mergePrivateModuleData(older, first);

  assert.equal(merged.tasks.find((task) => task.id === "health-1").title, "Cita médica");
  assert.deepEqual(merged.deletedTaskIds, ["health-deleted"]);
  assert.equal(merged.taskIds.includes("health-deleted"), true);
});

test("private module ignores a stale unversioned secondary deletion and lets newer edits beat old tombstones", () => {
  const current = {
    moduleId: "box_salud",
    box: { id: "box_salud", name: "SALUD Y CITAS" },
    tasks: [{ id: "health-1", boxId: "box_salud", title: "Consulta actualizada", updatedAt: 500 }],
    taskIds: ["health-1"], deletedTaskIds: [], deletedTaskUpdatedAt: {}, deletedBoxIds: [], deletedBoxUpdatedAt: {}
  };
  const staleCache = {
    ...current,
    tasks: [], taskIds: ["health-1"], deletedTaskIds: ["health-1"], deletedTaskUpdatedAt: {}
  };
  const ignored = mergePrivateModuleData(current, staleCache);
  assert.equal(ignored.tasks.some((task) => task.title === "Consulta actualizada"), true);
  assert.deepEqual(ignored.deletedTaskIds, []);

  const olderVersionedDeletion = { ...staleCache, deletedTaskUpdatedAt: { "health-1": 400 } };
  const preserved = mergePrivateModuleData(current, olderVersionedDeletion);
  assert.equal(preserved.tasks.some((task) => task.id === "health-1"), true);
  assert.deepEqual(preserved.deletedTaskIds, []);
});

test("migration versions legacy tombstones and preserves a later private edit", () => {
  const moduleSpecs = [
    { id: "box_salud", name: "SALUD Y CITAS", order: 1 },
    { id: "box_gastos", name: "GASTOS RELACIONADOS CON LEAH", order: 2 }
  ];
  const sharedPayload = {
    boxes: [{ id: "box_salud", name: "SALUD Y CITAS" }, { id: "box_gastos", name: "GASTOS RELACIONADOS CON LEAH" }],
    tasks: [], deletedTaskIds: ["health-deleted"], deletedBoxIds: [], updatedAt: 100
  };
  const existingModules = moduleSpecs.map((module) => ({
    moduleId: module.id, box: null, tasks: [], taskIds: module.id === "box_salud" ? ["health-deleted"] : [],
    deletedTaskIds: [], deletedTaskUpdatedAt: {}, deletedBoxIds: [], deletedBoxUpdatedAt: {}, updatedAt: 50
  }));
  const localData = {
    ...sharedPayload,
    tasks: [{ id: "health-deleted", boxId: "box_salud", title: "Edición adulta posterior", updatedAt: 150 }],
    deletedTaskIds: []
  };
  const plan = preparePrivateModuleMigration({
    sharedPayload, existingModules, localData, taskMemory: {}, moduleSpecs
  });
  const health = plan.modules.find((module) => module.moduleId === "box_salud");
  assert.deepEqual(health.deletedTaskIds, []);
  assert.equal(health.tasks.find((task) => task.id === "health-deleted").title, "Edición adulta posterior");
  assert.equal(Object.hasOwn(plan.sanitizedSharedPayload, "deletedTaskUpdatedAt"), true);
  assert.deepEqual(plan.sanitizedSharedPayload.deletedTaskUpdatedAt, {});
});

test("attaching private modules restores adult-only modules without mixing them into shared data", () => {
  const health = moduleDataFromWorkspace(base, "box_salud", ["health-deleted"]);
  const expenses = moduleDataFromWorkspace(base, "box_gastos");
  const shared = buildSharedWorkspacePayload(base, [health, expenses]);
  const hydrated = attachPrivateModulesToWorkspace(shared, [health, expenses]);

  assert.equal(hydrated.boxes.length, 3);
  assert.equal(hydrated.tasks.length, 3);
  assert.equal(hydrated.tasks.some((task) => task.title === "Pago de terapia"), true);
  assert.equal(hydrated.deletedTaskIds.includes("health-deleted"), true);
  assert.deepEqual(hydrated.taskMemoryByBox["box_mem_SALUD Y CITAS"], ["Pediatría"]);
  assert.deepEqual(hydrated.taskMemoryByBox["box_mem_GASTOS RELACIONADOS CON LEAH"], ["Recibo"]);
  assert.deepEqual(hydrated.dismissedTaskSuggestionsByBox["box_mem_SALUD Y CITAS"], ["Control médico"]);
  assert.deepEqual(hydrated.dismissedTaskSuggestionsByBox["box_mem_GASTOS RELACIONADOS CON LEAH"], ["Pago mensual"]);
});
