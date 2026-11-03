# Firestore rules upgrade required for Tasky sync protocol v2

Tasky now writes the Firestore document with a top-level integer field:

```json
{
  "protocolVersion": 2
}
```

The application also uses Firestore's atomic `documents:commit` endpoint with an `updateTime` precondition. This prevents a new client from replacing a document revision it did not read.

## Why the server rule is still required

A previously installed APK or cached JavaScript bundle can still send the old unconditional `PATCH` request. Client code cannot protect a write sent by an older client. The Firestore Security Rules for the production Tasky document must also reject writes that do not carry protocol version 2.

The repository's `main` branch contains no production Firestore Security Rules file. This PR deliberately does not invent or deploy a replacement ruleset.

## Required production rule change

In the existing rules for `/tasky_sync/{documentId}`, require this condition on both `create` and `update`:

```text
request.resource.data.get('protocolVersion', 0) == 2
```

Combine it with the current authorization condition for the document. Keep existing read permissions and any other required paths unchanged.

**Important:** Firestore Security Rules grants are combined with OR semantics. A new restrictive match does not override an existing broad `allow write: if true` (or another overlapping rule that grants access). The existing broad write grant for this path must be removed or narrowed as part of the same rules change. Review the complete current ruleset before deploying. See the official Firebase documentation on [rule evaluation](https://firebase.google.com/docs/rules/rules-behavior) and [validating incoming document fields](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Isolated emulator configuration

- `firebase.emulator.json` is the only config that points to `firestore.emulator.rules`.
- `firebase.json` intentionally does not declare a Firestore rules file, so test-only rules are not selected by the normal production deploy configuration.
- Emulator rules apply only to `sync_safety_test/{documentId}`, require `protocolVersion == 2` on create/update, and are not production rules.

The CI integration test checks both sides:
1. A new protocol-v2 client can create and write with a matching `updateTime`.
2. A simulated old APK that sends a blind update without `protocolVersion` receives `PERMISSION_DENIED` and cannot change the document.
3. A new client with a stale `updateTime` is rejected, then succeeds after it rereads and reconciles.

Do not merge this PR for production rollout until the actual current production rules have been amended and reviewed to enforce the protocol field, and the Web/Android flow has been functionally tested against an isolated document.
