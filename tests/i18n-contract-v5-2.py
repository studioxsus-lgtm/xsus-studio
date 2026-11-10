"""XSUS App V5.2: verify HTML/i18n runtime contract without a browser."""
from pathlib import Path
from html.parser import HTMLParser
import re, sys
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'app.html').read_text(encoding='utf-8')
manager=(ROOT/'assets/js/xsus-app/i18n/language-manager.js').read_text(encoding='utf-8')
class Parser(HTMLParser):
 def __init__(self): super().__init__();self.tags=[];self.ids=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.tags.append((tag,a))
  if 'id' in a:self.ids.append(a['id'])
p=Parser();p.feed(html)
errors=[]
def check(ok,msg):
 print(('PASS' if ok else 'FAIL')+' '+msg)
 if not ok:errors.append(msg)
check(len(p.ids)==len(set(p.ids)),'Unique HTML IDs')
selects=[a for tag,a in p.tags if tag=='select']
check(any(a.get('id')=='xsusLanguageSelect' for a in selects),'Header language selector exists')
check(any(a.get('id')=='stLanguage' for a in selects),'Settings language selector exists')
check('localStorage.setItem' in manager and 'localStorage.getItem' in manager,'Language persisted and restored')
check("document.documentElement.lang=active" in manager,'Document language updated')
check("xsus:language-changed" in manager,'Language-change event dispatched')
check('excludedDynamic' in manager and 'textarea' in manager and 'code' in manager,'User text and code excluded from dynamic translation')
check('attributeFilter' in manager and "'data-i18n-placeholder'" in manager,'Late translation attribute updates observed')
check("['en','sq','fr']" in manager,'Three supported languages')
check(html.index('assets/js/xsus-app/app.js') < html.index('assets/js/xsus-app/i18n/language-manager.js'),'App initialized before language manager')
print('RESULT:', 'PASS' if not errors else 'FAIL')
sys.exit(bool(errors))
