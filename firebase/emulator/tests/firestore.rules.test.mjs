import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  attachPrivateModulesToWorkspace,
  preparePrivateModuleMigration,
  validateCompletedPrivateModuleSet
} from "../../../tasky-private-data.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  runTransaction
} from "firebase/firestore";

const projectId = "demo-tasky-rules";
const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules }
  });

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const memberships = [
      ["jose", "jose", "owner"],
      ["jose", "leah", "guardian"],
      ["camila", "camila", "owner"],
      ["camila", "leah", "guardian"],
      ["leah", "leah", "child"]
    ];

    for (const [uid, workspaceId, role] of memberships) {
      await setDoc(doc(db, `user_access/${uid}/workspaces/${workspaceId}`), {
        active: true,
        role,
        workspaceId,
        ...(role === "child" ? { childAccessEnabled: true } : {}),
        displayName: `Tasky ${workspaceId}`
      });
    }

    await setDoc(doc(db, "workspaces/jose/shared/main"), { payloadJson: "{}", protocolVersion: 2 });
    await setDoc(doc(db, "workspaces/camila/shared/main"), { payloadJson: "{}", protocolVersion: 2 });
    await setDoc(doc(db, "workspaces/leah/shared/main"), { payloadJson: "{}", protocolVersion: 2 });
    await setDoc(doc(db, "workspaces/leah/access_control/private_modules"), {
      ready: true,
      schemaVersion: 1
    });
    await setDoc(doc(db, "workspaces/leah/adult_private/health"), {
      moduleId: "box_salud", schemaVersion: 1,
      payloadJson: JSON.stringify({ moduleId: "box_salud", box: { id: "box_salud" }, tasks: [], taskIds: [], deletedTaskIds: [], deletedBoxIds: [] })
    });
    await setDoc(doc(db, "workspaces/leah/adult_private/expenses"), {
      moduleId: "box_gastos", schemaVersion: 1,
      payloadJson: JSON.stringify({ moduleId: "box_gastos", box: { id: "box_gastos" }, tasks: [], taskIds: [], deletedTaskIds: [], deletedBoxIds: [] })
    });
    await setDoc(doc(db, "workspaces/leah/task_requests/seed"), {
      type: "new_task",
      createdBy: "leah",
      createdAt: new Date(),
      status: "pending",
      title: "Read a chapter",
      module: "box_escolar"
    });
  });
});

after(async () => {
  if (env) await env.cleanup();
});

test("unauthenticated visitors cannot read or write workspace data", async () => {
  const db = env.unauthenticatedContext().firestore();

  await assertFails(getDoc(doc(db, "workspaces/leah/shared/main")));
  await assertFails(setDoc(doc(db, "workspaces/leah/shared/attacker"), { payloadJson: "{}" }));
  await assertFails(getDoc(doc(db, "user_access/jose/workspaces/jose")));
});

test("users can list only their own workspace memberships", async () => {
  const jose = env.authenticatedContext("jose").firestore();
  const visitor = env.authenticatedContext("intruder").firestore();

  const ownMemberships = await assertSucceeds(getDocs(collection(jose, "user_access/jose/workspaces")));
  assert.equal(ownMemberships.size, 2);
  await assertFails(getDoc(doc(jose, "user_access/camila/workspaces/camila")));
  await assertFails(getDocs(collection(visitor, "user_access/jose/workspaces")));
});

test("José can access José and Leah, but not Camila", async () => {
  const db = env.authenticatedContext("jose").firestore();

  await assertSucceeds(getDoc(doc(db, "workspaces/jose/shared/main")));
  await assertSucceeds(setDoc(doc(db, "workspaces/jose/shared/main"), { payloadJson: "jose update", protocolVersion: 2 }));
  await assertFails(setDoc(doc(db, "workspaces/jose/shared/main"), { payloadJson: "unversioned overwrite" }));
  await assertSucceeds(getDoc(doc(db, "workspaces/leah/shared/main")));
  await assertSucceeds(setDoc(doc(db, "workspaces/leah/shared/main"), { payloadJson: "guardian update", protocolVersion: 2 }));
  await assertFails(getDoc(doc(db, "workspaces/camila/shared/main")));
  await assertFails(setDoc(doc(db, "workspaces/camila/shared/main"), { payloadJson: "forbidden" }));
});

