import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("new family workspaces start with a zero completed-task baseline", () => {
  const factory = appSource.match(/function buildEmptyWorkspaceDataset\(workspaceId\) \{([\s\S]*?)\n  \}/);
  assert.ok(factory, "buildEmptyWorkspaceDataset must exist");
  assert.match(factory[1], /monthlyCompletedBase:\s*0/);
});

test("compact workspace sync preserves an explicit zero completion baseline", () => {
  assert.match(appSource, /m:\s*Number\(d\.monthlyCompletedBase\s*\?\?\s*66\)/);
  assert.match(appSource, /monthlyCompletedBase:\s*Number\(parsed\.m\s*\?\?\s*66\)/);
});

test("dashboard metrics and rollover do not replace a zero baseline with the legacy value", () => {
  assert.match(appSource, /appState\.data\.monthlyCompletedBase\s*=\s*\(appState\.data\.monthlyCompletedBase\s*\?\?\s*66\)\s*\+\s*1/);
  assert.equal((appSource.match(/monthlyCompletedBase\s*\|\|\s*66/g) || []).length, 0);
  assert.match(appSource, /const monthlyTotal = \(appState\.data\.monthlyCompletedBase\s*\?\?\s*66\) \+ totalDoneNow/);
  assert.match(appSource, /const monthlyTotal = \(appState\.data\.monthlyCompletedBase\s*\?\?\s*66\) \+ tasks\.filter\(t => t\.done\)\.length/);
});
