import {supabase} from '../../../services/supabase-client.js';
import {mountPublicWorkspace} from './workspace/public-bootstrap.mjs?v=2';
const button=document.getElementById('xsus-ai-workspace-open');
const host=document.getElementById('xsus-ai-workspace');
let mounted=null;
button?.addEventListener('click',()=>{host.hidden=false;button.setAttribute('aria-expanded','true');if(!mounted){try{mounted=mountPublicWorkspace({document,container:host,auth:supabase.auth})}catch{host.textContent='AI workspace unavailable.'}}host.scrollIntoView({block:'start'});});
