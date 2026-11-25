import {createModernTheme} from './modern-ui.mjs';
const esc=s=>{if(typeof s!=='string'||s.length>2000)throw TypeError('Invalid text');return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
const path=s=>{if(typeof s!=='string'||!/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:html|png|jpg|jpeg|webp|avif)$/.test(s))throw TypeError('Invalid path');return s};
const items=s=>{if(!Array.isArray(s.items)||!s.items.length||s.items.length>30)throw TypeError('Invalid items');return s.items};
export function renderVisualSection(s,index=0){
 if(!Number.isInteger(index)||index<0||index>100)throw TypeError('Invalid index');
 const title=esc(s.title),id='section-'+index;
 let body;
 switch(s.type){
 case 'hero':case 'cta':body='<p>'+esc(s.text)+'</p>'+(s.link?'<a class="action" href="'+path(s.link.path)+'">'+esc(s.link.label)+'</a>':'');break;
 case 'features':case 'products':case 'pricing':body='<div class="visual-grid">'+items(s).map(i=>'<article><h3>'+esc(i.title)+'</h3><p>'+esc(i.text)+'</p>'+(i.price!==undefined?'<strong>'+esc(i.price)+'</strong>':'')+(i.image?'<img loading="lazy" src="'+path(i.image)+'" alt="'+esc(i.alt)+'">':'')+'</article>').join('')+'</div>';break;
 case 'gallery':body='<div class="visual-grid">'+items(s).map(i=>'<figure><img loading="lazy" src="'+path(i.image)+'" alt="'+esc(i.alt)+'"><figcaption>'+esc(i.title)+'</figcaption></figure>').join('')+'</div>';break;
 case 'faq':body=items(s).map(i=>'<details><summary>'+esc(i.title)+'</summary><p>'+esc(i.text)+'</p></details>').join('');break;
 default:throw TypeError('Unknown section');
 }
 return '<section class="visual-section visual-'+s.type+'" aria-labelledby="'+id+'"><h2 id="'+id+'">'+title+'</h2>'+body+'</section>';
}
export function composeLandingPage({title,sections,theme={},language='en',typography='system'}={}){
 if(!['en','sq','fr'].includes(language)||!['system','serif','mono'].includes(typography)||!Array.isArray(sections)||!sections.length||sections.length>40)throw TypeError('Invalid composition');
 const font={system:'system-ui,sans-serif',serif:'Georgia,serif',mono:'monospace'}[typography];
 const css=createModernTheme(theme)+'body{font-family:'+font+'}main{max-width:1200px;margin:auto}.visual-section{padding:clamp(24px,5vw,72px) 0}.visual-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:var(--gap)}.visual-grid article,figure{margin:0;padding:var(--gap);border:1px solid currentColor;border-radius:16px}img{max-width:100%;height:auto;border-radius:8px}.visual-hero h2{font-size:clamp(2rem,6vw,4rem);line-height:1.1}.action{display:inline-block;padding:12px 20px;border:2px solid currentColor;border-radius:8px}details{padding:12px;border-bottom:1px solid currentColor}';
 return {html:'<!doctype html><html lang="'+language+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+'</title><link rel="stylesheet" href="visual.css"></head><body><main><h1>'+esc(title)+'</h1>'+sections.map(renderVisualSection).join('')+'</main></body></html>',css,reviewRequired:true,publicationAuthorized:false};
}
