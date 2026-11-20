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
  cams: { email: "cams.tasky@example.test", password: "Cams-Tasky-Emulator-2026!" },
  leah: { email: "leah.tasky@example.test", password: "Leah-Tasky-Emulator-2026!" }
};

let testEnvironment;
let browser;
let server;
let baseUrl;
let joseUid;
let camsUid;
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
    const displayName = workspaceId === "jose" ? "José Carranza" : workspaceId === "camila" ? "Camila" : "Leah";
    await setDoc(doc(context.firestore(), "user_access", uid, "workspaces", workspaceId), {
      active: true,
      role,
      workspaceId,
      displayName,
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

async function selectProfile(page, workspaceId) {
  await page.locator("#tasky-profile-select").selectOption(workspaceId);
  assert.equal(await page.locator("#tasky-profile-select").inputValue(), workspaceId);
  await page.locator("#tasky-login-form:not([hidden])").waitFor({ state: "visible" });
}

async function login(page, user) {
  await page.locator("#tasky-login-email").fill(user.email);
  await page.locator("#tasky-login-password").fill(user.password);
  await page.locator("#tasky-login-submit").click();
}

async function assertWorkspace(page, workspaceId, expectedRole, expectedName) {
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.taskyWorkspace === expected,
    workspaceId,
    { timeout: 15000 }
  );
  assert.equal(await page.locator("html").getAttribute("data-tasky-role"), expectedRole);
  assert.equal(await page.locator("#tasky-test-result").innerText(), expectedName + " · " + expectedRole);
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules }
  });

  joseUid = await createEmulatorUser(users.jose);
  camsUid = await createEmulatorUser(users.cams);
  leahUid = await createEmulatorUser(users.leah);

  await seedMembership(joseUid, "jose", "owner");
  await seedMembership(joseUid, "leah", "guardian");
  await seedMembership(camsUid, "camila", "owner");
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

test("el formulario único muestra el desplegable de perfiles y credenciales", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await page.locator("#tasky-profile-picker:not([hidden])").waitFor({ state: "visible" });
    await page.locator("#tasky-login-form:not([hidden])").waitFor({ state: "visible" });
    assert.deepEqual(await page.locator("#tasky-profile-select option").evaluateAll((options) => options.map((option) => option.value)), ["", "jose", "camila", "leah"]);
    assert.equal(await page.locator("#tasky-login-email").isVisible(), true);
    assert.equal(await page.locator("#tasky-login-password").isVisible(), true);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("José elige su perfil, inicia sesión y entra a Tasky José", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await selectProfile(page, "jose");
    await login(page, users.jose);
    await assertWorkspace(page, "jose", "owner", "Tasky José");
    assert.equal(await page.locator("#tasky-test-greeting").innerText(), "José Carranza");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("Cams elige su perfil, inicia sesión y entra a Tasky Cams", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await selectProfile(page, "camila");
    await login(page, users.cams);
    await assertWorkspace(page, "camila", "owner", "Tasky Cams");
    assert.equal(await page.locator("#tasky-test-greeting").innerText(), "Camila");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("José puede elegir Tasky Leah e ingresar como adulto responsable", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await selectProfile(page, "leah");
    await login(page, users.jose);
    await assertWorkspace(page, "leah", "guardian", "Tasky Leah");
    assert.equal(await page.locator("#tasky-test-greeting").innerText(), "Leah");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("la cuenta infantil de Leah no entra mientras el acceso siga deshabilitado", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await selectProfile(page, "leah");
    await login(page, users.leah);
    await page.waitForFunction(() => document.querySelector("#tasky-auth-message")?.textContent.includes("Esta cuenta no tiene autorización para entrar a Tasky Leah."));
    assert.equal(await page.locator("html").getAttribute("data-tasky-workspace"), null);
    assert.equal(await page.locator("#tasky-profile-picker:not([hidden])").count(), 0);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("una cuenta no puede entrar a un perfil que no tiene asignado", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await selectProfile(page, "jose");
    await login(page, users.cams);
    await page.waitForFunction(() => document.querySelector("#tasky-auth-message")?.textContent.includes("Esta cuenta no tiene autorización para entrar a Tasky José."));
    assert.equal(await page.locator("html").getAttribute("data-tasky-workspace"), null);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});
