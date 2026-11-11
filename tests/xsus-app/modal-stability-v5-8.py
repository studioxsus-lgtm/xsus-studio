from pathlib import Path
p=Path(__file__).resolve().parents[2]
s=(p/'assets/js/xsus-app/settings.js').read_text()
checks={
 'open idempotent': 'if(isOpen())return;' in s,
 'scroll snapshot': "previousOverflow=document.body.style.overflow" in s,
 'scroll restore': "document.body.style.overflow=previousOverflow" in s,
 'focus connected': 'previousFocus?.isConnected' in s,
 'outside focus recovery': 'if(!dialog.contains(document.activeElement))' in s,
 'escape propagation': 'e.stopPropagation();dismiss()' in s,
 'tab wrap': 'e.shiftKey&&document.activeElement===first' in s,
}
for name,passed in checks.items():
 print(('PASS' if passed else 'FAIL')+' '+name)
assert all(checks.values()), 'Modal stability regression failed'
