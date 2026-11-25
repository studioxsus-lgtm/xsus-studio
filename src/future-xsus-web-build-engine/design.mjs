const palettes={ocean:['#eff6ff','#172554','#1d4ed8','#ffffff'],forest:['#f0fdf4','#14532d','#166534','#ffffff'],studio:['#18181b','#fafafa','#c4b5fd','#27272a'],sand:['#fffbeb','#451a03','#92400e','#ffffff']};
const layouts=['grid','split','stack'];
const kinds=['hero','features','metrics','faq','cta'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function text(v){if(typeof v!=='string'||!v.trim()||v.length>2000)throw new TypeError('Invalid text');return esc(v)}
export function createDesignSystem({palette='ocean',layout='grid',density='comfortable',motion=false}={}){
 if(!Object.hasOwn(palettes,palette)||!layouts.includes(layout)||!['compact','comfortable','spacious'].includes(density)||typeof motion!=='boolean')throw new TypeError('Invalid design');
 const [bg,fg,accent,surface]=palettes[palette],space={compact:'1rem',comfortable:'1.5rem',spacious:'2.5rem'}[density];
 return {palette,layout,density,motion,css:':root{--bg:'+bg+';--fg:'+fg+';--accent:'+accent+';--surface:'+surface+';--space:'+space+'}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:1rem/1.6 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:var(--space)}section{padding:var(--space);margin-block:var(--space);background:var(--surface);border-radius:1rem}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.15}h2{font-size:clamp(1.4rem,3vw,2rem)}a{color:var(--accent)}:focus-visible{outline:3px solid var(--accent);outline-offset:4px}.items{display:grid;gap:var(--space);grid-template-columns:'+({grid:'repeat(auto-fit,minmax(min(100%,16rem),1fr))',split:'repeat(2,minmax(0,1fr))',stack:'1fr'}[layout])+'}.item{padding:1rem;border:1px solid var(--accent);border-radius:.75rem;overflow-wrap:anywhere}@media(max-width:640px){.items{grid-template-columns:1fr}}'+(motion?'@media(prefers-reduced-motion:no-preference){.item{transition:transform .2s}.item:hover{transform:translateY(-3px)}}':'')};
}
export function composePage({title,language='en',sections,design={}}){
 if(!['en','sq','fr'].includes(language)||!Array.isArray(sections)||!sections.length||sections.length>40)throw new TypeError('Invalid page');
 const heading=text(title),system=createDesignSystem(design);
 const html=sections.map((s,i)=>{
 if(!s||typeof s!=='object'||(s.kind!==undefined&&s.type!==undefined&&s.kind!==s.type)||(s.body!==undefined&&s.text!==undefined&&s.body!==s.text))throw new TypeError('Invalid section');
 s={...s,kind:s.kind??s.type,body:s.body??s.text};
 if(!kinds.includes(s.kind))throw new TypeError('Invalid section');
 const label=text(s.title),body=s.body===undefined?'':'<p>'+text(s.body)+'</p>';
 const items=s.items??[];if(!Array.isArray(items)||items.length>30)throw new TypeError('Invalid items');
 const content=items.map(item=>s.kind==='faq'?'<details><summary>'+text(item.title)+'</summary><p>'+text(item.body)+'</p></details>':'<article class="item"><h3>'+text(item.title)+'</h3><p>'+text(item.body)+'</p></article>').join('');
 return '<section aria-labelledby="section-'+i+'"><h2 id="section-'+i+'">'+label+'</h2>'+body+(content?'<div class="items">'+content+'</div>':'')+'</section>';
 }).join('');
 return {html:'<!doctype html><html lang="'+language+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+heading+'</title><link rel="stylesheet" href="design.css"></head><body><main><h1>'+heading+'</h1>'+html+'</main></body></html>',css:system.css,design:system,reviewRequired:true};
}
