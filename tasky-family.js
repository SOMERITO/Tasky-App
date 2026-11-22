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
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  Timestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const db = getFirestore(getApp("tasky-multi-workspace"));
const panel = document.getElementById("tasky-family-panel");
const content = document.getElementById("tasky-family-content");
const childTasksShortcut = document.getElementById("tasky-child-tasks-shortcut");
const REQUESTS_PATH = ["workspaces", "leah", "task_requests"];
const CHILD_TASKS_PATH = ["workspaces", "leah", "child_tasks"];
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
const defaultChildModules = childModules.map((item) => ({ ...item }));
const privateChildModuleIds = new Set(["box_salud", "box_gastos"]);
let boardModuleIds = new Set(childModuleIds);

function isLeahChildVisibleModuleId(value) {
  const id = String(value || "").trim();
  return /^box_[A-Za-z0-9_-]{1,64}$/.test(id) && !privateChildModuleIds.has(id);
}

let activeWorkspace = null;
let activeRole = "";
let activeUid = "";
let requests = [];
let childTasks = [];
let boardTasks = [];
let unsubscribeRequests = null;
let unsubscribeChildTasks = null;
let unsubscribeBoard = null;
let editingChildTaskId = "";
let requestBusy = false;
let requestsLoadFailed = false;
let childTasksLoadFailed = false;
let requestsLoaded = false;
let childTasksLoaded = false;
let boardTasksLoaded = false;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function makeButton(label, className, onClick) {
  const button = node("button", className, label);
  button.type = "button";
  button.disabled = Boolean(requestBusy);
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
  else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) date = new Date(value + "T00:00:00");
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

function fillModuleSelect(select, selectedValue = "") {
  if (!select) return;
  select.replaceChildren();
  childModules.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    select.append(option);
  });
  if (selectedValue && childModuleIds.has(selectedValue)) select.value = selectedValue;
}

function syncChildModules(boxes) {
  if (!Array.isArray(boxes)) return;

  childModules.splice(0, childModules.length, ...defaultChildModules.map((item) => ({ ...item })));
  childModuleIds.clear();
  defaultChildModules.forEach((item) => childModuleIds.add(item.id));
  boardModuleIds = new Set();

  boxes.forEach((box) => {
    const id = String(box && box.id || "").trim();
    if (!isLeahChildVisibleModuleId(id)) return;
    boardModuleIds.add(id);

    if (!childModuleIds.has(id)) {
      const label = String(box.name || box.label || id.replace(/^box_/, ""))
        .trim()
        .slice(0, 80);
      childModules.push({ id, label: label || "Otro módulo" });
      childModuleIds.add(id);
    }
  });

  if (content) {
    content.querySelectorAll('select[name="module"]').forEach((select) => {
      const selected = String(select.value || "");
      fillModuleSelect(select, childModuleIds.has(selected) ? selected : "box_escolar");
    });
  }
}

