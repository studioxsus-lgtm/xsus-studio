import {supabase} from '../../services/supabase-client.js';
import {mountStudio} from './studio-controller.mjs?v=brand5.2';
const root=document.getElementById('studio-section');
try {
 mountStudio(root,supabase);
} catch {
 root.textContent='Logo Studio unavailable. Please reload.';
}
