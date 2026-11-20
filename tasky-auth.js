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

function showLogin(text = "", isError = false) {
  if (profilePicker) profilePicker.hidden = false;
  if (loginForm) loginForm.hidden = false;
  if (profileSelect) profileSelect.value = selectedWorkspaceId;
  if (signoutButton) signoutButton.hidden = !currentUser;
  if (submitButton) {
    submitButton.textContent = "Entrar a " + (workspaceMetadata[selectedWorkspaceId]?.shortName || "Tasky");
  }
  setGateVisible(true);
  setMessage(text, isError);
  if (passwordInput) passwordInput.value = "";
}

function selectWorkspace(workspaceId) {
  if (!workspaceId) {
    clearSelectedWorkspace();
    if (currentUser) window.location.reload();
    return;
  }
  const meta = workspaceMetadata[workspaceId];
  if (!meta) {
    setMessage("Selecciona un perfil válido.", true);
    return;
  }
  if (!persistSelectedWorkspace(workspaceId)) return;
  if (passwordInput) passwordInput.value = "";
  if (currentUser) {
    // Clear the previous workspace's in-memory data before switching.
    window.location.reload();
    return;
  }
  if (submitButton) submitButton.textContent = "Entrar a " + meta.shortName;
  setMessage("Has seleccionado " + meta.name + ". Ingresa con tu correo y contraseña.");
}

if (profileSelect) {
  profileSelect.addEventListener("change", () => {
    selectWorkspace(String(profileSelect.value || ""));
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

    if (!selected) {
      showLogin("Selecciona primero el espacio al que deseas ingresar.");
      return;
    }

    if (memberships.has(selected)) {
      dispatchWorkspaceReady(selected);
      return;
    }

    const meta = workspaceMetadata[selected];
    showLogin(
      "Esta cuenta no tiene autorización para entrar a " + meta.name + ". Verifica que estés usando la cuenta correcta o selecciona otro perfil.",
      true
    );
  } catch (error) {
    authResolved = true;
    showLogin(
      error && error.code === "permission-denied"
        ? "No se pudieron verificar tus permisos. Comprueba las reglas y la membresía de esta cuenta."
        : "No se pudieron cargar tus permisos. Comprueba tu conexión e inténtalo nuevamente.",
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
    const email = String(emailInput && emailInput.value || "").trim();
    const password = String(passwordInput && passwordInput.value || "");

    if (!selectedWorkspaceId) {
      showLogin("Selecciona primero José, Cams o Leah.");
      return;
    }
    if (!email || !password) {
      setMessage("Escribe el correo y la contraseña de la cuenta autorizada.", true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Verificando…";
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
      submitButton.textContent = "Entrar a " + (workspaceMetadata[selectedWorkspaceId]?.shortName || "Tasky");
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
      showLogin("Has cerrado sesión. Elige un perfil para continuar.");
    } catch (error) {
      setMessage("No se pudo cerrar la sesión. Inténtalo nuevamente.", true);
    }
  });
}

if (accountButton) {
  accountButton.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("tasky:open-workspace-picker"));
    showLogin("Elige el espacio al que deseas cambiar.");
  });
}

window.addEventListener("tasky:show-workspace-picker", () => {
  showLogin("Elige el espacio al que deseas cambiar.");
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

  showLogin();
  await loadMemberships(user);
});