function renderChildPanel() {
  const card = showPanelShell(
    "Tasky Leah",
    "Mis tareas",
    "Agrega tus pendientes, edita los tuyos y avisa cuando termines. José o Camila revisará cada tarea."
  );

  const grid = node("div", "tasky-family-grid");
  const newTaskCard = node("section", "tasky-family-form-card");
  newTaskCard.append(
    node("h3", "", "Agregar una tarea"),
    node("p", "tasky-family-help", "Quedará pendiente. Puedes editarla o eliminarla hasta enviarla a revisión.")
  );

  const newTaskForm = node("form", "tasky-family-form");
  newTaskForm.id = "tasky-child-task-create-form";
  newTaskForm.innerHTML = `
    <label class="tasky-family-field"><span>¿Qué tarea debes realizar?</span><input name="title" maxlength="180" required placeholder="Ej. Leer el capítulo de Comunicación" /></label>
    <label class="tasky-family-field"><span>Detalle (opcional)</span><textarea name="description" maxlength="500" placeholder="Agrega instrucciones o materiales que necesitas."></textarea></label>
    <label class="tasky-family-field"><span>¿En qué módulo?</span><select name="module" required></select></label>
    <div class="tasky-family-two-fields">
      <label class="tasky-family-field"><span>Fecha programada</span><input name="scheduledDate" type="date" /></label>
      <label class="tasky-family-field"><span>Fecha límite (opcional)</span><input name="deadlineDate" type="date" /></label>
    </div>
    <label class="tasky-family-field"><span>Prioridad</span><select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baja</option></select></label>
    <button type="submit" class="tasky-family-primary">Guardar tarea</button>
    <p class="tasky-family-message" data-family-message role="status" aria-live="polite"></p>
  `;
  fillModuleSelect(newTaskForm.elements.module, "box_escolar");
  newTaskForm.elements.scheduledDate.value = localDateISO();
  newTaskForm.addEventListener("submit", submitChildTask);
  newTaskCard.append(newTaskForm);

  grid.append(newTaskCard);
  card.append(grid);

  const assignedTasks = node("section", "tasky-family-inbox-card");
  assignedTasks.append(
    node("h3", "", "Tareas asignadas"),
    node("p", "tasky-family-help", "Las tareas que registraron José o Camila son de consulta. Cuando termines, envíalas a revisión.")
  );
  const assignedTaskList = node("div", "tasky-family-list");
  assignedTaskList.id = "tasky-family-assigned-tasks-list";
  assignedTasks.append(assignedTaskList);
  card.append(assignedTasks);

  const ownTasks = node("section", "tasky-family-inbox-card");
  ownTasks.append(
    node("h3", "", "Tus pendientes"),
    node("p", "tasky-family-help", "Edita o elimina tus pendientes antes de enviarlos a revisión.")
  );
  const taskList = node("div", "tasky-family-list");
  taskList.id = "tasky-family-child-tasks-list";
  ownTasks.append(taskList);
  card.append(ownTasks);

  const history = node("section", "tasky-family-inbox-card");
  history.append(
    node("h3", "", "Enviadas a revisión"),
    node("p", "tasky-family-help", "Aquí puedes consultar el resultado de las tareas que avisaste como terminadas.")
  );
  const list = node("div", "tasky-family-list");
  list.id = "tasky-family-requests-list";
  history.append(list);
  card.append(history);
  renderChildTaskList();
  renderAdultAssignedTaskList();
  renderRequestList();
}

function renderGuardianPanel() {
  const card = showPanelShell(
    "Tasky Leah · coordinación familiar",
    "Seguimiento de Leah",
    "Consulta las tareas que Leah registra, revisa sus avisos de finalización y administra el espacio familiar."
  );
  const count = node("span", "tasky-family-count", "0");
  count.id = "tasky-family-pending-count";
  card.querySelector(".tasky-family-heading").append(count);

  const childTaskSection = node("section", "tasky-family-inbox-card");
  childTaskSection.append(
    node("h3", "", "Tareas registradas por Leah"),
    node("p", "tasky-family-help", "Los registros aparecen automáticamente. Las tareas marcadas por Leah como terminadas esperan la confirmación de un adulto.")
  );
  const childTaskList = node("div", "tasky-family-list");
  childTaskList.id = "tasky-family-child-tasks-list";
  childTaskSection.append(childTaskList);
  card.append(childTaskSection);

  const requestSection = node("section", "tasky-family-inbox-card");
  requestSection.append(
    node("h3", "", "Avisos de finalización de tareas asignadas"),
    node("p", "tasky-family-help", "Revisa los avisos de Leah sobre tareas que José o Camila registraron directamente en el tablero.")
  );
  const list = node("div", "tasky-family-list");
  list.id = "tasky-family-requests-list";
  requestSection.append(list);
  card.append(requestSection);
  renderChildTaskList();
  renderRequestList();
}

