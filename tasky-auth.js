import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdToken
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyBCiHv2iS76-q4y3WHgdrJ2zW5YhrvEcb8",
  authDomain: "tasky-7a30c.firebaseapp.com",
  projectId: "tasky-7a30c",
  storageBucket: "tasky-7a30c.firebasestorage.app",
  messagingSenderId: "505071526437",
  appId: "1:505071526437:web:6c9eb46dbb4fef296655cc6"
});

const app = initializeApp(firebaseConfig, "tasky-multi-workspace");
const auth = getAuth(app);
const db = getFirestore(app);

const gate = document.getElementById("tasky-auth-gate");
const loginForm = document.getElementById("tasky-login-form");
const loginPanel = loginForm;
const picker = document.getElementById("tasky-workspace-picker");
const options = document.getElementById("tasky-workspace-options");
const message = document.getElementById("tasky-auth-message");
const userLabel = document.getElementById("tasky-auth-user-label");
const submitButton = document.getElementById("tasky-login-submit");
const emailInput = document.getElementById("tasky-login-email");
const passwordInput = document.getElementById("tasky-login-password");
const resetButton = document.getElementById("tasky-password-reset");
const signoutButton = document.getElementById("tasky-auth-signout");
const accountButton = document.getElementById("btn-tasky-account");
const SELECTED_WORKSPACE_KEY = "tasky:selected-workspace:v1";

const workspaceMetadata = {
  jose: {
    name: "Tasky José",
    description: "Tu espacio personal y privado.",
    icon: "✦",
    roleLabels: { owner: "Propietario" }
  },
  camila: {
    name: "Tasky Camila",
    description: "El espacio personal de Camila.",
    icon: "✿",
    roleLabels: { owner: "Propietaria" }
  },
  leah: {
    name: "Tasky Leah",
    description: "Organización escolar y familiar compartida.",
    icon: "♡",
    roleLabels: { guardian: "Adulto responsable", child: "Cuenta de Leah" }
  }
};

let currentUser = null;
let memberships = new Map();
let authResolved = false;
let pickerOpen = false;
let membershipLoadInFlight = false;

function setMessage(text, isError = false) {
  if (!message) return;
  message.textContent = String(text || "");
  message.classList.toggle("is-error", Boolean(isError));
}

function showLogin(text = "") {
  document.documentElement.removeAttribute("data-tasky-workspace");
  document.documentElement.removeAttribute("data-tasky-role");
  if (loginPanel) loginPanel.hidden = false;
  if (picker) picker.hidden = true;
  pickerOpen = false;
  setMessage(text);
  document.documentElement.classList.add("tasky-auth-required");
  document.documentElement.classList.remove("tasky-workspace-active");
  if (gate) gate.hidden = false;
}

function showPicker() {
  if (!currentUser || !authResolved) return;
  if (loginPanel) loginPanel.hidden = true;
  if (picker) picker.hidden = false;
  pickerOpen = true;
  document.documentElement.classList.add("tasky-auth-required");
  document.documentElement.classList.remove("tasky-workspace-active");
  if (gate) gate.hidden = false;
  if (userLabel) userLabel.textContent = currentUser.email || "Cuenta autenticada";
  renderWorkspaceOptions();
}

function renderWorkspaceOptions() {
  if (!options) return;
  options.replaceChildren();
  const allowed = [...memberships.entries()]
    .filter(([, membership]) => membership && membership.active === true)
    .sort(([a], [b]) => (a === "leah" ? 1 : b === "leah" ? -1 : a.localeCompare(b)));

  if (!allowed.length) {
    setMessage("Esta cuenta todavía no tiene espacios asignados. Solicita al administrador que complete sus permisos.", true);
    return;
  }

  allowed.forEach(([workspaceId, membership]) => {
    const meta = workspaceMetadata[workspaceId];
    if (!meta) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tasky-workspace-option";
    button.dataset.workspace = workspaceId;
    button.innerHTML = `
      <span class="tasky-workspace-option-icon" aria-hidden="true">${meta.icon}</span>
      <span class="tasky-workspace-option-copy">
        <span class="tasky-workspace-option-title">${meta.name}</span>
        <span class="tasky-workspace-option-description">${meta.description}</span>
      </span>
      <span class="tasky-workspace-option-role">${meta.roleLabels[membership.role] || "Integrante"}</span>
    `;
    button.addEventListener("click", () => selectWorkspace(workspaceId));
    options.append(button);
  });
  setMessage("Selecciona uno de los espacios autorizados para tu cuenta.");
}

function selectWorkspace(workspaceId) {
  const membership = memberships.get(workspaceId);
  const meta = workspaceMetadata[workspaceId];
  if (!currentUser || !membership || membership.active !== true || !meta) {
    setMessage("No tienes permiso para entrar a ese espacio.", true);
    return;
  }
  try {
    sessionStorage.setItem(SELECTED_WORKSPACE_KEY, workspaceId);
  } catch (error) {
    setMessage("No se pudo guardar temporalmente el espacio seleccionado. Habilita el almacenamiento de sesión e inténtalo de nuevo.", true);
    return;
  }
  // Reloading discards the previous workspace's in-memory application state before loading another.
  window.location.reload();
}

