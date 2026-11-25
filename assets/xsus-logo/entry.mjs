import {supabase} from '../../services/supabase-client.js';
import {mountStudio} from './studio-controller.mjs?v=20261125-4';
const root=document.getElementById('studio-section');
try{mountStudio(root,supabase);const header=document.getElementById('language-select'),local=root.querySelector('#logo-language');header.addEventListener('change',()=>{local.value=header.value;local.dispatchEvent(new Event('change'))});local.addEventListener('change',()=>{if(header.value!==local.value){header.value=local.value;document.documentElement.lang=local.value;header.dispatchEvent(new Event('change'))}}); }catch{root.textContent='Logo Studio unavailable. Please reload.'}
