import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

const projectId = "demo-tasky-auth";
const apiKey = "tasky-emulator-api-key";
const authEmulator = "http://127.0.0.1:9099";
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
const users = {
  jose: { email: "jose.tasky@example.test", password: "Jose-Tasky-Emulator-2026!" },
  leah: { email: "leah.tasky@example.test", password: "Leah-Tasky-Emulator-2026!" }
};

let testEnvironment;
let browser;
let server;
let baseUrl;
let joseUid;
let leahUid;

async function createEmulatorUser({ email, password }) {
  const response = await fetch(
    authEmulator + "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );
  const result = await response.json();
  if (!response.ok || !result.localId) {
    throw new Error("No se pudo crear el usuario ficticio en Auth Emulator: " + JSON.stringify(result));
  }
  return result.localId;
}

async function seedMembership(uid, workspaceId, role, extra = {}) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "user_access", uid, "workspaces", workspaceId), {
      active: true,
      role,
      workspaceId,
      displayName: workspaceId === "jose" ? "Tasky José" : "Tasky Leah",
      ...extra
    });
  });
}

function startStaticServer() {
  return new Promise((resolveServer, reject) => {
    server = createServer(async (request, response) => {
      try {
        if (!["GET", "HEAD"].includes(request.method || "GET")) {
          response.writeHead(405).end();
          return;
        }
        const pathname = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname);
        const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
        const filePath = resolve(rootDir, relativePath);
        if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
          response.writeHead(403).end();
          return;
        }
        const body = await readFile(filePath);
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".json": "application/json; charset=utf-8"
        };
        response.writeHead(200, {
          "Content-Type": types[extname(filePath)] || "application/octet-stream",
          "Cache-Control": "no-store"
        });
        response.end(request.method === "HEAD" ? undefined : body);
      } catch (error) {
        response.writeHead(404).end("Not found");
      }
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("No se pudo iniciar el servidor local de pruebas."));
        return;
      }
      baseUrl = "http://127.0.0.1:" + address.port;
      resolveServer();
    });
  });
}

async function openLoginPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const forbiddenProductionRequests = [];
  for (const host of ["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"]) {
    await page.route("https://" + host + "/**", async (route) => {
      forbiddenProductionRequests.push(route.request().url());
      await route.abort();
    });
  }
  await page.goto(baseUrl + "/tests/tasky-auth-emulator.html");
  return { context, page, forbiddenProductionRequests };
}

async function login(page, user) {
  await page.locator("#tasky-login-email").fill(user.email);
  await page.locator("#tasky-login-password").fill(user.password);
  await page.locator("#tasky-login-submit").click();
}

async function selectWorkspace(page, workspaceId, expectedRole) {
  await page.locator('[data-workspace="' + workspaceId + '"]').waitFor({ state: "visible" });
  await Promise.all([
    page.waitForFunction(
      (expected) => document.documentElement.dataset.taskyWorkspace === expected,
      workspaceId,
      { timeout: 15000 }
    ),
    page.locator('[data-workspace="' + workspaceId + '"]').click()
  ]);
  assert.equal(await page.locator("html").getAttribute("data-tasky-role"), expectedRole);
  assert.equal(await page.locator("#tasky-test-result").innerText(), (workspaceId === "jose" ? "Tasky José" : "Tasky Leah") + " · " + expectedRole);
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules }
  });

  joseUid = await createEmulatorUser(users.jose);
  leahUid = await createEmulatorUser(users.leah);

  await seedMembership(joseUid, "jose", "owner");
  await seedMembership(joseUid, "leah", "guardian");
  // Leah's account exists, but child access deliberately remains disabled for this test.
  await seedMembership(leahUid, "leah", "child", { childAccessEnabled: false });

  await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  if (testEnvironment) await testEnvironment.cleanup();
});

test("José inicia sesión y entra a su espacio privado Tasky José", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.jose);
    await page.locator('[data-workspace="jose"]').waitFor({ state: "visible" });
    await page.locator('[data-workspace="leah"]').waitFor({ state: "visible" });
    await selectWorkspace(page, "jose", "owner");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("José entra a Tasky Leah con el rol de adulto responsable", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.jose);
    await page.locator('[data-workspace="leah"]').waitFor({ state: "visible" });
    await selectWorkspace(page, "leah", "guardian");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("la cuenta infantil de Leah no entra mientras el acceso siga deshabilitado", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.leah);
    await page.locator("#tasky-workspace-picker:not([hidden])").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector("#tasky-auth-message")?.textContent.includes("Esta cuenta inició sesión, pero todavía no tiene espacios habilitados."));
    assert.equal(await page.locator('[data-workspace="leah"]').count(), 0);
    assert.equal(await page.locator("html").getAttribute("data-tasky-workspace"), null);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});
