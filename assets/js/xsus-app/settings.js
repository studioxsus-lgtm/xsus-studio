// XSUS APP V3.1 — visual settings only; no server persistence.
export function initSettings() {
 const overlay=document.getElementById('stOverlay'); if(!overlay)return;
 const dialog=overlay.querySelector('.st-dialog');const close=document.getElementById('stClose');
 let previousFocus=null;
 let previousOverflow='';
 const isOpen=()=>!overlay.classList.contains('hidden');
 const open=()=>{
  if(isOpen())return;
  previousFocus=document.activeElement;
  previousOverflow=document.body.style.overflow;
  overlay.classList.remove('hidden');
  document.body.style.overflow='hidden';
  dialog.focus({preventScroll:true});
 };
 const dismiss=()=>{
  if(!isOpen())return;
  overlay.classList.add('hidden');
  document.body.style.overflow=previousOverflow;
  if(previousFocus?.isConnected && typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});
 };
 document.addEventListener('xsus:open-settings',open);
 close.addEventListener('click',dismiss);document.getElementById('stDone').addEventListener('click',dismiss);
 overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
 overlay.addEventListener('keydown',e=>{if(!isOpen())return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();return;}if(e.key==='Tab'){const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length);if(!focusable.length){e.preventDefault();dialog.focus();return;}const first=focusable[0],last=focusable.at(-1);if(!dialog.contains(document.activeElement)){e.preventDefault();(e.shiftKey?last:first).focus();return;}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 const tabs=[...overlay.querySelectorAll('[data-st-tab]')];tabs.forEach(btn=>btn.addEventListener('click',()=>{tabs.forEach(t=>t.classList.toggle('active',t===btn));overlay.querySelectorAll('[data-st-view]').forEach(view=>view.classList.toggle('hidden',view.dataset.stView!==btn.dataset.stTab));}));
 const accents={cyan:'#22d3ee',violet:'#a78bfa',blue:'#60a5fa'};
 const setAccent=name=>{document.documentElement.style.setProperty('--cyan',accents[name]);overlay.querySelectorAll('[data-st-accent]').forEach(b=>{const selected=b.dataset.stAccent===name;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});};
 overlay.querySelectorAll('[data-st-accent]').forEach(b=>b.addEventListener('click',()=>setAccent(b.dataset.stAccent)));
 const density=document.getElementById('stDensity'),motion=document.getElementById('stMotion'),font=document.getElementById('stFont'),wrap=document.getElementById('stWrap');
 density.addEventListener('change',()=>document.body.classList.toggle('st-compact',density.value==='compact'));
 motion.addEventListener('change',()=>document.body.classList.toggle('st-reduce-motion',motion.checked));
 font.addEventListener('input',()=>{document.getElementById('stFontValue').textContent=`${font.value} px`;overlay.querySelector('.st-sample').style.fontSize=`${font.value}px`;});
 wrap.addEventListener('change',()=>{overlay.querySelector('.st-sample').style.whiteSpace=wrap.checked?'normal':'nowrap';});
 document.getElementById('stReset').addEventListener('click',()=>{setAccent('cyan');density.value='comfortable';motion.checked=false;font.value='13';wrap.checked=false;document.body.classList.remove('st-compact','st-reduce-motion');font.dispatchEvent(new Event('input'));wrap.dispatchEvent(new Event('change'));});
}
