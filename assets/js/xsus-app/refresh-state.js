import { getSupabaseClient } from './auth-session.js';

const sections = new Map();
let owner;
let warned = false;

function key(section) {
  return 'xsus-app:refresh:v1:' + owner + ':' + section;
}

export function registerRefreshState(section, read, restore) {
  sections.set(section, {read, restore});
}

export function saveRefreshState(section) {
  if (!owner) return;
  try {
    sessionStorage.setItem(key(section), JSON.stringify(sections.get(section).read()));
  } catch {
    if (warned) return;
    warned = true;
    const messages = {en:'Browser storage is unavailable or full. Download your HTML before refreshing.', sq:'Ruajtja në shfletues dështoi. Shkarko HTML-në para rifreskimit.', fr:'Stockage indisponible ou plein. Téléchargez le HTML avant d’actualiser.'};
    const toast = document.querySelector('#toast');
    if (toast) {
      toast.textContent = messages[document.documentElement.lang] || messages.en;
      toast.classList.add('show');
    }
  }
}

export function currentWorkspaceOwner() { return owner; }
export function readWorkspacePart(section) { return sections.get(section).read(); }
export function restoreWorkspacePart(section, value) {
  sections.get(section).restore(value);
  saveRefreshState(section);
}

function selectOwner(id) {
  if (id === owner) return;
  const first = owner === undefined;
  owner = id;
  warned = false;
  document.dispatchEvent(new Event('xsus:workspace-owner'));
  for (const [section, adapter] of sections) {
    let saved;
    try { saved = id && JSON.parse(sessionStorage.getItem(key(section))); } catch {}
    if (saved || !first) {
      try { adapter.restore(saved || null); } catch { adapter.restore(null); }
    }
  }
}

export async function initRefreshState() {
  try {
    const client = await getSupabaseClient();
    client.auth.onAuthStateChange((_event, session) => selectOwner(session?.user?.id || null));
  } catch { selectOwner(null); }
}
