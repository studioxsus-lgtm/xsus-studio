# XSUS App V5.0 — Mobile Language QA readiness

## Verified fix
The header language selector contained invalid nested `<span>` elements inside three `<option>` elements. They have been replaced with valid plain-text options. This avoids browser-specific DOM parsing of option children.

## Verification scope
- Offline dictionary and regression tests are run as part of this release.
- Browser language switching is NOT certified. Chromium in this environment refuses navigation to the local server (`net::ERR_BLOCKED_BY_ADMINISTRATOR`).
- Real Android testing remains required for EN → SQ → FR → EN, Settings synchronization, refresh persistence, and user input preservation.

## Android test procedure
1. Extract the complete ZIP (not just `app.html`) into a folder.
2. Serve that folder through an HTTP preview or hosting service that supports ES modules; opening `file://` directly may fail.
3. Open `app.html` in Chrome or Firefox on Android.
4. Change the language from EN to SQ, then FR, then EN. Check header, sidebar, chat, Settings, Projects, History, Testing and Publishing.
5. Enter a test message in AI Chat, change language, and confirm the message stays unchanged.
6. Select FR, refresh, and check that FR remains selected in both header and Settings.
7. Record any untranslated phrase and the screen where it appears.

No GitHub, AI Core, Hyper XSUS Core or backend changes.