function renderAdultAssignedTaskList() {
  if (!content || activeRole !== "child") return;
  const list = content.querySelector("#tasky-family-assigned-tasks-list");
  if (!list) return;
  list.replaceChildren();

  const eligibleTasks = boardTasks
    .filter((task) => task && boardModuleIds.has(String(task.boxId)))
    .sort((a, b) => {
      const aDue = String(a.dueDate || "");
      const bDue = String(b.dueDate || "");
      return aDue.localeCompare(bDue) || String(a.title || "").localeCompare(String(b.title || ""), "es");
    });

  if (!boardTasksLoaded) {
    list.append(node("div", "tasky-family-empty tasky-family-loading", "Cargando las tareas asignadas…"));
    return;
  }
  if (!eligibleTasks.length) {
    list.append(node("div", "tasky-family-empty", "Todavía no hay tareas asignadas por José o Camila."));
    return;
  }

  const pendingRequests = new Set(
    requests
      .filter((request) => request.type === "completion" && request.status === "pending")
      .map((request) => String(request.relatedTaskId || ""))
  );

  eligibleTasks.forEach((task) => {
    const taskId = String(task.id);
    const card = node("article", "tasky-family-request tasky-family-assigned-task");
    const top = node("div", "tasky-family-request-top");
    const title = node("h4", "tasky-family-request-title", task.title || "Tarea sin título");
    if (task.done || pendingRequests.has(taskId)) title.classList.add("is-struck");
    const status = task.done
      ? node("span", "tasky-family-status is-approved", "Completada")
      : node("span", "tasky-family-status " + (pendingRequests.has(taskId) ? "is-awaiting-review" : "is-pending"),
          pendingRequests.has(taskId) ? "Por revisar" : "Pendiente");
    top.append(title, status);
    card.append(top);

    const metadata = [moduleLabel(String(task.boxId))];
    if (task.dueDate) metadata.push("Programada: " + formatDate(task.dueDate));
    if (task.deadlineDate) metadata.push("Fecha límite: " + formatDate(task.deadlineDate));
    card.append(node("p", "tasky-family-request-meta", metadata.join(" · ")));
    if (task.description) card.append(node("p", "tasky-family-request-description", task.description));

    if (!task.done && !pendingRequests.has(taskId)) {
      const actions = node("div", "tasky-family-actions");
      actions.append(makeButton("Ya terminé esta tarea", "tasky-family-primary", () => submitCompletionForTask(taskId)));
      card.append(actions);
    } else if (pendingRequests.has(taskId)) {
      card.append(node("p", "tasky-family-help", "Tu aviso ya fue enviado. La tarea seguirá pendiente hasta que un adulto la confirme."));
    }
    list.append(card);
  });
}

async function submitCompletionForTask(taskId) {
  if (requestBusy || activeRole !== "child" || !activeUid) return;
  const task = boardTasks.find((item) => String(item.id) === String(taskId));
  const alreadyPending = requests.some((request) =>
    request.type === "completion" &&
    request.status === "pending" &&
    String(request.relatedTaskId || "") === String(taskId)
  );
  if (!task || task.done || alreadyPending || !boardModuleIds.has(String(task.boxId))) return;

  setRequestBusy(true);
  try {
    await addDoc(collection(db, ...REQUESTS_PATH), {
      type: "completion",
      createdBy: activeUid,
      createdAt: serverTimestamp(),
      status: "pending",
      relatedTaskId: String(taskId)
    });
  } catch (error) {
    const code = String(error && error.code || "unknown");
    window.alert("No se pudo enviar el aviso de finalización (" + code + ").");
    window.console && window.console.error("[Tasky Leah] Submit assigned-task review failed:", error);
  } finally {
    setRequestBusy(false);
    renderAdultAssignedTaskList();
  }
}

