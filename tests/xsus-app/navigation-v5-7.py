from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
s = (ROOT / "assets/js/xsus-app/navigation.js").read_text()
h = (ROOT / "app.html").read_text()
checks = {
    "Mobile tab pressed state": "button.setAttribute('aria-pressed', String(selected))" in s,
    "Outside click closes rail": "document.addEventListener('pointerdown'" in s and "!rail.contains(event.target)" in s,
    "Escape returns focus": "closeRail(true)" in s,
    "Rail closes on wide screen": "matchMedia('(min-width: 701px)')" in s,
    "Rail closes on landing": "xsus:close-mobile-navigation" in s,
    "Mobile buttons exist": 'data-mobile="chat"' in h and 'data-mobile="editor"' in h,
}
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + ": " + name)
assert all(checks.values())
