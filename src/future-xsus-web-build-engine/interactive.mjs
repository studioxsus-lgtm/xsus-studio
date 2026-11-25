import {generateWebsite} from './architecture.mjs';
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const words={en:['Frequently asked questions','Search','Contact draft','Email','Message','Save draft','Draft saved in this page only.'],sq:['Pyetje të shpeshta','Kërko','Draft kontakti','Email','Mesazh','Ruaj draftin','Drafti ruhet vetëm në këtë faqe.'],fr:['Questions fréquentes','Rechercher','Brouillon de contact','E-mail','Message','Enregistrer','Brouillon conservé sur cette page uniquement.']};
export function generateInteractiveWebsite(input,{components=['faq','search'],layout='grid',motion=false}={}){
 if(!Array.isArray(components)||components.some(x=>!['faq','search','contact'].includes(x))||new Set(components).size!==components.length)throw new TypeError('Invalid components');
 if(!['grid','stack','split'].includes(layout)||typeof motion!=='boolean')throw new TypeError('Invalid layout');
 const {plan,files}=generateWebsite(input);
 const w=words[plan.language];
 for(const {path} of plan.pages){
  const root='../'.repeat(path.split('/').length-1);
  const sections=components.map(c=>{
   if(c==='faq')return '<section><h2>'+w[0]+'</h2><details><summary>'+esc(plan.name)+'</summary><p>'+esc(plan.name)+'</p></details></section>';
   if(c==='search')return '<section><label for="xs-search">'+w[1]+'</label><input id="xs-search" type="search" data-xs-search></section>';
   return '<section><h2>'+w[2]+'</h2><form data-xs-draft><label>'+w[3]+'<input type="email" required></label><label>'+w[4]+'<textarea required maxlength="5000"></textarea></label><button type="submit">'+w[5]+'</button><output aria-live="polite" data-message="'+w[6]+'"></output></form></section>';
  }).join('');
  files[path]=files[path].replace('</main>',sections+'</main>').replace('</body>','<script type="module" src="'+root+'assets/interactions.js"></script></body>').replace('class="grid"','class="grid layout-'+layout+'"');
 }
 files['assets/style.css']+='\n.layout-stack{display:block}.layout-stack article{margin-bottom:1rem}.layout-split article{flex-basis:40%}form,label{display:grid;gap:.5rem}input,textarea,button{font:inherit;padding:.7rem}section{margin-bottom:1.5rem}[hidden]{display:none!important}'+(motion?'@media(prefers-reduced-motion:no-preference){article{transition:transform .2s}article:hover{transform:translateY(-3px)}}':'');
 files['assets/interactions.js']=`const search=document.querySelector('[data-xs-search]');
search?.addEventListener('input',()=>{const q=search.value.toLowerCase();for(const card of document.querySelectorAll('.grid article'))card.hidden=!card.textContent.toLowerCase().includes(q)});
for(const form of document.querySelectorAll('[data-xs-draft]'))form.addEventListener('submit',e=>{e.preventDefault();const output=form.querySelector('output');output.textContent=output.dataset.message;});
`;
 return {plan:{...plan,components:[...components],layout,motion},files};
}
