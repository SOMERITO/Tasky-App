/* ==========================================================================
   TASKY WORKSPACE PICKER UI · Tarjetas interactivas de selección de espacio
   Mejora visual progresiva sobre #tasky-profile-select sin alterar tasky-auth.js.
   ========================================================================== */
(() => {
  "use strict";

  const WORKSPACE_UI = {
    jose: {
      icon: "J",
      subtitle: "Tu espacio personal",
      accent: "jose"
    },
    camila: {
      icon: "C",
      subtitle: "Tu espacio personal",
      accent: "camila"
    },
    leah: {
      icon: "L",
      subtitle: "Espacio familiar y escolar",
      accent: "leah"
    }
  };

  function parseOptionLabel(rawText) {
    const parts = String(rawText || "").split("·").map(s => s.trim()).filter(Boolean);
    return {
      title: parts[0] || String(rawText || "").trim(),
      role: parts[1] || ""
    };
  }

  function initWorkspaceCards() {
    const picker = document.getElementById("tasky-profile-picker");
    const select = document.getElementById("tasky-profile-select");
    const form = document.getElementById("tasky-login-form");
    const submitBtn = document.getElementById("tasky-login-submit");
    if (!picker || !select) return;

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
      let selectedTitle = "";

      cards.forEach(card => {
        const isSelected = card.dataset.workspace === currentVal;
        card.classList.toggle("is-selected", isSelected);
        card.setAttribute("aria-checked", isSelected ? "true" : "false");
        if (isSelected) selectedTitle = card.dataset.title || "";
      });

      if (submitBtn && !picker.hidden && !select.hidden && currentVal && selectedTitle) {
        submitBtn.textContent = "Entrar a " + selectedTitle;
      }
    }

    function renderCards() {
      const validOptions = Array.from(select.options).filter(opt => opt.value && opt.value.trim() !== "");
      const shouldShowCards = !select.hidden && !select.disabled && validOptions.length > 0;

      picker.classList.toggle("has-custom-cards", shouldShowCards);
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

        const check = document.createElement("span");
        check.className = "tasky-ws-check";
        check.setAttribute("aria-hidden", "true");
        check.innerHTML = '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg>';

        card.appendChild(avatar);
        card.appendChild(body);
        card.appendChild(check);

        card.addEventListener("click", () => {
          select.value = workspaceId;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          syncSelectedState();
        });

        card.addEventListener("dblclick", () => {
          select.value = workspaceId;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          syncSelectedState();
          if (form && typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else if (submitBtn) {
            submitBtn.click();
          }
        });

        card.addEventListener("keydown", (event) => {
          const allCards = Array.from(cardsContainer.querySelectorAll(".tasky-ws-card"));
          const idx = allCards.indexOf(card);
          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            event.preventDefault();
            const next = allCards[(idx + 1) % allCards.length];
            if (next) { next.focus(); next.click(); }
          } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            event.preventDefault();
            const prev = allCards[(idx - 1 + allCards.length) % allCards.length];
            if (prev) { prev.focus(); prev.click(); }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkspaceCards, { once: true });
  } else {
    initWorkspaceCards();
  }
})();
