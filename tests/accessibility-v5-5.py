from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'app.html').read_text()
nav=(root/'assets/js/xsus-app/navigation.js').read_text()
css=(root/'assets/css/xsus-app/accessibility-v5-5.css').read_text()
checks={
 'valid HTML doctype':html.lstrip().lower().startswith('<!doctype html>'),
 'skip navigation': 'href="#features"' in html and 'xsus-skip-link' in html,
 'keyboard focus styling':':focus-visible' in css,
 'reduced motion': 'prefers-reduced-motion:reduce' in css,
 'sidebar expanded state': 'aria-controls="rail" aria-expanded="false"' in html and "railToggle.setAttribute('aria-expanded'" in nav,
 'Escape closes sidebar': "event.key === 'Escape' && rail.classList.contains('open')" in nav,
 'landing and workspace focus': "$('#landing').focus" in nav and "$('#workspace').focus" in nav,
 'skip text translated':all('"Skip to content"' in (root/f'assets/js/xsus-app/i18n/{lang}.js').read_text() for lang in ['en','sq','fr']),
 'no markup before html':html.startswith('<!DOCTYPE html>'),
 'stylesheet referenced':'accessibility-v5-5.css' in html,
}
for name,ok in checks.items():print(('PASS' if ok else 'FAIL')+' '+name)
assert all(checks.values())
