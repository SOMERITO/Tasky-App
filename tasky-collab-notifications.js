/* ==========================================================================
   TASKY COLLAB & NOTIFICATIONS · Notificaciones Inteligentes + Casillas Compartidas
   - Sin duplicación: el dueño sigue usando su casilla original (con insignia 👥 Compartida)
     y los cambios se sincronizan bidireccionalmente en vivo con Camila / Leah.
   - Para la persona invitada (que no tiene esa casilla), aparece una sola vez, plegable.
   ========================================================================== */
import { getApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const db = getFirestore(getApp("tasky-multi-workspace"));

const FAMILY_DIRECTORY = [
  { uid: "AtgLK3MTplgjwQDtHwEzw4Vjfzw2", name: "José", workspace: "jose", defaultRole: "editor", emoji: "🧔🏻" },
  { uid: "5y8N4YnvyRUrzokkrpO98jf19Vq1", name: "Camila", workspace: "camila", defaultRole: "editor", emoji: "👩🏻" },
  { uid: "zk4Cafr9hWdwGccZWgj6bojRz1u2", name: "Leah", workspace: "leah", defaultRole: "child", emoji: "👧🏻" }
];

let currentUid = "";
let currentName = "";
let currentWorkspaceId = "";
let currentRole = "";

let unsubNotifs = null;
let unsubSharedMember = null;
let unsubSharedInvited = null;

let notificationsList = [];
let sharedBoxesById = new Map();
let knownNotifIds = new Set();
let notifInitialLoaded = false;
let lastAppliedSharedVersion = new Map();
let ownerPushTimers = new Map();

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMemberInfoByUid(uid) {
  return FAMILY_DIRECTORY.find(m => m.uid === uid) || { uid, name: "Familiar", defaultRole: "editor", emoji: "👤" };
}

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortTime(ts) {
  const n = Number(ts || 0);
  if (!n) return "";
  try {
    return new Date(n).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (_) {
    return "";
  }
}

function tasksFingerprint(tasks) {
  return JSON.stringify(
    (tasks || [])
      .map(t => [
        String(t && t.id || ""),
        String(t && t.title || "").trim(),
        Boolean(t && t.done),
        Boolean(t && t.pendingReview),
        String(t && t.dueDate || ""),
        String(t && t.deadlineDate || "")
      ])
      .sort((a, b) => a[0].localeCompare(b[0]))
  );
}

function isOwnedInCurrentWorkspace(sbox) {
  return Boolean(
    sbox &&
    sbox.ownerUid === currentUid &&
    String(sbox.sourceWorkspace || "") === String(currentWorkspaceId || "") &&
    sbox.sourceBoxId
  );
}

function findOwnedSharedBoxBySourceId(sourceBoxId) {
  for (const sbox of sharedBoxesById.values()) {
    if (isOwnedInCurrentWorkspace(sbox) && String(sbox.sourceBoxId) === String(sourceBoxId)) {
      return sbox;
    }
  }
  return null;
}

/* --------------------------------------------------------------------------
   1. Notificaciones del sistema (Web Notification API + vibración móvil)
   -------------------------------------------------------------------------- */
function showSystemNotification(title, body) {
  try {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
  } catch (_) {}

  if (typeof window.Notification === "undefined") return;
  if (window.Notification.permission !== "granted") return;

  try {
    new window.Notification(title, {
      body: body || "",
      icon: "icon.png",
      badge: "icon.png",
      tag: "tasky-" + Date.now()
    });
  } catch (_) {}
}

function showInAppBanner(message, isError = false) {
  const stack = document.getElementById("toast-stack");
  if (!stack) return;
  const pill = document.createElement("div");
  pill.className = "toast" + (isError ? " toast-error" : "");
  pill.textContent = message;
  stack.appendChild(pill);
  window.setTimeout(() => {
    pill.style.opacity = "0";
    pill.style.transform = "translateY(-8px)";
    window.setTimeout(() => pill.remove(), 260);
  }, 3600);
}

async function sendUserNotification(targetUid, payload) {
  if (!targetUid || !currentUid) return;
  try {
    await addDoc(collection(db, "user_notifications", targetUid, "items"), {
      type: payload.type || "info",
      title: String(payload.title || "Aviso de Tasky").slice(0, 140),
      body: String(payload.body || "").slice(0, 400),
      fromUid: currentUid,
      fromName: currentName || getMemberInfoByUid(currentUid).name,
      sharedBoxId: payload.sharedBoxId || "",
      sharedBoxName: payload.sharedBoxName || "",
      status: payload.status || "info",
      read: false,
      createdAt: Date.now()
    });
  } catch (err) {
    console.warn("[Tasky Collab] No se pudo enviar notificación:", err);
  }
}

/* --------------------------------------------------------------------------
   2. Recordatorios inteligentes locales (vencimientos, atrasadas, cumpleaños)
   -------------------------------------------------------------------------- */
function runSmartDailyNotifications() {
  if (!currentUid || !currentWorkspaceId) return;
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  const ranKey = `tasky:smart-notif-digest:${currentUid}:${currentWorkspaceId}:${today}`;
  try {
    if (window.localStorage.getItem(ranKey) === "1") return;
  } catch (_) {}

  let localData = null;
  try {
    const keyPrefix = currentWorkspaceId === "leah" && currentRole === "child"
      ? `tasky:v2:leah:${currentUid}:tasky_data`
      : `tasky:v2:${currentWorkspaceId}:tasky_data`;
    const raw = window.localStorage.getItem(keyPrefix) || window.localStorage.getItem("tasky_data");
    if (raw) localData = JSON.parse(raw);
  } catch (_) {}

  if (!localData || !Array.isArray(localData.tasks)) return;

  const pending = localData.tasks.filter(t => t && !t.done);
  const dueToday = pending.filter(t => String(t.deadlineDate || t.dueDate || "") === today);
  const dueTomorrow = pending.filter(t => String(t.deadlineDate || "") === tomorrow);
  const overdue = pending.filter(t => {
    const d = String(t.deadlineDate || t.dueDate || "");
    return d && d < today && !t.noDeadline;
  });

  const md = today.slice(5);
  const todayBirthdays = (localData.birthdays || []).filter(b => {
    const rawDate = String(b && (b.date || b.birthDate || b.monthDay) || "");
    return rawDate.endsWith(md);
  });

  const digestItems = [];
  if (todayBirthdays.length > 0) {
    const names = todayBirthdays.map(b => b.name || b.person || "Cumpleañero").slice(0, 3).join(", ");
    digestItems.push({
      title: "🎂 ¡Cumpleaños hoy!",
      body: `Hoy celebra: ${names}. No olvides enviar un saludo especial.`
    });
  }
  if (overdue.length > 0 || dueToday.length > 0) {
    const parts = [];
    if (dueToday.length > 0) parts.push(`${dueToday.length} para hoy`);
    if (overdue.length > 0) parts.push(`${overdue.length} atrasadas`);
    digestItems.push({
      title: "☀️ Tu resumen del día en Tasky",
      body: `Tienes ${parts.join(" y ")}. ¡Vamos paso a paso!`
    });
  }
  if (dueTomorrow.length > 0) {
    digestItems.push({
      title: "📅 Tareas que vencen mañana",
      body: `${dueTomorrow.length} tarea(s) tienen fecha límite mañana (${dueTomorrow[0].title || ""}).`
    });
  }

  if (!digestItems.length) return;
  try { window.localStorage.setItem(ranKey, "1"); } catch (_) {}

  digestItems.forEach((item) => {
    sendUserNotification(currentUid, {
      type: "reminder",
      title: item.title,
      body: item.body,
      status: "info"
    });
    showSystemNotification(item.title, item.body);
  });
}

/* --------------------------------------------------------------------------
   3. UI de Campana de Notificaciones 🔔 y Modales
   -------------------------------------------------------------------------- */
function ensureBellAndModals() {
  const topActions = document.querySelector(".top-actions");
  if (topActions && !document.getElementById("tasky-notif-bell")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "tasky-notif-bell";
    btn.className = "icon-btn tasky-notif-bell";
    btn.setAttribute("aria-label", "Notificaciones e invitaciones");
    btn.title = "Notificaciones e invitaciones";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>' +
        '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
      '</svg>' +
      '<span id="tasky-notif-badge" class="tasky-notif-badge" hidden>0</span>';

    const moreBtn = document.getElementById("btn-more-options");
    if (moreBtn && moreBtn.parentElement === topActions) {
      topActions.insertBefore(btn, moreBtn);
    } else {
      topActions.appendChild(btn);
    }
    btn.addEventListener("click", openNotificationsModal);
  }

  if (!document.getElementById("tasky-notif-modal")) {
    const backdrop = document.createElement("div");
    backdrop.id = "tasky-notif-modal";
    backdrop.className = "modal-backdrop tasky-collab-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "Centro de notificaciones");
    backdrop.innerHTML =
      '<div class="modal-dialog tasky-collab-dialog">' +
        '<div class="modal-header">' +
          '<div>' +
            '<div class="modal-eyebrow">🔔 NOTIFICACIONES E INVITACIONES</div>' +
            '<h3 class="modal-title">Centro de avisos</h3>' +
          '</div>' +
          '<button type="button" class="modal-close-btn" id="tasky-notif-close" aria-label="Cerrar">✕</button>' +
        '</div>' +
        '<div class="tasky-notif-toolbar">' +
          '<button type="button" class="tasky-collab-chip-btn" id="tasky-enable-sys-notifs">🔔 Activar notificaciones del dispositivo</button>' +
          '<button type="button" class="tasky-collab-chip-btn is-muted" id="tasky-mark-all-read">✓ Marcar leídas</button>' +
        '</div>' +
        '<div id="tasky-notif-list" class="tasky-notif-list"></div>' +
      '</div>';
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeNotificationsModal();
    });
    backdrop.querySelector("#tasky-notif-close").addEventListener("click", closeNotificationsModal);
    backdrop.querySelector("#tasky-mark-all-read").addEventListener("click", markAllNotificationsRead);
    backdrop.querySelector("#tasky-enable-sys-notifs").addEventListener("click", requestSystemNotifications);
  }

  if (!document.getElementById("tasky-share-modal")) {
    const shareBackdrop = document.createElement("div");
    shareBackdrop.id = "tasky-share-modal";
    shareBackdrop.className = "modal-backdrop tasky-collab-backdrop";
    shareBackdrop.setAttribute("role", "dialog");
    shareBackdrop.setAttribute("aria-modal", "true");
    shareBackdrop.setAttribute("aria-label", "Compartir casilla");
    shareBackdrop.innerHTML =
      '<div class="modal-dialog tasky-collab-dialog">' +
        '<div class="modal-header">' +
          '<div>' +
            '<div class="modal-eyebrow">👥 COMPARTIR CASILLA</div>' +
            '<h3 class="modal-title" id="tasky-share-modal-title">Compartir casilla</h3>' +
          '</div>' +
          '<button type="button" class="modal-close-btn" id="tasky-share-close" aria-label="Cerrar">✕</button>' +
        '</div>' +
        '<p class="tasky-collab-help">Elige con quién compartir esta casilla. Recibirán una notificación para aceptarla y todo lo que hagan se reflejará automáticamente en esta misma casilla.</p>' +
        '<div id="tasky-share-members" class="tasky-share-members"></div>' +
        '<div class="tasky-share-footer" id="tasky-share-footer">' +
          '<button type="button" class="tasky-collab-chip-btn is-danger" id="tasky-share-unshare" hidden>Dejar de compartir</button>' +
          '<div style="display:flex;gap:8px;margin-left:auto;">' +
            '<button type="button" class="tasky-family-secondary" id="tasky-share-cancel">Cancelar</button>' +
            '<button type="button" class="tasky-family-primary" id="tasky-share-confirm">Guardar y compartir</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(shareBackdrop);

    shareBackdrop.addEventListener("click", (e) => {
      if (e.target === shareBackdrop) shareBackdrop.classList.remove("open");
    });
    shareBackdrop.querySelector("#tasky-share-close").addEventListener("click", () => shareBackdrop.classList.remove("open"));
    shareBackdrop.querySelector("#tasky-share-cancel").addEventListener("click", () => shareBackdrop.classList.remove("open"));
  }
}

