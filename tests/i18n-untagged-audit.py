from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]
soup=BeautifulSoup((root/'app.html').read_text(encoding='utf8'),'html.parser')
allowed={'XSUS APP','● ● ●','<App />','const view = ...','0 / 2000'}
untagged=[]
for node in soup.find_all(string=True):
 text=node.strip()
 if not text or node.parent.name in ('script','style','title','code','pre','[document]'):continue
 if node.parent.find_parent(attrs={'data-i18n':True}) or node.parent.has_attr('data-i18n'):continue
 if text in allowed or text.isnumeric():continue
 if len(text)>2:untagged.append(text)
print('Untagged text nodes requiring review:',len(untagged))
for value in untagged:print('-',value[:140])
