# XSUS App V4.2 — Manual browser test checklist

## Open locally
Extract the ZIP. From the folder containing `app.html`, run `python -m http.server 8000` on a computer and open `http://localhost:8000/app.html`. On Android, host the extracted directory on a static web server that supports ES modules (HTTP/HTTPS). Opening via `file://` may block ES module imports.

## Test cases (repeat in EN, SQ, FR)
1. Change header language EN → SQ → FR → EN; verify the landing title, CTA, navigation and `html lang` change appropriately.
2. Open Builder; verify sidebar and main panel labels change without reload.
3. Open Settings → Language; change language; verify header selector stays synchronized.
4. Open Projects, Version History, Testing and Publishing; verify static labels and dynamic descriptions. Record any English strings in SQ/FR.
5. Type a unique string into a form and chat input, switch language; confirm entered content remains unchanged.
6. Refresh; confirm last selected language is restored.
7. Test at 390px and 1280px widths, check menu/dialog text overflow and clipped buttons.
8. Check browser console for JavaScript errors.

## Pass criteria
All eight checks pass on actual browser, and no untranslated interface text remains in SQ/FR. The static tests do not prove this; screenshots and console output are needed for certification.