test("Camila can access Camila and Leah, but not José", async () => {
  const db = env.authenticatedContext("camila").firestore();

  await assertSucceeds(getDoc(doc(db, "workspaces/camila/shared/main")));
  await assertSucceeds(getDoc(doc(db, "workspaces/leah/shared/main")));
  await assertFails(getDoc(doc(db, "workspaces/jose/shared/main")));
  await assertFails(setDoc(doc(db, "workspaces/jose/shared/main"), { payloadJson: "forbidden" }));
});

test("adult guardians can read and write private health and expense documents; Leah cannot", async () => {
  const guardian = env.authenticatedContext("jose").firestore();
  const child = env.authenticatedContext("leah").firestore();

  await assertSucceeds(getDoc(doc(guardian, "workspaces/leah/adult_private/health")));
  await assertSucceeds(getDoc(doc(guardian, "workspaces/leah/adult_private/expenses")));
  await assertSucceeds(setDoc(doc(guardian, "workspaces/leah/adult_private/health"), {
    moduleId: "box_salud", schemaVersion: 1,
    payloadJson: JSON.stringify({ moduleId: "box_salud", box: { id: "box_salud" }, tasks: [], taskIds: [], deletedTaskIds: [], deletedBoxIds: [], appointments: [] })
  }));
  await assertSucceeds(setDoc(doc(guardian, "workspaces/leah/adult_private/expenses"), {
    moduleId: "box_gastos", schemaVersion: 1,
    payloadJson: JSON.stringify({ moduleId: "box_gastos", box: { id: "box_gastos" }, tasks: [], taskIds: [], deletedTaskIds: [], deletedBoxIds: [], items: [] })
  }));

  await assertSucceeds(getDoc(doc(child, "workspaces/leah/shared/main")));
  await assertFails(getDoc(doc(child, "workspaces/leah/adult_private/health")));
  await assertFails(getDoc(doc(child, "workspaces/leah/adult_private/expenses")));
  await assertFails(setDoc(doc(child, "workspaces/leah/adult_private/health"), { payloadJson: "child access denied" }));
  await assertFails(setDoc(doc(child, "workspaces/leah/adult_private/expenses"), { payloadJson: "child access denied" }));
  await assertFails(setDoc(doc(child, "workspaces/leah/shared/main"), { payloadJson: "child overwrite" }));
  await assertFails(deleteDoc(doc(child, "workspaces/leah/shared/main")));
});

test("Leah can create and edit her own pending tasks, but cannot delete or approve them", async () => {
  const db = env.authenticatedContext("leah").firestore();
  const taskRef = doc(db, "workspaces/leah/child_tasks/leah-owned-task");

  await assertSucceeds(setDoc(taskRef, {
    title: "Prepare science poster",
    description: "Bring the materials",
    module: "box_escolar",
    scheduledDate: "2026-11-20",
    deadlineDate: "2026-11-23",
    priority: "normal",
    createdBy: "leah",
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "pending"
  }));

  await assertSucceeds(updateDoc(taskRef, {
    title: "Prepare a science poster",
    updatedAt: new Date()
  }));

  await assertFails(deleteDoc(taskRef));

  await assertSucceeds(updateDoc(taskRef, {
    status: "awaiting_review",
    childCompletedAt: new Date(),
    updatedAt: new Date()
  }));

  await assertFails(updateDoc(taskRef, {
    status: "completed",
    completedAt: new Date(),
    reviewedBy: "leah",
    reviewedAt: new Date(),
    reviewNote: "",
    updatedAt: new Date()
  }));
  await assertFails(updateDoc(taskRef, {
    title: "Try to edit after marking it finished",
    updatedAt: new Date()
  }));
  await assertFails(deleteDoc(taskRef)); // Once submitted for review, Leah can no longer delete it.

  const guardian = env.authenticatedContext("jose").firestore();
  const guardianTaskRef = doc(guardian, "workspaces/leah/child_tasks/leah-owned-task");
  await assertSucceeds(getDoc(guardianTaskRef));
  await assertSucceeds(updateDoc(guardianTaskRef, {
    status: "completed",
    reviewedBy: "jose",
    reviewedAt: new Date(),
    reviewNote: "",
    completedAt: new Date(),
    updatedAt: new Date()
  }));
  await assertFails(updateDoc(guardianTaskRef, {
    createdBy: "camila",
    updatedAt: new Date()
  }));
  await assertSucceeds(deleteDoc(guardianTaskRef));

});

