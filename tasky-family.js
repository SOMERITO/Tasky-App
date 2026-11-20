import { getApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  runTransaction,
  Timestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const db = getFirestore(getApp("tasky-multi-workspace"));
const panel = document.getElementById("tasky-family-panel");
const content = document.getElementById("tasky-family-content");
const REQUESTS_PATH = ["workspaces", "leah", "task_requests"];
const SHARED_PATH = ["workspaces", "leah", "shared", "main"];

const childModules = [
  { id: "box_escolar", label: "Escolar" },
  { id: "box_evaluaciones", label: "Evaluaciones" },
  { id: "box_materiales", label: "Materiales" },
  { id: "box_actividades", label: "Actividades" },
  { id: "box_coordinacion", label: "Coordinación familiar" },
  { id: "box_habitos", label: "Hábitos y rutinas" }
];
const childModuleIds = new Set(childModules.map((item) => item.id));

let activeWorkspace = null;
let activeRole = "";
let activeUid = "";
let requests = [];
let boardTasks = [];
let unsubscribeRequests = null;
let unsubscribeBoard = null;
let requestBusy = false;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function makeButton(label, className, onClick) {
  const button = node("button", className, label);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

function setMessage(target, message, isError = false) {
  if (!target) return;
  target.textContent = message || "";
  target.classList.toggle("is-error", Boolean(isError));
}

function localDateISO() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(value) {
  if (!value) return "Fecha no indicada";
  let date = value;
  if (value && typeof value.toDate === "function") date = value.toDate();
  else date = new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Fecha no indicada";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "short", year: "numeric"
  }).format(date);
}

function requestStatusLabel(status) {
  if (status === "approved") return "Aprobada";
  if (status === "rejected") return "No aprobada";
  return "Pendiente";
}

function statusClass(status) {
  if (status === "approved") return "is-approved";
  if (status === "rejected") return "is-rejected";
  return "is-pending";
}

function requestTypeLabel(request) {
  return request.type === "completion" ? "Solicitud para confirmar una tarea" : "Nueva tarea";
}

function moduleLabel(moduleId) {
  const match = childModules.find((item) => item.id === moduleId);
  return match ? match.label : "Módulo no disponible";
}

function showPanelShell(eyebrow, title, subtitle) {
  panel.hidden = false;
  content.replaceChildren();
  const card = node("div", "tasky-family-card");
  const heading = node("div", "tasky-family-heading");
  const copy = node("div");
  copy.append(
    node("p", "tasky-family-eyebrow", eyebrow),
    node("h2", "tasky-family-title", title),
    node("p", "tasky-family-subtitle", subtitle)
  );
  heading.append(copy);
  card.append(heading);
  content.append(card);
  return card;
}

