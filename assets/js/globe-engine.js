
/**
 * XSUS STUDIO — GLOBE ENGINE
 * Version: 1.0.0
 *
 * Interactive Neon Globe V4.1
 * Independent JavaScript module.
 */

(() => {
  "use strict";

  function initializeGlobe() {
    const globe = document.querySelector(".xsus-globe");

    if (!globe) return;

    if (globe.dataset.engineReady === "true") return;
    globe.dataset.engineReady = "true";

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let rotationX = -18;
    let rotationY = 0;

    let dragging = false;
    let activePointerId = null;
    let previousX = 0;
    let previousY = 0;

    let animationFrame = null;
    let lastFrameTime = null;

    function render() {
      globe.style.setProperty(
        "--globe-x",
        `${rotationX}deg`
      );

      globe.style.setProperty(
        "--globe-y",
        `${rotationY}deg`
      );
    }

    function onPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      dragging = true;
      activePointerId = event.pointerId;

      previousX = event.clientX;
      previousY = event.clientY;

      globe.classList.add("dragging");

      if (globe.setPointerCapture) {
        globe.setPointerCapture(event.pointerId);
      }
    }

    function onPointerMove(event) {
      if (!dragging || event.pointerId !== activePointerId) {
        return;
      }

      const deltaX = event.clientX - previousX;
      const deltaY = event.clientY - previousY;

      previousX = event.clientX;
      previousY = event.clientY;

      rotationY += deltaX * 0.45;
      rotationX -= deltaY * 0.35;

      rotationX = Math.max(
        -75,
        Math.min(75, rotationX)
      );

      render();
    }

    function onPointerUp(event) {
      if (event.pointerId !== activePointerId) {
        return;
      }

      dragging = false;
      activePointerId = null;

      globe.classList.remove("dragging");

      if (
        globe.hasPointerCapture &&
        globe.hasPointerCapture(event.pointerId)
      ) {
        globe.releasePointerCapture(event.pointerId);
      }
    }

    function animate(timestamp) {
      if (lastFrameTime === null) {
        lastFrameTime = timestamp;
      }

      const deltaTime = Math.min(
        timestamp - lastFrameTime,
        100
      );

      lastFrameTime = timestamp;

      if (!dragging && !reducedMotion.matches) {
        rotationY += deltaTime * 0.006;
        render();
      }

      animationFrame = window.requestAnimationFrame(
        animate
      );
    }

    function onKeyDown(event) {
      const step = 8;

      switch (event.key) {
        case "ArrowLeft":
          rotationY -= step;
          break;

        case "ArrowRight":
          rotationY += step;
          break;

        case "ArrowUp":
          rotationX = Math.min(75, rotationX + step);
          break;

        case "ArrowDown":
          rotationX = Math.max(-75, rotationX - step);
          break;

        default:
          return;
      }

      event.preventDefault();
      render();
    }

    globe.addEventListener(
      "pointerdown",
      onPointerDown
    );

    globe.addEventListener(
      "pointermove",
      onPointerMove
    );

    globe.addEventListener(
      "pointerup",
      onPointerUp
    );

    globe.addEventListener(
      "pointercancel",
      onPointerUp
    );

    globe.addEventListener(
      "keydown",
      onKeyDown
    );

    if (!globe.hasAttribute("tabindex")) {
      globe.setAttribute("tabindex", "0");
    }

    globe.setAttribute(
      "aria-label",
      "XSUS interactive globe. Use arrow keys to rotate."
    );

    render();

    animationFrame = window.requestAnimationFrame(
      animate
    );

    window.addEventListener(
      "pagehide",
      () => {
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
      },
      { once: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeGlobe,
      { once: true }
    );
  } else {
    initializeGlobe();
  }
})();
