const cache=new Map();
let catalogPromise;
export function fontCatalog(){
 catalogPromise??=fetch(new URL('./catalog.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('font_unavailable');return r.json()}).catch(e=>{catalogPromise=null;throw e});
 return catalogPromise;
}
export async function fontBytes(meta){
 if(cache.has(meta.id))return cache.get(meta.id);
 const list=await Promise.all(['latin',...(meta.extension?['latin-ext']:[])].map(async subset=>{
  const url='https://cdn.jsdelivr.net/npm/@fontsource/'+meta.id+'@'+meta.version+'/files/'+meta.id+'-'+subset+'-400-normal.woff';
  const r=await fetch(url,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('font_unavailable');
  const bytes=await r.arrayBuffer();if(bytes.byteLength>400000)throw Error('invalid_font');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==(subset==='latin'?meta.sha256:meta.extSha256))throw Error('font_integrity_failed');return bytes;
 }));if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(meta.id,list);return list;
}
export async function editableType(svg,d){
 const ns=svg.namespaceURI,defs=svg.ownerDocument.createElementNS(ns,'defs'),css=svg.ownerDocument.createElementNS(ns,'style'),seen=new Set();
 const catalog=await fontCatalog();
 for(const l of d.layers.filter(x=>x.type==='text'&&x.outline)){
  if(l.along||l.curve)throw Error('editable_curved_type_requires_outlines');
  const meta=catalog.find(f=>f.id===l.fontId);if(!meta)throw Error('invalid_font');
  if(!seen.has(meta.id)){const buffers=await fontBytes(meta);
   const license=await fetch('https://cdn.jsdelivr.net/npm/@fontsource/'+meta.id+'@'+meta.version+'/LICENSE',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!license.ok)throw Error('font_unavailable');
   const notice=await license.text();if(notice.length>32000||!/SIL OPEN FONT LICENSE/i.test(notice))throw Error('invalid_font_license');
   const metadata=svg.ownerDocument.createElementNS(ns,'metadata');metadata.textContent=meta.family+' '+meta.version+' '+meta.source+'\n'+notice;defs.append(metadata);
   buffers.forEach((buffer,i)=>{const bytes=new Uint8Array(buffer);let raw='';for(let j=0;j<bytes.length;j+=8192)raw+=String.fromCharCode(...bytes.subarray(j,j+8192));
    css.textContent+='@font-face{font-family:v3-'+meta.id+';src:url(data:font/woff;base64,'+btoa(raw)+') format("woff");'+(i?'unicode-range:U+0100-024F,U+1E00-1EFF;':'')+'}';});seen.add(meta.id)}
  const original=svg.querySelector('[data-layer-id="'+l.id+'"]'),t=svg.ownerDocument.createElementNS(ns,'text');
  for(const a of original.attributes)t.setAttribute(a.name,a.value);
  for(const [k,v] of Object.entries({x:l.x,y:l.y,'text-anchor':'middle','font-family':'v3-'+meta.id,'font-size':l.fontSize,'letter-spacing':(l.trackingEm??0)*l.fontSize}))t.setAttribute(k,v);
  if(l.advance){t.setAttribute('textLength',l.advance);t.setAttribute('lengthAdjust','spacingAndGlyphs')}
  t.textContent=l.text;original.replaceWith(t);
 }
 defs.append(css);svg.prepend(defs);return svg;
}
