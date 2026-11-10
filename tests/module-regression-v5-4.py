from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/js/xsus-app'
visual=(root/'visual-editor.js').read_text()
publish=(root/'publishing.js').read_text()
checks={
 'Visual Editor imports translator': "import { t }" in visual,
 'Visual component labels use translator': '${ui(x.name)}' in visual,
 'Visual toolbar localizes': "ui('Canvas · Demo')" in visual and "ui('Properties')" in visual,
 'Visual inspector localizes': "ui('Corner radius')" in visual,
 'Visual user label remains escaped': 'esc(item.label)' in visual,
 'Publishing localizes environment label': "t(env.options[env.selectedIndex].getAttribute('data-i18n')" in publish,
 'Publishing preserves user notes': "notes.value.trim()" in publish,
 'No deployment request in Publishing': 'fetch(' not in publish and 'XMLHttpRequest' not in publish,
}
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL'),name)
if not all(checks.values()):raise SystemExit(1)
print(f'RESULT: {len(checks)} static checks passed')
