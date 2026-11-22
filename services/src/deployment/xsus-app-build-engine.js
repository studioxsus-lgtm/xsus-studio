// XSUS App Build Engine v0.1 — deterministic, server-owned static scaffold.
// This is NOT an AI code generator and never executes user-supplied code.
const MAX_GOAL=1200;
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
export function createXsUsAppBuildArtifacts(snapshot) {
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return null;
 const goal=typeof snapshot.goal==='string'?snapshot.goal.trim():null;
 if(!goal||goal.length>MAX_GOAL||/[\u0000-\u001f\u007f]/.test(goal))return null;
 // Only a safe description becomes text. Never accept browser-provided
 // buildArtifacts, scripts, HTML, URLs or arbitrary JS from the snapshot.
 const title=escapeHtml(goal.slice(0,80));
 const description=escapeHtml(goal);
 return Object.freeze({
  'index.html':`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'"><title>${title}</title><link rel="stylesheet" href="./styles.css"></head><body><main><p class="eyebrow">XSUS APP · GENERATED SCAFFOLD</p><h1>${title}</h1><p id="goal">${description}</p><section aria-label="Build status"><h2>Project scaffold</h2><p>Structure generated from a saved goal. Application features require implementation and testing.</p></section><output id="status" aria-live="polite"></output></main><script src="./app.js" defer></script></body></html>`,
  'styles.css':`*{box-sizing:border-box}body{margin:0;background:#0b1424;color:#eef7ff;font:16px/1.6 system-ui,sans-serif}main{max-width:780px;margin:8vh auto;padding:28px}h1{font-size:clamp(1.8rem,5vw,3rem);overflow-wrap:anywhere}.eyebrow{font-size:.8rem;letter-spacing:.12em;color:#58cde6}section{padding:20px;margin-top:28px;border:1px solid #35536c;border-radius:12px;background:#12253a}`,
  'app.js':`'use strict';document.getElementById('status').textContent='Scaffold ready for development';`
 });
}
export function createXsUsAppSavedProjectBuilder(client) {
 if(typeof client?.from!=='function')throw new TypeError('Trusted owner-scoped project client required');
 return async function buildFromSavedProject({projectId,ownerId}={}) {
  if(typeof projectId!=='string'||typeof ownerId!=='string')return null;
  try{
   const {data,error}=await client.from('xsus_builder_projects').select('id,owner_id,snapshot')
    .eq('id',projectId).eq('owner_id',ownerId).maybeSingle();
   if(error||!data||data.id!==projectId||data.owner_id!==ownerId)return null;
   return createXsUsAppBuildArtifacts(data.snapshot);
  }catch{return null;}
 };
}
