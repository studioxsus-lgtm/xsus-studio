from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[2]
js=root/'assets/js/xsus-app'
files=list(js.rglob('*.js'))
for f in files:
    subprocess.run(['node','--check',str(f)],check=True,capture_output=True,text=True)
print(f'PASS JavaScript syntax: {len(files)} files')
v=(js/'version-history.js').read_text()
for marker in ['id="vhFrom"','id="vhTo"',"$('#vhFrom')","$('#vhTo')","'#vhFrom,#vhTo'"]:
    assert marker in v, f'missing stable version selector {marker}'
assert "${t('To')}day" not in v
assert "line('− '+t(c)" in v and "line('+ '+t(c)" in v
print('PASS version comparison stable selectors and localized changes')
e=(js/'editor.js').read_text()
assert "document.addEventListener('xsus:language-changed', () => renderEditor())" in e
assert "const ui = value => escapeHtml(t(value));" in e
assert 'samples[currentFile]' in e
print('PASS editor rerender on language change; sample code remains unchanged')
n=(js/'navigation.js').read_text()
assert "title.textContent = t(current.dataset.section)" in n
assert "formatUi('{section}: interface placeholder" in n
print('PASS navigation dynamic labels')
