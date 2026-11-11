"""XSUS App V5.2: reproducible non-browser regression checks."""
from pathlib import Path
import subprocess, sys, zipfile
root = Path(__file__).resolve().parents[2]
tests = ['i18n-audit.py','i18n-regression.py','i18n-untagged-audit.py','i18n-dynamic-v4-4.py','i18n-dynamic-v4-5.py','i18n-quality-v4-7.py','i18n-identical-v4-8.py','i18n-contract-v5-2.py']
failed=[]
for name in tests:
    result=subprocess.run([sys.executable,str(root/'tests/xsus-app'/name)],cwd=root,capture_output=True,text=True)
    print(('PASS' if result.returncode==0 else 'FAIL')+' '+name)
    if result.returncode: failed.append(name); print(result.stdout[-1200:],result.stderr[-1200:])
js=list((root/'assets/js/xsus-app').rglob('*.js'))
for path in js:
    # Node accepts ES module syntax with --input-type=module when reading stdin.
    result=subprocess.run(['node','--input-type=module','--check'],input=path.read_text(),text=True,capture_output=True)
    if result.returncode:failed.append(str(path.relative_to(root)));print(result.stderr)
print(f'JavaScript syntax: {len(js)} checked; {len([x for x in failed if x.endswith(".js")])} failed')
print('RESULT:', 'PASS (static checks only)' if not failed else f'FAIL: {failed}')
sys.exit(bool(failed))
