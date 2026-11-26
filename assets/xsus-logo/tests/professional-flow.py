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
generator="""import {createOrchestrator} from './orchestrator.mjs';
const r=JSON.parse(process.argv[1]);const engine=createOrchestrator({interpret:async a=>({...a,brief:{name:'ORION'}}),plan:async a=>({...a,approved:true,review_required:false})});
console.log(JSON.stringify(await engine.generate({...r,requestId:'qa-professional'})));"""
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

 def click(key):page.locator('#graphic-'+key).click()
 def check_saved():
  page.wait_for_function("document.querySelector('#logo-status').textContent==='Project saved.' && !document.querySelector('#logo-save').disabled")
 def model():return page.evaluate("JSON.parse(localStorage.rows)[0].document")
 page.locator('#graphic-style').select_option('luxury')
 page.locator('#graphic-blend').select_option('minimalist')
 page.locator('#graphic-finish').select_option('metallic')
 page.locator('#graphic-slogan').fill('Élan • Ëndërr')
 el('count').select_option('6');el('seed').fill('42');el('prompt').fill('Create a luxury logo for "ORION" with a lion.')
 el('generate').click();check_saved()
 assert model()['graphic']['styles']==['luxury','minimalist']
 el('layers').locator('button').first.click()
 page.locator('#graphic-node').check()
 svg=el('canvas').locator('svg');dot=svg.locator('circle').first
 dot.scroll_into_view_if_needed();pos=dot.bounding_box()
 page.mouse.move(pos['x']+pos['width']/2,pos['y']+pos['height']/2);page.mouse.down();page.mouse.move(pos['x']+12,pos['y']+7);page.mouse.up()
 page.locator('#graphic-node').uncheck();assert el('undo').is_enabled();el('undo').click();el('redo').click()
 page.locator('#graphic-geometry').select_option('inset');click('apply')
 el('save').click();check_saved();assert model()['layers'][0]['sources']
 page.reload();page.wait_for_function("document.querySelectorAll('#logo-variants button').length===6")
 assert el('canvas').locator('svg path').count()>1
 before=[v['document'] for v in model()['creativeGallery']['variants']]
 el('regen').click();check_saved();after=[v['document'] for v in model()['creativeGallery']['variants']]
 assert [i for i in range(6) if before[i]!=after[i]]==[0]
 assert after[0]['graphic']['options']['slogan']=='Élan • Ëndërr'
 page.set_viewport_size({'width':360,'height':800});assert el('generate').is_visible()
 for lang in ['sq','fr','en']:
  page.locator('#language-select').select_option(lang);assert page.locator('html').get_attribute('lang')==lang
 browser.close()
server.shutdown()
print("PASS professional studio generation, visual node drag, Boolean sources, undo/redo, persistence, reload, selective regeneration, languages and mobile")