async function submitChildTask(event) {
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

  if (!title || title.length > 180 || description.length > 500 ||
      !childModuleIds.has(module) || !isLeahChildVisibleModuleId(module)) {
    setMessage(message, "Completa un título válido y selecciona un módulo permitido.", true);
    return;
  }
  if (deadlineDate && scheduledDate && deadlineDate < scheduledDate) {
    setMessage(message, "La fecha límite no puede ser anterior a la fecha programada.", true);
    return;
  }

  setRequestBusy(true);
  setMessage(message, "Guardando tarea…");
  try {
    await addDoc(collection(db, ...CHILD_TASKS_PATH), {
      title,
      description,
      module,
      scheduledDate: scheduledDate || localDateISO(),
      deadlineDate,
      priority,
      createdBy: activeUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "pending"
    });
    form.reset();
    fillModuleSelect(form.elements.module, "box_escolar");
    form.elements.scheduledDate.value = localDateISO();
    setMessage(message, "Tarea guardada como pendiente. Puedes editarla o eliminarla antes de enviarla a revisión.");
  } catch (error) {
    const code = String(error && error.code || "unknown");
    setMessage(message, "No se pudo registrar la tarea (" + code + "). Comprueba la conexión y los permisos.", true);
    window.console && window.console.error("[Tasky Leah] Create task failed:", error);
  } finally {
    setRequestBusy(false);
  }
}

function childTaskStatusLabel(status) {
  if (status === "awaiting_review") return "Lista para revisar";
  if (status === "completed") return "Completada";
  return "Pendiente";
}

function childTaskStatusClass(status) {
  if (status === "awaiting_review") return "is-awaiting-review";
  if (status === "completed") return "is-approved";
  return "is-pending";
}

function renderChildTaskEditor(task) {
  const form = node("form", "tasky-family-form tasky-family-task-editor");
  const makeField = (labelText, name, type, value, maxLength) => {
    const label = node("label", "tasky-family-field");
    label.append(node("span", "", labelText));
    const field = document.createElement(type === "textarea" ? "textarea" : "input");
    field.name = name;
    if (type !== "textarea") field.type = type;
    if (maxLength) field.maxLength = maxLength;
    field.value = value || "";
    label.append(field);
    return label;
  };

  form.append(makeField("Título", "title", "text", task.title, 180));
  form.append(makeField("Detalle", "description", "textarea", task.description, 500));

  const moduleLabelElement = node("label", "tasky-family-field");
  moduleLabelElement.append(node("span", "", "Módulo"));
  const moduleSelect = document.createElement("select");
  moduleSelect.name = "module";
  fillModuleSelect(moduleSelect, String(task.module || "box_escolar"));
  moduleLabelElement.append(moduleSelect);
  form.append(moduleLabelElement);

  const dates = node("div", "tasky-family-two-fields");
  dates.append(makeField("Fecha programada", "scheduledDate", "date", task.scheduledDate || ""));
  dates.append(makeField("Fecha límite", "deadlineDate", "date", task.deadlineDate || ""));
  form.append(dates);

  const priorityLabel = node("label", "tasky-family-field");
  priorityLabel.append(node("span", "", "Prioridad"));
  const prioritySelect = document.createElement("select");
  prioritySelect.name = "priority";
  [
    ["normal", "Normal"],
    ["high", "Alta"],
    ["low", "Baja"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    prioritySelect.append(option);
  });
  prioritySelect.value = task.priority || "normal";
  priorityLabel.append(prioritySelect);
  form.append(priorityLabel);

  const actions = node("div", "tasky-family-actions");
  const save = makeButton("Guardar cambios", "tasky-family-primary", () => {});
  save.type = "submit";
  const cancel = makeButton("Cancelar", "tasky-family-secondary", () => {
    editingChildTaskId = "";
    renderChildTaskList();
  });
  actions.append(save, cancel);
  form.append(actions);
  const message = node("p", "tasky-family-message");
  message.dataset.familyMessage = "";
  form.append(message);
  form.addEventListener("submit", (event) => saveChildTaskEdits(event, task));
  return form;
}

