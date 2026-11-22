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
  leah: { email: "leah.tasky@example.test", password: "Leah-Tasky-Emulator-2026!" },
  leahDisabled: { email: "leah-disabled.tasky@example.test", password: "Leah-Disabled-Emulator-2026!" }
};

let testEnvironment;
let browser;
let server;
let baseUrl;
let joseUid;
let camsUid;
let leahUid;
let leahDisabledUid;

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

async function login(page, user) {
  await page.locator("#tasky-login-credentials:not([hidden])").waitFor({ state: "visible" });
  await page.locator("#tasky-login-email").fill(user.email);
  await page.locator("#tasky-login-password").fill(user.password);
  await page.locator("#tasky-login-submit").click();

  // A single authorized workspace enters directly. Multi-workspace accounts
  // see the picker; accounts with no access see the final authorization message.
  await page.waitForFunction(() => {
    const workspaceId = document.documentElement.dataset.taskyWorkspace || "";
    const picker = document.getElementById("tasky-profile-picker");
    const select = document.getElementById("tasky-profile-select");
    const message = document.getElementById("tasky-auth-message")?.textContent || "";
    return Boolean(
      workspaceId ||
      (picker && !picker.hidden && select && (
        select.options.length > 1 ||
        message.includes("todavía no tiene espacios autorizados") ||
        message.includes("No se pudieron verificar tus permisos") ||
        message.includes("No se pudieron cargar tus espacios")
      ))
    );
  }, null, { timeout: 15000 });
}

async function selectProfile(page, workspaceId) {
  await page.locator("#tasky-profile-select").selectOption(workspaceId);
  assert.equal(await page.locator("#tasky-profile-select").inputValue(), workspaceId);
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
  leahDisabledUid = await createEmulatorUser(users.leahDisabled);

  await seedMembership(joseUid, "jose", "owner");
  await seedMembership(joseUid, "leah", "guardian");
  await seedMembership(camsUid, "camila", "owner");
  await seedMembership(camsUid, "leah", "guardian");
  await seedMembership(leahUid, "leah", "child", { childAccessEnabled: true });
  await seedMembership(leahDisabledUid, "leah", "child", { childAccessEnabled: false });
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "workspaces/leah/access_control/private_modules"), {
      ready: true,
      schemaVersion: 1
    });
    await setDoc(doc(db, "workspaces/leah/shared/main"), {
      payloadJson: JSON.stringify({
        boxes: [
          { id: "box_escolar", name: "ESCOLAR" },
          { id: "box_custom_frances", name: "FRANCÉS" }
        ],
        tasks: [
          {
            id: "french-task-f2",
            boxId: "box_custom_frances",
            title: "Completar F2",
            description: "",
            done: false,
            dueDate: "2026-11-22",
            deadlineDate: "",
            createdAt: Date.now()
          }
        ]
      }),
      updatedAt: Date.now()
    });
  });

  await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  if (testEnvironment) await testEnvironment.cleanup();
});

