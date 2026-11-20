import assert from "node:assert/strict";
import test from "node:test";
import {
  attachPrivateModulesToWorkspace,
  buildSharedWorkspacePayload,
  mergePrivateModuleData,
  moduleDataFromWorkspace
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
  taskMemoryByBox: {
    box_escolar: ["Leer"],
    box_salud: ["Pediatría"],
    box_gastos: ["Recibo"]
  },
  dismissedTaskSuggestionsByBox: {
    box_salud: ["Control médico"],
    box_gastos: ["Pago mensual"]
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
    { id: "health-event", taskId: "health-1", title: "Cita médica" },
    { id: "expense-event", taskId: "expense-1", title: "Pago de terapia" }
  ],
  updatedAt: 10
};

test("shared payload excludes private boxes, tasks, tombstones and related metadata", () => {
  const health = moduleDataFromWorkspace(base, "box_salud", ["health-deleted"]);
  const expenses = moduleDataFromWorkspace(base, "box_gastos");
  const shared = buildSharedWorkspacePayload(base, [health, expenses]);

  assert.deepEqual(shared.boxes.map((box) => box.id), ["box_escolar"]);
  assert.deepEqual(shared.tasks.map((task) => task.id), ["school-1"]);
  assert.deepEqual(shared.deletedTaskIds, ["school-deleted"]);
  assert.deepEqual(shared.deletedBoxIds, []);
  assert.deepEqual(Object.keys(shared.taskMemoryByBox), ["box_escolar"]);
  assert.deepEqual(Object.keys(shared.dismissedTaskSuggestionsByBox), []);
  assert.deepEqual(Object.keys(shared.focusPlan.byBox), ["box_escolar"]);
  assert.deepEqual(shared.completionLog.map((entry) => entry.taskId), ["school-1"]);
  assert.equal(Object.hasOwn(shared, "history"), false);
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

test("attaching private modules restores adult-only modules without mixing them into shared data", () => {
  const health = moduleDataFromWorkspace(base, "box_salud", ["health-deleted"]);
  const expenses = moduleDataFromWorkspace(base, "box_gastos");
  const shared = buildSharedWorkspacePayload(base, [health, expenses]);
  const hydrated = attachPrivateModulesToWorkspace(shared, [health, expenses]);

  assert.equal(hydrated.boxes.length, 3);
  assert.equal(hydrated.tasks.length, 3);
  assert.equal(hydrated.tasks.some((task) => task.title === "Pago de terapia"), true);
  assert.equal(hydrated.deletedTaskIds.includes("health-deleted"), true);
});
