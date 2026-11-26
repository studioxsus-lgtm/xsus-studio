# XSUS Logo Professional Graphic Intelligence V3

Professional V3 is an opt-in extension of the two existing generation contracts. The studio offers Professional, Creative V2 and Classic. Professional projects retain their source brief, selected concept, gallery, wordmarks, glyph outlines and graphic settings. Opening a legacy project reads its native representation. A professional edit upgrades the in-memory document and the user can undo it before saving.

## Components and files

Engine branch: graphic-v3/style.mjs, composition.mjs, typography.mjs and font-files.mjs, color.mjs, boolean.mjs, curves.mjs, scene.mjs, professional.mjs, verification.mjs, fonts/catalog.json, VERIFY.md and bench.mjs. Integration points: orchestrator.mjs, user-gateway.mjs, editor.mjs, creative-v2/contours.mjs, package.json, package-lock.json, check-core-integration.mjs and graphic-v3.test.mjs.

Public branch: logo.html and assets/xsus-logo. The updated entry, client, assistant, workspace, layers, properties, vector-canvas, view, controller, i18n, stylesheet and export modules use graphic-v3. The panel, font-assets, portable renderer, curve editing, compiled vector and PDF tools, licenses, source build instructions, and browser checks are contained within the logo module. For reproducible builds, install the engine packages, run npm ci in graphic-v3/build, set LOGO_ENGINE_DIR and run node rebuild.mjs.

## Verification

* 344 former engine tests and 256 added checks pass (600 total). The 105 treatments and 128 commercial OFL font families have individual regression checks. All 204 industry profiles, 34 sectors and 1,000 catalog symbols remain available through V2.
* Seven workspace tests passed. Chromium exercised pre-V3 and professional generation, layer edits, node dragging, Boolean source preservation, undo/redo, save, page reload, selective regeneration and responsive controls. These UI tests isolate their account and project fixtures.
* A separate rolled-back transaction on the real Supabase project inserted, reopened and updated a generated V3 gallery under its test owner. Another test owner could neither read nor update the same row.
* PDF rasterization at 72 dpi and Chromium pixel comparison on a 512 by 320 metallic wordmark gave mean RGB errors on a 0–255 scale: PNG 0.004, JPEG 0.256, WebP 0.094 and PDF 0.321. SVG/XML, embedded-font SVG, JSON and ZIP contents were checked independently. These figures describe this fixture.
* The engine benchmark generated twenty twelve-concept batches. Median 73.5 ms, 95th percentile 203.5 ms, peak process RSS 309948 KiB. Browser gallery rendering on a 360 by 800 viewport with fourfold CPU throttling: median 56.1 ms, 95th percentile 67.8 ms. This is emulation rather than device hardware timing.

## Operational limits

Editable straight SVG text embeds the licensed font; outlines preserve curved wordmarks. Font changes fetch the pinned font package and verify its digest. Ordinary viewing and outlined exports use saved path geometry. Centered strokes and opaque gradient stops support vector PDF. Other stroke alignments and transparent gradient stops require SVG. Numeric CMYK is approximate. The application does not certify PDF/X or ICC print color. Browser undo history is per session; immediate Boolean sources and the latest artwork survive a save. Visual quality metrics are heuristic.