function updateSysNotifButton() {
  const btn = document.getElementById("tasky-enable-sys-notifs");
  if (!btn) return;
  if (typeof window.Notification === "undefined") {
    btn.textContent = "🔔 Avisos activos dentro de la app";
    btn.disabled = true;
    return;
  }
  if (window.Notification.permission === "granted") {
    btn.textContent = "✅ Notificaciones del dispositivo activas";
    btn.classList.add("is-enabled");
  } else if (window.Notification.permission === "denied") {
    btn.textContent = "⚠️ Permiso bloqueado en el navegador";
  } else {
    btn.textContent = "🔔 Activar notificaciones del dispositivo";
  }
}

async function requestSystemNotifications() {
  if (typeof window.Notification === "undefined") {
    showInAppBanner("Tu navegador/WebView usará las notificaciones internas de Tasky.");
    return;
  }
  try {
    const result = await window.Notification.requestPermission();
    updateSysNotifButton();
    if (result === "granted") {
      showInAppBanner("¡Notificaciones activadas!");
      showSystemNotification("Tasky 🔔", "¡Listo! Ahora recibirás tus recordatorios e invitaciones aquí.");
    } else {
      showInAppBanner("No se otorgó permiso de notificaciones del sistema.", true);
    }
  } catch (_) {}
}