async function loadMemberships(user) {
  if (!user || membershipLoadInFlight) return;
  membershipLoadInFlight = true;
  try {
    const membershipCollection = collection(db, "user_access", user.uid, "workspaces");
    const snapshot = await getDocs(membershipCollection);
    const next = new Map();
    snapshot.forEach((entry) => {
      const value = entry.data() || {};
      const workspaceId = String(entry.id || "");
      if (
        workspaceMetadata[workspaceId] &&
        value.workspaceId === workspaceId &&
        value.active === true &&
        ["owner", "guardian", "child"].includes(value.role) &&
        (value.role !== "child" || value.childAccessEnabled === true)
      ) {
        next.set(workspaceId, {
          active: true,
          role: value.role,
          workspaceId,
          displayName: String(value.displayName || workspaceMetadata[workspaceId].name)
        });
      }
    });
    memberships = next;
    authResolved = true;

    if (!memberships.size) {
      showPicker();
      setMessage("La cuenta inició sesión, pero todavía no tiene espacios asignados.", true);
      return;
    }

    let selected = "";
    try {
      selected = sessionStorage.getItem(SELECTED_WORKSPACE_KEY) || "";
    } catch (error) {}

    if (selected && memberships.has(selected)) {
      dispatchWorkspaceReady(selected);
      return;
    }

    if (selected) {
      try { sessionStorage.removeItem(SELECTED_WORKSPACE_KEY); } catch (error) {}
    }

    if (memberships.size === 1) {
      const onlyWorkspace = memberships.keys().next().value;
      selectWorkspace(onlyWorkspace);
      return;
    }

    showPicker();
  } catch (error) {
    authResolved = true;
    showPicker();
    setMessage(
      error && error.code === "permission-denied"
        ? "No se pudieron leer los espacios autorizados. Verifica las reglas y la membresía de esta cuenta."
        : "No se pudieron cargar tus espacios. Comprueba tu conexión e inténtalo nuevamente.",
      true
    );
  } finally {
    membershipLoadInFlight = false;
  }
}

function dispatchWorkspaceReady(workspaceId) {
  const membership = memberships.get(workspaceId);
  const meta = workspaceMetadata[workspaceId];
  if (!membership || !meta || !currentUser) return;
  setMessage("");
  if (gate) gate.hidden = true;
  document.documentElement.classList.remove("tasky-auth-required");
  document.documentElement.classList.add("tasky-workspace-active");
  document.documentElement.dataset.taskyRole = membership.role;
  window.dispatchEvent(new CustomEvent("tasky:workspace-ready", {
    detail: {
      uid: currentUser.uid,
      workspaceId,
      role: membership.role,
      workspaceName: meta.name,
      displayName: membership.displayName
    }
  }));
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = String(emailInput && emailInput.value || "").trim();
    const password = String(passwordInput && passwordInput.value || "");
    if (!email || !password) {
      setMessage("Escribe tu correo y contraseña.", true);
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = "Ingresando…";
    setMessage("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (passwordInput) passwordInput.value = "";
    } catch (error) {
      setMessage(
        error && ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(error.code)
          ? "El correo o la contraseña no son correctos."
          : error && error.code === "auth/too-many-requests"
            ? "Se han realizado demasiados intentos. Espera un momento y vuelve a intentarlo."
            : "No se pudo iniciar sesión. Comprueba la conexión y los datos ingresados.",
        true
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Iniciar sesión";
    }
  });
}

if (resetButton) {
  resetButton.addEventListener("click", async () => {
    const email = String(emailInput && emailInput.value || "").trim();
    if (!email) {
      setMessage("Escribe tu correo electrónico para enviarte el enlace de recuperación.", true);
      emailInput && emailInput.focus();
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Si la cuenta existe, recibirás un correo con los pasos para restablecer la contraseña.");
    } catch (error) {
      setMessage("No se pudo enviar el correo de recuperación. Comprueba la dirección e inténtalo de nuevo.", true);
    }
  });
}

if (signoutButton) {
  signoutButton.addEventListener("click", async () => {
    try {
      try { sessionStorage.removeItem(SELECTED_WORKSPACE_KEY); } catch (error) {}
      await signOut(auth);
      memberships = new Map();
      showLogin("Has cerrado sesión.");
    } catch (error) {
      setMessage("No se pudo cerrar la sesión. Inténtalo nuevamente.", true);
    }
  });
}

if (accountButton) {
  accountButton.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("tasky:open-workspace-picker"));
    showPicker();
  });
}

window.addEventListener("tasky:show-workspace-picker", showPicker);
window.addEventListener("storage", (event) => {
  if (event.key === "firebase:authUser:" + auth.app.options.apiKey + ":[DEFAULT]" && !event.newValue) {
    try { sessionStorage.removeItem(SELECTED_WORKSPACE_KEY); } catch (error) {}
    window.location.reload();
  }
});

window.TaskyAuth = {
  get currentUser() { return currentUser; },
  getIdToken: async (forceRefresh = false) => {
    if (!currentUser) throw new Error("No hay una sesión activa.");
    return getIdToken(currentUser, forceRefresh);
  },
  getMembership: (workspaceId) => memberships.get(String(workspaceId)) || null,
  get memberships() {
    return [...memberships.entries()].map(([workspaceId, membership]) => ({ workspaceId, ...membership }));
  },
  signOut: async () => {
    try { sessionStorage.removeItem(SELECTED_WORKSPACE_KEY); } catch (error) {}
    await signOut(auth);
  }
};

showLogin();
onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  memberships = new Map();
  authResolved = false;
  membershipLoadInFlight = false;
  if (!user) {
    try { sessionStorage.removeItem(SELECTED_WORKSPACE_KEY); } catch (error) {}
    showLogin();
    return;
  }
  showPicker();
  await loadMemberships(user);
});