function createChildTaskCard(task) {
  const card = node("article", "tasky-family-request tasky-family-child-task");
  const top = node("div", "tasky-family-request-top");
  const title = node("h4", "tasky-family-request-title", task.title || "Tarea sin título");
  if (task.status === "awaiting_review" || task.status === "completed") {
    title.classList.add("is-struck");
  }
  const status = node(
    "span",
    "tasky-family-status " + childTaskStatusClass(task.status),
    childTaskStatusLabel(task.status)
  );
  top.append(title, status);
  card.append(top);

  const meta = [
    moduleLabel(task.module),
    task.scheduledDate ? "Programada: " + formatDate(task.scheduledDate) : "Sin fecha programada",
    task.deadlineDate ? "Límite: " + formatDate(task.deadlineDate) : "Sin fecha límite",
    "Prioridad: " + (task.priority === "high" ? "Alta" : task.priority === "low" ? "Baja" : "Normal")
  ];
  card.append(node("p", "tasky-family-request-meta", meta.join(" · ")));
  if (task.description) card.append(node("p", "tasky-family-request-description", task.description));
  if (task.status === "awaiting_review") {
    card.append(node("p", "tasky-family-help", "Leah indicó que terminó. La tarea sigue visible y espera la revisión de José o Camila."));
  } else if (task.status === "completed") {
    card.append(node("p", "tasky-family-help", "Un adulto confirmó esta tarea" +
      (task.reviewedBy ? " · revisión registrada" : "") + "."));
  }

  const actions = node("div", "tasky-family-actions");
  if (activeRole === "child" && task.createdBy === activeUid && task.status === "pending") {
    actions.append(
      makeButton("Editar", "tasky-family-secondary", () => {
        editingChildTaskId = String(task.id);
        renderChildTaskList();
      }),
      makeButton("Ya terminé", "tasky-family-primary", () => markChildTaskForReview(task.id)),
      makeButton("Eliminar", "tasky-family-danger", () => removeChildTask(task.id))
    );
  } else if (activeRole !== "child") {
    if (task.status === "awaiting_review") {
      actions.append(
        makeButton("Aprobar y completar", "tasky-family-primary", () => reviewChildTask(task.id, "approved")),
        makeButton("Devolver a pendientes", "tasky-family-secondary", () => reviewChildTask(task.id, "rejected"))
      );
    } else {
      actions.append(
        makeButton("Editar", "tasky-family-secondary", () => {
          editingChildTaskId = String(task.id);
          renderChildTaskList();
        }),
        makeButton("Eliminar", "tasky-family-danger", () => removeChildTask(task.id))
      );
    }
  }
  if (actions.childElementCount) card.append(actions);
  return card;
}

function renderChildTaskList() {
  if (!content) return;
  const list = content.querySelector("#tasky-family-child-tasks-list");
  if (!list) return;
  list.replaceChildren();
  const visibleTasks = activeRole === "child"
    ? childTasks.filter((task) => task.createdBy === activeUid)
    : childTasks;

  if (!childTasksLoaded) {
    list.append(node("div", "tasky-family-empty tasky-family-loading", "Cargando tus tareas…"));
    return;
  }
  if (!visibleTasks.length) {
    list.append(node("div", "tasky-family-empty",
      activeRole === "child"
        ? "Todavía no has registrado tareas."
        : "Leah todavía no ha registrado tareas."
    ));
    return;
  }

  visibleTasks.forEach((task) => {
    if (editingChildTaskId === String(task.id) &&
        (activeRole !== "child" || (task.createdBy === activeUid && task.status === "pending")) &&
        (activeRole === "child" || task.status !== "awaiting_review")) {
      const wrapper = node("article", "tasky-family-request tasky-family-child-task");
      wrapper.append(renderChildTaskEditor(task));
      list.append(wrapper);
    } else {
      list.append(createChildTaskCard(task));
    }
  });
}

