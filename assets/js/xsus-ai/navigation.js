
/**
 * XSUS AI V3 — Navigation Controller
 * Version: 3.0.0
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Sidebar open / close
 * - Desktop sidebar collapse
 * - Mobile header navigation
 * - Active workspace navigation
 * - Keyboard accessibility
 * - Responsive behavior
 *
 * Independent UI module.
 * No AI Core dependencies.
 */

export const NAVIGATION_VERSION = "3.0.0";

export const NAVIGATION_SECTIONS = Object.freeze([
  "chat",
  "history",
  "projects",
  "knowledge",
  "settings"
]);

const MOBILE_SIDEBAR_BREAKPOINT = 900;
const MOBILE_HEADER_BREAKPOINT = 850;

function isElement(value) {
  return value instanceof HTMLElement;
}

export function createNavigation(options = {}) {
  const {
    sidebar,
    sidebarToggle = null,
    sidebarClose = null,
    sidebarCollapse = null,
    sidebarBackdrop = null,

    headerNav = null,
    headerMenuToggle = null,

    workspace = null,

    onNavigate = () => {},
    onNewChat = () => {}
  } = options;

  if (!isElement(sidebar)) {
    throw new TypeError(
      "XSUS Navigation: sidebar element is required."
    );
  }

  let destroyed = false;
  let activeSection = "chat";
  let lastSidebarTrigger = null;
  let lastHeaderTrigger = null;

  const cleanups = [];

  function listen(target, eventName, handler) {
    if (!target) return;

    target.addEventListener(eventName, handler);

    cleanups.push(() => {
      target.removeEventListener(eventName, handler);
    });
  }

  function isMobileSidebar() {
    return window.innerWidth <=
      MOBILE_SIDEBAR_BREAKPOINT;
  }

  function isMobileHeader() {
    return window.innerWidth <=
      MOBILE_HEADER_BREAKPOINT;
  }

  function getSidebarOpen() {
    return sidebar.classList.contains("is-open");
  }

  function getHeaderOpen() {
    return Boolean(
      headerNav?.classList.contains("is-open")
    );
  }

  function updateSidebarAccessibility(open) {
    if (sidebarToggle) {
      sidebarToggle.setAttribute(
        "aria-expanded",
        String(open)
      );
    }

    if (sidebarBackdrop) {
      sidebarBackdrop.hidden = !open;
    }
  }

  function closeSidebar(restoreFocus = true) {
    if (destroyed) return;

    sidebar.classList.remove("is-open");
    updateSidebarAccessibility(false);

    if (restoreFocus && isMobileSidebar()) {
      const trigger =
        lastSidebarTrigger || sidebarToggle;

      trigger?.focus();
    }
  }

  function openSidebar(trigger = sidebarToggle) {
    if (destroyed) return;

    if (!isMobileSidebar()) {
      sidebar.classList.remove("is-collapsed");
      return;
    }

    closeHeader(false);

    lastSidebarTrigger = trigger;

    sidebar.classList.add("is-open");
    updateSidebarAccessibility(true);

    const firstFocusable = sidebar.querySelector(
      "button:not([disabled]), a[href]"
    );

    firstFocusable?.focus();
  }

  function toggleSidebar() {
    if (destroyed) return;

    if (isMobileSidebar()) {
      if (getSidebarOpen()) {
        closeSidebar();
      } else {
        openSidebar();
      }

      return;
    }

    const collapsed =
      sidebar.classList.toggle("is-collapsed");

    if (sidebarCollapse) {
      sidebarCollapse.setAttribute(
        "aria-expanded",
        String(!collapsed)
      );
    }
  }

  function closeHeader(restoreFocus = true) {
    if (destroyed) return;

    headerNav?.classList.remove("is-open");

    headerMenuToggle?.setAttribute(
      "aria-expanded",
      "false"
    );

    if (restoreFocus && isMobileHeader()) {
      (lastHeaderTrigger || headerMenuToggle)?.focus();
    }
  }

  function openHeader(trigger = headerMenuToggle) {
    if (destroyed || !headerNav) return;

    if (!isMobileHeader()) return;

    closeSidebar(false);

    lastHeaderTrigger = trigger;

    headerNav.classList.add("is-open");

    headerMenuToggle?.setAttribute(
      "aria-expanded",
      "true"
    );

    headerNav.querySelector("a[href]")?.focus();
  }

  function toggleHeader() {
    if (destroyed) return;

    if (getHeaderOpen()) {
      closeHeader();
    } else {
      openHeader();
    }
  }

  function updateActiveItems(section) {
    const items = sidebar.querySelectorAll(
      "[data-nav-section]"
    );

    items.forEach(item => {
      const active =
        item.dataset.navSection === section;

      item.classList.toggle("is-active", active);

      if (active) {
        item.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function navigate(section) {
    if (destroyed) return false;

    if (!NAVIGATION_SECTIONS.includes(section)) {
      return false;
    }

    activeSection = section;

    updateActiveItems(section);

    if (workspace) {
      workspace.dataset.activeSection = section;
    }

    closeSidebar(false);
    closeHeader(false);

    onNavigate(section);

    return true;
  }

  function handleSidebarClick(event) {
    const newChatButton = event.target.closest(
      "[data-action='new-chat']"
    );

    if (
      newChatButton &&
      sidebar.contains(newChatButton)
    ) {
      closeSidebar(false);
      onNewChat();
      return;
    }

    const navigationItem = event.target.closest(
      "[data-nav-section]"
    );

    if (
      !navigationItem ||
      !sidebar.contains(navigationItem)
    ) {
      return;
    }

    const section =
      navigationItem.dataset.navSection;

    if (
      navigationItem.tagName === "A" &&
      navigationItem.hasAttribute("href")
    ) {
      const href =
        navigationItem.getAttribute("href");

      if (
        href &&
        href !== "#" &&
        !href.startsWith("#")
      ) {
        return;
      }
    }

    if (navigationItem.tagName === "A") {
      event.preventDefault();
    }

    navigate(section);
  }

  function handleDocumentPointer(event) {
    if (destroyed) return;

    const target = event.target;

    if (
      isMobileSidebar() &&
      getSidebarOpen() &&
      !sidebar.contains(target) &&
      !sidebarToggle?.contains(target)
    ) {
      closeSidebar(false);
    }

    if (
      isMobileHeader() &&
      getHeaderOpen() &&
      !headerNav?.contains(target) &&
      !headerMenuToggle?.contains(target)
    ) {
      closeHeader(false);
    }
  }

  function handleKeyboard(event) {
    if (destroyed) return;

    if (event.key === "Escape") {
      if (getSidebarOpen()) {
        closeSidebar();
      }

      if (getHeaderOpen()) {
        closeHeader();
      }
    }
  }

  function handleResize() {
    if (destroyed) return;

    if (!isMobileSidebar()) {
      sidebar.classList.remove("is-open");
      updateSidebarAccessibility(false);
    }

    if (!isMobileHeader()) {
      closeHeader(false);
    }
  }

  function initialize() {
    sidebar.classList.remove("is-open");

    if (sidebarBackdrop) {
      sidebarBackdrop.hidden = true;
    }

    if (sidebarToggle && !sidebar.id) {
      sidebar.id = "xsus-ai-sidebar";
    }

    if (sidebarToggle) {
      sidebarToggle.setAttribute(
        "aria-controls",
        sidebar.id
      );

      sidebarToggle.setAttribute(
        "aria-expanded",
        "false"
      );
    }

    if (headerNav && headerMenuToggle) {
      if (!headerNav.id) {
        headerNav.id = "xsus-ai-header-nav";
      }

      headerMenuToggle.setAttribute(
        "aria-controls",
        headerNav.id
      );

      headerMenuToggle.setAttribute(
        "aria-expanded",
        "false"
      );
    }

    listen(sidebarToggle, "click", toggleSidebar);
    listen(sidebarClose, "click", () => closeSidebar());
    listen(sidebarCollapse, "click", toggleSidebar);

    listen(
      sidebarBackdrop,
      "click",
      () => closeSidebar()
    );

    listen(
      headerMenuToggle,
      "click",
      toggleHeader
    );

    listen(
      sidebar,
      "click",
      handleSidebarClick
    );

    listen(
      document,
      "pointerdown",
      handleDocumentPointer
    );

    listen(
      document,
      "keydown",
      handleKeyboard
    );

    listen(window, "resize", handleResize);

    updateActiveItems(activeSection);
    handleResize();
  }

  initialize();

  return Object.freeze({
    navigate,

    openSidebar,
    closeSidebar,
    toggleSidebar,

    openHeader,
    closeHeader,
    toggleHeader,

    getActiveSection: () => activeSection,

    destroy() {
      if (destroyed) return;

      cleanups.forEach(cleanup => cleanup());

      sidebar.classList.remove(
        "is-open",
        "is-collapsed"
      );

      headerNav?.classList.remove("is-open");

      if (sidebarBackdrop) {
        sidebarBackdrop.hidden = true;
      }

      destroyed = true;
    }
  });
}
