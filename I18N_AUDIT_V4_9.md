# XSUS App V4.9 — Browser verification readiness

## Scope
- Added `tests/browser-language-v4-9.py` for language switching EN → SQ → FR → EN, header/Settings synchronization, user-entered prompt preservation, language persistence after reload, and JavaScript page errors.
- Test scenarios use 390×844 mobile and 1366×900 desktop viewports.
- Tests are intended to run against a local HTTP server, because ES module imports may not work from `file://`.

## Verification performed in this environment
- Static dictionary parity, JS syntax and ZIP integrity: run locally and record actual outcomes.
- Chromium launch succeeded, but page navigation to localhost was denied with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Browser assertions **did not execute**, and browser QA is **not certified**.

## How to run browser tests on a computer
1. Extract the ZIP and open a terminal in `xsus-app-modular`.
2. Install Playwright (`pip install playwright`) and its Chromium (`python -m playwright install chromium`), if needed.
3. Run `python tests/browser-language-v4-9.py`.
4. Record PASS/FAIL output; review the page manually for clipping, untranslated strings, and dialogs.

## Remaining work
Human review of translation context, dynamic strings and visual/mobile testing. No GitHub, backend or AI Core changes.
