import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
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

    await setDoc(doc(db, "workspaces/jose/shared/main"), { payloadJson: "{}" });
    await setDoc(doc(db, "workspaces/camila/shared/main"), { payloadJson: "{}" });
    await setDoc(doc(db, "workspaces/leah/shared/main"), { payloadJson: "{}" });
    await setDoc(doc(db, "workspaces/leah/access_control/private_modules"), {
      ready: true,
      schemaVersion: 1
    });
    await setDoc(doc(db, "workspaces/leah/adult_private/health"), { notes: "private test data" });
    await setDoc(doc(db, "workspaces/leah/adult_private/expenses"), { total: 120 });
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
  await assertSucceeds(setDoc(doc(db, "workspaces/jose/shared/main"), { payloadJson: "jose update" }));
  await assertSucceeds(getDoc(doc(db, "workspaces/leah/shared/main")));
  await assertSucceeds(setDoc(doc(db, "workspaces/leah/shared/main"), { payloadJson: "guardian update" }));
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
    payloadJson: JSON.stringify({ appointments: [] })
  }));
  await assertSucceeds(setDoc(doc(guardian, "workspaces/leah/adult_private/expenses"), {
    payloadJson: JSON.stringify({ items: [] })
  }));

  await assertSucceeds(getDoc(doc(child, "workspaces/leah/shared/main")));
  await assertFails(getDoc(doc(child, "workspaces/leah/adult_private/health")));
  await assertFails(getDoc(doc(child, "workspaces/leah/adult_private/expenses")));
  await assertFails(setDoc(doc(child, "workspaces/leah/adult_private/health"), { payloadJson: "child access denied" }));
  await assertFails(setDoc(doc(child, "workspaces/leah/adult_private/expenses"), { payloadJson: "child access denied" }));
  await assertFails(setDoc(doc(child, "workspaces/leah/shared/main"), { payloadJson: "child overwrite" }));
  await assertFails(deleteDoc(doc(child, "workspaces/leah/shared/main")));
});

test("Leah can submit a new task and a completion request, but cannot approve or delete requests", async () => {
  const db = env.authenticatedContext("leah").firestore();
  const newTaskRef = doc(db, "workspaces/leah/task_requests/leah-new-task");
  const completionRef = doc(db, "workspaces/leah/task_requests/leah-completion");

  await assertSucceeds(setDoc(newTaskRef, {
    type: "new_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    title: "Prepare science poster",
    description: "Bring the materials",
    module: "box_escolar",
    scheduledDate: "2026-11-20",
    deadlineDate: "2026-11-23",
    priority: "normal"
  }));

  await assertSucceeds(setDoc(completionRef, {
    type: "completion",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    relatedTaskId: "adult-created-task"
  }));

  await assertFails(updateDoc(newTaskRef, {
    status: "approved",
    reviewedBy: "leah",
    reviewedAt: new Date(),
    reviewNote: "",
    createdTaskId: "task_child_cannot_create"
  }));
  await assertFails(deleteDoc(doc(db, "workspaces/leah/task_requests/seed")));

  const guardian = env.authenticatedContext("jose").firestore();
  const requestRef = doc(guardian, "workspaces/leah/task_requests/leah-new-task");
  await assertSucceeds(updateDoc(requestRef, {
    status: "approved",
    reviewedBy: "jose",
    reviewedAt: new Date(),
    reviewNote: "Aprobada por un adulto.",
    createdTaskId: "task_approved_request"
  }));
  await assertFails(updateDoc(requestRef, { title: "Intento de alterar la solicitud original" }));
});