async function saveChildTaskEdits(event, task) {
  event.preventDefault();
  if (requestBusy || !activeUid || !task) return;
  if (activeRole === "child" &&
      (task.createdBy !== activeUid || task.status !== "pending")) return;
  if (activeRole !== "child" && !["owner", "guardian"].includes(activeRole)) return;

  const form = event.currentTarget;
  const title = String(form.elements.title.value || "").trim();
  const description = String(form.elements.description.value || "").trim();
  const module = String(form.elements.module.value || "");
  const scheduledDate = String(form.elements.scheduledDate.value || "");
  const deadlineDate = String(form.elements.deadlineDate.value || "");
  const priority = String(form.elements.priority.value || "normal");
  const message = form.querySelector("[data-family-message]");

  if (!title || title.length > 180 || description.length > 500 ||
      !childModuleIds.has(module) || !isLeahChildVisibleModuleId(module)) {
    setMessage(message, "Completa un título válido y selecciona un módulo permitido.", true);
    return;
  }
  if (deadlineDate && scheduledDate && deadlineDate < scheduledDate) {
    setMessage(message, "La fecha límite no puede ser anterior a la fecha programada.", true);
    return;
  }

  setRequestBusy(true);
  setMessage(message, "Guardando cambios…");
  try {
    await updateDoc(doc(db, ...CHILD_TASKS_PATH, String(task.id)), {
      title,
      description,
      module,
      scheduledDate,
      deadlineDate,
      priority,
      updatedAt: serverTimestamp()
    });
    editingChildTaskId = "";
    setMessage(message, "Cambios guardados.");
  } catch (error) {
    const code = String(error && error.code || "unknown");
    setMessage(message, "No se pudieron guardar los cambios (" + code + ").", true);
    window.console && window.console.error("[Tasky Leah] Update task failed:", error);
  } finally {
    setRequestBusy(false);
    renderChildTaskList();
  }
}

async function markChildTaskForReview(taskId) {
  if (requestBusy || activeRole !== "child" || !activeUid) return;
  const task = childTasks.find((item) => String(item.id) === String(taskId));
  if (!task || task.createdBy !== activeUid || task.status !== "pending") return;
  setRequestBusy(true);
  try {
    await updateDoc(doc(db, ...CHILD_TASKS_PATH, String(taskId)), {
      status: "awaiting_review",
      childCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    const code = String(error && error.code || "unknown");
    window.alert("No se pudo enviar el aviso de finalización (" + code + ").");
    window.console && window.console.error("[Tasky Leah] Submit completion failed:", error);
  } finally {
    setRequestBusy(false);
    renderChildTaskList();
  }
}

async function reviewChildTask(taskId, decision) {
  if (requestBusy || activeRole === "child" || !activeUid ||
      !["approved", "rejected"].includes(decision)) return;
  const task = childTasks.find((item) => String(item.id) === String(taskId));
  if (!task || task.status !== "awaiting_review") return;
  setRequestBusy(true);
  try {
    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, ...CHILD_TASKS_PATH, String(taskId));
      const taskSnapshot = await transaction.get(taskRef);
      if (!taskSnapshot.exists()) throw new Error("La tarea ya no existe.");
      if ((taskSnapshot.data() || {}).status !== "awaiting_review") {
        throw new Error("Esta tarea ya fue revisada o cambió de estado.");
      }
      transaction.update(taskRef, {
        status: decision === "approved" ? "completed" : "pending",
        reviewedBy: activeUid,
        reviewedAt: serverTimestamp(),
        reviewNote: decision === "approved" ? "" : "Revisa la actividad y vuelve a marcarla cuando esté lista.",
        completedAt: decision === "approved" ? Timestamp.now() : null,
        updatedAt: serverTimestamp()
      });
    });
    if (decision === "rejected") {
      window.alert("La tarea volvió a pendientes. Leah podrá revisarla y editarla.");
    }
  } catch (error) {
    const code = String(error && error.code || "unknown");
    window.alert("No se pudo registrar la revisión (" + code + ").");
    window.console && window.console.error("[Tasky Leah] Review task failed:", error);
  } finally {
    setRequestBusy(false);
    renderChildTaskList();
  }
}