function openNotificationsModal() {
  ensureBellAndModals();
  updateSysNotifButton();
  renderNotificationsList();
  const modal = document.getElementById("tasky-notif-modal");
  if (modal) modal.classList.add("open");
}

function closeNotificationsModal() {
  const modal = document.getElementById("tasky-notif-modal");
  if (modal) modal.classList.remove("open");
}

async function markAllNotificationsRead() {
  if (!currentUid) return;
  const unread = notificationsList.filter(n => !n.read);
  await Promise.all(unread.map(n =>
    updateDoc(doc(db, "user_notifications", currentUid, "items", n.id), { read: true }).catch(() => {})
  ));
  showInAppBanner("Notificaciones marcadas como leídas");
}

function updateBellBadge() {
  const badge = document.getElementById("tasky-notif-badge");
  const bell = document.getElementById("tasky-notif-bell");
  if (!badge || !bell) return;
  const unreadCount = notificationsList.filter(n => !n.read || n.status === "pending").length;
  badge.hidden = unreadCount === 0;
  badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  bell.classList.toggle("has-unread", unreadCount > 0);
}

function renderNotificationsList() {
  const container = document.getElementById("tasky-notif-list");
  if (!container) return;

  if (!notificationsList.length) {
    container.innerHTML = '<div class="tasky-family-empty">No tienes notificaciones nuevas por ahora.</div>';
    return;
  }

  container.innerHTML = "";
  notificationsList.forEach((n) => {
    const card = document.createElement("article");
    card.className = "tasky-notif-item" + (!n.read ? " is-unread" : "");

    const isPendingInvite = n.type === "shared_box_invite" && n.status === "pending" && n.sharedBoxId;
    card.innerHTML =
      '<div class="tasky-notif-item-top">' +
        `<strong class="tasky-notif-item-title">${escapeHtml(n.title)}</strong>` +
        `<span class="tasky-notif-item-time">${escapeHtml(formatShortTime(n.createdAt))}</span>` +
      '</div>' +
      `<p class="tasky-notif-item-body">${escapeHtml(n.body)}</p>`;

    if (isPendingInvite) {
      const actions = document.createElement("div");
      actions.className = "tasky-notif-actions";

      const acceptBtn = document.createElement("button");
      acceptBtn.type = "button";
      acceptBtn.className = "tasky-family-primary";
      acceptBtn.textContent = "✓ Aceptar casilla";
      acceptBtn.addEventListener("click", () => respondToSharedInvite(n, true));

      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "tasky-family-secondary";
      rejectBtn.textContent = "Rechazar";
      rejectBtn.addEventListener("click", () => respondToSharedInvite(n, false));

      actions.append(acceptBtn, rejectBtn);
      card.appendChild(actions);
    } else if (n.type === "shared_box_invite" && n.status !== "pending") {
      const tag = document.createElement("span");
      tag.className = "tasky-notif-status-tag";
      tag.textContent = n.status === "accepted" ? "✅ Invitación aceptada" : "Invitación rechazada";
      card.appendChild(tag);
    }

    container.appendChild(card);
  });
}

