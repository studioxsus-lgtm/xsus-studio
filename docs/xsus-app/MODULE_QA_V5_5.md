# XSUS App V5.5 — Accessibility & Keyboard QA

## Changes
- Corrected the invalid leading HTML element and restored `<!DOCTYPE html>` at the start of `app.html`.
- Added a keyboard-accessible skip link, translated in EN/SQ/FR.
- Added visible keyboard focus styling and reduced-motion support in a standalone CSS module.
- Added `aria-controls`/`aria-expanded` updates for the Builder sidebar toggle, including Escape-to-close and focus restoration.
- Improved focus placement when moving between Landing and Builder.
- Preserved the original logo and independent, design-only architecture.

## Verification scope
Static tests check structural properties and JavaScript syntax. They do not replace testing with an actual browser, keyboard, screen reader, or mobile device. Dialog focus trapping was already implemented in the preceding version; it has not been fully tested with assistive technology.

## Pending
Manual/browser testing for modal focus behavior, touch targets, visual overflow, translated labels and screen reader announcements.
