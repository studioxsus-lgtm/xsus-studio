import {inspectAccountProjectSnapshot} from './project-snapshot-integrity.js';
import {updateLinkedAccountProject} from './account-save-operation.js';
import {nextAccountRetryDelay,shouldRetryAccountSave} from './account-retry-policy.js';
import {hasProjectWork,canCaptureProject} from './project-recovery-policy.js';
import {classifyAccountSaveResult} from './account-autosave-policy.js';
import { getSupabaseClient } from './auth-session.js';
import { currentWorkspaceOwner, readWorkspacePart, restoreWorkspacePart, saveRefreshState } from './refresh-state.js?v=20261122-unified2';

const labels = {
  en:['My projects','Project name','Save a copy','Sign in to access your projects.','Saved to your account.','No saved projects.','Account storage is unavailable.','Show more','Close','Saving…','Open','Enter an app idea or build a project first.'],
  sq:['Projektet e mia','Emri i projektit','Ruaj një kopje','Hyr në llogari për të hapur projektet.','Projekti u ruajt në llogari.','Nuk ke ende projekte të ruajtura.','Ruajtja në llogari nuk është e disponueshme.','Shfaq më shumë','Mbyll','Po ruhet…','Hap','Shkruaj një ide ose ndërto një projekt fillimisht.'],
  fr:['Mes projets','Nom du projet','Enregistrer une copie','Connectez-vous pour accéder à vos projets.','Projet enregistré dans votre compte.','Aucun projet enregistré.','Le stockage du compte est indisponible.','Afficher plus','Fermer','Enregistrement…','Ouvrir','Saisissez une idée ou créez un projet.']
};
const deletionLabels = {
  en: {button:'Delete', confirm:'Permanently delete this saved copy?', success:'Project deleted.', failed:'Could not confirm deletion. Reopen My projects to check.'},
  sq: {button:'Fshi', confirm:'Ta fshish përgjithmonë këtë kopje të ruajtur?', success:'Projekti u fshi.', failed:'Fshirja nuk u konfirmua. Rihap Projektet e mia për ta kontrolluar.'},
  fr: {button:'Supprimer', confirm:'Supprimer définitivement cette copie enregistrée ?', success:'Projet supprimé.', failed:'Suppression non confirmée. Rouvrez Mes projets pour vérifier.'}
};
const saveLabels = {
  en: ['Save project','Save changes','This project changed or was deleted. Reopen it or save a copy.'],
  sq: ['Ruaj projektin','Ruaj ndryshimet','Projekti ka ndryshuar ose është fshirë. Rihape ose ruaj një kopje.'],
  fr: ['Enregistrer le projet','Enregistrer les modifications','Le projet a changé ou a été supprimé. Rouvrez-le ou enregistrez une copie.']
};
function activeSession() {
  const builder = readWorkspacePart('builder');
  return builder.sessions.find(item => item.id === builder.activeId);
}

const table = 'xsus_builder_projects';
const boardId = html => html?.match(/<html lang="en" data-board="([a-f0-9-]+)"/)?.[1];

export function captureProject() {
  const builder = readWorkspacePart('builder');
  const session = builder.sessions.find(item => item.id === builder.activeId);
  if (!canCaptureProject(builder,session)) return null;
  const ids = new Set(session.messages.map(m => m.reviewKey ?? m.result?.requestId).filter(Boolean));
  const reviews = builder.reviews.filter(([id]) => ids.has(id));
  const boards = new Set([session.generatedHtml, ...reviews.map(([,r]) => r.builtHtml)].map(boardId).filter(Boolean));
  const {accountProject, ...content} = session;
  return {version:1, session:content, goal:builder.goal, steps:builder.steps, reviews, boards:readWorkspacePart('boards').filter(([id]) => boards.has(id))};
}

