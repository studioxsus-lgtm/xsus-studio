"""Offline checks for dictionary integrity, placeholders and suspicious untranslated values."""
import json, subprocess, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
base=root/'assets/js/xsus-app/i18n'
def load(lang):
    script=f"import d from '{(base/f'{lang}.js').as_uri()}';console.log(JSON.stringify(d))"
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',script],text=True))
d={lang:load(lang) for lang in ('en','sq','fr')}
keys=set(d['en']); errors=[]
for lang, entries in d.items():
    missing=keys-set(entries)
    if missing: errors.append(f'{lang}: {len(missing)} keys absent')
    for key,value in entries.items():
        if not isinstance(value,str) or not value.strip(): errors.append(f'{lang}: empty translation {key!r}')
        if set(re.findall(r'\{([a-zA-Z]+)\}',key)) != set(re.findall(r'\{([a-zA-Z]+)\}',value)):
            errors.append(f'{lang}: placeholder mismatch {key!r}')
    print(f'{lang}: {len(entries)} entries, {len(missing)} missing relative to EN')
for lang in ('sq','fr'):
    identical=[key for key in keys & set(d[lang]) if d[lang][key].strip()==d['en'][key].strip()]
    print(f'{lang}: {len(identical)} values identical to EN (review candidates, not automatic errors)')
    print('  Samples:',repr(identical[:12]))
if errors:
    print('\n'.join(errors[:30]));raise SystemExit(1)
print('PASS: dictionary values, key parity, placeholders')
