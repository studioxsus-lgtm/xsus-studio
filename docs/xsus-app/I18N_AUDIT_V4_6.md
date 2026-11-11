# XSUS App V4.6 — Browser Language Verification

## Scope
- Automated Chromium smoke test for 390×844 mobile and 1366×900 desktop viewports.
- EN → SQ → FR → EN switching, synchronized Settings selector, restoration of English labels, and language persistence after reload.
- JavaScript page error collection.
- Static dictionary coverage and JavaScript syntax checks.

## Browser environment limitation
The browser test could not complete in the current execution environment: Chromium returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` for the local HTTP address before loading `app.html`. This is **not a passing browser test** and is not evidence of a defect in the XSUS App itself.

## Run on a machine with local browser access
From the project folder, install Playwright for Python (`pip install playwright`), ensure Chromium is installed and run:

`python tests/xsus-app/browser-language-v4-6.py`

On Android, extract the ZIP and open the project through a local HTTP server rather than a `file://` URL (ES module imports require HTTP). In the page header choose EN, SQ, FR and verify the hero, menu, Builder and Settings. Confirm typed content stays intact.

## Limitations
Dictionary key coverage does not certify linguistic quality or all runtime-generated content. External Lucide CDN may be unavailable offline. No changes to GitHub, XSUS AI Core or Hyper XSUS Core.