test("Leah cannot create malformed requests or impersonate another user", async () => {
  const db = env.authenticatedContext("leah").firestore();

  await assertFails(setDoc(doc(db, "workspaces/leah/task_requests/fake-author"), {
    type: "new_task",
    createdBy: "jose",
    createdAt: new Date(),
    status: "pending",
    title: "Impersonated",
    module: "box_escolar"
  }));

  await assertFails(setDoc(doc(db, "workspaces/leah/task_requests/invalid-status"), {
    type: "new_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "approved",
    title: "Skip adult review",
    module: "box_escolar"
  }));

  await assertFails(setDoc(doc(db, "workspaces/leah/task_requests/invalid-type"), {
    type: "delete_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    title: "Try to delete"
  }));

  await assertFails(setDoc(doc(db, "workspaces/leah/task_requests/extra-field"), {
    type: "new_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    title: "Unexpected key",
    module: "box_escolar",
    ownerOverride: true
  }));

  await assertFails(setDoc(doc(db, "workspaces/leah/task_requests/private-module"), {
    type: "new_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    title: "Private information request",
    module: "box_salud"
  }));

  await assertFails(setDoc(doc(db, "workspaces/leah/task_requests/long-description"), {
    type: "new_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    title: "Valid title",
    description: "x".repeat(501),
    module: "box_escolar"
  }));
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


test("a guardian can atomically approve a task request and add the task to Leah's shared board", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "workspaces/leah/shared/main"), {
      payloadJson: JSON.stringify({
        boxes: [{ id: "box_escolar", name: "ESCOLAR" }],
        tasks: [],
        updatedAt: 1
      }),
      updatedAt: 1,
      deviceId: "emulator-seed"
    });
  });

  const child = env.authenticatedContext("leah").firestore();
  const requestRef = doc(child, "workspaces/leah/task_requests/atomic-approval-test");
  await assertSucceeds(setDoc(requestRef, {
    type: "new_task",
    createdBy: "leah",
    createdAt: new Date(),
    status: "pending",
    title: "Preparar una maqueta",
    description: "Llevar cartulina",
    module: "box_escolar",
    scheduledDate: "2026-11-21",
    deadlineDate: "",
    priority: "normal"
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
    const taskId = "task_atomic_approval";
    payload.tasks.push({
      id: taskId,
      boxId: "box_escolar",
      title: requestSnapshot.data().title,
      done: false,
      createdAt: Date.now(),
      dueDate: requestSnapshot.data().scheduledDate,
      frequency: "once",
      repeatDays: [],
      order: 0
    });
    payload.updatedAt = 2;
    payload.deviceId = "guardian-approval-test";
    transaction.update(sharedRef, {
      payloadJson: JSON.stringify(payload),
      updatedAt: 2,
      deviceId: "guardian-approval-test"
    });
    transaction.update(doc(guardian, "workspaces/leah/task_requests/atomic-approval-test"), {
      status: "approved",
      reviewedBy: "jose",
      reviewedAt: new Date(),
      reviewNote: "",
      createdTaskId: taskId
    });
  }));

  const approvedRequest = await assertSucceeds(getDoc(doc(guardian, "workspaces/leah/task_requests/atomic-approval-test")));
  const updatedBoard = await assertSucceeds(getDoc(sharedRef));
  assert.equal(approvedRequest.data().status, "approved");
  assert.equal(approvedRequest.data().createdTaskId, "task_atomic_approval");
  const payload = JSON.parse(updatedBoard.data().payloadJson);
  assert.equal(payload.tasks.length, 1);
  assert.equal(payload.tasks[0].title, "Preparar una maqueta");
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

test("an enabled child membership is still blocked until private-module migration is complete", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "user_access/child-before-migration/workspaces/leah"), {
      active: true,
      role: "child",
      workspaceId: "leah",
      childAccessEnabled: true,
      displayName: "Tasky Leah"
    });
  });

  const child = env.authenticatedContext("child-before-migration").firestore();
  await assertFails(getDoc(doc(child, "workspaces/leah/shared/main")));
  await assertFails(getDoc(doc(child, "workspaces/leah/task_requests/seed")));
});

test("Leah's child workspace access stays disabled until private module data is separated", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "user_access/child-paused/workspaces/leah"), {
      active: true,
      role: "child",
      workspaceId: "leah",
      childAccessEnabled: false,
      displayName: "Tasky Leah"
    });
  });
  const db = env.authenticatedContext("child-paused").firestore();
  await assertFails(getDoc(doc(db, "workspaces/leah/shared/main")));
  await assertFails(getDoc(doc(db, "workspaces/leah/task_requests/seed")));
});
