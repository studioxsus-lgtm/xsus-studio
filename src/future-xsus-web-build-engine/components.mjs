const esc=v=>{if(typeof v!=='string'||v.length>2000)throw new TypeError('Invalid text');return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
const path=v=>{if(typeof v!=='string'||! /^(?:\.\.\/)*[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(?:html|png|jpg|jpeg|webp|avif)$/.test(v))throw new TypeError('Invalid local path');return esc(v)};
const items=v=>{if(!Array.isArray(v)||v.length>50)throw new TypeError('Invalid items');return v};
export function renderComponent(kind,props={}){
 switch(kind){
 case 'header':return '<header><strong>'+esc(props.brand)+'</strong><nav aria-label="Main">'+items(props.links).map(l=>'<a href="'+path(l.href)+'"'+(l.current===true?' aria-current="page"':'')+'>'+esc(l.label)+'</a>').join('')+'</nav></header>';
 case 'footer':return '<footer><p>'+esc(props.text)+'</p></footer>';
 case 'gallery':return '<div class="xs-grid">'+items(props.images).map(i=>'<figure><img loading="lazy" src="'+path(i.src)+'" alt="'+esc(i.alt)+'"><figcaption>'+esc(i.caption??'')+'</figcaption></figure>').join('')+'</div>';
 case 'products':return '<div class="xs-grid">'+items(props.products).map(p=>'<article><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><strong>'+esc(p.price)+'</strong><p><a href="'+path(p.href)+'">View product</a></p></article>').join('')+'</div>';
 case 'metrics':return '<dl class="xs-grid">'+items(props.metrics).map(m=>'<div><dt>'+esc(m.label)+'</dt><dd>'+esc(m.value)+'</dd></div>').join('')+'</dl>';
 case 'chart':{const values=items(props.values);if(values.some(v=>typeof v.value!=='number'||!Number.isFinite(v.value)||v.value<0))throw new TypeError('Invalid chart value');const max=Math.max(1,...values.map(v=>v.value));return '<figure><figcaption>'+esc(props.title)+'</figcaption><ul>'+values.map(v=>'<li>'+esc(v.label)+' <meter min="0" max="'+max+'" value="'+v.value+'"></meter> '+v.value+'</li>').join('')+'</ul></figure>'}
 case 'form':{const fields=items(props.fields);const names=new Set();return '<form>'+fields.map(f=>{if(typeof f.name!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(f.name)||names.has(f.name)||!['text','email','number','date'].includes(f.type))throw new TypeError('Invalid field');names.add(f.name);return '<label>'+esc(f.label)+'<input name="'+f.name+'" type="'+f.type+'"'+(f.required===true?' required':'')+'></label>'}).join('')+'<button type="button" disabled>'+esc(props.button??'Submit')+'</button></form>'}
 default:throw new TypeError('Unknown component');
 }
}
export const componentCss='.xs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:1rem}.xs-grid img{max-width:100%;height:auto}header nav{display:flex;flex-wrap:wrap;gap:1rem}form label{display:block;margin-block:.75rem}meter{max-width:100%}';
