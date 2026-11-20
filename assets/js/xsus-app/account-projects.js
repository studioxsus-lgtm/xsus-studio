import { getSupabaseClient } from './auth-session.js';
import { currentWorkspaceOwner, readWorkspacePart, restoreWorkspacePart } from './refresh-state.js?v=20261120-account1';

const labels = {
  en:['My projects','Project name','Save a copy','Sign in to access your projects.','Saved to your account.','No saved projects.','Account storage is unavailable.','Show more','Close','Saving…','Open','Enter an app idea or build a project first.'],
  sq:['Projektet e mia','Emri i projektit','Ruaj një kopje','Hyr në llogari për të hapur projektet.','Projekti u ruajt në llogari.','Nuk ke ende projekte të ruajtura.','Ruajtja në llogari nuk është e disponueshme.','Shfaq më shumë','Mbyll','Po ruhet…','Hap','Shkruaj një ide ose ndërto një projekt fillimisht.'],
  fr:['Mes projets','Nom du projet','Enregistrer une copie','Connectez-vous pour accéder à vos projets.','Projet enregistré dans votre compte.','Aucun projet enregistré.','Le stockage du compte est indisponible.','Afficher plus','Fermer','Enregistrement…','Ouvrir','Saisissez une idée ou créez un projet.']
};
const table = 'xsus_builder_projects';
const boardId = html => html?.match(/<html lang="en" data-board="([a-f0-9-]+)"/)?.[1];

export function captureProject() {
  const builder = readWorkspacePart('builder');
  const session = builder.sessions.find(item => item.id === builder.activeId);
  if (!session.messages.length && !builder.goal.trim() && !builder.steps.trim() && !session.generatedHtml) return null;
  const ids = new Set(session.messages.map(m => m.reviewKey ?? m.result?.requestId).filter(Boolean));
  const reviews = builder.reviews.filter(([id]) => ids.has(id));
  const boards = new Set([session.generatedHtml, ...reviews.map(([,r]) => r.builtHtml)].map(boardId).filter(Boolean));
  return {version:1, session, goal:builder.goal, steps:builder.steps, reviews, boards:readWorkspacePart('boards').filter(([id]) => boards.has(id))};
}

export function openProject(project) {
  if (project?.version !== 1 || !Array.isArray(project.session?.messages) || !Array.isArray(project.reviews) || !Array.isArray(project.boards)) throw Error('Unsupported project');
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
  restoreWorkspacePart('builder',{...builder,sessions:[{...copy.session,id},...builder.sessions],activeId:id,nextId:id+1,reviews:[...builder.reviews,...reviews],goal:copy.goal,steps:copy.steps});
}

export function initAccountProjects() {
  const dialog = document.querySelector('#accountProjects');
  const list = dialog.querySelector('[data-project-list]');
  const form = dialog.querySelector('form');
  const input = form.querySelector('input');
  const submit = form.querySelector('button');
  const status = dialog.querySelector('[role=status]');
  const more = dialog.querySelector('[data-more]');
  const words = () => labels[document.documentElement.lang] || labels.en;
  const buttons = document.querySelectorAll('[data-account-projects]');
  let generation = 0, offset = 0;
  function translate() {
    const w=words();
    for (const b of buttons) if (b.classList.contains('pm-launch')) b.textContent=w[0];
    dialog.querySelector('h2').textContent=w[0]; form.querySelector('span').textContent=w[1];
    submit.textContent=w[2]; more.textContent=w[7]; dialog.querySelector('[data-close]').ariaLabel=w[8];
  }
  const current = (token,owner) => token===generation && dialog.open && owner===currentWorkspaceOwner();
  async function fetchPage(reset) {
    const token=generation, owner=currentWorkspaceOwner();
    if (reset) { offset=0; list.replaceChildren(); more.hidden=true; }
    submit.disabled=!owner;
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
            const {data,error}=await client.from(table).select('snapshot').eq('owner_id',owner).eq('id',row.id).single();
            if (!current(token,owner)) return;
            if (error) throw error;
            openProject(data.snapshot); dialog.close(); document.querySelector('[data-section="AI Builder"]')?.click();
          } catch { if (current(token,owner)) status.textContent=words()[6]; }
          finally { b.disabled=false; }
        };
        list.append(b);
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
    submit.disabled=true; status.textContent=words()[9];
    try {
      const client=await getSupabaseClient();
      if (!current(token,owner)) return;
      const {error}=await client.from(table).insert({id:crypto.randomUUID(),owner_id:owner,name,snapshot});
      if (!current(token,owner)) return;
      if (error) throw error;
      status.textContent=words()[4]; generation++; await fetchPage(true);
    } catch { if(current(token,owner)) status.textContent=words()[6]; }
    finally { if(current(token,owner)) submit.disabled=false; }
  };
  translate(); document.addEventListener('xsus:language-changed',translate);
  for(const button of buttons) button.onclick=()=>{
    translate();generation++;status.textContent='';
    const project=captureProject(); input.value=project?.session?.messages.length ? project.session.name : (project?.goal || '').slice(0,120);
    dialog.showModal(); fetchPage(true);
  };
  more.onclick=()=>fetchPage(false);
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.onclose=()=>{ generation++;list.replaceChildren();input.value='';status.textContent=''; };
  document.addEventListener('xsus:workspace-owner',()=>{if(dialog.open)dialog.close();});
}
