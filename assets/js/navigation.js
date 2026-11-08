
/**
 * XSUS STUDIO — NAVIGATION
 * Version: 1.0.0
 *
 * Mobile navigation controller.
 * Independent from Globe and Language Engine.
 */

(() => {
  "use strict";

  function initializeNavigation() {
    const menuButton = document.querySelector(
      ".menu-toggle"
    );

    const navigation = document.querySelector(
      ".nav"
    );

    if (!menuButton || !navigation) {
      return;
    }

    if (menuButton.dataset.navigationReady === "true") {
      return;
    }

    menuButton.dataset.navigationReady = "true";

    if (!navigation.id) {
      navigation.id = "xsus-main-navigation";
    }

    menuButton.setAttribute(
      "aria-controls",
      navigation.id
    );

    function setMenuOpen(isOpen) {
      navigation.classList.toggle("open", isOpen);

      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu"
      );
    }

    setMenuOpen(false);

    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.contains("open");
      setMenuOpen(!isOpen);
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (
        !navigation.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) {
        setMenuOpen(false);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeNavigation,
      { once: true }
    );
  } else {
    initializeNavigation();
  }
})();
