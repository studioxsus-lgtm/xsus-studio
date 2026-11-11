#!/usr/bin/env python3
"""XSUS App V6.0 reproducible non-browser quality gate."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import subprocess, sys, re, json
ROOT=Path(__file__).resolve().parents[2]
class Audit(HTMLParser):
 def __init__(self): super().__init__(); self.ids=[];self.refs=[];self.scripts=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag in ('script','img','link'):
   attr='src' if tag in ('script','img') else 'href'
   if a.get(attr) and not re.match(r'^(https?:|data:|#)',a[attr]):self.refs.append(a[attr])
   if tag=='script' and a.get('type')=='module':self.scripts.append(a.get('src',''))
errors=[]; checks=[]
def record(name,ok,detail=''):
 checks.append((name,ok,detail));print(('PASS' if ok else 'FAIL')+' '+name+(' — '+detail if detail else ''))
 if not ok:errors.append(name)
html=Audit();html.feed((ROOT/'app.html').read_text())
dup=[k for k,v in Counter(html.ids).items() if v>1]
record('Unique HTML IDs',not dup,', '.join(dup[:8]))
missing=[ref for ref in html.refs if not (ROOT/ref.split('?')[0]).is_file()]
record('Local HTML assets',not missing,f'{len(html.refs)} references, {len(missing)} missing')
record('Module entrypoint','assets/js/xsus-app/app.js' in html.scripts)
record('Original XSUS App logo',all((ROOT/'assets/images/xsus-app'/n).is_file() for n in ['xsus-app-logo.png','xsus-app-icon.png','xsus-app-favicon.png']))
js=list((ROOT/'assets/js/xsus-app').rglob('*.js'))
invalid=[]
for f in js:
 p=subprocess.run(['node','--input-type=module','--check'],input=f.read_text(),capture_output=True,text=True)
 if p.returncode:invalid.append(str(f.relative_to(ROOT)))
record('JavaScript syntax',not invalid,f'{len(js)} checked; invalid: {invalid}')
checks_to_run=['run-v5-2-checks.py','module-regression-v5-3.py','module-regression-v5-4.py','accessibility-v5-5.py','responsive-accessibility-v5-6.py','navigation-v5-7.py','modal-stability-v5-8.py']
for t in checks_to_run:
 p=subprocess.run([sys.executable,str(ROOT/'tests/xsus-app'/t)],cwd=ROOT,capture_output=True,text=True)
 record(t,p.returncode==0,(p.stdout+p.stderr)[-220:].strip().replace('\n',' | ') if p.returncode else '')
p=subprocess.run(['node',str(ROOT/'tests/xsus-app/modal-coordinator-v5-9.mjs')],cwd=ROOT,capture_output=True,text=True)
record('modal-coordinator-v5-9.mjs',p.returncode==0,(p.stdout+p.stderr)[-250:].strip())
# Avoid implying translations are linguistically certified.
record('Language dictionaries',all((ROOT/'assets/js/xsus-app/i18n'/f'{lang}.js').is_file() for lang in ['en','sq','fr']))
report={'version':'6.0','scope':'static_and_unit_regression_only','passed':sum(ok for _,ok,_ in checks),'failed':len(errors),'checks':[{'name':n,'passed':ok,'detail':d} for n,ok,d in checks], 'browser_verified':False}
(ROOT/'docs/xsus-app/results/QA_RESULTS_V6_0.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('SUMMARY',report['passed'],'passed',report['failed'],'failed; browser not verified')
sys.exit(bool(errors))