function renderChildPanel() {
  const card = showPanelShell(
    "Tasky Leah · espacio familiar",
    "Mis solicitudes",
    "Puedes pedir que agreguen una tarea o solicitar que un adulto confirme una tarea que ya terminaste."
  );

  const grid = node("div", "tasky-family-grid");
  const newTaskCard = node("section", "tasky-family-form-card");
  newTaskCard.append(
    node("h3", "", "Pedir una nueva tarea"),
    node("p", "tasky-family-help", "La solicitud llegará a José y Camila para que puedan revisarla.")
  );

  const newTaskForm = node("form", "tasky-family-form");
  newTaskForm.innerHTML = `
    <label class="tasky-family-field"><span>¿Qué tarea necesitas?</span><input name="title" maxlength="180" required placeholder="Ej. Leer el capítulo de Comunicación" /></label>
    <label class="tasky-family-field"><span>Detalle (opcional)</span><textarea name="description" maxlength="500" placeholder="Puedes explicar qué necesitas o qué materiales debes llevar."></textarea></label>
    <label class="tasky-family-field"><span>¿En qué módulo?</span><select name="module" required></select></label>
    <div class="tasky-family-two-fields">
      <label class="tasky-family-field"><span>Fecha programada</span><input name="scheduledDate" type="date" /></label>
      <label class="tasky-family-field"><span>Fecha límite (opcional)</span><input name="deadlineDate" type="date" /></label>
    </div>
    <label class="tasky-family-field"><span>Prioridad</span><select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baja</option></select></label>
    <button type="submit" class="tasky-family-primary">Enviar solicitud</button>
    <p class="tasky-family-message" data-family-message role="status" aria-live="polite"></p>
  `;
  const moduleSelect = newTaskForm.elements.module;
  childModules.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    moduleSelect.append(option);
  });
  newTaskForm.elements.scheduledDate.value = localDateISO();
  newTaskForm.addEventListener("submit", submitNewTaskRequest);
  newTaskCard.append(newTaskForm);

  const completionCard = node("section", "tasky-family-form-card");
  completionCard.append(
    node("h3", "", "Ya terminé una tarea"),
    node("p", "tasky-family-help", "Selecciona una tarea pendiente. Un adulto revisará tu solicitud antes de marcarla como completada.")
  );
  const completionForm = node("form", "tasky-family-form");
  completionForm.innerHTML = `
    <label class="tasky-family-field"><span>Tarea terminada</span><select name="taskId" required><option value="">Cargando tareas…</option></select></label>
    <button type="submit" class="tasky-family-primary">Solicitar confirmación</button>
    <p class="tasky-family-message" data-family-message role="status" aria-live="polite"></p>
  `;
  completionForm.addEventListener("submit", submitCompletionRequest);
  completionCard.append(completionForm);
  grid.append(newTaskCard, completionCard);
  card.append(grid);

  const history = node("section", "tasky-family-inbox-card");
  history.append(
    node("h3", "", "Estado de mis solicitudes"),
    node("p", "tasky-family-help", "Aquí podrás comprobar si cada solicitud está pendiente, aprobada o necesita revisión.")
  );
  const list = node("div", "tasky-family-list");
  list.id = "tasky-family-requests-list";
  history.append(list);
  card.append(history);
  renderRequestList();
  updateCompletionTaskOptions();
}

function renderGuardianPanel() {
  const card = showPanelShell(
    "Tasky Leah · coordinación familiar",
    "Solicitudes de Leah",
    "Revisa las tareas que Leah necesita incorporar y las solicitudes de confirmación. Las aprobaciones se guardan junto con el tablero compartido."
  );
  const count = node("span", "tasky-family-count", "0");
  count.id = "tasky-family-pending-count";
  card.querySelector(".tasky-family-heading").append(count);
  const list = node("div", "tasky-family-list");
  list.id = "tasky-family-requests-list";
  card.append(list);
  renderRequestList();
}

function updateCompletionTaskOptions() {
  if (activeRole !== "child" || !content) return;
  const select = content.querySelector('form [name="taskId"]');
  if (!select) return;
  const pendingRequests = new Set(
    requests
      .filter((request) => request.type === "completion" && request.status === "pending")
      .map((request) => String(request.relatedTaskId || ""))
  );
  const previousValue = select.value;
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = boardTasks.length ? "Selecciona una tarea" : "No hay tareas pendientes disponibles";
  select.append(placeholder);
  const available = boardTasks
    .filter((task) => task && !task.done && childModuleIds.has(String(task.boxId)) && !pendingRequests.has(String(task.id)))
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "es"));
  available.forEach((task) => {
    const option = document.createElement("option");
    option.value = String(task.id);
    option.textContent = String(task.title || "Tarea sin título");
    select.append(option);
  });
  select.disabled = available.length === 0 || requestBusy;
  const submit = select.form && select.form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = available.length === 0 || requestBusy;
  if (previousValue && available.some((task) => String(task.id) === previousValue)) {
    select.value = previousValue;
  }
}

