#!/usr/bin/env python3
"""XSUS App V4.5 static regression checks; NOT browser tests."""
from pathlib import Path
import re, subprocess
root=Path(__file__).resolve().parents[2]
js=root/'assets/js/xsus-app'
td=(js/'testing-diagnostics.js').read_text()
notify=(js/'notifications.js').read_text()
assert 'escapeHtml(t(item.status))' in td, 'Localized status must be escaped'
assert '[x.name,t(x.name),x.category,t(x.category),x.status,t(x.status)]' in td, 'Search must match localized labels'
assert "document.addEventListener('xsus:language-changed'" in notify, 'Active toast must refresh on language change'
assert 'activeToastKey = message' in notify
for path in sorted(js.rglob('*.js')):
    result=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
    assert result.returncode==0, f'{path}: {result.stderr}'
print('PASS: localized diagnostics search, status, toast refresh and JS syntax')
