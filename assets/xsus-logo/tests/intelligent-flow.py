"""Browser test against the actual V4 edit engine with local account and storage fixtures."""
import json
import os
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from uuid import uuid4
from playwright.sync_api import sync_playwright
from flow_fixture import shell

ui = Path(__file__).resolve().parents[1]
engine = Path(os.environ["LOGO_ENGINE_DIR"]).resolve()
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ui)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"
execute = """import {projectAction} from './intelligence-v4/project.mjs';
const [row,r]=JSON.parse(process.argv[1]);
try{console.log(JSON.stringify(await projectAction(row,r,async()=>({approved:true}))))}
catch(e){console.log(JSON.stringify({error:e.message}))}"""
row = dict(id=str(uuid4()), owner_id='user-a', revision=1, name='AXION', document={
    'version':'1.0.0', 'width':256, 'height':256, 'layers':[
        dict(id='mark',type='circle',cx=128,cy=100,r=50,fill='#111111'),
        dict(id='brand-name',type='text',x=128,y=215,fontSize=18,text='AXION',fill='#111111')]})
with sync_playwright() as driver:
    browser = driver.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':390,'height':844},accept_downloads=True)
    page.route(origin+'/test',lambda r:r.fulfill(content_type='text/html',body=shell))
    page.add_init_script("if(!localStorage.rows)localStorage.rows=JSON.stringify("+json.dumps([row])+");")
    def edit(route):
        request = route.request.post_data_json
        stored = page.evaluate("JSON.parse(localStorage.rows)[0]")
        result = json.loads(subprocess.check_output(['node','--input-type=module','-e',execute,json.dumps([stored,request])],cwd=engine))
        if 'document' in result:
            stored['document'] = result['document']
            stored['revision'] += 1
            result['result']['revision'] = stored['revision']
            page.evaluate("row=>localStorage.rows=JSON.stringify([row])",stored)
        route.fulfill(status=422 if 'error' in result else 200,content_type='application/json',body=json.dumps(result.get('result',result)))
    page.route('**/v4/public/edit',edit)
    page.goto(origin+'/test')
    page.locator('#logo-layers button').first.click()
    panel=page.locator('.intelligent-panel')
    panel.locator('summary').first.click()
    instruction=panel.locator('textarea')
    instruction.fill('Make the symbol blue')
    def press(name): panel.get_by_role('button',name=name,exact=True).click()
    press('Preview')
    panel.locator('.edit-comparison svg').nth(1).wait_for()
    assert page.evaluate('JSON.parse(localStorage.rows)[0].revision')==1
    press('Reject')
    assert panel.locator('.edit-comparison svg').count()==0
    press('Preview');press('Apply')
    page.wait_for_function("JSON.parse(localStorage.rows)[0].revision===2")
    page.reload()
    page.locator('#logo-layers button').first.click()
    panel.locator('summary').first.click()
    assert page.evaluate("JSON.parse(localStorage.rows)[0].document.layers[0].fill")=='#2463eb'
    press('Undo edit')
    page.wait_for_function("JSON.parse(localStorage.rows)[0].revision===3")
    press('Redo edit')
    page.wait_for_function("JSON.parse(localStorage.rows)[0].revision===4")
    press('Analyze variants')
    panel.get_by_text('Variant 1',exact=False).first.wait_for()
    press('Size proof')
    panel.get_by_text('2048 × 2048',exact=False).wait_for()
    page.locator('#logo-format').select_option('svg')
    with page.expect_download() as download:
        page.locator('#logo-export').click()
    assert '#2463eb' in Path(download.value.path()).read_text()
    browser.close()
server.shutdown()
print('PASS V4 mobile preview, reject, apply, reload, undo, redo, analysis, ten scales and edited SVG download (local fixtures)')