export function openProject(project, accountProject = null) {
  if (!inspectAccountProjectSnapshot(project).ok) throw Error('Unsupported or corrupted project snapshot');
  const builder = readWorkspacePart('builder');
  const id = builder.nextId;
  // Give each imported copy its own review and board IDs.
  const copy = structuredClone(project);
  const ids = new Map();
  for (const [old] of copy.reviews) ids.set(old, crypto.randomUUID());
  const boards = new Map(copy.boards.map(([old]) => [old,crypto.randomUUID()]));
  function remap(html) {
    const old = boardId(html);
    if (!old) return html;
    if (!boards.has(old)) boards.set(old,crypto.randomUUID());
    return html.replace('data-board="'+old+'"','data-board="'+boards.get(old)+'"');
  }
  copy.session.generatedHtml = remap(copy.session.generatedHtml);
  for (const message of copy.session.messages) {
    const key = message.reviewKey ?? message.result?.requestId;
    if (ids.has(key)) message.reviewKey = ids.get(key);
  }
  const reviews = copy.reviews.map(([key,r]) => [ids.get(key),{...r,builtHtml:remap(r.builtHtml)}]);
  restoreWorkspacePart('boards',[...readWorkspacePart('boards'),...copy.boards.map(([key,rows]) => [boards.get(key),rows])]);
  restoreWorkspacePart('builder',{...builder,sessions:[{...copy.session,id,accountProject},...builder.sessions],activeId:id,nextId:id+1,reviews:[...builder.reviews,...reviews],goal:copy.goal,steps:copy.steps});
}