test("la pantalla inicial solicita credenciales antes de mostrar espacios", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await page.locator("#tasky-login-credentials:not([hidden])").waitFor({ state: "visible" });
    assert.equal(await page.locator("#tasky-profile-picker").isVisible(), false);
    assert.equal(await page.locator("#tasky-login-email").isVisible(), true);
    assert.equal(await page.locator("#tasky-login-password").isVisible(), true);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("José solo ve José y Leah después de autenticar su cuenta", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.jose);
    assert.deepEqual(
      await page.locator("#tasky-profile-select option").evaluateAll((options) => options.map((option) => option.value)),
      ["", "jose", "leah"]
    );
    assert.equal(await page.locator("#tasky-login-email").isVisible(), false);
    await selectProfile(page, "jose");
    await assertWorkspace(page, "jose", "owner", "Tasky José");
    assert.equal(await page.locator("#tasky-test-greeting").innerText(), "José Carranza");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("Camila solo ve Cams y Leah después de autenticar su cuenta", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.cams);
    assert.deepEqual(
      await page.locator("#tasky-profile-select option").evaluateAll((options) => options.map((option) => option.value)),
      ["", "camila", "leah"]
    );
    await selectProfile(page, "camila");
    await assertWorkspace(page, "camila", "owner", "Tasky Cams");
    assert.equal(await page.locator("#tasky-test-greeting").innerText(), "Camila");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("Camila también puede seleccionar Tasky Leah como adulta responsable", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.cams);
    await selectProfile(page, "leah");
    await assertWorkspace(page, "leah", "guardian", "Tasky Leah");
    assert.equal(await page.locator("#tasky-test-greeting").innerText(), "Leah");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("José puede seleccionar Tasky Leah después de autenticar su cuenta", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.jose);
    await selectProfile(page, "leah");
    await assertWorkspace(page, "leah", "guardian", "Tasky Leah");
    assert.equal(await page.locator("#tasky-test-greeting").innerText(), "Leah");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("Leah entra automáticamente a su único espacio familiar", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.leah);
    await assertWorkspace(page, "leah", "child", "Tasky Leah");
    assert.equal(await page.locator("#tasky-profile-picker").isVisible(), false);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("Leah ve solo Entrar y Cerrar sesión al abrir su único espacio", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.leah);
    await assertWorkspace(page, "leah", "child", "Tasky Leah");

    await page.locator("#btn-tasky-account").click();
    assert.equal(await page.locator("#tasky-profile-picker").isVisible(), true);
    assert.equal(await page.locator("#tasky-profile-select").isVisible(), false);
    assert.equal(await page.locator("#tasky-profile-select-label").isVisible(), false);
    assert.equal(await page.locator("#tasky-login-submit").innerText(), "Entrar");
    assert.equal(await page.locator("#tasky-login-submit").isEnabled(), true);
    assert.equal(await page.locator("#tasky-auth-signout").isVisible(), true);

    await page.locator("#tasky-login-submit").click();
    await assertWorkspace(page, "leah", "child", "Tasky Leah");
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("the Leah task dialog does not reserve vertical space above the board", async () => {
  const indexHtml = await readFile(resolve(rootDir, "index.html"), "utf8");
  const appSource = await readFile(resolve(rootDir, "app.js"), "utf8");
  const familySource = await readFile(resolve(rootDir, "tasky-family.js"), "utf8");
  const cssSource = await readFile(resolve(rootDir, "styles.css"), "utf8");
  const panelPosition = indexHtml.indexOf('id="tasky-family-panel"');
  const boardPosition = indexHtml.indexOf('<div class="app-shell">');

  assert.ok(panelPosition >= 0 && panelPosition < boardPosition,
    "The family dialog placeholder must remain available before the board.");
  assert.match(appSource, /topActions\.insertBefore\(familyShortcut, topActions\.firstChild\)/);
  assert.match(appSource, /familyPanel\.hidden = true/);
  assert.match(familySource, /panel\.classList\.toggle\("is-open", childMode && childPanelOpen\)/);
  assert.match(cssSource, /\.tasky-family-panel\.is-child-dialog\.is-open\s*\{[\s\S]{0,500}position:\s*fixed/);
  assert.match(cssSource, /html\[data-tasky-workspace="leah"\] body\.tasky-leah-workspace \.app-shell\s*\{[\s\S]{0,220}padding-top:\s*18px\s*!important/);
});

test("Leah can use her main casilla board without writing to the shared board", async () => {
  const appSource = await readFile(resolve(rootDir, "app.js"), "utf8");
  const familySource = await readFile(resolve(rootDir, "tasky-family.js"), "utf8");
  const rulesSource = await readFile(resolve(rootDir, "firebase/firestore.rules"), "utf8");

  assert.match(appSource, /workspaceShell\.removeAttribute\("inert"\)/,
    "Leah's board must stay interactive rather than inert.");
  assert.match(appSource, /childApi\.create\(/,
    "The inline Add Task form must create a child-owned record.");
  assert.match(appSource, /childApi\.submitForReview\(/,
    "Leah's task check must submit her own task for adult review.");
  assert.match(appSource, /childApi\.requestAssignedCompletion\(/,
    "A task assigned by an adult must create a review request, not edit the shared task.");
  assert.match(appSource, /childApi\.update\(/);
  assert.doesNotMatch(appSource, /childApi\.remove\(/);
  assert.match(appSource, /tasky:child-tasks-updated/);
  assert.match(familySource, /window\.TaskyFamilyTasks\s*=\s*\{/);
  assert.match(familySource, /collection\(db, \.\.\.CHILD_TASKS_PATH\)/);
  assert.match(rulesSource, /match \/workspaces\/\{workspaceId\}\/child_tasks/);
  assert.match(rulesSource, /allow create: if workspaceId == 'leah' && isChild\(workspaceId\)/);
  assert.match(appSource, /childSyncText\.textContent = "Tareas propias activas"/);
  assert.match(appSource, /setRealtimeSyncStatus\("Tus tareas se guardan en tu espacio; el tablero familiar permanece protegido\."/,
    "Child task writes must not fall through to shared/main.");
});

test("Leah puede crear, editar y enviar a revisión sus propias tareas sin poder eliminarlas", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.leah);
    await assertWorkspace(page, "leah", "child", "Tasky Leah");
    const shortcut = page.locator("#tasky-child-tasks-shortcut");
    await shortcut.waitFor({ state: "visible" });
    assert.equal(
      await shortcut.evaluate((element) => element.parentElement.classList.contains("top-actions")),
      true,
      "Desktop Leah task shortcut must live in the top navigation."
    );
    await page.locator("#tasky-family-panel").waitFor({ state: "hidden" });

    await shortcut.click();
    const familyPanel = page.locator("#tasky-family-panel");
    await familyPanel.waitFor({ state: "visible" });
    assert.equal(await familyPanel.evaluate((element) => getComputedStyle(element).position), "fixed",
      "The task dialog must overlay the page instead of pushing the dashboard down.");

    const form = page.locator("#tasky-child-task-create-form");
    await form.waitFor({ state: "visible" });

    // The live board may contain custom child-visible modules such as French.
    await form.locator('option[value="box_custom_frances"]').waitFor({ state: "attached" });
    const assignedFrenchTask = page
      .locator("#tasky-family-assigned-tasks-list article")
      .filter({ hasText: "Completar F2" });
    await assignedFrenchTask.waitFor({ state: "visible" });
    await assignedFrenchTask.getByRole("button", { name: "Ya terminé esta tarea" }).click();
    await page
      .locator("#tasky-family-requests-list article")
      .filter({ hasText: "Confirmar: Completar F2" })
      .waitFor({ state: "visible" });

    await form.locator('input[name="title"]').fill("Practicar vocabulario de francés");
    await form.locator('select[name="module"]').selectOption("box_custom_frances");
    await form.locator('button[type="submit"]').click();
    const ownFrenchTask = page
      .locator("#tasky-family-child-tasks-list article")
      .filter({ hasText: "Practicar vocabulario de francés" });
    await ownFrenchTask.waitFor({ state: "visible" });
    await ownFrenchTask.getByRole("button", { name: "Ya terminé" }).click();
    await ownFrenchTask.getByText("Lista para revisar").waitFor({ state: "visible" });

    await form.locator('input[name="title"]').fill("Preparar maqueta de ciencias");
    await form.locator('textarea[name="description"]').fill("Reunir cartulina y colores");
    await form.locator('select[name="module"]').selectOption("box_escolar");
    await form.locator('select[name="priority"]').selectOption("high");
    await form.locator('button[type="submit"]').click();

    const firstTask = page.locator("#tasky-family-child-tasks-list article").filter({ hasText: "Preparar maqueta de ciencias" });
    await firstTask.waitFor({ state: "visible" });

    await firstTask.getByRole("button", { name: "Editar" }).click();
    const editor = page.locator(".tasky-family-task-editor");
    await editor.waitFor({ state: "visible" });
    await editor.locator('input[name="title"]').fill("Preparar maqueta de ciencias y tecnología");
    await editor.getByRole("button", { name: "Guardar cambios" }).click();
    const editedTask = page.locator("#tasky-family-child-tasks-list article").filter({ hasText: "Preparar maqueta de ciencias y tecnología" });
    await editedTask.waitFor({ state: "visible" });

    await editedTask.getByRole("button", { name: "Ya terminé" }).click();
    await editedTask.getByText("Lista para revisar").waitFor({ state: "visible" });

    await form.locator('input[name="title"]').fill("Leer diez páginas");
    await form.locator('select[name="module"]').selectOption("box_escolar");
    await form.locator('button[type="submit"]').click();
    const secondTask = page.locator("#tasky-family-child-tasks-list article").filter({ hasText: "Leer diez páginas" });
    await secondTask.waitFor({ state: "visible" });
    assert.equal(await secondTask.getByRole("button", { name: "Eliminar" }).count(), 0);

    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("los adultos pueden revisar tareas de Leah en módulos personalizados", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.jose);
    await selectProfile(page, "leah");
    await assertWorkspace(page, "leah", "guardian", "Tasky Leah");
    await page.locator("#tasky-family-panel:not([hidden])").waitFor({ state: "visible" });

    const frenchTask = page
      .locator("#tasky-family-child-tasks-list article")
      .filter({ hasText: "Practicar vocabulario de francés" });
    await frenchTask.waitFor({ state: "visible" });
    const frenchModuleMeta = frenchTask.locator(".tasky-family-request-meta");
    await frenchModuleMeta.waitFor({ state: "visible" });
    assert.match(await frenchModuleMeta.innerText(), /FRANCÉS/);
    await frenchTask.getByRole("button", { name: "Aprobar y completar" }).click();
    await frenchTask.getByText("Completada").waitFor({ state: "visible" });
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("una membresía infantil deshabilitada no aparece como espacio disponible", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.leahDisabled);
    assert.equal(await page.locator("#tasky-profile-select").isVisible(), false);
    assert.equal(await page.locator("#tasky-login-submit").isVisible(), false);
    assert.equal(await page.locator("#tasky-auth-signout").isVisible(), true);
    assert.match(await page.locator("#tasky-auth-message").innerText(), /todavía no tiene espacios autorizados/);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});

test("una cuenta no puede forzar la selección de un espacio ajeno", async () => {
  const { context, page, forbiddenProductionRequests } = await openLoginPage();
  try {
    await login(page, users.cams);
    await page.locator("#tasky-profile-select").evaluate((select) => {
      const option = document.createElement("option");
      option.value = "jose";
      option.textContent = "Tasky José";
      select.append(option);
      select.value = "jose";
    });
    await page.locator("#tasky-login-form").evaluate((form) => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    assert.match(await page.locator("#tasky-auth-message").innerText(), /espacios autorizados/);
    assert.equal(await page.locator("html").getAttribute("data-tasky-workspace"), null);
    assert.deepEqual(forbiddenProductionRequests, []);
  } finally {
    await context.close();
  }
});
