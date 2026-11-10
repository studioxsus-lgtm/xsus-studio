#!/usr/bin/env python3
"""Real Chromium smoke test. Requires playwright Python package and system Chromium."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import json, sys
root=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/app.html'
results=[]
def check(name, fn):
 try:
  fn(); results.append((name,True,''));print('PASS',name)
 except Exception as e:
  results.append((name,False,str(e)[:240]));print('FAIL',name,str(e)[:240])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for label,viewport in [('desktop',{'width':1365,'height':768}),('mobile',{'width':390,'height':844})]:
  page=browser.new_page(viewport=viewport)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='networkidle',timeout=30000)
  check(label+' page loads',lambda: (page.locator('#landing').wait_for(state='visible'),page.locator('#workspace').wait_for(state='hidden')))
  check(label+' entrypoint no JS errors',lambda: (_ for _ in ()).throw(AssertionError(errors)) if errors else None)
  def builder():
   page.locator('[data-open-builder]').first.click()
   page.locator('#workspace').wait_for(state='visible')
   assert page.locator('#landing').is_hidden()
  check(label+' builder opens',builder)
  def modal():
   page.evaluate("document.dispatchEvent(new CustomEvent('xsus:open-settings'))")
   page.locator('#stOverlay').wait_for(state='visible')
   page.keyboard.press('Escape')
   page.locator('#stOverlay').wait_for(state='hidden')
  check(label+' settings opens and Escape closes',modal)
  check(label+' after actions no JS errors',lambda: (_ for _ in ()).throw(AssertionError(errors)) if errors else None)
  page.close()
 browser.close()
server.shutdown()
report={'version':'6.1','browser':'system Chromium headless','results':[{'name':n,'passed':ok,'detail':detail} for n,ok,detail in results], 'passed':sum(x[1] for x in results),'failed':sum(not x[1] for x in results)}
(root/'QA_BROWSER_V6_1.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('SUMMARY',report['passed'],'passed',report['failed'],'failed')
sys.exit(bool(report['failed']))