export function initAccountProjects() {
  const dialog = document.querySelector('#accountProjects');
  const list = dialog.querySelector('[data-project-list]');
  const form = dialog.querySelector('form');
  const input = form.querySelector('input');
  const submit = form.querySelector('button');
  const copyButton = form.querySelector('[data-save-copy]');
  let saving = false;
  const status = dialog.querySelector('[role=status]');
  const more = dialog.querySelector('[data-more]');
  const words = () => labels[document.documentElement.lang] || labels.en;
  const buttons = document.querySelectorAll('[data-account-projects]');
  let generation = 0, offset = 0;
  function translate() {
    const w=words();
    for (const b of buttons) if (b.classList.contains('pm-launch')) b.textContent=w[0];
    dialog.querySelector('h2').textContent=w[0]; form.querySelector('span').textContent=w[1];
    const linked = activeSession()?.accountProject;
    const actions = saveLabels[document.documentElement.lang] || saveLabels.en;
    submit.textContent=actions[linked ? 1 : 0]; copyButton.textContent=w[2]; copyButton.hidden=!linked; more.textContent=w[7]; dialog.querySelector('[data-close]').ariaLabel=w[8];
  }
  const current = (token,owner) => token===generation && dialog.open && owner===currentWorkspaceOwner();
  async function fetchPage(reset) {
    const token=generation, owner=currentWorkspaceOwner();
    if (reset) { offset=0; list.replaceChildren(); more.hidden=true; }
    submit.disabled=!owner || saving; copyButton.disabled=submit.disabled;
    if (!owner) { status.textContent=words()[3]; return; }
    more.disabled=true;
    try {
      const client=await getSupabaseClient();
      const {data,error}=await client.from(table).select('id,name,created_at').eq('owner_id',owner).order('created_at',{ascending:false}).order('id').range(offset,offset+19);
      if (!current(token,owner)) return;
      if (error) throw error;
      if (!data.length && !offset) status.textContent=words()[5];
      offset+=data.length; more.hidden=data.length<20;
      for (const row of data) {
        const b=document.createElement('button'); b.type='button'; b.className='pm-launch';
        b.textContent=words()[10]+' · '+row.name+' · '+new Date(row.created_at).toLocaleString(document.documentElement.lang);
        b.onclick=async () => {
          b.disabled=true;
          try {
            const {data,error}=await client.from(table).select('name,snapshot').eq('owner_id',owner).eq('id',row.id).single();
            if (!current(token,owner)) return;
            if (error) throw error;
            openProject(data.snapshot,{id:row.id,name:data.name,token:data.snapshot.saveToken ?? null}); dialog.close(); document.querySelector('[data-section="AI Builder"]')?.click();
          } catch { if (current(token,owner)) status.textContent=words()[6]; }
          finally { b.disabled=false; }
        };
        const text = deletionLabels[document.documentElement.lang] || deletionLabels.en;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'pm-launch';
        remove.textContent = text.button;
        remove.setAttribute('aria-label', text.button + ' · ' + row.name);
        remove.onclick = async () => {
          if (remove.disabled || !current(token, owner)) return;
          const timestamp = new Date(row.created_at).toLocaleString(document.documentElement.lang);
          if (!window.confirm(text.confirm + '\n\n' + row.name + '\n' + timestamp)) return;
          remove.disabled = true;
          b.disabled = true;
          try {
            const {data, error} = await client.from(table).delete()
              .eq('owner_id', owner).eq('id', row.id).select('id').maybeSingle();
            if (!current(token, owner)) return;
            if (error || data?.id !== row.id) throw Error('Deletion unconfirmed');
            for (const session of readWorkspacePart('builder').sessions) {
              if (session.accountProject?.id === row.id) delete session.accountProject;
            }
            saveRefreshState('builder'); translate(); generation++;
            await fetchPage(true);
            if (dialog.open && owner === currentWorkspaceOwner()) status.textContent = text.success;
          } catch {
            if (current(token, owner)) status.textContent = text.failed;
          } finally {
            remove.disabled = false;
            b.disabled = false;
          }
        };
        const entry = document.createElement('div');
        entry.append(b, remove);
        list.append(entry);
      }
    } catch { if (current(token,owner)) status.textContent=words()[6]; }
    finally { if(current(token,owner)) more.disabled=false; }
  }
  form.onsubmit=async event=>{
    event.preventDefault();
    const owner=currentWorkspaceOwner(), token=generation;
    if (!owner || submit.disabled) return;
    const snapshot=captureProject(), name=input.value.trim();
    if (!snapshot) { status.textContent=words()[11]; return; }
    if (!name) {input.focus();return;}
    const session = activeSession();
    const link = event.submitter === copyButton ? null : session.accountProject;
    const id = link?.id ?? crypto.randomUUID();
    snapshot.saveToken = crypto.randomUUID();
    saving=true; submit.disabled=true; copyButton.disabled=true; status.textContent=words()[9];
    try {
      const client=await getSupabaseClient();
      if (!current(token,owner)) return;
      if (link) {
        const result = await updateLinkedAccountProject(client,{table,owner,id,token:link.token,snapshot,name});
        if (result !== 'saved') {
          if (current(token,owner)) status.textContent=result==='revision-conflict'
            ? (saveLabels[document.documentElement.lang] || saveLabels.en)[2] : words()[6];
          return;
        }
      } else {
        const {error} = await client.from(table).insert({id,owner_id:owner,name,snapshot});
        if (error) throw error;
      }
      if (currentWorkspaceOwner() === owner && readWorkspacePart('builder').sessions.includes(session)) {
        session.accountProject={id,name,token:snapshot.saveToken};
        autosaveConflict = null;
        autosaveFailures = 0;
        lastAutosaved = '';
        saveRefreshState('builder');
      }
      if (!current(token,owner)) return;
      translate(); status.textContent=words()[4]; generation++; await fetchPage(true);
    } catch { if(current(token,owner)) status.textContent=words()[6]; }
    finally {
      saving=false;
      submit.disabled=!currentWorkspaceOwner();copyButton.disabled=submit.disabled;
      // A workspace edit during manual save must not be silently stranded.
      if(autosavePending){
        autosavePending=false;
        clearTimeout(autosaveTimer);
        autosaveTimer=setTimeout(()=>{void autosaveLinkedProject();},1600);
      }
    }
  };
  // Autosave only projects that the user explicitly saved to their account first.
  // Keep optimistic revision checks to avoid overwriting a newer remote copy.
  let autosaveTimer = null;
  let autosaveBusy = false;
  let lastAutosaved = '';
  let autosavePending = false;
  let autosaveConflict = null;
  let autosaveFailures = 0;
  async function autosaveLinkedProject() {
    if (autosaveBusy || saving) { autosavePending = true; return; }
    const owner = currentWorkspaceOwner();
    const session = activeSession();
    const link = session?.accountProject;
    if (!owner || !link?.id) return;
    if (autosaveConflict === link.id) return;
    const snapshot = captureProject();
    if (!snapshot) return;
    const fingerprint = JSON.stringify({ id: link.id, content: snapshot });
    if (fingerprint === lastAutosaved) return;
    autosaveBusy = true;
    try {
      const client = await getSupabaseClient();
      if (currentWorkspaceOwner() !== owner || activeSession() !== session ||
          session.accountProject?.token !== link.token) return;
      snapshot.saveToken = crypto.randomUUID();
      const result=await updateLinkedAccountProject(client,{
        table,owner,id:link.id,token:link.token,snapshot
      });
      if(result==='retryable-error')throw Error('Transient account save failure');
      if(result==='revision-conflict') {
        // Do not overwrite conflicting remote edits or deleted projects.
        autosaveConflict = link.id;
        autosaveFailures = 0;
        if (currentWorkspaceOwner() === owner) {
          status.textContent = (saveLabels[document.documentElement.lang] || saveLabels.en)[2];
          document.dispatchEvent(new CustomEvent('xsus:project-autosave-conflict',{detail:{projectId:link.id}}));
        }
        return;
      }
      if (currentWorkspaceOwner() === owner && session.accountProject?.token === link.token) {
        session.accountProject = { ...link, token: snapshot.saveToken };
        lastAutosaved = fingerprint;
        autosaveConflict = null;
        autosaveFailures = 0;
        saveRefreshState('builder');
      }
    } catch {
      // Keep the draft intact. Network/storage failures are not revision conflicts.
      if(shouldRetryAccountSave({
        result:'retryable-error',
        ownerMatches:currentWorkspaceOwner()===owner,
        linked:session.accountProject?.id===link.id,
        conflicted:autosaveConflict===link.id
      })) {
        autosaveFailures++;
        autosavePending = true;
      }
    } finally {
      autosaveBusy = false;
      if (autosavePending) {
        autosavePending = false;
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => { void autosaveLinkedProject(); },
          autosaveFailures ? nextAccountRetryDelay(autosaveFailures) : 1600);
      }
    }
  }
  document.addEventListener('xsus:workspace-saved', event => {
    if (event.detail?.section !== 'builder' || !event.detail.owner) return;
    if (autosaveBusy) { autosavePending = true; return; }
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => { void autosaveLinkedProject(); }, 1600);
  });
  // Restore the most recently saved account project after refresh, but never
  // replace an existing local draft or a project already restored from this tab.
  let restoreGeneration = 0;
  async function restoreLastAccountProject() {
    const generation = ++restoreGeneration;
    const owner = currentWorkspaceOwner();
    if (!owner) return;
    const builder = readWorkspacePart('builder');
    if (hasProjectWork(builder)) return;
    try {
      const client = await getSupabaseClient();
      const { data, error } = await client.from(table)
        .select('id,name,snapshot,created_at').eq('owner_id',owner)
        .order('created_at',{ascending:false}).limit(1).maybeSingle();
      if (error || !data?.snapshot || generation !== restoreGeneration ||
          currentWorkspaceOwner() !== owner) return;
      const latest = readWorkspacePart('builder');
      if (hasProjectWork(latest)) return;
      openProject(data.snapshot, { id:data.id, name:data.name, token:data.snapshot.saveToken ?? null });
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent = document.documentElement.lang === 'sq'
          ? 'Projekti i fundit u rikthye nga llogaria.'
          : 'Last saved project restored from your account.';
        toast.classList.add('show');
      }
    } catch {
      // Never clear local work when the network or account storage is unavailable.
    }
  }
  document.addEventListener('xsus:workspace-owner', () => {
    ++restoreGeneration;
    if (currentWorkspaceOwner()) void restoreLastAccountProject();
  });
  translate(); document.addEventListener('xsus:language-changed',translate);
  for(const button of buttons) button.onclick=()=>{
    translate();generation++;status.textContent='';
    const project=captureProject(); input.value=activeSession()?.accountProject?.name ?? (project?.session?.messages.length ? project.session.name : (project?.goal || '').slice(0,120));
    dialog.showModal(); fetchPage(true);
  };
  more.onclick=()=>fetchPage(false);
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.onclose=()=>{ generation++;list.replaceChildren();input.value='';status.textContent=''; };
  document.addEventListener('xsus:workspace-owner',()=>{if(dialog.open)dialog.close();});
}
