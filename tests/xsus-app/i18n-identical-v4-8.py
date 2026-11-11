"""V4.8: detect untranslated-looking entries outside approved brands, technical terms and shared words."""
from pathlib import Path
import subprocess, json, re
base=Path(__file__).resolve().parents[2]/'assets/js/xsus-app/i18n'
def load(lang):
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',f"import d from '{(base/(lang+'.js')).as_uri()}';console.log(JSON.stringify(d))"],text=True))
d={lang:load(lang) for lang in ('en','sq','fr')}
shared={'Booking Studio','Commerce Hub','Task Flow','XSUS AI','XSUS AI Core','Hyper XSUS Core','XSUS App','XSUS App.','XSUS App Builder','XSUS Studio','XSUS STUDIO','XSUS Web','XSUS Game','XSUS Logo','XSUS Domain','THE X IDENTITY','Logo','Domain','Web','my-first-app','13 px','✦ XSUS APP · DEMO','0 / 2000','html','EN','SQ','FR','Shqip','Français','Code','Versions','Tests','Diagnostics','Configuration','Production','0 concepts','Concept','Concepts','Mobile','Validation','Description','Portfolio'}
errors=[]
for lang in ('sq','fr'):
    same=sorted(k for k in d['en'] if k in d[lang] and d[lang][k]==d['en'][k])
    unexpected=[k for k in same if k not in shared]
    print(f'{lang}: {len(same)} identical strings; {len(unexpected)} unclassified')
    errors.extend(f'{lang}: {k}' for k in unexpected)
if errors: raise SystemExit('Unexpected unchanged translations: '+repr(errors))
print('PASS V4.8 identical-value classification')
