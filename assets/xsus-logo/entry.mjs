import {supabase} from '../../services/supabase-client.js';
import {mountStudio} from './studio-controller.mjs?v=20261125-7';
const root=document.getElementById('studio-section');
try {
 mountStudio(root,supabase);
} catch {
 root.textContent='Logo Studio unavailable. Please reload.';
}
