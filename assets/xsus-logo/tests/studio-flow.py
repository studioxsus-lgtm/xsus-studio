"""Run with LOGO_ENGINE_DIR and optionally CHROMIUM_PATH; requires Python Playwright."""
import json, os, subprocess, threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ui = Path(__file__).resolve().parents[1]
engine = Path(os.environ["LOGO_ENGINE_DIR"]).resolve()
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler,directory=str(ui)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"
from flow_fixture import shell
generator = """import {composeCreative} from './creative-v2/compose.mjs';
const args=JSON.parse(process.argv[1]);console.log(JSON.stringify({version:'1.0.0',requestId:'test',...await composeCreative({...args,brief:{name:'ORION'},strategy:{approved:true}})}));"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH"),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':920})
 page.route(origin+'/test', lambda route:route.fulfill(content_type='text/html',body=shell))
 def generate(route):
  data=subprocess.check_output(['node','--input-type=module','-e',generator,route.request.post_data],cwd=engine)
  route.fulfill(content_type='application/json',body=data)
 page.route('**/v1/public/generate',generate)
 page.on('dialog',lambda dialog:dialog.accept())
 page.goto(origin+'/test')
 el=lambda id:page.locator('#logo-'+id)
 el('count').select_option('6');el('seed').fill('42');el('prompt').fill('Logo for "ORION" with a lion but without a crown.')
 el('generate').click()
 def ready():
  page.wait_for_function("document.querySelectorAll('#logo-variants button').length===6 && !document.querySelector('#logo-save').disabled")
 ready()
 variants=el('variants').locator('button')
 variants.nth(2).click();el('layers').locator('button').last.click();el('text').fill('ORION STUDIO');el('apply').click()
 el('undo').click();assert el('canvas').locator('text').text_content()=='ORION'
 el('redo').click();el('save').click();ready()
 page.reload();ready();assert el('canvas').locator('text').text_content()=='ORION STUDIO'
 shapes=lambda:variants.evaluate_all("(bs)=>bs.map(b=>b.querySelector('svg').outerHTML)")
 before=shapes();el('regen').click();ready();after=shapes()
 assert [i for i in range(6) if before[i]!=after[i]]==[2]
 for fmt in ['svg','png','json']:
  el('format').select_option(fmt)
  with page.expect_download() as dl:el('export').click()
  data=Path(dl.value.path()).read_bytes()
  assert {'svg':b'<svg','png':b'\x89PNG','json':b'{'}[fmt] in data[:200]
 for lang in ['sq','fr','en']:
  page.locator('#language-select').select_option(lang);assert page.locator('html').get_attribute('lang')==lang
 page.set_viewport_size({'width':360,'height':800});assert el('generate').is_visible()
 page.evaluate("sessionStorage.owner='user-b'");page.reload();el('generate').wait_for()
 assert el('project-list').locator('button').count()==0
 browser.close()
server.shutdown()
print("PASS: generate, edit, undo/redo, save, refresh, gallery, single regeneration, exports, languages, mobile, separate fixture account")