test("Leah can use custom visible modules but cannot use adult-private modules", async () => {
  const db = env.authenticatedContext("leah").firestore();
  const base = {
    title: "Practicar francés",
    description: "",
    module: "box_custom_frances",
    scheduledDate: "2026-11-22",
    deadlineDate: "",
    priority: "normal",
    createdBy: "leah",
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "pending"
  };

  await assertSucceeds(setDoc(
    doc(db, "workspaces/leah/child_tasks/custom-visible-module"),
    base
  ));
  await assertFails(setDoc(
    doc(db, "workspaces/leah/child_tasks/private-health-module"),
    { ...base, module: "box_salud" }
  ));
  await assertFails(setDoc(
    doc(db, "workspaces/leah/child_tasks/private-expenses-module"),
    { ...base, module: "box_gastos" }
  ));
});

test("Leah cannot create malformed child tasks or change ownership/status", async () => {
  const db = env.authenticatedContext("leah").firestore();
  const base = {
    title: "Valid title",
    description: "",
    module: "box_escolar",
    scheduledDate: "2026-11-20",
    deadlineDate: "",
    priority: "normal",
    createdBy: "leah",
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "pending"
  };

  await assertFails(setDoc(doc(db, "workspaces/leah/child_tasks/fake-author"), {
    ...base, createdBy: "jose"
  }));
  await assertFails(setDoc(doc(db, "workspaces/leah/child_tasks/invalid-status"), {
    ...base, status: "completed"
  }));
  await assertFails(setDoc(doc(db, "workspaces/leah/child_tasks/extra-field"), {
    ...base, ownerOverride: true
  }));
  await assertFails(setDoc(doc(db, "workspaces/leah/child_tasks/child-completes-now"), {
    ...base, done: true
  }));
  await assertFails(setDoc(doc(db, "workspaces/leah/child_tasks/private-module"), {
    ...base, module: "box_salud"
  }));
  await assertFails(setDoc(doc(db, "workspaces/leah/child_tasks/long-description"), {
    ...base, description: "x".repeat(501)
  }));

  const otherChild = env.authenticatedContext("intruder").firestore();
  await assertFails(getDoc(doc(otherChild, "workspaces/leah/child_tasks/leah-owned-task")));
});

test("Leah can send only completion requests for adult-created tasks", async () => {
  const db = env.authenticatedContext("leah").firestore();
  const completionRef = doc(db, "workspaces/leah/task_requests/leah-completion");

  await assertSucceeds(setDoc(completionRef, {
    type: "completion",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    relatedTaskId: "adult-created-task"
  }));

  await assertFails(setDoc(doc(db, "workspaces/leah/task_requests/new-task-approval"), {
    type: "new_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    title: "This should be a direct child task",
    module: "box_escolar"
  }));

  await assertFails(updateDoc(completionRef, {
    status: "approved",
    reviewedBy: "leah",
    reviewedAt: new Date(),
    reviewNote: ""
  }));
  await assertFails(deleteDoc(doc(db, "workspaces/leah/task_requests/seed")));

  const guardian = env.authenticatedContext("jose").firestore();
  const guardianRequestRef = doc(guardian, "workspaces/leah/task_requests/leah-completion");
  await assertSucceeds(updateDoc(guardianRequestRef, {
    status: "approved",
    reviewedBy: "jose",
    reviewedAt: new Date(),
    reviewNote: ""
  }));
  await assertFails(updateDoc(guardianRequestRef, { relatedTaskId: "altered" }));
});