async function submitNewTaskRequest(event) {
  event.preventDefault();
  if (requestBusy || activeRole !== "child" || !activeUid) return;
  const form = event.currentTarget;
  const title = String(form.elements.title.value || "").trim();
  const description = String(form.elements.description.value || "").trim();
  const module = String(form.elements.module.value || "");
  const scheduledDate = String(form.elements.scheduledDate.value || "");
  const deadlineDate = String(form.elements.deadlineDate.value || "");
  const priority = String(form.elements.priority.value || "normal");
  const message = form.querySelector("[data-family-message]");

  if (!title || title.length > 180 || !childModuleIds.has(module)) {
    setMessage(message, "Completa el título y selecciona un módulo permitido.", true);
    return;
  }
  if (deadlineDate && scheduledDate && deadlineDate < scheduledDate) {
    setMessage(message, "La fecha límite no puede ser anterior a la fecha programada.", true);
    return;
  }

  setRequestBusy(true);
  setMessage(message, "Enviando solicitud…");
  try {
    await addDoc(collection(db, ...REQUESTS_PATH), {
      type: "new_task",
      createdBy: activeUid,
      createdAt: serverTimestamp(),
      status: "pending",
      title,
      description,
      module,
      scheduledDate: scheduledDate || localDateISO(),
      deadlineDate,
      priority
    });
    form.reset();
    form.elements.scheduledDate.value = localDateISO();
    setMessage(message, "Solicitud enviada. José y Camila podrán revisarla desde Tasky Leah.");
  } catch (error) {
    setMessage(message, "No se pudo enviar la solicitud. Revisa tu conexión o los permisos de este espacio.", true);
  } finally {
    setRequestBusy(false);
  }
}

async function submitCompletionRequest(event) {
  event.preventDefault();
  if (requestBusy || activeRole !== "child" || !activeUid) return;
  const form = event.currentTarget;
  const taskId = String(form.elements.taskId.value || "");
  const task = boardTasks.find((item) => String(item.id) === taskId);
  const message = form.querySelector("[data-family-message]");
  if (!task || task.done || !childModuleIds.has(String(task.boxId))) {
    setMessage(message, "Selecciona una tarea pendiente válida.", true);
    return;
  }
  setRequestBusy(true);
  setMessage(message, "Enviando solicitud…");
  try {
    await addDoc(collection(db, ...REQUESTS_PATH), {
      type: "completion",
      createdBy: activeUid,
      createdAt: serverTimestamp(),
      status: "pending",
      relatedTaskId: taskId
    });
    form.reset();
    setMessage(message, "Solicitud enviada. La tarea seguirá pendiente hasta que un adulto la verifique.");
  } catch (error) {
    setMessage(message, "No se pudo enviar la solicitud. Revisa tu conexión o los permisos de este espacio.", true);
  } finally {
    setRequestBusy(false);
  }
}

function setRequestBusy(busy) {
  requestBusy = Boolean(busy);
  if (content) {
    content.querySelectorAll("form button, form input, form select, form textarea").forEach((control) => {
      if (control.name === "taskId") return;
      control.disabled = requestBusy;
    });
  }
  updateCompletionTaskOptions();
}

function createRequestCard(requestId, request) {
  const card = node("article", "tasky-family-request");
  const top = node("div", "tasky-family-request-top");
  const titleText = request.type === "completion"
    ? "Confirmar: " + (boardTasks.find((task) => String(task.id) === String(request.relatedTaskId))?.title || "tarea seleccionada")
    : String(request.title || "Nueva tarea");
  const title = node("h4", "tasky-family-request-title", titleText);
  const status = node("span", "tasky-family-status " + statusClass(request.status), requestStatusLabel(request.status));
  top.append(title, status);
  card.append(top);
  const metaParts = [requestTypeLabel(request), formatDate(request.createdAt)];
  if (request.type === "new_task") metaParts.push(moduleLabel(request.module));
  card.append(node("p", "tasky-family-request-meta", metaParts.join(" · ")));
  if (request.description) card.append(node("p", "tasky-family-request-description", request.description));
  if (request.scheduledDate) {
    card.append(node("p", "tasky-family-request-meta", "Programada: " + formatDate(request.scheduledDate)));
  }
  if (request.deadlineDate) {
    card.append(node("p", "tasky-family-request-meta", "Fecha límite: " + formatDate(request.deadlineDate)));
  }
  if (request.reviewNote) card.append(node("p", "tasky-family-request-meta", "Comentario: " + request.reviewNote));
  if (request.createdTaskId) card.append(node("p", "tasky-family-request-meta", "Tarea incorporada al tablero."));
  if (activeRole !== "child" && request.status === "pending") {
    const actions = node("div", "tasky-family-actions");
    const approve = makeButton("Aprobar", "tasky-family-primary", () => reviewRequest(requestId, "approved"));
    const reject = makeButton("No aprobar", "tasky-family-danger", () => reviewRequest(requestId, "rejected"));
    approve.disabled = requestBusy;
    reject.disabled = requestBusy;
    actions.append(approve, reject);
    card.append(actions);
  }
  return card;
}