async function removeChildTask(taskId) {
  if (requestBusy || !activeUid) return;
  const task = childTasks.find((item) => String(item.id) === String(taskId));
  if (!task) return;

  // Leah may delete only her own pending task, before sending it to review.
  if (activeRole === "child") {
    if (task.createdBy !== activeUid || task.status !== "pending") return;
  } else if (!["owner", "guardian"].includes(activeRole)) {
    return;
  }

  if (!window.confirm("¿Eliminar esta tarea pendiente? Esta acción no se puede deshacer.")) return;
  setRequestBusy(true);
  try {
    await deleteDoc(doc(db, ...CHILD_TASKS_PATH, String(taskId)));
    if (editingChildTaskId === String(taskId)) editingChildTaskId = "";
  } catch (error) {
    const code = String(error && error.code || "unknown");
    window.alert("No se pudo eliminar la tarea (" + code + ").");
    window.console && window.console.error("[Tasky Leah] Delete task failed:", error);
  } finally {
    setRequestBusy(false);
    renderChildTaskList();
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
  renderChildTaskList();
  renderAdultAssignedTaskList();
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
    if (count) {
      count.textContent = String(
        visibleRequests.filter((request) => request.status === "pending").length +
        childTasks.filter((task) => task.status === "awaiting_review").length
      );
    }
  }
  if (!requestsLoaded) {
    list.append(node("div", "tasky-family-empty tasky-family-loading", "Cargando avisos…"));
    return;
  }
  if (!visibleRequests.length) {
    list.append(node("div", "tasky-family-empty",
      activeRole === "child"
        ? "Todavía no has enviado avisos sobre tareas asignadas."
        : "No hay avisos de finalización pendientes para revisar."
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
          const belongsToVisibleModule = Boolean(
            task &&
            isLeahChildVisibleModuleId(task.boxId) &&
            Array.isArray(payload.boxes) &&
            payload.boxes.some((box) =>
              String(box && box.id || "") === String(task.boxId) &&
              isLeahChildVisibleModuleId(box.id)
            )
          );
          if (!task || task.done || !belongsToVisibleModule) {
            throw new Error("La tarea ya no está pendiente o no pertenece a un módulo visible de Leah.");
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

if (childTasksShortcut) {
  childTasksShortcut.addEventListener("click", () => {
    if (activeRole !== "child" || !panel) return;
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const title = content && content.querySelector("#tasky-child-task-create-form input[name='title']");
      if (title) title.focus({ preventScroll: true });
    }, 320);
  });
}

function updatePanelVisibility() {
  if (!panel) return;

  // Leah always has her own task workspace, even before the first snapshot returns.
  const hasFamilyActivity = requests.length > 0 || childTasks.length > 0;
  const hasLoadIssue = requestsLoadFailed || childTasksLoadFailed;
  const childMode = activeRole === "child";
  panel.dataset.taskyRole = activeRole;
  panel.hidden = !(childMode || hasFamilyActivity || hasLoadIssue);
  panel.setAttribute("aria-hidden", String(panel.hidden));
  if (childTasksShortcut) {
    childTasksShortcut.hidden = !childMode;
    childTasksShortcut.setAttribute("aria-expanded", String(childMode && !panel.hidden));
  }
}

function closeWorkspace() {
  if (unsubscribeRequests) unsubscribeRequests();
  if (unsubscribeChildTasks) unsubscribeChildTasks();
  if (unsubscribeBoard) unsubscribeBoard();
  unsubscribeRequests = null;
  unsubscribeChildTasks = null;
  unsubscribeBoard = null;
  activeWorkspace = null;
  activeRole = "";
  activeUid = "";
  requests = [];
  childTasks = [];
  boardTasks = [];
  editingChildTaskId = "";
  requestBusy = false;
  requestsLoadFailed = false;
  childTasksLoadFailed = false;
  requestsLoaded = false;
  childTasksLoaded = false;
  boardTasksLoaded = false;
  if (panel) {
    panel.hidden = true;
    panel.removeAttribute("data-tasky-role");
    panel.setAttribute("aria-hidden", "true");
  }
  if (childTasksShortcut) childTasksShortcut.hidden = true;
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
  requestsLoaded = false;
  childTasksLoaded = false;
  boardTasksLoaded = false;
  requestsLoadFailed = false;
  childTasksLoadFailed = false;

  if (activeRole === "child") renderChildPanel();
  else renderGuardianPanel();
  updatePanelVisibility();

  const requestsQuery = query(
    collection(db, ...REQUESTS_PATH),
    orderBy("createdAt", "desc"),
    limit(75)
  );
  unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
    requestsLoaded = true;
    requestsLoadFailed = false;
    requests = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderRequestList();
    renderAdultAssignedTaskList();
    updatePanelVisibility();
  }, (error) => {
    requestsLoaded = true;
    requestsLoadFailed = true;
    const list = content.querySelector("#tasky-family-requests-list");
    if (list) list.replaceChildren(node("div", "tasky-family-empty",
      "No se pudieron cargar los avisos (" + String(error && error.code || "error") + ")."
    ));
    updatePanelVisibility();
    window.console && window.console.error("[Tasky Leah] Requests listener failed:", error);
  });

  const childTasksQuery = query(
    collection(db, ...CHILD_TASKS_PATH),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  unsubscribeChildTasks = onSnapshot(childTasksQuery, (snapshot) => {
    childTasksLoaded = true;
    childTasksLoadFailed = false;
    childTasks = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    if (!childTasks.some((task) => String(task.id) === editingChildTaskId)) editingChildTaskId = "";
    renderChildTaskList();
    updatePanelVisibility();
    const count = content.querySelector("#tasky-family-pending-count");
    if (count) {
      count.textContent = String(
        childTasks.filter((task) => task.status === "awaiting_review").length +
        requests.filter((request) => request.status === "pending").length
      );
    }
  }, (error) => {
    childTasksLoaded = true;
    childTasksLoadFailed = true;
    const list = content.querySelector("#tasky-family-child-tasks-list");
    if (list) list.replaceChildren(node("div", "tasky-family-empty",
      "No se pudieron cargar tus tareas (" + String(error && error.code || "error") + ")."
    ));
    updatePanelVisibility();
    window.console && window.console.error("[Tasky Leah] Child tasks listener failed:", error);
  });

  if (activeRole === "child") {
    const sharedRef = doc(db, ...SHARED_PATH);
    unsubscribeBoard = onSnapshot(sharedRef, (snapshot) => {
      boardTasksLoaded = true;
      const payload = parseSharedPayload(snapshot);
      syncChildModules(payload && payload.boxes);
      boardTasks = payload && Array.isArray(payload.tasks) ? payload.tasks : [];
      renderAdultAssignedTaskList();
    }, (error) => {
      boardTasksLoaded = true;
      boardTasks = [];
      renderAdultAssignedTaskList();
      const list = content.querySelector("#tasky-family-assigned-tasks-list");
      if (list) list.replaceChildren(node("div", "tasky-family-empty",
        "No se pudieron cargar las tareas asignadas (" + String(error && error.code || "error") + ")."
      ));
      window.console && window.console.error("[Tasky Leah] Shared board listener failed:", error);
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