test("only adults can create shared notifications; all members can read them", async () => {
  const jose = env.authenticatedContext("jose").firestore();
  const leah = env.authenticatedContext("leah").firestore();

  await assertSucceeds(setDoc(doc(jose, "workspaces/leah/notifications/task-added"), {
    eventType: "task_added",
    title: "Nueva tarea",
    createdAt: new Date(),
    createdBy: "jose",
    audience: "all",
    readBy: []
  }));

  await assertSucceeds(getDoc(doc(leah, "workspaces/leah/notifications/task-added")));

  await assertFails(setDoc(doc(leah, "workspaces/leah/notifications/fake-notice"), {
    eventType: "task_added",
    title: "Aviso falso",
    createdAt: new Date(),
    createdBy: "leah",
    audience: "all",
    readBy: []
  }));
});


test("a guardian can atomically approve a completion request for an adult-created task", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "workspaces/leah/shared/main"), {
      payloadJson: JSON.stringify({
        boxes: [{ id: "box_escolar", name: "ESCOLAR" }],
        tasks: [{
          id: "adult-created-task",
          boxId: "box_escolar",
          title: "Terminar una maqueta",
          done: false,
          createdAt: Date.now(),
          dueDate: "2026-11-21",
          frequency: "once",
          repeatDays: [],
          order: 0
        }],
        updatedAt: 1
      }),
      updatedAt: 1,
      deviceId: "emulator-seed",
      protocolVersion: 2
    });
  });

  const child = env.authenticatedContext("leah").firestore();
  const requestRef = doc(child, "workspaces/leah/task_requests/atomic-approval-test");
  await assertSucceeds(setDoc(requestRef, {
    type: "completion",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    relatedTaskId: "adult-created-task"
  }));

  const guardian = env.authenticatedContext("jose").firestore();
  const sharedRef = doc(guardian, "workspaces/leah/shared/main");
  await assertSucceeds(runTransaction(guardian, async (transaction) => {
    const [requestSnapshot, sharedSnapshot] = await Promise.all([
      transaction.get(doc(guardian, "workspaces/leah/task_requests/atomic-approval-test")),
      transaction.get(sharedRef)
    ]);
    assert.equal(requestSnapshot.data().status, "pending");
    const payload = JSON.parse(sharedSnapshot.data().payloadJson);
    const task = payload.tasks.find((item) => item.id === "adult-created-task");
    assert.ok(task);
    task.done = true;
    task.completedDate = "2026-11-21";
    payload.updatedAt = 2;
    payload.deviceId = "guardian-approval-test";
    transaction.update(sharedRef, {
      payloadJson: JSON.stringify(payload),
      updatedAt: 2,
      deviceId: "guardian-approval-test",
      protocolVersion: 2
    });
    transaction.update(doc(guardian, "workspaces/leah/task_requests/atomic-approval-test"), {
      status: "approved",
      reviewedBy: "jose",
      reviewedAt: new Date(),
      reviewNote: ""
    });
  }));

  const approvedRequest = await assertSucceeds(getDoc(doc(guardian, "workspaces/leah/task_requests/atomic-approval-test")));
  const updatedBoard = await assertSucceeds(getDoc(sharedRef));
  assert.equal(approvedRequest.data().status, "approved");
  const payload = JSON.parse(updatedBoard.data().payloadJson);
  assert.equal(payload.tasks.length, 1);
  assert.equal(payload.tasks[0].done, true);
});

test("only an adult can create or change workspace membership records", async () => {
  const leah = env.authenticatedContext("leah").firestore();

  await assertFails(setDoc(doc(leah, "user_access/leah/workspaces/jose"), {
    active: true,
    role: "guardian",
    workspaceId: "jose"
  }));

  await assertFails(deleteDoc(doc(leah, "user_access/leah/workspaces/leah")));
});

test("completed private migration requires both valid module documents and blocks later saves on corruption", async () => {
  const db = await env.withSecurityRulesDisabled((context) => context.firestore());
  const prefix = `workspaces/private-integrity-${Date.now()}`;
  const markerRef = doc(db, `${prefix}/access_control/private_modules`);
  const healthRef = doc(db, `${prefix}/adult_private/health`);
  const expensesRef = doc(db, `${prefix}/adult_private/expenses`);
  const workspaceId = prefix.split("/").at(-1);
  const sharedRef = doc(db, `${prefix}/shared/main`);
  const child = env.authenticatedContext("private-guard-child").fire