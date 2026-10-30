/* Tasky — navegación móvil por pantallas independientes. */
(() => {
  "use strict";

  const media = window.matchMedia("(max-width: 700px)");
  const navIds = {
    today: "mobile-nav-today",
    boxes: "mobile-nav-boxes",
    search: "mobile-nav-search",
    progress: "mobile-nav-progress",
    more: "mobile-nav-more"
  };
  const searchInput = document.getElementById("search-input");
  let currentView = "today";
  let returnView = "today";
  let savedSearch = searchInput ? searchInput.value : "";

  const isMobile = () => media.matches;

  function clickTab(tabName) {
    const tab = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
    if (tab) tab.click();
  }

  function fireSearchUpdate() {
    if (!searchInput) return;
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    searchInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function updateNav() {
    Object.entries(navIds).forEach(([view, id]) => {
      const button = document.getElementById(id);
      if (!button) return;
      const active = view === currentView;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function setView(view, options = {}) {
    if (!isMobile()) return;
    const previousView = currentView;
    if (previousView === "search" && view !== "search" && searchInput) {
      savedSearch = searchInput.value;
    }
    if (view !== "search" && searchInput && searchInput.value) {
      searchInput.value = "";
      fireSearchUpdate();
    }
    if (view === "search" && searchInput) {
      searchInput.value = savedSearch || "";
      fireSearchUpdate();
    }

    currentView = view;
    document.body.dataset.mobileView = view;
    updateNav();

    if (view === "today") clickTab("today");
    if (view === "boxes" || view === "search") clickTab("all");

    if (view === "search" && searchInput && options.focusSearch !== false) {
      window.setTimeout(() => {
        searchInput.focus({ preventScroll: true });
        searchInput.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 120);
    } else if (options.scrollTop !== false) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function openOverlayView(view, triggerId) {
    if (!isMobile()) return;
    if (currentView !== "progress" && currentView !== "more") returnView = currentView;
    setView(view, { scrollTop: false });
    const trigger = document.getElementById(triggerId);
    if (trigger) trigger.click();
  }

  function restoreReturnView() {
    if (!isMobile() || (currentView !== "progress" && currentView !== "more")) return;
    const destination = returnView || "today";
    setView(destination);
  }

  function installOverlayObserver(id, view) {
    const overlay = document.getElementById(id);
    if (!overlay || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      if (currentView === view && !overlay.classList.contains("open")) {
        restoreReturnView();
      }
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
  }

  function handleMobileNavClick(event, button) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    switch (button.id) {
      case navIds.today:
        setView("today");
        break;
      case navIds.boxes:
        setView("boxes");
        break;
      case navIds.search:
        setView("search");
        break;
      case navIds.progress:
        openOverlayView("progress", "btn-open-productivity");
        break;
      case navIds.more:
        openOverlayView("more", "btn-more-options");
        break;
    }
  }

  document.addEventListener("click", event => {
    if (!isMobile()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const navButton = target.closest(".mobile-app-nav-item");
    if (navButton && Object.values(navIds).includes(navButton.id)) {
      handleMobileNavClick(event, navButton);
      return;
    }

    if (target.closest("#btn-open-productivity")) {
      if (currentView !== "progress" && currentView !== "more") returnView = currentView;
      setView("progress", { scrollTop: false });
      return;
    }

    if (target.closest("#btn-more-options")) {
      if (currentView !== "progress" && currentView !== "more") returnView = currentView;
      setView("more", { scrollTop: false });
    }
  }, true);

  let pullToRefreshInstalled = false;

  function installPullToRefresh() {
    if (pullToRefreshInstalled || !isMobile()) return;
    pullToRefreshInstalled = true;

    const indicator = document.createElement("div");
    indicator.id = "tasky-pull-refresh";
    indicator.className = "tasky-pull-refresh";
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-live", "polite");
    indicator.innerHTML = '<span class="tasky-pull-refresh-spinner" aria-hidden="true"></span><span id="tasky-pull-refresh-label">Desliza hacia abajo para actualizar</span>';
    document.body.appendChild(indicator);

    const label = indicator.querySelector("#tasky-pull-refresh-label");
    const threshold = 52;
    let tracking = false;
    let pulling = false;
    let refreshing = false;
    let startX = 0;
    let startY = 0;
    let pullDistance = 0;

    const pageScrollTop = () => Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    );

    const canStart = event => {
      if (!isMobile() || refreshing || event.touches.length !== 1 || pageScrollTop() > 1) return false;
      if (document.querySelector(".modal-backdrop.open")) return false;
      const target = event.target instanceof Element ? event.target : null;
      if (target && target.closest("input, textarea, select, button, a, [contenteditable='true'], .top-navbar, .mobile-app-nav, .controls-bar, .fab-wrapper, [data-no-pull-refresh]")) return false;
      return true;
    };

    const resetIndicator = () => {
      indicator.classList.remove("is-visible", "is-pulling", "is-refreshing");
      indicator.style.removeProperty("--pull-distance");
      pullDistance = 0;
      pulling = false;
    };

    document.addEventListener("touchstart", event => {
      if (!canStart(event)) {
        tracking = false;
        return;
      }
      tracking = true;
      pulling = false;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      pullDistance = 0;
    }, { passive: true });

    document.addEventListener("touchmove", event => {
      if (!tracking || event.touches.length !== 1 || refreshing) return;
      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (deltaY < -4 || (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12)) {
        tracking = false;
        if (pulling) resetIndicator();
        return;
      }
      if (deltaY <= 10 || pageScrollTop() > 1) return;

      // Intercept only a downward gesture that begins at the top of the page.
      // Normal vertical scrolling and horizontal swipes remain native.
      event.preventDefault();
      pulling = true;
      pullDistance = Math.min(92, Math.max(0, (deltaY - 10) * 0.58));
      indicator.style.setProperty("--pull-distance", (pullDistance * 0.72).toFixed(1) + "px");
      indicator.classList.add("is-visible", "is-pulling");
      if (label) label.textContent = pullDistance >= threshold ? "Suelta para actualizar" : "Desliza para actualizar";
    }, { passive: false });

    document.addEventListener("touchend", async () => {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;

      if (pullDistance < threshold || refreshing) {
        resetIndicator();
        return;
      }

      refreshing = true;
      indicator.classList.remove("is-pulling");
      indicator.classList.add("is-refreshing", "is-visible");
      indicator.style.setProperty("--pull-distance", "0px");
      if (label) label.textContent = "Actualizando Tasky…";

      let status = "error";
      try {
        status = await new Promise(resolve => {
          let completed = false;
          const finish = result => {
            if (completed) return;
            completed = true;
            resolve(result || "error");
          };
          window.dispatchEvent(new CustomEvent("tasky:manual-refresh", {
            detail: { complete: finish }
          }));
          window.setTimeout(() => finish("error"), 20000);
        });
      } catch (error) {
        status = "error";
      }

      if (label) {
        const messages = {
          synced: "Tasky está actualizado",
          syncing: "Cambios aplicados · sincronizando",
          offline: "Sin conexión a Internet",
          unverified: "No se pudo verificar la nube",
          busy: "Actualización en curso",
          error: "No se pudo actualizar"
        };
        label.textContent = messages[status] || "Actualización finalizada";
      }

      indicator.classList.remove("is-refreshing", "is-pulling");
      window.setTimeout(() => {
        refreshing = false;
        resetIndicator();
      }, 1050);
    }, { passive: true });

    document.addEventListener("touchcancel", () => {
      tracking = false;
      if (!refreshing) resetIndicator();
    }, { passive: true });
  }

  function initializeMobileExperience() {
    if (document.readyState === "loading") return;
    if (!isMobile()) {
      delete document.body.dataset.mobileView;
      return;
    }
    currentView = "today";
    document.body.dataset.mobileView = "today";
    updateNav();
    clickTab("today");
    installPullToRefresh();
  }

  installOverlayObserver("modal-productivity", "progress");
  installOverlayObserver("modal-options", "more");

  // app.js registers its controls during DOMContentLoaded; initialize mobile
  // navigation afterwards so the initial "Hoy" filter is not lost.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMobileExperience, { once: true });
  } else {
    initializeMobileExperience();
  }

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", initializeMobileExperience);
  } else if (typeof media.addListener === "function") {
    media.addListener(initializeMobileExperience);
  }

  window.addEventListener("pageshow", () => {
    if (isMobile() && !document.body.dataset.mobileView) initializeMobileExperience();
  });
})();
