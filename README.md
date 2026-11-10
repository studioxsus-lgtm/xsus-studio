# XSUS App — Modular Design V2

Design-only prototype. No backend, AI Core, Hyper XSUS Core, Supabase or persistence is connected. No code is imported from the main Studio demo.

## Entry point
- `app.html`: HTML structure only, links to modular CSS/JS.

## CSS
- `base.css`: tokens, typography, buttons, shared components
- `landing.css`: public landing page
- `header.css`: workspace header, status, responsive navigation base
- `sidebar.css`: left navigation rail
- `chat.css`: AI chat presentation and composer
- `editor.css`: code, design, split and preview presentation
- `responsive.css`: mobile/tablet rules and reduced-motion support

## JavaScript
- `app.js`: entry point
- `state.js`: local UI state and DOM helpers
- `navigation.js`: landing/workspace, sidebar, mobile panels
- `chat.js`: simulated chat only
- `editor.js`: code/design/preview mock rendering
- `notifications.js`: toast feedback

## Run
Because ES modules can be blocked on `file://` URLs, use a local HTTP server, e.g. from the project folder: `python -m http.server 8000`, then visit `http://localhost:8000/app.html`. On a phone, use an HTML preview service that supports multi-file projects or host the folder. The external Lucide icon CDN requires internet access.

## Next design tasks
Detailed visual refinement: landing page, header, sidebar, chat, editor, file tree, settings dialogs, accessibility and mobile behavior. All backend integrations remain out of scope.


## V2.1 — Header & Navigation
- Independent landing header with desktop module navigation and a mobile menu (accessible aria-expanded and Escape closing).
- Workspace header with project breadcrumb, draft status, save placeholder, settings shortcut, and exit-to-landing action.
- No authentication, backend, persistence or AI integration.
- All references to other XSUS pages are navigation links only, not imports or runtime dependencies.


## V2.2 — Landing Page detail pass
- Three app-type cards: Mobile, Web, Business tools
- Four-step design workflow (descriptive only)
- Three-panel showcase illustration
- Three concept cards that prefill the local Builder prompt
- Final CTA and expanded footer
- All new landing styles remain in `assets/css/xsus-app/landing.css`.
- No backend, storage, AI integration, or code generation.


## V2.3 — Sidebar & Dashboard
- Separate `dashboard.css` and `dashboard.js` for visual project overview.
- Dashboard sample metrics, project concept cards, type filter and text search.
- Sample concept actions load prompts in the existing Builder; New Project does not create a persistent project.
- Sidebar active navigation and focus styling; dashboard adapts to phone screens.
- All project names and counts are fictional demonstration content. No backend or AI is connected.


## V2.4 — Advanced AI Chat design
- Separate `chat-advanced.css` and updated `chat.js` for richer conversation UI.
- Temporary, in-memory demo sessions, concept cards, prompt suggestions, character counter, cancel state, copy/refine actions.
- No AI generation, uploads, persistence, backend or integration.
- Demo session history disappears on refresh; no real projects are created.


## V2.5 — Advanced Editor & Preview
- Independent `editor-advanced.css` for file explorer, code viewer, draggable split, preview toolbar and design properties.
- `editor.js` contains four local read-only sample files. The sample code is never executed or saved.
- Split divider: drag horizontally on wide screens, or use arrow keys while focused.
- Preview: desktop/tablet/mobile sizing, zoom 60–150%, optional grid overlay.
- Design mode: illustrative component selector and static properties.
- No AI, backend, build, file write or deployment integration.


## V2.6 — Advanced Visual Editor design
- New isolated `visual-editor.js` and `visual-editor.css` modules.
- Component library: heading, paragraph, button, card, input and badge.
- Layers tab: select, reorder, duplicate and remove components.
- Canvas: selection outline, editable labels and corner radius.
- All edits live only in memory; refreshing resets the demonstration.
- No drag-and-drop, source-code generation, backend, AI, persistence or publishing.


## V2.7 — Project Manager & Templates
- Project Manager overlay: search, category filter, sort, project/template tabs.
- Six template examples and three sample project concepts.
- Create/remove temporary local concept cards; nothing is persisted.
- Opening a concept only prefills the existing AI Builder composer.
- Separate CSS and JS modules; no AI Core, Hyper XSUS Core or Supabase connections.