function renderRequestList() {
  if (!content) return;
  const list = content.querySelector("#tasky-family-requests-list");
  if (!list) return;
  list.replaceChildren();
  const visibleRequests = activeRole === "child"
    ? requests.filter((request) => request.createdBy === activeUid)
    : requests;
  if (activeRole !== "child") {
    const count = content.querySelector("#tasky-family-pending-count");
    if (count) count.textContent = String(visibleRequests.filter((request) => request.status === "pending").length);
  }
  if (!visibleRequests.length) {
    list.append(node("div", "tasky-family-empty",
      activeRole === "child" ? "Todavía no has enviado solicitudes." : "No hay solicitudes pendientes. Cuando Leah envíe una, aparecerá aquí."
    ));
    return;
  }
  visibleRequests.forEach((request) => list.append(createRequestCard(request.id, request)));
}

function parseSharedPayload(snapshot) {
  if (!snapshot || !snapshot.exists()) return null;
  const data = snapshot.data() || {};
  const raw = data.payloadJson;
  if (typeof raw !== "string" || !raw) return null;
  try {
    const payload = JSON.parse(raw);
    if (!payload || !Array.isArray(payload.boxes) || !Array.isArray(payload.tasks)) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

async function reviewRequest(requestId, decision) {
  if (requestBusy || activeRole === "child" || !activeUid) return;
  if (!["approved", "rejected"].includes(decision)) return;
  setRequestBusy(true);
  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, ...REQUESTS_PATH, requestId);
      const requestSnapshot = await transaction.get(requestRef);
      if (!requestSnapshot.exists()) throw new Error("La solicitud ya no existe.");
      const request = requestSnapshot.data() || {};
      if (request.status !== "pending") throw new Error("Esta solicitud ya fue atendida.");

      const now = Date.now();
      const requestUpdate = {
        status: decision,
        reviewedBy: activeUid,
        reviewedAt: Timestamp.now(),
        reviewNote: ""
      };

      if (decision === "approved") {
        const sharedRef = doc(db, ...SHARED_PATH);
        const sharedSnapshot = await transaction.get(sharedRef);
        const payload = parseSharedPayload(sharedSnapshot);
        if (!payload) throw new Error("No se encontró el tablero compartido o no contiene datos válidos.");

        if (request.type === "new_task") {
          const module = childModules.find((item) => item.id === request.module);
          if (!module || !childModuleIds.has(module.id)) throw new Error("El módulo solicitado no está permitido.");
          const box = payload.boxes.find((item) => String(item.id) === module.id);
          if (!box) throw new Error("El módulo solicitado todavía no existe en el tablero compartido.");
          const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
          const taskId = "task_family_" + now + "_" + Math.random().toString(36).slice(2, 9);
          const order = tasks
            .filter((task) => String(task.boxId) === module.id)
            .reduce((highest, task) => Math.max(highest, Number(task.order) || 0), -1) + 1;
          tasks.push({
            id: taskId,
            boxId: module.id,
            title: String(request.title || "").trim(),
            description: String(request.description || "").trim(),
            done: false,
            completedDate: null,
            createdAt: now,
            updatedAt: now,
            dueDate: String(request.scheduledDate || localDateISO()),
            deadlineDate: String(request.deadlineDate || ""),
            noDeadline: !request.deadlineDate,
            frequency: "once",
            repeatDays: [],
            rescheduledCount: 0,
            isRescheduled: false,
            order,
            sourceRequestId: requestId
          });
          payload.tasks = tasks;
          requestUpdate.createdTaskId = taskId;
        } else if (request.type === "completion") {
          const task = payload.tasks.find((item) => String(item.id) === String(request.relatedTaskId));
          if (!task || task.done || !childModuleIds.has(String(task.boxId))) {
            throw new Error("La tarea ya no está pendiente o no pertenece a un módulo de Leah.");
          }
          task.done = true;
          task.completedDate = localDateISO();
          task.updatedAt = now;
          task.completionRequestId = requestId;
        } else {
          throw new Error("Tipo de solicitud no reconocido.");
        }

        payload.updatedAt = now;
        payload.deviceId = "tasky-family-approval";
        transaction.update(sharedRef, {
          payloadJson: JSON.stringify(payload),
          updatedAt: now,
          deviceId: "tasky-family-approval"
        });
      }

      transaction.update(doc(db, ...REQUESTS_PATH, requestId), requestUpdate);
    });

    if (decision === "approved") {
      window.dispatchEvent(new CustomEvent("tasky:family-board-updated"));
    }
  } catch (error) {
    window.console && window.console.error("Tasky family request review failed:", error);
    window.alert(error && error.message ? error.message : "No se pudo actualizar la solicitud.");
  } finally {
    setRequestBusy(false);
  }
}

