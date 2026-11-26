"""Time rendering a 12-concept gallery under Chromium CPU throttling."""
import json,os,subprocess,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ui=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ui)))
threading.Thread(target=server.serve_forever,daemon=True).start()
code="""import {composeCreative} from './creative-v2/compose.mjs';import {enhance} from './graphic-v3/professional.mjs';
const {kit}=await composeCreative({prompt:'AXION letter A and network',creative:{version:'2.0.0',count:12,seed:21},language:'en',brief:{name:'AXION'},strategy:{approved:true}});
console.log(JSON.stringify(enhance(kit,{finish:'metallic',slogan:'Design for tomorrow'}).variants.map(v=>v.document)))"""
docs=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=os.environ['LOGO_ENGINE_DIR']))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),args=['--no-sandbox'])
 page=b.new_page(viewport={'width':360,'height':800},is_mobile=True,has_touch=True)
 c=page.context.new_cdp_session(page);c.send('Emulation.setCPUThrottlingRate',{'rate':4})
 page.goto(f'http://127.0.0.1:{server.server_port}')
 print(page.evaluate("""async docs=>{const {renderVector}=await import('/vector-canvas.mjs');const samples=[];
 for(let i=0;i<20;i++){const start=performance.now();document.body.replaceChildren(...docs.map(d=>renderVector(d)));document.body.getBoundingClientRect();samples.push(performance.now()-start)}
 samples.sort((a,b)=>a-b);return {n:samples.length,p50:samples[9],p95:samples[18],layers:document.querySelectorAll('[data-layer-id]').length}}""",docs))
 b.close()
server.shutdown()
