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

function dispatchSilentRealtimeSync(reason, retryCount = 0) {
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
    let completedStatus = null;
    window.dispatchEvent(new CustomEvent("tasky:realtime-remote-change", {
      detail: {
        reason,
        workspaceId: activeWorkspaceId,
        at: Date.now(),
        complete: (status) => {
          completedStatus = status;
          if (status === "busy" && retryCount < 3) {
            retryTimer = window.setTimeout(() => {
              dispatchSilentRealtimeSync("busy-retry", retryCount + 1);
            }, 850);
          }
        }
      }
    }));
    // Respaldo por si app.js no invocó complete (compatibilidad)
    if (completedStatus === null && reason === "snapshot" && retryCount === 0) {
      retryTimer = window.setTimeout(() => {
        if (pendingRemoteSync) flushPendingSyncIfIdle();
      }, 1500);
    }
  }, reason === "snapshot" ? 150 : 60);
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
  stopRealtimeListener();
  if (!workspaceId) return;
  activeWorkspaceId = String(workspaceId);

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

      if (!initializedSnapshot) {
        initializedSnapshot = true;
        lastSeenUpdatedAt = remoteUpdatedAt;
        dispatchSilentRealtimeSync("initial-live-attach");
        return;
      }

      if (remoteUpdatedAt > 0 && remoteUpdatedAt !== lastSeenUpdatedAt) {
        lastSeenUpdatedAt = remoteUpdatedAt;
        dispatchSilentRealtimeSync("snapshot");
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

function handleAppResume(source) {
  if (!activeWorkspaceId) return;
  dispatchSilentRealtimeSync(source);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    handleAppResume("visibility-visible");
  }
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

window.addEventListener("tasky:workspace-ready", (event) => {
  const ws = event && event.detail && event.detail.workspaceId ? String(event.detail.workspaceId) : "";
  if (ws) startRealtimeListener(ws);
});

window.TaskyRealtimeSync = {
  get isLive() { return isLiveConnected; },
  get workspaceId() { return activeWorkspaceId; },
  triggerSync() { handleAppResume("manual-api"); }
};
