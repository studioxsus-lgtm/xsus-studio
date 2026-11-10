from pathlib import Path
import re, json
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]
js=root/'assets/js/xsus-app'
soup=BeautifulSoup((root/'app.html').read_text(), 'html.parser')
keys=set()
for el in soup.find_all(True):
    if el.has_attr('data-i18n'): keys.add(el['data-i18n'])
    for attr in ('placeholder','aria-label'):
        if el.has_attr('data-i18n-'+attr): keys.add(el.get(attr,''))
for path in js.rglob('*.js'):
    if 'i18n' not in path.parts: keys.update(re.findall(r"\bt\(['\"]([^'\"]+)['\"]\)",path.read_text()))
for lang in ('en','sq','fr'):
    data=json.loads(__import__('subprocess').check_output(['node','--input-type=module','-e',f"import d from '{(js/'i18n'/f'{lang}.js').as_uri()}';console.log(JSON.stringify(d))"],text=True))
    missing=sorted(keys-set(data))
    print(f'{lang}: {len(missing)} missing of {len(keys)} referenced keys')
    if missing: print('  Examples:',repr(missing[:10]))
