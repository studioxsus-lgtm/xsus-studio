"""Browser pixel/format checks against real professional documents from the engine."""
import io,json,os,subprocess,threading,tempfile,zipfile
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
ui=Path(__file__).resolve().parents[1]
engine=Path(os.environ['LOGO_ENGINE_DIR']).resolve()
code="""import {composeCreative} from './creative-v2/compose.mjs';import {enhance} from './graphic-v3/professional.mjs';
let {kit}=await composeCreative({prompt:'Luxury logo for "ORION" with a lion',language:'en',brief:{name:'ORION'},strategy:{approved:true},creative:{version:'2.0.0',seed:11,count:3}});
console.log(JSON.stringify(enhance(kit,{styles:['luxury','minimalist'],font:'alegreya',slogan:'Élan • Ëndërr',finish:'metallic',width:512,height:320}).variants[0].document));"""
doc=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=engine))
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ui)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw,tempfile.TemporaryDirectory() as tmp:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':700,'height':500})
 # Serve bytes from the pinned, installed upstream packages to remove CDN timing from the visual test.
 def font_asset(route):
  suffix=route.request.url.split('/npm/@fontsource/',1)[1];pkg,asset=suffix.split('/',1)
  family,ver=pkg.split('@');root=engine/'node_modules'/'@fontsource'/family
  assert json.loads((root/'package.json').read_text())['version']==ver
  f=(root/asset).resolve();assert root.resolve() in f.parents
  route.fulfill(body=f.read_bytes(),headers={'Access-Control-Allow-Origin':'*','Content-Type':'font/woff' if asset.endswith('.woff') else 'text/plain'})
 page.route('https://cdn.jsdelivr.net/npm/@fontsource/**',font_asset)
 page.goto(f'http://127.0.0.1:{server.server_port}');page.evaluate("""async d=>{
 document.body.replaceChildren();document.body.style.cssText='margin:0;background:white';
 const {renderVector}=await import('/vector-canvas.mjs');document.body.append(renderVector(d));}""",doc)
 ref=Image.open(io.BytesIO(page.locator('svg').screenshot())).convert('RGB')
 for fmt in ['svg','svg-text','png','jpeg','webp','json','zip','pdf']:
  with page.expect_download() as dl:
   page.evaluate("""async ([d,format])=>{const {downloadLogo}=await import('/export.mjs');await downloadLogo(d,{name:'quality',format})}""",[doc,fmt])
  f=Path(dl.value.path());data=f.read_bytes()
  if fmt=='svg-text': assert b'<text' in data and b'data:font/woff;base64,' in data and b'SIL OPEN FONT LICENSE' in data
  if fmt=='json': assert json.loads(data)==doc
  if fmt=='svg': assert b'linearGradient' in data and b'<path' in data
  if fmt=='zip':
   with zipfile.ZipFile(f) as z: assert json.loads(z.read('editable.json'))==doc and b'linearGradient' in z.read('artwork.svg')
  if fmt=='pdf':
   dest=Path(tmp)/'proof';subprocess.run(['pdftoppm','-r','72','-singlefile','-png',str(f),str(dest)],check=True)
   img=Image.open(str(dest)+'.png').convert('RGB')
  elif fmt in ['png','webp','jpeg']:
   im=Image.open(f).convert('RGBA');img=Image.new('RGB',im.size,'white');img.paste(im,mask=im.getchannel('A'))
  else:continue
  assert img.size==ref.size,(fmt,img.size,ref.size)
  error=sum(ImageStat.Stat(ImageChops.difference(img,ref)).mean)/3
  print(fmt,'RGB mean absolute pixel error',round(error,3),flush=True);assert error<4,(fmt,error)
 browser.close()
server.shutdown()
