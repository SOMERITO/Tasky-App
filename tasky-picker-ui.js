/* ==========================================================================
   TASKY PICKER & LOGIN UI · Acceso en 1 clic, Recordar correo y Ojo animado
   Mejora visual progresiva sobre #tasky-auth-gate sin alterar tasky-auth.js.
   ========================================================================== */
(() => {
  "use strict";

  const REMEMBER_EMAIL_KEY = "tasky:remembered-email:v1";
  const REMEMBER_FLAG_KEY = "tasky:remember-email-enabled:v1";

  const WORKSPACE_UI = {
    jose: { icon: "J", subtitle: "Tu espacio personal", accent: "jose" },
    camila: { icon: "C", subtitle: "Tu espacio personal", accent: "camila" },
    leah: { icon: "L", subtitle: "Espacio familiar y escolar", accent: "leah" }
  };

  function parseOptionLabel(rawText) {
    const parts = String(rawText || "").split("·").map(s => s.trim()).filter(Boolean);
    return {
      title: parts[0] || String(rawText || "").trim(),
      role: parts[1] || ""
    };
  }

  /* ------------------------------------------------------------------------
     1. Recordar último correo + Ojo / Monito animado para ver contraseña
     ------------------------------------------------------------------------ */
  function enhanceLoginExperience() {
    const credentialsSection = document.getElementById("tasky-login-credentials");
    const emailInput = document.getElementById("tasky-login-email");
    const passwordInput = document.getElementById("tasky-login-password");
    const toggleBtn = document.getElementById("tasky-password-toggle");
    const resetBtn = document.getElementById("tasky-password-reset");
    const form = document.getElementById("tasky-login-form");

    // A) Casilla "Recordar correo" junto a "Olvidé mi contraseña"
    if (credentialsSection && emailInput && !document.getElementById("tasky-remember-email")) {
      const row = document.createElement("div");
      row.className = "tasky-auth-helper-row";

      const label = document.createElement("label");
      label.className = "tasky-remember-label";
      label.htmlFor = "tasky-remember-email";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "tasky-remember-email";
      checkbox.className = "tasky-remember-checkbox";

      const customBox = document.createElement("span");
      customBox.className = "tasky-remember-box";
      customBox.setAttribute("aria-hidden", "true");
      customBox.innerHTML = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 8.4l3 3 6.6-6.8"/></svg>';

      const text = document.createElement("span");
      text.textContent = "Recordar correo";

      label.append(checkbox, customBox, text);
      row.appendChild(label);

      if (resetBtn && resetBtn.parentElement === credentialsSection) {
        credentialsSection.insertBefore(row, resetBtn);
        row.appendChild(resetBtn);
      } else {
        credentialsSection.appendChild(row);
      }

      // Restaurar estado guardado del último correo
      try {
        const savedEnabled = window.localStorage.getItem(REMEMBER_FLAG_KEY);
        const savedEmail = String(window.localStorage.getItem(REMEMBER_EMAIL_KEY) || "").trim();
        const shouldRemember = savedEnabled === null ? true : savedEnabled === "1";
        checkbox.checked = shouldRemember;
        if (shouldRemember && savedEmail) {
          emailInput.value = savedEmail;
          // Reafirmar tras autofill del navegador si estaba distinto al recordado
          window.setTimeout(() => {
            if (checkbox.checked && savedEmail && emailInput.value !== savedEmail) {
              emailInput.value = savedEmail;
            }
          }, 260);
        }
      } catch (_) {}

      const persistRememberPreference = () => {
        try {
          if (checkbox.checked) {
            window.localStorage.setItem(REMEMBER_FLAG_KEY, "1");
            const val = String(emailInput.value || "").trim();
            if (val) window.localStorage.setItem(REMEMBER_EMAIL_KEY, val);
          } else {
            window.localStorage.setItem(REMEMBER_FLAG_KEY, "0");
            window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
          }
        } catch (_) {}
      };

      checkbox.addEventListener("change", persistRememberPreference);
      if (form) {
        form.addEventListener("submit", persistRememberPreference, true);
      }
    }

    // B) Ojo animado SVG profesional (reemplaza emoji estático 👁️ / 🙈)
    if (toggleBtn && passwordInput && !toggleBtn.dataset.animatedEyeInstalled) {
      toggleBtn.dataset.animatedEyeInstalled = "1";
      toggleBtn.classList.add("tasky-animated-eye-btn");

      const renderAnimatedEye = () => {
        const isShown = passwordInput.type === "text" || toggleBtn.getAttribute("aria-pressed") === "true";
        toggleBtn.classList.toggle("is-password-visible", isShown);
        if (!toggleBtn.querySelector(".tasky-eye-anim")) {
          toggleBtn.innerHTML =
            '<span class="tasky-eye-anim" aria-hidden="true">' +
              '<svg class="tasky-eye-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path class="eye-outline" d="M2.2 12C4.2 7.8 7.8 5.5 12 5.5s7.8 2.3 9.8 6.5c-2 4.2-5.6 6.5-9.8 6.5S4.2 16.2 2.2 12Z"/>' +
                '<circle class="eye-pupil" cx="12" cy="12" r="3.1"/>' +
                '<line class="eye-slash" x1="4" y1="4" x2="20" y2="20"/>' +
              '</svg>' +
            '</span>';
        }
      };

      renderAnimatedEye();

      // Re-aplicar nuestro SVG animado cada vez que tasky-auth.js cambia textContent al emoji
      const btnObserver = new MutationObserver(() => {
        if (!toggleBtn.querySelector(".tasky-eye-anim")) {
          renderAnimatedEye();
        } else {
          const isShown = passwordInput.type === "text" || toggleBtn.getAttribute("aria-pressed") === "true";
          toggleBtn.classList.toggle("is-password-visible", isShown);
        }
      });
      btnObserver.observe(toggleBtn, { childList: true, attributes: true, attributeFilter: ["aria-pressed"] });

      toggleBtn.addEventListener("click", () => {
        toggleBtn.classList.remove("is-blinking");
        void toggleBtn.offsetWidth;
        toggleBtn.classList.add("is-blinking");
        window.setTimeout(renderAnimatedEye, 10);
      });
    }
  }

  /* ------------------------------------------------------------------------
     2. Selector de espacios con entrada AUTOMÁTICA en 1 solo clic
     ------------------------------------------------------------------------ */
  function initWorkspaceCards() {
    const picker = document.getElementById("tasky-profile-picker");
    const select = document.getElementById("tasky-profile-select");
    const form = document.getElementById("tasky-login-form");
    const submitBtn = document.getElementById("tasky-login-submit");
    if (!picker || !select) return;

    let enteringWorkspace = false;
    let cardsContainer = picker.querySelector(".tasky-ws-cards");
    if (!cardsContainer) {
      cardsContainer = document.createElement("div");
      cardsContainer.className = "tasky-ws-cards";
      cardsContainer.setAttribute("role", "radiogroup");
      cardsContainer.setAttribute("aria-label", "Elige tu espacio");
      select.insertAdjacentElement("afterend", cardsContainer);
    }

    function syncSelectedState() {
      const currentVal = String(select.value || "");
      const cards = cardsContainer.querySelectorAll(".tasky-ws-card");
      cards.forEach(card => {
        const isSelected = card.dataset.workspace === currentVal;
        card.classList.toggle("is-selected", isSelected);
        card.setAttribute("aria-checked", isSelected ? "true" : "false");
      });
    }

    function enterWorkspaceImmediately(workspaceId, card) {
      if (enteringWorkspace || !workspaceId) return;
      enteringWorkspace = true;

      select.value = workspaceId;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncSelectedState();

      if (card) {
        card.classList.add("is-entering");
        const sub = card.querySelector(".tasky-ws-sub");
        if (sub) sub.textContent = "Entrando a tu espacio…";
      }

      window.setTimeout(() => {
        if (form && typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else if (submitBtn) {
          submitBtn.click();
        }
        window.setTimeout(() => { enteringWorkspace = false; }, 2500);
      }, 170);
    }

    function renderCards() {
      const validOptions = Array.from(select.options).filter(opt => opt.value && opt.value.trim() !== "");
      const shouldShowCards = !picker.hidden && !select.hidden && !select.disabled && validOptions.length > 0;

      picker.classList.toggle("has-custom-cards", shouldShowCards);
      if (form) form.classList.toggle("has-instant-ws-cards", shouldShowCards);
      cardsContainer.hidden = !shouldShowCards;

      if (!shouldShowCards) {
        cardsContainer.replaceChildren();
        return;
      }

      const frag = document.createDocumentFragment();
      validOptions.forEach((opt, index) => {
        const workspaceId = String(opt.value).trim();
        const meta = WORKSPACE_UI[workspaceId] || {
          icon: workspaceId.slice(0, 1).toUpperCase() || "T",
          subtitle: "Espacio autorizado",
          accent: "default"
        };
        const { title, role } = parseOptionLabel(opt.textContent);

        const card = document.createElement("button");
        card.type = "button";
        card.className = "tasky-ws-card";
        card.dataset.workspace = workspaceId;
        card.dataset.accent = meta.accent;
        card.dataset.title = title;
        card.setAttribute("role", "radio");
        card.setAttribute("aria-checked", "false");
        card.style.setProperty("--card-index", String(index));

        const avatar = document.createElement("span");
        avatar.className = "tasky-ws-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = meta.icon;

        const body = document.createElement("span");
        body.className = "tasky-ws-body";

        const topRow = document.createElement("span");
        topRow.className = "tasky-ws-top";

        const titleEl = document.createElement("span");
        titleEl.className = "tasky-ws-title";
        titleEl.textContent = title;
        topRow.appendChild(titleEl);

        if (role) {
          const roleEl = document.createElement("span");
          roleEl.className = "tasky-ws-role";
          roleEl.textContent = role;
          topRow.appendChild(roleEl);
        }

        const subEl = document.createElement("span");
        subEl.className = "tasky-ws-sub";
        subEl.textContent = meta.subtitle;

        body.appendChild(topRow);
        body.appendChild(subEl);

        const arrow = document.createElement("span");
        arrow.className = "tasky-ws-check tasky-ws-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4.5l5.5 5.5-5.5 5.5"/></svg>';

        card.appendChild(avatar);
        card.appendChild(body);
        card.appendChild(arrow);

        // Un solo clic entra automáticamente al espacio elegido
        card.addEventListener("click", () => {
          enterWorkspaceImmediately(workspaceId, card);
        });

        card.addEventListener("keydown", (event) => {
          const allCards = Array.from(cardsContainer.querySelectorAll(".tasky-ws-card"));
          const idx = allCards.indexOf(card);
          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            event.preventDefault();
            const next = allCards[(idx + 1) % allCards.length];
            if (next) next.focus();
          } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            event.preventDefault();
            const prev = allCards[(idx - 1 + allCards.length) % allCards.length];
            if (prev) prev.focus();
          }
        });

        frag.appendChild(card);
      });

      cardsContainer.replaceChildren(frag);
      syncSelectedState();
    }

    select.addEventListener("change", syncSelectedState);

    const observer = new MutationObserver(() => {
      renderCards();
    });
    observer.observe(select, {
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "disabled"]
    });
    observer.observe(picker, {
      attributes: true,
      attributeFilter: ["hidden"]
    });

    renderCards();
  }

  function bootAll() {
    enhanceLoginExperience();
    initWorkspaceCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAll, { once: true });
  } else {
    bootAll();
  }
})();
