# XSUS Web V0.1

Run `python3 -m http.server 8000` from the project root, then open `/web.html`. The standalone HTML preview can be opened directly.

Choose Studio, Portfolio, or Blank. Select a section in the canvas or sidebar to edit it in Properties. The active project is saved in this browser after each edit. Use **Resume project** after reloading. **New project** asks before replacing the saved draft. If storage is unavailable, keep the tab open until you have copied the work you need. A draft is local to its browser and website origin. Preview uses a sandboxed frame and layout widths of 1280, 768, and 390 CSS pixels.

| Area | Source file |
| --- | --- |
| Page structure and Builder panels | `web.html` |
| Design tokens and shared controls | `assets/css/xsus-web/base.css` |
| Header and landing page styles | `assets/css/xsus-web/header.css`, `landing.css` |
| Builder layout and panels | `assets/css/xsus-web/builder.css`, `pages.css`, `properties.css` |
| Preview and generated page styles | `assets/css/xsus-web/preview.css`, `page.css` |
| Template dialog and responsive styles | `assets/css/xsus-web/templates.css`, `responsive.css` |
| Editor startup | `assets/js/xsus-web/app.js` |
| Page and section editing | `assets/js/xsus-web/pages.js`, `sections.js`, `properties.js` |
| Template content | `assets/js/xsus-web/templates.js` |
| Layout navigation and editor state | `assets/js/xsus-web/navigation.js`, `state.js` |
| Preview devices and HTML output | `assets/js/xsus-web/preview.js`, `site-renderer.js` |
| Albanian, English, and French | `assets/js/xsus-web/i18n/sq.js`, `en.js`, `fr.js` |
| Draft persistence and validation | `assets/js/xsus-web/project-storage.js` |
| Brand artwork | `assets/images/xsus-web/brand.png` |

Account sync, AI adapters, multi-file export, and publishing from the Builder are outside V0.1.