function closeWorkspace() {
  if (unsubscribeRequests) unsubscribeRequests();
  if (unsubscribeBoard) unsubscribeBoard();
  unsubscribeRequests = null;
  unsubscribeBoard = null;
  activeWorkspace = null;
  activeRole = "";
  activeUid = "";
  requests = [];
  boardTasks = [];
  requestBusy = false;
  if (panel) panel.hidden = true;
  if (content) content.replaceChildren();
}

function openWorkspace(detail) {
  const api = window.TaskyAuth;
  if (!panel || !content || !api || !api.currentUser || !detail || detail.workspaceId !== "leah") {
    closeWorkspace();
    return;
  }
  if (api.currentUser.uid !== detail.uid) return closeWorkspace();
  const membership = api.getMembership("leah");
  if (!membership || membership.active !== true || membership.role !== detail.role) return closeWorkspace();
  if (!["guardian", "owner", "child"].includes(membership.role)) return closeWorkspace();

  closeWorkspace();
  activeWorkspace = "leah";
  activeRole = membership.role;
  activeUid = api.currentUser.uid;

  if (activeRole === "child") renderChildPanel();
  else renderGuardianPanel();

  const requestsQuery = query(
    collection(db, ...REQUESTS_PATH),
    orderBy("createdAt", "desc"),
    limit(75)
  );
  unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
    requests = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderRequestList();
    updateCompletionTaskOptions();
  }, (error) => {
    const list = content.querySelector("#tasky-family-requests-list");
    if (list) list.replaceChildren(node("div", "tasky-family-empty",
      "No se pudieron cargar las solicitudes. Comprueba los permisos y la conexión."
    ));
    window.console && window.console.error("Tasky family requests listener failed:", error);
  });

  if (activeRole === "child") {
    const sharedRef = doc(db, ...SHARED_PATH);
    unsubscribeBoard = onSnapshot(sharedRef, (snapshot) => {
      const payload = parseSharedPayload(snapshot);
      boardTasks = payload && Array.isArray(payload.tasks) ? payload.tasks : [];
      updateCompletionTaskOptions();
    }, (error) => {
      boardTasks = [];
      updateCompletionTaskOptions();
      window.console && window.console.error("Tasky family board listener failed:", error);
    });
  }
}

window.addEventListener("tasky:workspace-ready", (event) => openWorkspace(event && event.detail));
window.addEventListener("tasky:open-workspace-picker", closeWorkspace);

const currentWorkspace = document.documentElement.dataset.taskyWorkspace;
if (currentWorkspace === "leah" && window.TaskyAuth && window.TaskyAuth.currentUser) {
  openWorkspace({
    uid: window.TaskyAuth.currentUser.uid,
    workspaceId: "leah",
    role: (window.TaskyAuth.getMembership("leah") || {}).role
  });
}
