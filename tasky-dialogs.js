/* ==========================================================================
   TASKY STUDIO DIALOGS · Pop-ups profesionales estilo Apple / Linear
   Reemplaza los cuadros nativos feos de Chrome ("somerito.github.io dice")
   con modales glassmorphic animados (alert, confirm y prompt).
   ========================================================================== */
(() => {
  "use strict";

  const nativeAlert = typeof window.alert === "function" ? window.alert.bind(window) : null;

  function detectVisualMeta(message, explicitTone) {
    const text = String(message || "");
    if (explicitTone) {
      const map = {
        success: { icon: "✓", eyebrow: "TASKY · COMPLETADO", tone: "success" },
        danger: { icon: "!", eyebrow: "TASKY · CONFIRMACIÓN", tone: "danger" },
        warning: { icon: "!", eyebrow: "TASKY · ATENCIÓN", tone: "warning" },
        edit: { icon: "✎", eyebrow: "TASKY · EDITAR", tone: "primary" },
        info: { icon: "T", eyebrow: "TASKY · AVISO", tone: "primary" }
      };
      return map[explicitTone] || map.info;
    }
    if (/✅|listo|completad|fusionad|restaurad|guardad/i.test(text)) {
      return { icon: "✓", eyebrow: "TASKY · COMPLETADO", tone: "success" };
    }
    if (/error|no se pudo|fall[oó]|❌/i.test(text)) {
      return { icon: "!", eyebrow: "TASKY · AVISO", tone: "danger" };
    }
    return { icon: "T", eyebrow: "TASKY · AVISO", tone: "primary" };
  }

  function ensureDialogHost() {
    let backdrop = document.getElementById("tasky-studio-dialog-backdrop");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = "tasky-studio-dialog-backdrop";
    backdrop.className = "modal-backdrop tasky-studio-dialog-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "tasky-sd-title");
    backdrop.innerHTML =
      '<div class="modal-dialog tasky-studio-dialog">' +
        '<div class="tasky-sd-header">' +
          '<div id="tasky-sd-badge" class="tasky-sd-badge" aria-hidden="true">T</div>' +
          '<div class="tasky-sd-head-copy">' +
            '<div id="tasky-sd-eyebrow" class="tasky-sd-eyebrow">TASKY</div>' +
            '<h3 id="tasky-sd-title" class="tasky-sd-title">Aviso</h3>' +
          '</div>' +
          '<button type="button" id="tasky-sd-close" class="modal-close-btn" aria-label="Cerrar">✕</button>' +
        '</div>' +
        '<div id="tasky-sd-body" class="tasky-sd-body"></div>' +
        '<div id="tasky-sd-input-wrap" class="tasky-sd-input-wrap" hidden>' +
          '<input id="tasky-sd-input" type="text" class="tasky-sd-input" />' +
        '</div>' +
        '<div class="tasky-sd-actions">' +
          '<button type="button" id="tasky-sd-cancel" class="tasky-family-secondary" hidden>Cancelar</button>' +
          '<button type="button" id="tasky-sd-confirm" class="tasky-family-primary">Aceptar</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    return backdrop;
  }

  function splitTitleAndBody(rawMessage, customTitle) {
    const clean = String(rawMessage || "").trim();
    if (customTitle) return { title: customTitle, body: clean };
    const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      return {
        title: lines[0].replace(/^[✅❌⚠️ℹ️🎉👥✨]+\s*/, ""),
        body: lines.slice(1).join("\n")
      };
    }
    return { title: "Mensaje de Tasky", body: clean };
  }

  function openStudioDialog(mode, rawMessage, options = {}) {
    return new Promise((resolve) => {
      if (!document.body) {
        if (nativeAlert && mode === "alert") nativeAlert(rawMessage);
        resolve(mode === "prompt" ? null : true);
        return;
      }

      const backdrop = ensureDialogHost();
      const badgeEl = backdrop.querySelector("#tasky-sd-badge");
      const eyebrowEl = backdrop.querySelector("#tasky-sd-eyebrow");
      const titleEl = backdrop.querySelector("#tasky-sd-title");
      const bodyEl = backdrop.querySelector("#tasky-sd-body");
      const inputWrap = backdrop.querySelector("#tasky-sd-input-wrap");
      const inputEl = backdrop.querySelector("#tasky-sd-input");
      const cancelBtn = backdrop.querySelector("#tasky-sd-cancel");
      const confirmBtn = backdrop.querySelector("#tasky-sd-confirm");
      const closeBtn = backdrop.querySelector("#tasky-sd-close");

      const meta = detectVisualMeta(rawMessage, options.tone || (mode === "prompt" ? "edit" : mode === "confirm" ? "warning" : ""));
      const parts = splitTitleAndBody(rawMessage, options.title);

      badgeEl.textContent = meta.icon;
      badgeEl.dataset.tone = meta.tone;
      eyebrowEl.textContent = options.eyebrow || meta.eyebrow;
      titleEl.textContent = parts.title;
      bodyEl.textContent = parts.body;
      bodyEl.hidden = !parts.body;

      const isPrompt = mode === "prompt";
      const isConfirm = mode === "confirm";
      inputWrap.hidden = !isPrompt;
      cancelBtn.hidden = !(isPrompt || isConfirm);

      if (isPrompt) {
        inputEl.value = String(options.defaultValue || "");
        inputEl.placeholder = String(options.placeholder || "Escribe aquí…");
      }

      confirmBtn.textContent = options.confirmText || (isPrompt ? "Guardar" : isConfirm ? "Confirmar" : "Aceptar");
      cancelBtn.textContent = options.cancelText || "Cancelar";
      confirmBtn.classList.toggle("is-danger", meta.tone === "danger");

      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        backdrop.classList.remove("open");
        document.removeEventListener("keydown", onKeyDown, true);
        resolve(result);
      };

      const onConfirm = () => {
        if (isPrompt) finish(inputEl.value);
        else finish(true);
      };

      const onCancel = () => {
        if (isPrompt) finish(null);
        else if (isConfirm) finish(false);
        else finish(true);
      };

      const onKeyDown = (ev) => {
        if (!backdrop.classList.contains("open")) return;
        if (ev.key === "Escape") {
          ev.preventDefault();
          onCancel();
        } else if (ev.key === "Enter" && (isPrompt || !ev.shiftKey)) {
          ev.preventDefault();
          onConfirm();
        }
      };

      confirmBtn.onclick = onConfirm;
      cancelBtn.onclick = onCancel;
      closeBtn.onclick = onCancel;
      backdrop.onclick = (e) => {
        if (e.target === backdrop) onCancel();
      };

      document.addEventListener("keydown", onKeyDown, true);
      backdrop.classList.add("open");

      window.setTimeout(() => {
        if (isPrompt) {
          inputEl.focus();
          inputEl.select();
        } else {
          confirmBtn.focus();
        }
      }, 40);
    });
  }

  window.TaskyDialog = {
    alert: (message, options = {}) => openStudioDialog("alert", message, options),
    confirm: (message, options = {}) => openStudioDialog("confirm", message, options),
    prompt: (message, defaultValue = "", options = {}) =>
      openStudioDialog("prompt", message, { ...options, defaultValue })
  };

  // Reemplazar window.alert para que incluso avisos rápidos usen el diseño profesional de Tasky
  window._nativeAlert = nativeAlert;
  window.alert = function (message) {
    openStudioDialog("alert", message);
  };
})();