## V2.8 — Version History & Activity Design
- Standalone `version-history.css` and `version-history.js` modules.
- Sidebar History opens a responsive dialog with sample timeline, checkpoint details, conceptual comparison, and activity list.
- Keyboard Escape, focus return and basic dialog focus trapping included.
- Restore action is explicitly non-operational and displays a design-only notification.
- All sample events are static fictional examples; no version snapshots, file changes, persistence, AI, backend or integration.

## V2.9 — Testing & Diagnostics UI
- New modular files: `testing-diagnostics.css` and `testing-diagnostics.js`.
- Tests sidebar entry opens a design-only modal with Overview, Results, Diagnostics, sample statuses, filters, details and simulated progress.
- Sample statuses are NOT real tests. No backend, AI core, or deployment integration.


## V3.0 — Publishing & Deployment UI (design only)
- New isolated `publishing.css` and `publishing.js`.
- Sidebar Publish opens a responsive modal with Overview, Configuration and Release history tabs.
- Local-only draft form with project name, target environment, suggested subdomain and release notes.
- Uses `.example.invalid` to ensure the preview address is not mistaken for a live domain.
- Preview and Reset modify only the visible UI. No network calls, deployment, domain registration, storage, builds, authentication or rollback.
- Escape key, focus return and basic focus trapping supported.


## V3.1 — Advanced Settings & Personalization
- `settings.css` and `settings.js` implement an accessible visual settings dialog.
- Appearance: accent swatches, comfortable/compact density, reduced motion.
- Editor: sample font-size and line-wrap preview (no source files modified).
- Language: preferred-language selector (UI text not translated).
- Privacy & Security: read-only unconnected service statuses.
- Settings are session-only, with no backend, credentials, or persistent storage.

## V3.2 — Responsive & UI Polish (design only)
- New `ui-polish.css` loaded last to refine touch targets, keyboard focus, contrast, wrapping and narrow-screen layout without rewriting previous component styles.
- Improved phone navigation tabs, safe-area padding, panel overflow, tablet toolbar wrapping and small-screen typography.
- Reduced-motion and forced-colors support.
- No network, backend, AI Core, Hyper XSUS Core, persistence or deployment integration.
- Browser visual testing is still required across actual devices.


## V3.3 — Official XSUS App branding
- Replaced the temporary X monogram in the public and workspace headers with the user-supplied XSUS App logo.
- Added independent `assets/images/xsus-app/` assets for the original logo, square icon and favicon.
- Added isolated `brand-refinement.css` after all existing stylesheets.
- Visual review on actual browsers is still required; no backend or engine integration.


## V3.4 — Static Design QA
- See `DESIGN_QA_V3_4.md` for reproducible static checks and outstanding browser testing.
- No claims of successful browser visual verification.


## V3.5 — i18n incremental
Language selector EN/SQ/FR added. See I18N_AUDIT_V3_5.md for precise coverage and outstanding translations.


## V3.6 — Static translations
Added SQ/FR translations for all tagged HTML strings; dynamic strings remain for next audit. See I18N_AUDIT_V3_6.md.


## V3.7
Dynamic interface localization improvements and audit: see `I18N_AUDIT_V3_7.md`. Some dynamic demonstration text remains untranslated.


## V3.8 translation audit
See `I18N_AUDIT_V3_8.md`. The three-language UI remains a work in progress; dynamic data and browser verification are outstanding.


## V3.9
See `I18N_AUDIT_V3_9.md` for dynamic Chat translation work and remaining gaps.


## V4.0
Dynamic demo UI translations for project management, version history, diagnostics and publishing. See I18N_AUDIT_V4_0.md.

## V4.1
Language-switch audit and Publishing preview refresh. Run `python tests/i18n-audit.py` (requires BeautifulSoup). See `I18N_AUDIT_V4_1.md`.

## V4.2
EN dictionary completeness, attribute-source correction, regression tests, and browser checklist. See `I18N_AUDIT_V4_2.md`.


## V4.3
Shiko `I18N_AUDIT_V4_3.md` për auditin e teksteve HTML dhe kufizimet.

## V4.4
Korrigjime të Version History, përkthime të Navigation/Editor dhe testet e regresionit. Shiko `I18N_AUDIT_V4_4.md`.


