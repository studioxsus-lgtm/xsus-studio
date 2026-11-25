import {createProject} from './index.mjs';
const profiles=Object.freeze({
 business:['index.html','about.html','services.html','contact.html'],
 commerce:['index.html','catalog.html','product.html','cart.html','contact.html'],
 portfolio:['index.html','projects.html','about.html','contact.html'],
 education:['index.html','courses.html','lesson.html','resources.html'],
 dashboard:['index.html','analytics.html','reports.html','settings.html'],
 blog:['index.html','articles.html','article.html','about.html']
});
const themes=Object.freeze({
 light:{background:'#ffffff',foreground:'#172033',accent:'#4338ca'},
 dark:{background:'#111827',foreground:'#f8fafc',accent:'#a5b4fc'},
 warm:{background:'#fff7ed',foreground:'#431407',accent:'#9a3412'}
});
export function planWebsite({name,type,theme='light',pages,language='en'}={}){
 if(!Object.hasOwn(profiles,type)) throw new TypeError('Unsupported website type');
 if(!Object.hasOwn(themes,theme)) throw new TypeError('Unsupported theme');
 if(!['en','sq','fr'].includes(language)) throw new TypeError('Unsupported language');
 const project=createProject({name,pages:pages??profiles[type]});
 return {...project,type,language,theme:{...themes[theme]},reviewRequired:true,features:{navigation:true,responsive:true,backend:false,payments:false}};
}
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={en:{home:'Home',nav:'Navigation'},sq:{home:'Kreu',nav:'Navigimi'},fr:{home:'Accueil',nav:'Navigation'}};
export function generateWebsite(input){
 const plan=planWebsite(input);
 const files=Object.create(null);
 for(const {path} of plan.pages){
  const root='../'.repeat(path.split('/').length-1);
  const label=p=>p==='index.html'?labels[plan.language].home:p.replace(/\.html$/,'').replaceAll('/',' / ').replaceAll('-',' ');
  const nav=plan.pages.map(p=>'<a href="'+root+p.path+'"'+(p.path===path?' aria-current="page"':'')+'>'+esc(label(p.path))+'</a>').join('');
  const layout=plan.type==='dashboard'?'dashboard':plan.type==='commerce'?'catalog':plan.type==='portfolio'?'gallery':'editorial';
  files[path]='<!doctype html><html lang="'+plan.language+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(plan.name+' — '+label(path))+'</title><link rel="stylesheet" href="'+root+'assets/style.css"></head><body class="'+layout+'"><header><strong>'+esc(plan.name)+'</strong><nav aria-label="'+labels[plan.language].nav+'">'+nav+'</nav></header><main><section class="hero"><h1>'+esc(label(path))+'</h1><p>'+esc(plan.name)+'</p></section><section class="grid">'+plan.pages.filter(p=>p.path!==path).map(p=>'<article><h2>'+esc(label(p.path))+'</h2><a href="'+root+p.path+'">'+esc(label(p.path))+'</a></article>').join('')+'</section></main></body></html>';
 }
 const t=plan.theme;
 files['assets/style.css']=':root{--bg:'+t.background+';--fg:'+t.foreground+';--accent:'+t.accent+'}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:1rem system-ui}header,main{padding:clamp(1rem,4vw,3rem)}nav,.grid{display:flex;flex-wrap:wrap;gap:1rem}a{color:var(--accent)}a:focus-visible{outline:3px solid var(--accent)}.hero{padding:3rem 0}.grid article{flex:1 1 14rem;padding:1.5rem;border:1px solid currentColor;border-radius:1rem}.dashboard header{border-bottom:1px solid}.gallery .grid article{min-height:12rem}.catalog .grid article{flex-basis:18rem}.editorial main{max-width:70rem;margin:auto}';
 return {plan,files};
}
