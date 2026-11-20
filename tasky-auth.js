import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdToken,
  connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const emulatorRequested = window.__TASKY_USE_FIREBASE_EMULATORS__ === true;
const localHosts = new Set(["localhost", "127.0.0.1"]);
const firebaseEnvironment = window.TaskyFirebaseEnvironment;
if (!firebaseEnvironment || !firebaseEnvironment.config) {
  throw new Error("No se pudo determinar el entorno Firebase de Tasky.");
}
if (emulatorRequested && (!localHosts.has(window.location.hostname) || firebaseEnvironment.isEmulator !== true)) {
  throw new Error("Tasky Firebase Emulators solo se pueden usar desde localhost.");
}

const firebaseConfig = Object.freeze({ ...firebaseEnvironment.config });

const app = initializeApp(firebaseConfig, "tasky-multi-workspace");
const auth = getAuth(app);
const db = getFirestore(app);

if (firebaseEnvironment.isEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

const gate = document.getElementById("tasky-auth-gate");
const profilePicker = document.getElementById("tasky-profile-picker");
const credentialsPanel = document.getElementById("tasky-login-credentials");
const profileSelect = document.getElementById("tasky-profile-select");
const loginForm = document.getElementById("tasky-login-form");
const message = document.getElementById("tasky-auth-message");
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
    shortName: "José",
    greetingName: "José Carranza",
    description: "Tu espacio personal",
    icon: "J",
    roleLabels: { owner: "Propietario" }
  },
  camila: {
    name: "Tasky Cams",
    shortName: "Cams",
    greetingName: "Camila",
    description: "Su espacio personal",
    icon: "C",
    roleLabels: { owner: "Propietaria" }
  },
  leah: {
    name: "Tasky Leah",
    shortName: "Leah",
    greetingName: "Leah",
    description: "Espacio familiar y escolar",
    icon: "L",
    roleLabels: { guardian: "Adulto responsable", child: "Cuenta de Leah" }
  }
};

let currentUser = null;
let memberships = new Map();
let authResolved = false;
let membershipLoadInFlight = false;
let selectedWorkspaceId = readSelectedWorkspace();

function readSelectedWorkspace() {
  try {
    const value = sessionStorage.getItem(SELECTED_WORKSPACE_KEY) || "";
    return Object.prototype.hasOwnProperty.call(workspaceMetadata, value) ? value : "";
  } catch (error) {
    return "";
  }
}

function persistSelectedWorkspace(workspaceId) {
  try {
    sessionStorage.setItem(SELECTED_WORKSPACE_KEY, workspaceId);
    selectedWorkspaceId = workspaceId;
    return true;
  } catch (error) {
    setMessage("No se pudo guardar temporalmente el perfil seleccionado. Habilita el almacenamiento de sesión e inténtalo de nuevo.", true);
    return false;
  }
}

function clearSelectedWorkspace() {
  selectedWorkspaceId = "";
  try { sessionStorage.removeItem(SELECTED_WORKSPACE_KEY); } catch (error) {}
}

function setMessage(text, isError = false) {
  if (!message) return;
  message.textContent = String(text || "");
  message.classList.toggle("is-error", Boolean(isError));
}

function setGateVisible(visible) {
  if (gate) gate.hidden = !visible;
  if (visible) {
    document.documentElement.classList.add("tasky-auth-required");
    document.documentElement.classList.remove("tasky-workspace-active");
  }
}

function setSubmitLabel(label) {
  if (submitButton) submitButton.textContent = label;
}

function showLogin(text = "", isError = false) {
  if (credentialsPanel) credentialsPanel.hidden = false;
  if (profilePicker) profilePicker.hidden = true;
  if (loginForm) loginForm.hidden = false;
  if (signoutButton) signoutButton.hidden = true;
  if (resetButton) resetButton.hidden = false;
  if (submitButton) {
    submitButton.disabled = false;
    setSubmitLabel("Iniciar sesión");
  }
  setGateVisible(true);
  setMessage(text, isError);
}

function showWorkspacePicker(text = "", isError = false) {
  if (credentialsPanel) credentialsPanel.hidden = true;
  if (profilePicker) profilePicker.hidden = false;
  if (loginForm) loginForm.hidden = false;
  if (resetButton) resetButton.hidden = true;
  if (signoutButton) signoutButton.hidden = false;

  if (profileSelect) {
    const previouslySelected = String(profileSelect.value || selectedWorkspaceId || "");
    profileSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = memberships.size ? "Selecciona un espacio" : "No hay espacios disponibles";
    profileSelect.append(placeholder);

    memberships.forEach((membership, workspaceId) => {
      const meta = workspaceMetadata[workspaceId];
      if (!meta) return;
      const option = document.createElement("option");
      option.value = workspaceId;
      const roleLabel = meta.roleLabels && meta.roleLabels[membership.role]
        ? meta.roleLabels[membership.role]
        : "Acceso autorizado";
      option.textContent = meta.name + " · " + roleLabel;
      profileSelect.append(option);
    });

    profileSelect.value = memberships.has(previouslySelected) ? previouslySelected : "";
    profileSelect.disabled = memberships.size === 0;
  }

  if (submitButton) {
    submitButton.disabled = memberships.size === 0;
    const selected = String(profileSelect && profileSelect.value || "");
    setSubmitLabel(selected && workspaceMetadata[selected]
      ? "Entrar a " + workspaceMetadata[selected].shortName
      : "Continuar");
  }
  setGateVisible(true);
  setMessage(text, isError);
  if (passwordInput) passwordInput.value = "";
}

