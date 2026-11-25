// Serve the repository root on localhost:8040 and run with Playwright.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});try{
for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:850}});
await page.goto(process.env.XSUS_WEB_TEST_ORIGIN || 'http://127.0.0.1:8040');
await page.evaluate(async()=>{
document.body.replaceChildren();const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/js/xsus-web/workspace/unified-view.css';document.head.append(css);
const base='/assets/js/xsus-web/workspace/';
const {createWorkspaceController}=await import(base+'workspace-controller.mjs'),{mountUnifiedView}=await import(base+'unified-view.mjs');
window.files={'index.html':'Home','menu.html':'Menu','contact.html':'Old hours'};let revision=1;
const workspace=createWorkspaceController({versions:{list:async()=>({revision}),get:async()=>({files:window.files}),save:async(id,files,expected)=>{if(window.conflict)throw Object.assign(Error(),{status:409});await new Promise(r=>setTimeout(r,200));if(expected!==revision)throw Error();window.files=files;return {revision:++revision}}},propose:async()=>{}});
const view=mountUnifiedView({document,container:document.body,app:{workspace,list:async()=>[{id:'restaurant',status:'completed',name:'Restaurant'}],open:id=>workspace.open(id)}});await view.refresh();
});
if(width<800)await page.getByRole('button',{name:'Projects',exact:true}).click();
await page.getByRole('button',{name:'Open project'}).click();
await page.getByLabel('Source file').selectOption('contact.html');
await page.getByLabel('Source code').fill('Saturday 21:00');
await page.getByText('Unsaved changes',{exact:true}).waitFor();
await page.getByText('Saved · Version 2').waitFor();
assert.deepEqual(await page.evaluate(()=>window.files),{'index.html':'Home','menu.html':'Menu','contact.html':'Saturday 21:00'});
const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download current ZIP'}).click();assert.equal(await (await download).failure(),null);
await page.evaluate(()=>window.conflict=true);await page.getByLabel('Source code').fill('Conflict draft');
await page.getByRole('button',{name:'Save',exact:true}).click();
await page.getByText(/Revision conflict/).waitFor();assert.equal(await page.getByLabel('Source code').inputValue(),'Conflict draft');
assert.equal(await page.evaluate(()=>window.files['contact.html']),'Saturday 21:00');
await page.close();console.log(width+'px · open, select, autosave, ZIP, conflict passed')
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
