/* ==========================================================================
   TASKY REALTIME SYNC · Sincronización instantánea estilo WhatsApp Web / Todoist
   Mantiene un listener Firestore onSnapshot sobre workspaces/{ws}/shared/main
   y sincroniza al instante al reanudar Median.co / volver a la pestaña.
   ========================================================================== */
import { getApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const db = getFirestore(getApp("tasky-multi-workspace"));

let activeWorkspaceId = "";
let unsubscribeSnapshot = null;
let lastSeenUpdatedAt = 0;
let lastSeenDeviceId = "";
let initializedSnapshot = false;
let pendingRemoteSync = false;
let coalesceTimer = null;
let retryTimer = null;
let isLiveConnected = false;

function isUserTyping() {
  const el = document.activeElement;
  if (!el || el === document.body) return false;
  const tag = String(el.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

function dispatchSilentRealtimeSync(reason, retryCount = 0, remoteDeviceId = "") {
  if (document.visibilityState === "hidden") {
    pendingRemoteSync = true;
    return;
  }
  if (isUserTyping() && reason === "snapshot") {
    pendingRemoteSync = true;
    return;
  }
  pendingRemoteSync = false;
  window.clearTimeout(coalesceTimer);
  window.clearTimeout(retryTimer);
  coalesceTimer = window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("tasky:realtime-remote-change", {
      detail: {
        reason,
        workspaceId: activeWorkspaceId,
        remoteDeviceId: remoteDeviceId || lastSeenDeviceId || "",
        at: Date.now(),
        complete: (status) => {
          if (status === "busy" && retryCount < 4) {
            retryTimer = window.setTimeout(() => {
              dispatchSilentRealtimeSync("busy-retry", retryCount + 1, remoteDeviceId);
            }, 950);
          }
        }
      }
    }));
  }, reason === "snapshot" ? 450 : 120);
}

function flushPendingSyncIfIdle() {
  if (!pendingRemoteSync) return;
  if (document.visibilityState === "hidden" || isUserTyping()) return;
  dispatchSilentRealtimeSync("deferred-flush");
}

function stopRealtimeListener() {
  if (typeof unsubscribeSnapshot === "function") {
    try { unsubscribeSnapshot(); } catch (_) {}
  }
  unsubscribeSnapshot = null;
  isLiveConnected = false;
  initializedSnapshot = false;
}

function startRealtimeListener(workspaceId) {
  const ws = String(workspaceId || "").trim();
  if (!ws) return;
  if (ws === activeWorkspaceId && typeof unsubscribeSnapshot === "function") return;

  stopRealtimeListener();
  activeWorkspaceId = ws;

  const sharedRef = doc(db, "workspaces", activeWorkspaceId, "shared", "main");
  unsubscribeSnapshot = onSnapshot(
    sharedRef,
    { includeMetadataChanges: false },
    (snapshot) => {
      isLiveConnected = true;
      document.documentElement.dataset.taskyRealtime = "live";
      if (!snapshot || !snapshot.exists()) return;
      const data = snapshot.data() || {};
      const remoteUpdatedAt = Number(data.updatedAt || 0);
      const remoteDeviceId = String(data.deviceId || "");

      if (!initializedSnapshot) {
        initializedSnapshot = true;
        lastSeenUpdatedAt = remoteUpdatedAt;
        lastSeenDeviceId = remoteDeviceId;
        return;
      }

      if (remoteUpdatedAt > 0 && remoteUpdatedAt !== lastSeenUpdatedAt) {
        lastSeenUpdatedAt = remoteUpdatedAt;
        lastSeenDeviceId = remoteDeviceId;
        dispatchSilentRealtimeSync("snapshot", 0, remoteDeviceId);
      }
    },
    (error) => {
      isLiveConnected = false;
      document.documentElement.dataset.taskyRealtime = "reconnecting";
      if (window.TaskyFirebaseEnvironment && window.TaskyFirebaseEnvironment.isStaging) {
        console.warn("[Tasky Realtime] onSnapshot error:", error && error.code ? error.code : error);
      }
    }
  );
}

function detectAndAttachWorkspace() {
  const fromAttr = String(document.documentElement.dataset.taskyWorkspace || "").trim();
  if (fromAttr) {
    startRealtimeListener(fromAttr);
    return;
  }
  try {
    const authUser = window.TaskyAuth && window.TaskyAuth.currentUser;
    const fromSession = String(window.sessionStorage.getItem("tasky:selected-workspace:v1") || "").trim();
    if (authUser && fromSession) {
      startRealtimeListener(fromSession);
    }
  } catch (_) {}
}

function handleAppResume(source) {
  if (!activeWorkspaceId) detectAndAttachWorkspace();
  if (!activeWorkspaceId) return;
  dispatchSilentRealtimeSync(source);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    handleAppResume("visibility-visible");
  }
});

window.addEventListener("pageshow", () => {
  handleAppResume("pageshow");
});

window.addEventListener("online", () => {
  handleAppResume("network-online");
});

document.addEventListener("focusout", () => {
  window.setTimeout(flushPendingSyncIfIdle, 120);
});

// Callbacks oficiales de Median.co / GoNative cuando la app vuelve de segundo plano
const prevMedianResumed = window.median_app_resumed;
window.median_app_resumed = function (...args) {
  if (typeof prevMedianResumed === "function") {
    try { prevMedianResumed.apply(this, args); } catch (_) {}
  }
  handleAppResume("median-resumed");
};

const prevGoNativeResumed = window.gonative_app_resumed;
window.gonative_app_resumed = function (...args) {
  if (typeof prevGoNativeResumed === "function") {
    try { prevGoNativeResumed.apply(this, args); } catch (_) {}
  }
  handleAppResume("gonative-resumed");
};

// 1. Escuchar el evento normal tasky:workspace-ready
window.addEventListener("tasky:workspace-ready", (event) => {
  const ws = event && event.detail && event.detail.workspaceId ? String(event.detail.workspaceId) : "";
  if (ws) startRealtimeListener(ws);
});

// 2. Evitar race condition si tasky:workspace-ready ya ocurrió antes de cargar este módulo
const attrObserver = new MutationObserver(() => {
  detectAndAttachWorkspace();
});
attrObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-tasky-workspace"]
});

detectAndAttachWorkspace();
window.setTimeout(detectAndAttachWorkspace, 600);
window.setTimeout(detectAndAttachWorkspace, 1800);

window.TaskyRealtimeSync = {
  get isLive() { return isLiveConnected; },
  get workspaceId() { return activeWorkspaceId; },
  triggerSync() { handleAppResume("manual-api"); }
};
