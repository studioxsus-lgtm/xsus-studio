/** XSUS App V5.9 — design-only modal coordination. */
const MODALS = Object.freeze([
  ['pmOverlay', 'pmClose'],
  ['vhOverlay', 'vhClose'],
  ['tdOverlay', 'tdClose'],
  ['pubOverlay', 'pubClose'],
  ['stOverlay', 'stClose'],
]);

export function initModalCoordinator() {
  const entries = MODALS.map(([overlayId, closeId]) => ({
    overlay: document.getElementById(overlayId),
    close: document.getElementById(closeId),
  })).filter(entry => entry.overlay && entry.close);
  let reconciling = false;
  const isOpen = entry => !entry.overlay.classList.contains('hidden');
  const reconcile = newlyOpened => {
    if (reconciling || !isOpen(newlyOpened)) return;
    reconciling = true;
    try {
      const target = newlyOpened.overlay.querySelector('[role="dialog"]');
      for (const entry of entries) {
        if (entry !== newlyOpened && isOpen(entry)) entry.close.click();
      }
      // Some existing close handlers reset overflow unconditionally.
      document.body.style.overflow = 'hidden';
      if (target && !target.contains(document.activeElement)) {
        target.focus({ preventScroll: true });
      }
    } finally {
      reconciling = false;
    }
  };
  for (const entry of entries) {
    let wasOpen = isOpen(entry);
    const observer = new MutationObserver(() => {
      const nowOpen = isOpen(entry);
      if (nowOpen && !wasOpen) reconcile(entry);
      wasOpen = nowOpen;
    });
    observer.observe(entry.overlay, { attributes: true, attributeFilter: ['class'] });
  }
}