function selectWorkspace(workspaceId) {
  if (!currentUser || !memberships.has(workspaceId)) {
    showWorkspacePicker("Selecciona uno de los espacios autorizados para tu cuenta.", true);
    return;
  }
  if (!persistSelectedWorkspace(workspaceId)) return;
  if (passwordInput) passwordInput.value = "";
  // Reloading clears all in-memory data from the previously active workspace.
  window.location.reload();
}

if (profileSelect) {
  profileSelect.addEventListener("change", () => {
    const workspaceId = String(profileSelect.value || "");
    setSubmitLabel(workspaceId && workspaceMetadata[workspaceId]
      ? "Entrar a " + workspaceMetadata[workspaceId].shortName
      : "Continuar");
    setMessage("");
  });
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
          displayName: (() => {
            const storedName = String(value.displayName || user.displayName || "").trim();
            return storedName && !storedName.startsWith("Tasky ")
              ? storedName
              : workspaceMetadata[workspaceId].greetingName;
          })()
        });
      }
    });

    memberships = next;
    authResolved = true;

    const selected = readSelectedWorkspace();
    selectedWorkspaceId = selected;
    if (selected && memberships.has(selected)) {
      dispatchWorkspaceReady(selected);
      return;
    }
    if (selected) clearSelectedWorkspace();

    if (!memberships.size) {
      showWorkspacePicker(
        "Tu cuenta fue identificada, pero todavía no tiene espacios autorizados. Solicita a un administrador que configure tu acceso.",
        true
      );
      return;
    }

    showWorkspacePicker("Identidad verificada. Selecciona el espacio al que deseas ingresar.");
  } catch (error) {
    authResolved = true;
    showWorkspacePicker(
      error && error.code === "permission-denied"
        ? "No se pudieron verificar tus permisos. Comprueba las reglas y la membresía de esta cuenta."
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
  setGateVisible(false);
  document.documentElement.removeAttribute("data-tasky-workspace");
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

    if (currentUser) {
      const workspaceId = String(profileSelect && profileSelect.value || "");
      if (!workspaceId || !memberships.has(workspaceId)) {
        showWorkspacePicker("Selecciona uno de los espacios autorizados para tu cuenta.", true);
        return;
      }
      selectWorkspace(workspaceId);
      return;
    }

    const email = String(emailInput && emailInput.value || "").trim();
    const password = String(passwordInput && passwordInput.value || "");
    if (!email || !password) {
      setMessage("Escribe tu correo y contraseña para continuar.", true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Verificando cuenta…";
    setMessage("");
    clearSelectedWorkspace();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (passwordInput) passwordInput.value = "";
      setMessage("Cuenta verificada. Estamos cargando tus espacios autorizados.");
    } catch (error) {
      setMessage(
        error && ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(error.code)
          ? "El correo o la contraseña no son correctos."
          : error && error.code === "auth/too-many-requests"
            ? "Se han realizado demasiados intentos. Espera un momento y vuelve a intentarlo."
            : "No se pudo iniciar sesión. Comprueba la conexión y los datos ingresados.",
        true
      );
      submitButton.disabled = false;
      setSubmitLabel("Iniciar sesión");
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
      setMessage("Si la cuenta existe, recibirás un correo con los pasos para restablecer tu contraseña.");
    } catch (error) {
      setMessage("No se pudo enviar el correo de recuperación. Comprueba la dirección e inténtalo de nuevo.", true);
    }
  });
}

if (signoutButton) {
  signoutButton.addEventListener("click", async () => {
    try {
      clearSelectedWorkspace();
      memberships = new Map();
      await signOut(auth);
      currentUser = null;
      showLogin("Has cerrado sesión. Ingresa con tu correo y contraseña.");
    } catch (error) {
      setMessage("No se pudo cerrar la sesión. Inténtalo nuevamente.", true);
    }
  });
}

if (accountButton) {
  accountButton.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("tasky:open-workspace-picker"));
    showWorkspacePicker("Elige uno de los espacios autorizados para tu cuenta.");
  });
}

window.addEventListener("tasky:show-workspace-picker", () => {
  showWorkspacePicker("Elige uno de los espacios autorizados para tu cuenta.");
});

window.addEventListener("storage", (event) => {
  if (event.key === "firebase:authUser:" + auth.app.options.apiKey + ":[DEFAULT]" && !event.newValue) {
    clearSelectedWorkspace();
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
    clearSelectedWorkspace();
    memberships = new Map();
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
    showLogin();
    return;
  }

  showWorkspacePicker("Verificando los espacios autorizados de tu cuenta…");
  await loadMemberships(user);
});
