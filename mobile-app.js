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
