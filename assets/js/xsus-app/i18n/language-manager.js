import sq from './sq.js';
import fr from './fr.js';
import en from './en.js';
const translations = {en,sq,fr};
const supported = ['en','sq','fr'];
const original = new WeakMap();
const dynamicOriginal = new WeakMap();
const dynamicRoots = ['.toast','#chatMessages','#pmOverlay','#vhOverlay','#tdOverlay','#pubOverlay','#stOverlay'];
const excludedDynamic = 'input,textarea,code,pre,[contenteditable],.message-content,.chat-bubble,.pm-card h3,.pm-card p';
function translateDynamic(root){
 
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const parent=node.parentElement;if(!parent || parent.closest(excludedDynamic) || parent.closest('[data-i18n]'))continue;
  const value=dynamicOriginal.get(node)??node.nodeValue;const trimmed=value.trim();
  if(!trimmed)continue;
  if(active==='en'){if(dynamicOriginal.has(node))node.nodeValue=value;continue;}
  if(!(trimmed in translations[active]))continue;
  if(!dynamicOriginal.has(node))dynamicOriginal.set(node,value);
  node.nodeValue=value.replace(trimmed,translations[active][trimmed]);
 }
}
function applyDynamic(){for(const selector of dynamicRoots)document.querySelectorAll(selector).forEach(translateDynamic);}

let active = 'en';
let busy = false;
function remember(el,attr){let state=original.get(el);if(!state){state={};original.set(el,state);}if(!(attr in state))state[attr]=attr==='text'?el.textContent:el.getAttribute(attr);return state[attr];}
function translateElement(el){
 if(el.hasAttribute('data-i18n')){const source=el.getAttribute('data-i18n')||remember(el,'text');const target=translations[active][source]??source;if(el.textContent!==target)el.textContent=target;}
 for(const attr of ['placeholder','aria-label']){if(el.hasAttribute('data-i18n-'+attr)){const source=el.getAttribute('data-i18n-'+attr)||remember(el,attr);const target=translations[active][source]??source;if(el.getAttribute(attr)!==target)el.setAttribute(attr,target);}}
}
function apply(){busy=true;document.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label]').forEach(translateElement);document.documentElement.lang=active;const langSelect=document.getElementById('xsusLanguageSelect');if(langSelect)langSelect.value=active;const settings=document.getElementById('stLanguage');if(settings)settings.value=active;applyDynamic();busy=false;}
export function setLanguage(lang){if(!supported.includes(lang))return;active=lang;try{localStorage.setItem('xsus-app-language',lang);}catch{}apply();document.dispatchEvent(new CustomEvent('xsus:language-changed',{detail:{language:lang}}));}
export function getLanguage(){return active;}
export function t(key){return translations[active]?.[key]??key;}
export function formatUi(key, values={}){return t(key).replace(/\{([a-zA-Z]+)\}/g, (_,name)=>String(values[name]??''));}
const select=document.getElementById('xsusLanguageSelect');
select?.addEventListener('change',e=>setLanguage(e.target.value));
document.getElementById('stLanguage')?.addEventListener('change',e=>setLanguage(e.target.value));
let initial='en';try{initial=localStorage.getItem('xsus-app-language')||'en';}catch{}
setLanguage(supported.includes(initial)?initial:'en');
// Re-apply translations to newly inserted tagged UI, without altering source code or user inputs.
const observer = new MutationObserver(records => {
 if (busy) return;
 let shouldApply = false;
 for (const record of records) {
  if (record.type === 'attributes' && record.target?.matches?.('[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label]')) shouldApply = true;
  if (record.type === 'childList' && record.addedNodes.length) {
   for (const node of record.addedNodes) {
    if (node.nodeType === 1 && (node.matches?.('[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label]') || node.querySelector?.('[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label]'))) shouldApply = true;
   }
  }
 }
 if (shouldApply) queueMicrotask(apply);
 else if (records.some(r=>r.type==='childList' && r.addedNodes.length)) queueMicrotask(()=>{if(!busy)applyDynamic();});
});
observer.observe(document.body, {childList:true,attributes:true,attributeFilter:['data-i18n','data-i18n-placeholder','data-i18n-aria-label'],subtree:true});
// Dynamic strings without data-i18n remain subject to a separate audit.