## V4.5 — Dynamic i18n regression
Shiko `I18N_AUDIT_V4_5.md`; ekzekuto `python3 tests/i18n-dynamic-v4-5.py`. Kontroll statik, jo provë shfletuesi.

## V4.6 — Browser language verification
Run `python tests/browser-language-v4-6.py` on a computer with Chromium and Playwright. The script checks both mobile and desktop viewports, language switching, persistence and JavaScript errors. See `I18N_AUDIT_V4_6.md`. Browser execution is not verified in the current restricted environment.

## V4.7 — Translation quality checks
Run `python tests/i18n-quality-v4-7.py` to verify dictionary parity, nonempty translations, and template placeholders. Browser test: `python tests/browser-language-v4-6.py`; it auto-detects system Chromium or uses `XSUS_CHROMIUM_PATH`. Browser testing requires local HTTP access and has not passed in the restricted execution environment.


## V4.8
Albanian Draft terminology corrected; run `python tests/i18n-identical-v4-8.py` for identical-value classification. See I18N_AUDIT_V4_8.md.

## V4.9 — Browser language QA
Run `python tests/browser-language-v4-9.py` on a machine with Playwright and Chromium. See `I18N_AUDIT_V4_9.md` for limitations and checklist.

## V5.0 — Mobile language QA readiness
- Fixed invalid markup inside the header language `<select>` options.
- See `I18N_AUDIT_V5_0.md` and `tests/V5_0_ANDROID_CHECKLIST.md`.
- Browser execution remains unverified.

## V5.1 — Static QA and Android language checklist
- Fixed syntax in `testing-diagnostics.js` fallback details rendering.
- Run `python tests/run-v5-1-checks.py` for seven translation checks and syntax checks of all JS modules (requires Node.js).
- Follow `tests/V5_1_ANDROID_LANGUAGE_TEST.md` to validate EN/SQ/FR in a real mobile browser.
- Browser QA has not passed in this environment because local server access was blocked.

## V5.2 — i18n contract regression
Run `python3 tests/run-v5-2-checks.py`. The additional contract check covers late-added translation attributes and DOM/i18n invariants. These are static checks, not a substitute for a real browser run. See `I18N_AUDIT_V5_2.md`.

## V5.3 — Module regression
- Dashboard notifications localized in EN/SQ/FR.
- Editor clipboard fallback and translation-function shadowing fixed.
- Run `python3 tests/module-regression-v5-3.py` and `python3 tests/run-v5-2-checks.py`.
- Browser tests remain pending.

## V5.4 — Module QA
Visual Editor controls and demo content now use EN/SQ/FR translation keys; Publishing's environment label is translated in the local preview. Static regression: `python3 tests/module-regression-v5-4.py`. See `MODULE_QA_V5_4.md`. Browser QA remains pending.

## V5.5 — Accessibility and keyboard QA
Added `assets/css/xsus-app/accessibility-v5-5.css`, skip navigation EN/SQ/FR, sidebar accessibility state and focus transitions. Run `python3 tests/accessibility-v5-5.py`. See `MODULE_QA_V5_5.md`. Browser and screen reader verification remain pending.

## V5.6 — Mobile modal & accessibility QA
Përmirësime të responsivitetit për pesë dialogët dhe fokusin e tastierës. Raporti: `MODULE_QA_V5_6.md`. Testi: `python tests/responsive-accessibility-v5-6.py`. Kjo nuk zëvendëson testimin në shfletues real.

## V5.7
Mobile navigation and focus-state hardening; see MODULE_QA_V5_7.md.

## V5.8 — Settings modal stability
Settings now preserves the prior scroll lock and restores keyboard focus safely. Run `python3 tests/modal-stability-v5-8.py`. See `MODULE_QA_V5_8.md`. Browser QA remains pending.

## V6.0 — Full static QA gate
Run `python3 tests/full-qa-v6-0.py` (Python 3 and Node.js required). The script checks HTML assets, duplicate IDs, logo assets, JS syntax, and the existing V5.2–V5.9 regression suites; writes `QA_RESULTS_V6_0.json`. See `MODULE_QA_V6_0.md`. Browser QA is not certified.

## V6.2 — XSUS Studio account links
Landing and Builder now link to XSUS Studio Login / Sign Up and display a verified account status only when served on the Studio origin. This is not a backend authorization gate. See `MODULE_QA_V6_2.md`.
