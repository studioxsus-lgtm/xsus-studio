# XSUS App V6.1 — Full verification

All 14 V6.0 static/regression gates were rerun; see `QA_RESULTS_V6_0.json` for exact results.

A new Playwright/Chromium smoke test (`tests/browser-smoke-v6-1.py`) attempts desktop and mobile loading, Builder, Settings and Escape. In this environment, Chromium navigation to loopback HTTP was blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`; therefore **browser functionality is NOT verified**.

No GitHub or AI core changes. Design-only app.