async function respondToSharedInvite(notif, accept) {
  if (!currentUid || !notif || !notif.sharedBoxId) return;
  try {
    const boxRef = doc(db, "shared_boxes", notif.sharedBoxId);
    if (accept) {
      await updateDoc(boxRef, {
        memberUids: arrayUnion(currentUid),
        invitedUids: arrayRemove(currentUid),
        updatedAt: Date.now(),
        updatedByUid: currentUid,
        updatedByName: currentName
      });
    } else {
      await updateDoc(boxRef, {
        invitedUids: arrayRemove(currentUid),
        updatedAt: Date.now(),
        updatedByUid: currentUid,
        updatedByName: currentName
      });
    }

    await updateDoc(doc(db, "user_notifications", currentUid, "items", notif.id), {
      status: accept ? "accepted" : "rejected",
      read: true
    });

    if (notif.fromUid && notif.fromUid !== currentUid) {
      await sendUserNotification(notif.fromUid, {
        type: "shared_box_accepted",
        title: accept ? `🎉 ${currentName} aceptó la casilla compartida` : `${currentName} rechazó la invitación`,
        body: accept
          ? `Ahora ambos comparten «${notif.sharedBoxName || "casilla compartida"}» y recibirás avisos cuando haga cambios.`
          : `No se unió a «${notif.sharedBoxName || "casilla compartida"}».`,
        sharedBoxId: notif.sharedBoxId,
        sharedBoxName: notif.sharedBoxName,
        status: "info"
      });
    }

    showInAppBanner(accept ? `¡Casilla «${notif.sharedBoxName}» agregada a tu tablero!` : "Invitación rechazada");
  } catch (err) {
    console.error("[Tasky Collab] Error respondiendo invitación:", err);
    showInAppBanner("No se pudo procesar la invitación. Intenta de nuevo.", true);
  }
}

/* --------------------------------------------------------------------------
   4. Casillas Compartidas SIN duplicación para el dueño + Sync bidireccional
   -------------------------------------------------------------------------- */
function getLocalBoxSnapshot(boxId) {
  try {
    const keyPrefix = `tasky:v2:${currentWorkspaceId}:tasky_data`;
    const raw = window.localStorage.getItem(keyPrefix) || window.localStorage.getItem("tasky_data");
    if (!raw) return null;
    const data = JSON.parse(raw);
    const box = (data.boxes || []).find(b => String(b.id) === String(boxId));
    if (!box) return null;
    const tasks = (data.tasks || [])
      .filter(t => String(t.boxId) === String(boxId))
      .map(t => ({
        id: String(t.id),
        title: String(t.title || ""),
        description: String(t.description || ""),
        done: Boolean(t.done),
        pendingReview: Boolean(t.pendingReview),
        dueDate: String(t.dueDate || ""),
        deadlineDate: String(t.deadlineDate || ""),
        noDeadline: Boolean(t.noDeadline),
        createdAt: Number(t.createdAt || Date.now()),
        updatedAt: Number(t.updatedAt || Date.now()),
        createdByUid: String(t.createdByUid || currentUid),
        createdByName: String(t.createdByName || currentName)
      }));
    return { box, tasks };
  } catch (_) {
    return null;
  }
}

