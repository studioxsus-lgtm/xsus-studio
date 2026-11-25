# XSUS LOGO STUDIO — THE X IDENTITY
## Public workspace
- Projects: create, open, rename, save, delete using authenticated owner-scoped Supabase storage.
- Brief: brand name, prompt, language; display clarification and review states.
- Canvas: render validated vector documents, select variants, edit layers, undo/redo.
- Properties: colors, text, geometry, layer order; controls only when implemented.
- Export: SVG and JSON first, raster and typography-aware PDF when verified.
## Security boundary
Browser uses a user session, never internal service tokens. A trusted server gateway must validate the user, enforce request limits, and forward to Logo Engine. Do not enable public generation until this gateway is implemented and tested.
## Migration
Preserve shared authentication, desktop module navigation, mobile navigation, EN/FR/SQ, and existing modules. Remove third-party suggestion calls. Export must match the actual rendered document. Do not replace the current public page with a nonfunctional shell.
## Acceptance
Test generation, review, editing, export, project persistence and cross-user isolation. No simulated success or placeholder controls.
