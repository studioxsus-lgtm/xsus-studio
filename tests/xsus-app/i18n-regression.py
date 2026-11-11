from pathlib import Path
from bs4 import BeautifulSoup
import json,re,subprocess,sys
root=Path(__file__).resolve().parents[2]
js=root/'assets/js/xsus-app'
soup=BeautifulSoup((root/'app.html').read_text(encoding='utf8'),'html.parser')
keys=set()
for el in soup.find_all(True):
    if el.has_attr('data-i18n'):keys.add(el['data-i18n'])
    for attr in ('placeholder','aria-label'):
        if el.has_attr('data-i18n-'+attr):keys.add(el.get(attr,''))
for file in js.rglob('*.js'):
    if 'i18n' not in file.parts:keys.update(re.findall(r"\bt\(['\"]([^'\"]+)['\"]\)",file.read_text(encoding='utf8')))
for lang in ('en','sq','fr'):
    file=js/'i18n'/f'{lang}.js'
    data=json.loads(subprocess.check_output(['node','--input-type=module','-e',f"import d from '{file.as_uri()}';console.log(JSON.stringify(d))"],text=True))
    missing=keys-set(data)
    assert not missing,f'{lang} missing {len(missing)} keys: {sorted(missing)[:8]}'
    assert all(isinstance(data[k],str) and data[k].strip() for k in keys),f'{lang}: empty translations'
    print(f'PASS {lang}: {len(keys)} referenced keys present')
assert soup.find(id='xsusLanguageSelect') is not None
assert soup.find(id='stLanguage') is not None
print('PASS both language selectors exist')