function openShareModalForBox(boxId, boxTitleFallback) {
  ensureBellAndModals();
  const modal = document.getElementById("tasky-share-modal");
  const titleEl = document.getElementById("tasky-share-modal-title");
  const listEl = document.getElementById("tasky-share-members");
  const confirmBtn = document.getElementById("tasky-share-confirm");
  const unshareBtn = document.getElementById("tasky-share-unshare");
  if (!modal || !listEl || !confirmBtn) return;

  const snap = getLocalBoxSnapshot(boxId);
  const boxName = (snap && snap.box && snap.box.name) || boxTitleFallback || "Casilla";
  const boxEmoji = (snap && snap.box && snap.box.emoji) || "👥";
  const boxColor = (snap && snap.box && snap.box.color) || "#4f46e5";

  const sharedBoxId = `sb_${currentUid.slice(0, 8)}_${String(boxId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const existingShared = sharedBoxesById.get(sharedBoxId) || findOwnedSharedBoxBySourceId(boxId) || null;

  if (titleEl) titleEl.textContent = `Compartir «${boxName}»`;

  const candidates = FAMILY_DIRECTORY.filter(m => m.uid !== currentUid);
  listEl.innerHTML = "";
  candidates.forEach((member) => {
    const alreadyMember = existingShared && Array.isArray(existingShared.memberUids) && existingShared.memberUids.includes(member.uid);
    const alreadyInvited = existingShared && Array.isArray(existingShared.invitedUids) && existingShared.invitedUids.includes(member.uid);
    const roleLabel = member.defaultRole === "child"
      ? "Puede ver, agregar y pedir revisión (sin borrar)"
      : "Puede ver, agregar, editar y completar todo";

    const row = document.createElement("label");
    row.className = "tasky-share-member-row";
    row.innerHTML =
      `<input type="checkbox" value="${escapeHtml(member.uid)}" ${(alreadyMember || alreadyInvited) ? "checked" : ""} />` +
      `<span class="tasky-share-member-avatar">${escapeHtml(member.emoji)}</span>` +
      '<span class="tasky-share-member-info">' +
        `<strong>${escapeHtml(member.name)} ${alreadyMember ? '<em class="tasky-share-pill">Compartida</em>' : alreadyInvited ? '<em class="tasky-share-pill is-pending">Invitación enviada</em>' : ""}</strong>` +
        `<small>${escapeHtml(roleLabel)}</small>` +
      '</span>';
    listEl.appendChild(row);
  });

  if (unshareBtn) {
    const newUnshare = unshareBtn.cloneNode(true);
    unshareBtn.parentNode.replaceChild(newUnshare, unshareBtn);
    newUnshare.hidden = !existingShared;
    if (existingShared) {
      newUnshare.addEventListener("click", async () => {
        if (!window.confirm(`¿Dejar de compartir «${boxName}»? Tu casilla y tus tareas locales seguirán intactas.`)) return;
        await deleteDoc(doc(db, "shared_boxes", existingShared.id));
        sharedBoxesById.delete(existingShared.id);
        modal.classList.remove("open");
        injectShareButtonsIntoBoxes();
        showInAppBanner(`Se dejó de compartir «${boxName}»`);
      });
    }
  }

  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

  newConfirm.addEventListener("click", async () => {
    const selectedUids = Array.from(listEl.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
    if (!selectedUids.length) {
      showInAppBanner("Selecciona al menos a una persona para compartir esta casilla.", true);
      return;
    }

    newConfirm.disabled = true;
    newConfirm.textContent = "Compartiendo…";
    try {
      const existingMembers = existingShared && Array.isArray(existingShared.memberUids)
        ? existingShared.memberUids.filter(uid => uid === currentUid || selectedUids.includes(uid))
        : [currentUid];
      if (!existingMembers.includes(currentUid)) existingMembers.push(currentUid);

      const prevInvited = existingShared && Array.isArray(existingShared.invitedUids) ? existingShared.invitedUids : [];
      const brandNewInvites = selectedUids.filter(uid => !existingMembers.includes(uid) && !prevInvited.includes(uid));
      const allInvited = selectedUids.filter(uid => !existingMembers.includes(uid));

      const rolesByUid = { [currentUid]: "owner" };
      selectedUids.forEach(uid => {
        rolesByUid[uid] = getMemberInfoByUid(uid).defaultRole;
      });

      const tasksToShare = snap && snap.tasks ? snap.tasks : (existingShared && existingShared.tasks ? existingShared.tasks : []);

      await setDoc(doc(db, "shared_boxes", existingShared ? existingShared.id : sharedBoxId), {
        id: existingShared ? existingShared.id : sharedBoxId,
        sourceBoxId: String(boxId),
        sourceWorkspace: currentWorkspaceId,
        name: String(boxName).toUpperCase(),
        emoji: String(boxEmoji),
        color: String(boxColor),
        ownerUid: currentUid,
        ownerName: currentName,
        memberUids: existingMembers,
        invitedUids: allInvited,
        rolesByUid,
        tasks: tasksToShare,
        updatedAt: Date.now(),
        updatedByUid: currentUid,
        updatedByName: currentName
      }, { merge: true });

      await Promise.all(brandNewInvites.map(uid =>
        sendUserNotification(uid, {
          type: "shared_box_invite",
          title: `👥 ${currentName} te compartió «${boxName}»`,
          body: `Acepta esta invitación para ver, agregar y editar en vivo las tareas de «${boxName}» junto a ${currentName}.`,
          sharedBoxId: existingShared ? existingShared.id : sharedBoxId,
          sharedBoxName: boxName,
          status: "pending"
        })
      ));

      modal.classList.remove("open");
      injectShareButtonsIntoBoxes();
      showInAppBanner(`¡Listo! «${boxName}» compartida sin duplicar tu pantalla.`);
    } catch (err) {
      console.error("[Tasky Collab] Error al compartir casilla:", err);
      showInAppBanner("No se pudo compartir la casilla. Verifica tu conexión.", true);
    } finally {
      newConfirm.disabled = false;
      newConfirm.textContent = "Guardar y compartir";
    }
  });

  modal.classList.add("open");
}

function injectShareButtonsIntoBoxes() {
  if (!currentUid || currentRole === "child") return;
  const boxCards = document.querySelectorAll("#boxes-container .box-card[data-box-id]");
  boxCards.forEach((card) => {
    const boxId = card.dataset.boxId;
    if (!boxId || boxId === "box_salud" || boxId === "box_gastos") return;
    const actions = card.querySelector(".box-header-actions");
    if (!actions) return;

    const ownedShared = findOwnedSharedBoxBySourceId(boxId);

    let btn = actions.querySelector(".tasky-share-box-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "box-ctrl-btn tasky-share-box-btn";
      btn.setAttribute("aria-label", "Compartir casilla");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>' +
          '<circle cx="9" cy="7" r="4"/>' +
          '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/>' +
          '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>' +
        '</svg>';
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nameEl = card.querySelector(".box-name");
        openShareModalForBox(boxId, nameEl ? nameEl.textContent.trim() : "");
      });
      actions.insertBefore(btn, actions.firstChild);
    }

    btn.classList.toggle("is-shared-active", Boolean(ownedShared));
    btn.title = ownedShared ? "Gestionar casilla compartida" : "Compartir esta casilla con Camila o Leah";

    // Mostrar insignia sutil "👥 Compartida · Camila" en la casilla original del dueño (sin duplicar tarjeta)
    const badgesRow = card.querySelector(".box-badges-row");
    const existingPill = card.querySelector(".tasky-shared-owner-pill");
    if (ownedShared && badgesRow) {
      const otherMembers = (ownedShared.memberUids || []).filter(u => u !== currentUid).map(u => getMemberInfoByUid(u).name);
      const pendingInvites = (ownedShared.invitedUids || []).filter(u => u !== currentUid).map(u => getMemberInfoByUid(u).name);
      const label = otherMembers.length
        ? `👥 Compartida · ${otherMembers.join(", ")}`
        : pendingInvites.length
          ? `👥 Invitada · ${pendingInvites.join(", ")}`
          : "👥 Compartida";

      if (existingPill) {
        existingPill.textContent = label;
      } else {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "box-pill tasky-shared-owner-pill";
        pill.textContent = label;
        pill.title = "Clic para gestionar con quién está compartida esta casilla";
        pill.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nameEl = card.querySelector(".box-name");
          openShareModalForBox(boxId, nameEl ? nameEl.textContent.trim() : "");
        });
        badgesRow.appendChild(pill);
      }
    } else if (!ownedShared && existingPill) {
      existingPill.remove();
    }
  });
}

// Sincronizar cambios hechos por el dueño en su casilla normal -> Firestore shared_boxes
function scheduleOwnerBoxesSyncToCloud() {
  if (!currentUid || currentRole === "child") return;
  for (const sbox of sharedBoxesById.values()) {
    if (!isOwnedInCurrentWorkspace(sbox)) continue;
    const prevTimer = ownerPushTimers.get(sbox.id);
    if (prevTimer) window.clearTimeout(prevTimer);

    const timer = window.setTimeout(async () => {
      ownerPushTimers.delete(sbox.id);
      const snap = getLocalBoxSnapshot(sbox.sourceBoxId);
      if (!snap) return;
      const nextFp = tasksFingerprint(snap.tasks);
      const currentFp = tasksFingerprint(sbox.tasks || []);
      if (nextFp === currentFp) return;

      const now = Date.now();
      lastAppliedSharedVersion.set(sbox.id, now);
      try {
        await updateDoc(doc(db, "shared_boxes", sbox.id), {
          name: String(snap.box.name || sbox.name).toUpperCase(),
          emoji: String(snap.box.emoji || sbox.emoji || ""),
          tasks: snap.tasks,
          updatedAt: now,
          updatedByUid: currentUid,
          updatedByName: currentName
        });
        await notifyOtherBoxMembers(
          sbox,
          `👥 Actualización en «${sbox.name}»`,
          `${currentName} actualizó las tareas de «${sbox.name}».`
        );
      } catch (err) {
        console.warn("[Tasky Collab] Error sincronizando cambios del dueño:", err);
      }
    }, 650);

    ownerPushTimers.set(sbox.id, timer);
  }
}

// Aplicar cambios hechos por Camila/Leah -> directamente en la casilla original del dueño
function applyCollaboratorUpdateToOwnerBox(sbox) {
  if (!isOwnedInCurrentWorkspace(sbox)) return;
  if (sbox.updatedByUid === currentUid) return;
  const version = Number(sbox.updatedAt || 0);
  if (version <= Number(lastAppliedSharedVersion.get(sbox.id) || 0)) return;

  const snap = getLocalBoxSnapshot(sbox.sourceBoxId);
  if (snap && tasksFingerprint(snap.tasks) === tasksFingerprint(sbox.tasks || [])) {
    lastAppliedSharedVersion.set(sbox.id, version);
    return;
  }

  lastAppliedSharedVersion.set(sbox.id, version);
  window.dispatchEvent(new CustomEvent("tasky:apply-shared-box-from-collab", {
    detail: {
      boxId: String(sbox.sourceBoxId),
      tasks: Array.isArray(sbox.tasks) ? sbox.tasks : [],
      updatedAt: version
    }
  }));
}

// Renderizar casillas compartidas ÚNICAMENTE para quienes fueron invitados (NO duplicar al dueño)
function renderSharedBoxesSection() {
  const boxesContainer = document.getElementById("boxes-container");
  if (!boxesContainer || !boxesContainer.parentElement) return;

  let section = document.getElementById("tasky-shared-boxes-section");
  const guestSharedBoxes = Array.from(sharedBoxesById.values())
    .filter(b => b && Array.isArray(b.memberUids) && b.memberUids.includes(currentUid) && !isOwnedInCurrentWorkspace(b))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

  if (!guestSharedBoxes.length) {
    if (section) section.remove();
    return;
  }

  if (!section) {
    section = document.createElement("section");
    section.id = "tasky-shared-boxes-section";
    section.className = "tasky-shared-section";
    section.setAttribute("aria-label", "Casillas compartidas contigo");
    boxesContainer.parentElement.insertBefore(section, boxesContainer);
  }

  section.innerHTML =
    '<div class="tasky-shared-section-head">' +
      '<span>👥 Compartidas contigo</span>' +
      `<small>${guestSharedBoxes.length}</small>` +
    '</div>';

  guestSharedBoxes.forEach((sbox) => {
    const isChildInBox = (sbox.rolesByUid && sbox.rolesByUid[currentUid] === "child") || currentRole === "child";
    const pendingTasks = (sbox.tasks || []).filter(t => !t.done);
    const doneTasks = (sbox.tasks || []).filter(t => t.done);
    const collapseKey = `tasky:shared-box-collapsed:${sbox.id}`;
    let isCollapsed = true;
    try {
      const saved = window.localStorage.getItem(collapseKey);
      if (saved !== null) isCollapsed = saved === "1";
    } catch (_) {}

    const card = document.createElement("article");
    card.className = "box-card tasky-shared-box-card" + (isCollapsed ? " is-collapsed" : "");
    card.innerHTML =
      '<div class="tasky-shared-box-top">' +
        '<div class="tasky-shared-box-title-wrap" role="button" tabindex="0">' +
          `<span class="tasky-shared-emoji">${escapeHtml(sbox.emoji || "👥")}</span>` +
          '<div>' +
            `<h3 class="tasky-shared-box-name">${escapeHtml(sbox.name)}</h3>` +
            `<span class="tasky-shared-members-line">👥 De ${escapeHtml(sbox.ownerName || "Familiar")} · ${pendingTasks.length} pendientes</span>` +
          '</div>' +
        '</div>' +
        '<div class="tasky-shared-box-controls">' +
          `<span class="box-count-pill">${pendingTasks.length}</span>` +
          `<button type="button" class="box-ctrl-btn tasky-shared-collapse-btn" aria-expanded="${!isCollapsed}" title="${isCollapsed ? "Desplegar" : "Plegar"}">${isCollapsed ? "▸" : "▾"}</button>` +
        '</div>' +
      '</div>' +
      '<div class="tasky-shared-box-body"' + (isCollapsed ? " hidden" : "") + '>' +
        '<div class="tasky-shared-task-list"></div>' +
        '<form class="tasky-shared-add-form">' +
          '<input type="text" maxlength="180" placeholder="+ Añadir tarea compartida…" required />' +
          '<button type="submit" class="tasky-family-primary">Añadir</button>' +
        '</form>' +
      '</div>';

    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
      try { window.localStorage.setItem(collapseKey, isCollapsed ? "1" : "0"); } catch (_) {}
      card.classList.toggle("is-collapsed", isCollapsed);
      const bodyEl = card.querySelector(".tasky-shared-box-body");
      const btnEl = card.querySelector(".tasky-shared-collapse-btn");
      if (bodyEl) bodyEl.hidden = isCollapsed;
      if (btnEl) {
        btnEl.textContent = isCollapsed ? "▸" : "▾";
        btnEl.setAttribute("aria-expanded", String(!isCollapsed));
      }
    };

    card.querySelector(".tasky-shared-box-title-wrap").addEventListener("click", toggleCollapse);
    card.querySelector(".tasky-shared-collapse-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse();
    });

    const listEl = card.querySelector(".tasky-shared-task-list");
    const orderedTasks = [...pendingTasks, ...doneTasks];
    if (!orderedTasks.length) {
      listEl.innerHTML = '<div class="tasky-family-empty">Sin tareas todavía. Agrega la primera abajo.</div>';
    } else {
      orderedTasks.forEach((task) => {
        const row = document.createElement("div");
        row.className = "tasky-shared-task-row" + (task.done ? " is-done" : "");

        const checkBtn = document.createElement("button");
        checkBtn.type = "button";
        checkBtn.className = "task-check-circle" + (task.done ? " is-checked" : "");
        checkBtn.setAttribute("aria-label", task.done ? "Marcar pendiente" : "Completar tarea compartida");
        checkBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        checkBtn.addEventListener("click", () => toggleSharedTask(sbox, task, isChildInBox));

        const copy = document.createElement("div");
        copy.className = "tasky-shared-task-copy";
        const reviewTag = task.pendingReview ? '<span class="tasky-share-pill is-pending">⏳ Revisión solicitada</span>' : "";
        copy.innerHTML =
          `<span class="tasky-shared-task-title">${escapeHtml(task.title)}</span> ${reviewTag}` +
          `<small>${escapeHtml(task.createdByName || "Familiar")}${task.dueDate ? " · " + escapeHtml(task.dueDate) : ""}</small>`;

        row.append(checkBtn, copy);

        if (!isChildInBox) {
          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "task-act-btn";
          editBtn.title = "Editar tarea";
          editBtn.textContent = "✏️";
          editBtn.addEventListener("click", () => editSharedTask(sbox, task));

          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "task-act-btn";
          delBtn.title = "Eliminar tarea";
          delBtn.textContent = "✕";
          delBtn.addEventListener("click", () => deleteSharedTask(sbox, task));

          row.append(editBtn, delBtn);
        }

        listEl.appendChild(row);
      });
    }

    const addForm = card.querySelector(".tasky-shared-add-form");
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = addForm.querySelector("input");
      const title = String(input && input.value || "").trim();
      if (!title) return;
      input.value = "";
      await addSharedTask(sbox, title);
    });

    section.appendChild(card);
  });
}

async function notifyOtherBoxMembers(sbox, title, body) {
  const others = (sbox.memberUids || []).filter(uid => uid !== currentUid);
  await Promise.all(others.map(uid =>
    sendUserNotification(uid, {
      type: "shared_box_update",
      title,
      body,
      sharedBoxId: sbox.id,
      sharedBoxName: sbox.name,
      status: "info"
    })
  ));
}

async function addSharedTask(sbox, title) {
  const newTask = {
    id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    description: "",
    done: false,
    pendingReview: false,
    dueDate: getTodayISO(),
    deadlineDate: "",
    noDeadline: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdByUid: currentUid,
    createdByName: currentName
  };
  const nextTasks = [...(sbox.tasks || []), newTask];
  await updateDoc(doc(db, "shared_boxes", sbox.id), {
    tasks: nextTasks,
    updatedAt: Date.now(),
    updatedByUid: currentUid,
    updatedByName: currentName
  });
  await notifyOtherBoxMembers(sbox, `👥 Nueva tarea en «${sbox.name}»`, `${currentName} agregó: ${title}`);
}

async function toggleSharedTask(sbox, targetTask, isChildInBox) {
  const nextTasks = (sbox.tasks || []).map(t => {
    if (t.id !== targetTask.id) return t;
    if (isChildInBox) {
      return { ...t, pendingReview: true, updatedAt: Date.now() };
    }
    return { ...t, done: !t.done, pendingReview: false, updatedAt: Date.now() };
  });
  await updateDoc(doc(db, "shared_boxes", sbox.id), {
    tasks: nextTasks,
    updatedAt: Date.now(),
    updatedByUid: currentUid,
    updatedByName: currentName
  });
  if (isChildInBox) {
    showInAppBanner("Enviado a revisión de papá y mamá ✨");
    await notifyOtherBoxMembers(sbox, `✨ ${currentName} terminó una tarea en «${sbox.name}»`, `Revisa y aprueba: ${targetTask.title}`);
  } else if (!targetTask.done) {
    await notifyOtherBoxMembers(sbox, `✅ Tarea completada en «${sbox.name}»`, `${currentName} completó: ${targetTask.title}`);
  }
}

async function editSharedTask(sbox, targetTask) {
  const nextTitle = window.prompt("Editar tarea compartida:", targetTask.title || "");
  if (nextTitle === null) return;
  const trimmed = nextTitle.trim();
  if (!trimmed) return;
  const nextTasks = (sbox.tasks || []).map(t =>
    t.id === targetTask.id ? { ...t, title: trimmed, updatedAt: Date.now() } : t
  );
  await updateDoc(doc(db, "shared_boxes", sbox.id), {
    tasks: nextTasks,
    updatedAt: Date.now(),
    updatedByUid: currentUid,
    updatedByName: currentName
  });
  await notifyOtherBoxMembers(sbox, `✏️ Tarea editada en «${sbox.name}»`, `${currentName} actualizó: ${trimmed}`);
}

async function deleteSharedTask(sbox, targetTask) {
  const nextTasks = (sbox.tasks || []).filter(t => t.id !== targetTask.id);
  await updateDoc(doc(db, "shared_boxes", sbox.id), {
    tasks: nextTasks,
    updatedAt: Date.now(),
    updatedByUid: currentUid,
    updatedByName: currentName
  });
  await notifyOtherBoxMembers(sbox, `🗑️ Tarea retirada en «${sbox.name}»`, `${currentName} quitó: ${targetTask.title}`);
}

/* --------------------------------------------------------------------------
   5. Listeners en vivo Firestore (Notificaciones + Casillas Compartidas)
   -------------------------------------------------------------------------- */
function stopListeners() {
  [unsubNotifs, unsubSharedMember, unsubSharedInvited].forEach(u => {
    if (typeof u === "function") { try { u(); } catch (_) {} }
  });
  unsubNotifs = unsubSharedMember = unsubSharedInvited = null;
  sharedBoxesById.clear();
  notificationsList = [];
  knownNotifIds.clear();
  notifInitialLoaded = false;
}

function startCollabForUser(detail) {
  const uid = detail.uid || (window.TaskyAuth && window.TaskyAuth.currentUser && window.TaskyAuth.currentUser.uid) || "";
  const ws = detail.workspaceId || document.documentElement.dataset.taskyWorkspace || "";
  if (!uid || !ws) return;
  if (uid === currentUid && ws === currentWorkspaceId && unsubNotifs) return;

  stopListeners();
  currentUid = uid;
  currentWorkspaceId = ws;
  currentRole = detail.role || document.documentElement.dataset.taskyRole || "";
  currentName = detail.displayName || getMemberInfoByUid(uid).name;

  ensureBellAndModals();
  injectShareButtonsIntoBoxes();

  const notifQ = query(
    collection(db, "user_notifications", currentUid, "items"),
    orderBy("createdAt", "desc"),
    limit(30)
  );
  unsubNotifs = onSnapshot(notifQ, (snap) => {
    const next = [];
    snap.forEach((docSnap) => {
      next.push({ id: docSnap.id, ...(docSnap.data() || {}) });
    });

    if (notifInitialLoaded) {
      next.forEach((n) => {
        if (!knownNotifIds.has(n.id) && !n.read && n.fromUid !== currentUid) {
          showInAppBanner(`${n.title}`);
          showSystemNotification(n.title, n.body);
          const bell = document.getElementById("tasky-notif-bell");
          if (bell) {
            bell.classList.remove("is-ringing");
            void bell.offsetWidth;
            bell.classList.add("is-ringing");
          }
        }
      });
    } else {
      notifInitialLoaded = true;
    }

    knownNotifIds = new Set(next.map(n => n.id));
    notificationsList = next;
    updateBellBadge();
    renderNotificationsList();
  }, () => {});

  const memberQ = query(
    collection(db, "shared_boxes"),
    where("memberUids", "array-contains", currentUid)
  );
  unsubSharedMember = onSnapshot(memberQ, (snap) => {
    const nextIds = new Set();
    snap.forEach((docSnap) => {
      const sbox = { id: docSnap.id, ...(docSnap.data() || {}) };
      nextIds.add(docSnap.id);
      sharedBoxesById.set(docSnap.id, sbox);
      applyCollaboratorUpdateToOwnerBox(sbox);
    });
    Array.from(sharedBoxesById.entries()).forEach(([id, data]) => {
      const stillInvited = Array.isArray(data.invitedUids) && data.invitedUids.includes(currentUid);
      if (!nextIds.has(id) && !stillInvited) sharedBoxesById.delete(id);
    });
    injectShareButtonsIntoBoxes();
    renderSharedBoxesSection();
  }, () => {});

  const invitedQ = query(
    collection(db, "shared_boxes"),
    where("invitedUids", "array-contains", currentUid)
  );
  unsubSharedInvited = onSnapshot(invitedQ, (snap) => {
    snap.forEach((docSnap) => {
      sharedBoxesById.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() || {}) });
    });
  }, () => {});

  window.setTimeout(runSmartDailyNotifications, 3500);
}

function installBoxesObserver() {
  const boxesEl = document.getElementById("boxes-container");
  if (!boxesEl || boxesEl.dataset.taskyCollabObs === "1") return;
  boxesEl.dataset.taskyCollabObs = "1";
  const obs = new MutationObserver(() => {
    injectShareButtonsIntoBoxes();
  });
  obs.observe(boxesEl, { childList: true });
}

window.addEventListener("tasky:data-saved", (event) => {
  if (event && event.detail && event.detail.skipCollabEcho) return;
  scheduleOwnerBoxesSyncToCloud();
});

window.addEventListener("tasky:workspace-ready", (event) => {
  startCollabForUser((event && event.detail) || {});
  installBoxesObserver();
});

function detectExistingSession() {
  const ws = document.documentElement.dataset.taskyWorkspace || "";
  const uid = window.TaskyAuth && window.TaskyAuth.currentUser && window.TaskyAuth.currentUser.uid;
  if (ws && uid) {
    startCollabForUser({ uid, workspaceId: ws, role: document.documentElement.dataset.taskyRole || "" });
    installBoxesObserver();
  }
}

window.setTimeout(detectExistingSession, 700);
window.setTimeout(detectExistingSession, 2000);
