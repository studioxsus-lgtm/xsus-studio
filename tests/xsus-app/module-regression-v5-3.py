"""Static regression guards for Dashboard, Chat, Editor and Project Manager."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
js=root/'assets/js/xsus-app'
checks={
 'Dashboard translates notification messages': "toast(t('New project: visual concept only. Nothing is saved.'))" in (js/'dashboard.js').read_text(),
 'Dashboard translates sample notification': "toast(t('Sample concept loaded in the prompt.'))" in (js/'dashboard.js').read_text(),
 'Chat does not persist messages': 'localStorage' not in (js/'chat.js').read_text(),
 'Chat renders user text with textContent': 'content.textContent = text' in (js/'chat.js').read_text(),
 'Editor uses distinct toast variable': "const node = $('#toast')" in (js/'editor.js').read_text(),
 'Editor guards unavailable clipboard': 'if (!navigator.clipboard?.writeText)' in (js/'editor.js').read_text(),
 'Editor keeps sample code read-only': 'READ ONLY' in (js/'editor.js').read_text(),
 'Project Manager escapes project names': 'escapeHtml(t(x.name))' in (js/'project-manager.js').read_text(),
 'Project Manager supports language refresh': "xsus:language-changed" in (js/'project-manager.js').read_text(),
}
for name,passed in checks.items(): print(('PASS' if passed else 'FAIL'),name)
assert all(checks.values()),'Static module regression failed'
print(f'PASS {len(checks)} static guards (not browser interaction tests)')
