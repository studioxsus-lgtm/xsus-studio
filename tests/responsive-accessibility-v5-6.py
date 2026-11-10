from pathlib import Path
root=Path(__file__).resolve().parents[1]
css=(root/'assets/css/xsus-app/responsive.css').read_text()
html=(root/'app.html').read_text()
assert 'assets/css/xsus-app/responsive.css' in html
for selector in ['.pm-overlay','.vh-overlay','.td-overlay','.pub-overlay','.st-overlay']:
    assert selector in css, selector
for token in ['safe-area-inset-top','100dvh','focus-visible','overscroll-behavior','max-width: 480px']:
    assert token in css, token
for name in ['project-manager.js','testing-diagnostics.js']:
    s=(root/'assets/js/xsus-app'/name).read_text()
    assert 'e.preventDefault();' in s and 'focus()' in s
print('PASS: 5 modal overlays, mobile safe areas, keyboard focus fallback, stylesheet linkage')
