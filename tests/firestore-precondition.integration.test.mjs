import test from "node:test";
import assert from "node:assert/strict";

const projectId = process.env.GCLOUD_PROJECT || "demo-tasky-safety";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const documentUrl =
  "http://" + emulatorHost +
  "/v1/projects/" + projectId +
  "/databases/(default)/documents/sync_safety_test/conditional_write_guard";

async function parseResponse(response) {
  const raw = await response.text();
  let json = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { raw };
  }
  return { response, json };
}


async function patchLegacyDocument(payload) {
  const response = await fetch(documentUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        payloadJson: { stringValue: JSON.stringify(payload) }
      }
    })
  });
  return parseResponse(response);
}

async function readDocument() {
  const response = await fetch(documentUrl, { cache: "no-store" });
  return parseResponse(response);
}

async function deleteDocument() {
  await fetch(documentUrl, { method: "DELETE" }).catch(() => {});
}

async function commitDocument(precondition, payload) {
  const response = await fetch(
    "http://" + emulatorHost +
      "/v1/projects/" + projectId +
      "/databases/(default)/documents:commit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{
          update: {
            name: "projects/" + projectId +
              "/databases/(default)/documents/sync_safety_test/conditional_write_guard",
            fields: {
              payloadJson: { stringValue: JSON.stringify(payload) },
              protocolVersion: { integerValue: "2" }
            }
          },
          currentDocument: precondition
        }]
      })
    }
  );
  return parseResponse(response);
}

test("Firestore Commit REST enforces exists=false and updateTime before accepting writes", async t => {
  await deleteDocument();
  t.after(deleteDocument);

  // A missing document can only be created using the explicit create-if-absent guard.
  const missingCreate = await commitDocument(
    { exists: false },
    { version: 1, source: "device-A" }
  );
  assert.equal(missingCreate.response.ok, true, JSON.stringify(missingCreate.json));

  // Simulate an older APK: blind PATCH with no updateTime and no protocol marker.
  // Firestore Security Rules must reject it before it can overwrite the new document.
  const legacyWrite = await patchLegacyDocument({
    version: 999,
    source: "legacy-apk-with-stale-cache"
  });
  assert.equal(legacyWrite.response.ok, false, JSON.stringify(legacyWrite.json));
  assert.equal(legacyWrite.json.error && legacyWrite.json.error.status, "PERMISSION_DENIED");

  const afterLegacyRead = await readDocument();
  assert.equal(afterLegacyRead.response.ok, true);
  assert.equal(afterLegacyRead.json.fields.payloadJson.stringValue,
    JSON.stringify({ version: 1, source: "device-A" }));

  const firstRead = await readDocument();
  assert.equal(firstRead.response.ok, true);
  const firstUpdateTime = firstRead.json.updateTime;
  assert.equal(typeof firstUpdateTime, "string");
  assert.ok(firstUpdateTime.length > 0);

  // Two devices read the same revision. The first write wins.
  const deviceAWrite = await commitDocument(
    { updateTime: firstUpdateTime },
    { version: 2, source: "device-A" }
  );
  assert.equal(deviceAWrite.response.ok, true, JSON.stringify(deviceAWrite.json));
  const deviceAUpdateTime = deviceAWrite.json.writeResults &&
    deviceAWrite.json.writeResults[0] && deviceAWrite.json.writeResults[0].updateTime;
  assert.equal(typeof deviceAUpdateTime, "string");
  assert.ok(deviceAUpdateTime);

  // Device B tries the same stale revision. Firestore must reject it.
  const deviceBStaleWrite = await commitDocument(
    { updateTime: firstUpdateTime },
    { version: 999, source: "stale-device-B" }
  );
  assert.equal(deviceBStaleWrite.response.ok, false);
  const failureStatus = String(
    deviceBStaleWrite.json && deviceBStaleWrite.json.error &&
    deviceBStaleWrite.json.error.status || ""
  );
  assert.match(
    failureStatus,
    /FAILED_PRECONDITION|ABORTED/,
    JSON.stringify(deviceBStaleWrite.json)
  );

  // The stale write must not have changed the document.
  const afterConflictRead = await readDocument();
  assert.equal(afterConflictRead.response.ok, true);
  assert.equal(afterConflictRead.json.fields.payloadJson.stringValue,
    JSON.stringify({ version: 2, source: "device-A" }));

  // Device B must re-read and use the new revision before retrying.
  const deviceBReconciledWrite = await commitDocument(
    { updateTime: afterConflictRead.json.updateTime },
    { version: 3, source: "device-B-after-reconciliation" }
  );
  assert.equal(deviceBReconciledWrite.response.ok, true,
    JSON.stringify(deviceBReconciledWrite.json));
  assert.equal(typeof (deviceBReconciledWrite.json.writeResults &&
    deviceBReconciledWrite.json.writeResults[0] &&
    deviceBReconciledWrite.json.writeResults[0].updateTime), "string");

  // exists=false must not replace an already existing document.
  const forbiddenRescueOverwrite = await commitDocument(
    { exists: false },
    { version: 1000, source: "rescue-must-not-overwrite" }
  );
  assert.equal(forbiddenRescueOverwrite.response.ok, false);

  const finalRead = await readDocument();
  assert.equal(finalRead.response.ok, true);
  assert.equal(finalRead.json.fields.payloadJson.stringValue,
    JSON.stringify({ version: 3, source: "device-B-after-reconciliation" }));
});
