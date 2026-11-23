import {appendGeneratedSourceRevision,findGeneratedSourceRevision} from './generated-source-history.js';
import { SOURCE_PATHS, validProjectSource, copyProjectSource, restoreProjectSource } from './project-source-snapshot.js';
import { buildFromChatGoal } from './build-engine-chat-client.js?v=20261123-formfix2';
import { appendSourceRevision } from './code-generation/source-history.js';
import { registerRefreshState, saveRefreshState, restoreWorkspacePart, readWorkspacePart, currentWorkspaceOwner } from './refresh-state.js?v=20261122-unified2';
import { showGeneratedHtml, showGeneratedFiles, getGeneratedPreviewHtml } from './editor.js?v=20261123-toolbar30';
import { appendScaffoldControls, upgradeTaskBoard, enableTaskAssignments, enableMemberFilter } from './scaffold/index.js?v=20261122-authgate1';
import { t } from './i18n/language-manager.js?v=20261120-scaffold1';
import { $, $$ } from './state.js';
import { toast } from './notifications.js';
import { createDraftPlan, parsePlanSteps, BridgeRequestError } from './hyper-future-bridge-client.js?v=20261122-goalplan1';
import { createAppSpecification } from './app-specification/index.js?v=20261122-reviewed1';
import { approveSpecificationReviewDraft, createSpecificationReviewDraft, parseSpecificationList } from './app-specification/review.js?v=20261120-scaffold1';

// Conversation drafts stay in memory on this page. Credentials and prompts are never persisted here.
const sessions = [{ id: 1, name: 'New conversation', messages: [] }];
const specificationReviews = new Map();
function sourceKey(id){
  const owner=currentWorkspaceOwner();
  return owner ? 'xsus-app:source:v1:'+owner+':'+id : null;
}
const validSourceFiles=validProjectSource;
function storeSourceFiles(session){
  if(!session || !validSourceFiles(session.generatedFiles))return false;
  const key=sourceKey(session.id);
  if(!key)return false;
  try{
    localStorage.setItem(key,JSON.stringify(copyProjectSource(session.generatedFiles)));
    return true;
  }catch(error){
    console.warn('[xsus-source-save-failed]',error?.name||'Error');
    toast('Source files could not be saved. Check browser storage.');
    return false;
  }
}
function restoreSourceFiles(session){
  const key=sourceKey(session.id);
  if(!key)return;
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    // The workspace snapshot is authoritative when it already contains source files.
    // In particular, never overwrite a freshly imported account project with an
    // unrelated local source cache that happens to reuse the same numeric session id.
    const restored=restoreProjectSource(session.generatedFiles,saved);
    if(restored)session.generatedFiles=restored;
  }catch(error){console.warn('[xsus-source-restore-failed]',error?.name||'Error');}
}

let activeId = 1;
let nextId = 2;
let busy = false;
let requestController = null;
const current = () => sessions.find(session => session.id === activeId);
function iconRefresh() { window.lucide?.createIcons?.(); }
function scrollChat() { const el = $('#chatMessages'); el.scrollTop = el.scrollHeight; }

function addBubble(text, role) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = role === 'user' ? t('YOU') : t('✦ XSUS APP · CONNECTED CORES');
  const content = document.createElement('div');
  content.textContent = text;
  bubble.append(meta, content);
  $('#chatMessages').append(bubble);
  scrollChat();
}

function renderSpecificationCard(specification, draft, reviewKey) {
  const specCard = document.createElement('article'); specCard.className = 'concept-card app-specification-card';
  specCard.dataset.requestId = specification.requestId;
  const specHeading = document.createElement('h3');
  specHeading.textContent = t(draft.state === 'approved_for_next_phase' ? 'App specification approved' : 'App specification draft');
  const specStatus = document.createElement('p');
  specStatus.textContent = t(draft.state === 'approved_for_next_phase' ? 'Approved for the next phase only' : 'Edit each list using one item per line, then approve the specification');
  specCard.append(specHeading, specStatus);

  const makeEditor = (label, key, values, target) => {
    const section = document.createElement('section'); section.className = 'app-specification-section';
    const title = document.createElement('label'); title.className = 'app-specification-label'; title.textContent = t(label);
    const input = document.createElement('textarea'); input.className = 'app-specification-input'; input.rows = Math.min(5, Math.max(2, values.length));
    input.value = values.join('\n'); input.setAttribute('aria-label', t(label));
    input.placeholder = t('One item per line');
    input.disabled = draft.state !== 'draft';
    title.append(input); section.append(title); target.append(section);
    input.addEventListener('input', () => {
      const parsed = parseSpecificationList(input.value);
      if (key === 'requirements') draft.requirements = parsed;
      else draft.proposedStructure[key] = parsed;
    });
  };
  makeEditor('Pages / screens', 'pages', draft.proposedStructure.pages, specCard);
  makeEditor('UI components', 'components', draft.proposedStructure.components, specCard);
  makeEditor('Data models', 'dataModels', draft.proposedStructure.dataModels, specCard);
  makeEditor('Interactions', 'interactions', draft.proposedStructure.interactions, specCard);
  makeEditor('User requirements', 'requirements', draft.requirements, specCard);

  const questions = document.createElement('section'); questions.className = 'app-specification-section';
  const questionTitle = document.createElement('h4'); questionTitle.textContent = t('Open questions'); questions.append(questionTitle);
  const questionList = document.createElement('ul');
  (draft.openQuestions.length ? draft.openQuestions : [t('No open questions')]).forEach(question => {
    const item = document.createElement('li'); item.textContent = t(question); questionList.append(item);
  });
  questions.append(questionList); specCard.append(questions);
  const status = document.createElement('p'); status.className = 'app-specification-feedback'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  if (draft.state === 'approved_for_next_phase') status.textContent = t('Approved in this temporary session. No code was generated or saved.');
  specCard.append(status);
  const actions = document.createElement('div'); actions.className = 'app-specification-actions';
  if (draft.state === 'draft') {
    const approve = document.createElement('button'); approve.type = 'button'; approve.className = 'app-specification-approve'; approve.textContent = t('Approve specification');
    approve.addEventListener('click', () => {
      const result = approveSpecificationReviewDraft(draft);
      if (!result.ok) {
        status.textContent = t(result.errors[0] === 'pages_required' ? 'Add at least one page or screen before approval.' : result.errors[0] === 'requirements_required' ? 'Add at least one user requirement before approval.' : 'Review the specification fields and try again.');
        return;
      }
      specificationReviews.set(reviewKey, { ...result.specification, humanReviewed: draft.humanReviewed === true });
      saveRefreshState('builder');
      specCard.replaceWith(renderSpecificationCard(specification, result.specification, reviewKey));
    });
    const discard = document.createElement('button'); discard.type = 'button'; discard.className = 'app-specification-discard'; discard.textContent = t('Discard draft');
    discard.addEventListener('click', () => {
      specificationReviews.set(reviewKey, { state: 'discarded' });
      saveRefreshState('builder');
      specCard.remove();
    });
    actions.append(approve, discard);
  }
  if (actions.childElementCount) specCard.append(actions);
  if (draft.state === 'approved_for_next_phase') appendScaffoldControls(specCard, draft, t, html => {
    draft.builtHtml = html;
    current().generatedHtml = html;
    saveRefreshState('builder');
    renderBoardActions(html);
    showGeneratedHtml(html, true);
  }, editedFiles => {
    const liveDraft = specificationReviews.get(reviewKey);
    if (liveDraft !== draft || liveDraft.state !== 'approved_for_next_phase') {
      throw new Error('This project review is no longer active.');
    }
    if (!['index.html', 'styles.css', 'app.js'].every(name =>
      typeof editedFiles[name] === 'string' && editedFiles[name].length <= 500000)) {
      throw new TypeError('Invalid source files.');
    }
    liveDraft.sourceHistory = appendSourceRevision(liveDraft.sourceHistory, editedFiles);
    liveDraft.sourceFiles = structuredClone(editedFiles);
    saveRefreshState('builder');
    return liveDraft.sourceHistory;
  }, releases => {
    const liveDraft = specificationReviews.get(reviewKey);
    if (liveDraft !== draft || liveDraft.state !== 'approved_for_next_phase') {
      throw new Error('This project review is no longer active.');
    }
    if (!Array.isArray(releases) || releases.length > 20) throw new TypeError('Invalid release history.');
    liveDraft.buildReleases = structuredClone(releases);
    saveRefreshState('builder');
  });
  return specCard;
}

function addPlan(result, reviewKey = result.requestId) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble assistant';
  const card = document.createElement('article'); card.className = 'concept-card bridge-plan-card';
  const meta = document.createElement('div'); meta.className = 'message-meta'; meta.textContent = t('✦ HYPER XSUS CORE + FUTURE XSUS CORE');
  const needsReview = result.status === 'review_required' || result.language?.review_required === true;
  const heading = document.createElement('h3'); heading.textContent = t(needsReview ? 'Draft plan needs review' : 'Validated draft plan');
  const language = document.createElement('p');
  language.textContent = `${t(result.language?.review_required ? 'Future XSUS Core could not fully verify the English goal' : 'Future XSUS Core reviewed the English goal')}: “${result.language.text}” (${result.language.status}).` + (result.plan?.proposalSource ? ` ${t('Hyper XSUS Core proposed the development steps for human review.')}` : '');
  const list = document.createElement('ol'); list.className = 'bridge-plan-steps';
  for (const step of result.plan.steps) {
    const item = document.createElement('li');
    const task = document.createElement('span'); task.textContent = step.task;
    item.append(task);
    if (Array.isArray(step.dependsOn) && step.dependsOn.length) {
      const dependency = document.createElement('small'); dependency.textContent = `${t('Depends on')}: ${step.dependsOn.join(', ')}`; item.append(dependency);
    }
    list.append(item);
  }
  const badges = document.createElement('div'); badges.className = 'concept-badges';
  [t('Draft only'), ...(needsReview ? [t('Human review needed')] : []), t('Not executable'), t('Not saved')].forEach(label => { const tag = document.createElement('span'); tag.textContent = label; badges.append(tag); });
  const note = document.createElement('p'); note.className = 'bridge-plan-note';
  note.textContent = t(needsReview
    ? 'Review the original English goal before relying on this structural draft. No code is generated, no steps run and no project is saved.'
    : 'This is a validated planning draft. It does not generate app code, run steps or save a project.');
  const request = document.createElement('small'); request.className = 'bridge-request-id';
  request.textContent = `${t('Request ID')}: ${result.requestId}`;
  card.append(meta, heading, language, list, badges, note, request); bubble.append(card);
  // A review-required plan must never advance automatically. The user must
  // explicitly accept the original English goal before a specification is made.
  const acceptedReview = specificationReviews.get(reviewKey)?.humanReviewed === true;
  if (result.status === 'review_required' && !acceptedReview) {
    const reviewButton = document.createElement('button');
    reviewButton.type = 'button';
    reviewButton.className = 'app-specification-approve';
    reviewButton.textContent = t('Review original goal and continue');
    reviewButton.addEventListener('click', () => {
      const confirmation = window.confirm(
        'Review the original English goal and the proposed steps above. ' +
        'Continue to an editable specification? This does not execute, save, or deploy code.'
      );
      if (!confirmation) return;
      specificationReviews.set(reviewKey, { humanReviewed: true });
      renderMessages();
    });
    card.append(reviewButton);
  }
  if (result.status === 'completed' || acceptedReview) {
    try {
      const specification = createAppSpecification(result, { humanReviewed: acceptedReview });
      let reviewDraft = specificationReviews.get(reviewKey);
      if (reviewDraft?.state !== 'discarded') {
        if (!reviewDraft?.state) {
        reviewDraft = { ...createSpecificationReviewDraft(specification), humanReviewed: acceptedReview };
        specificationReviews.set(reviewKey, reviewDraft);
        }
        bubble.append(renderSpecificationCard(specification, reviewDraft, reviewKey));
      }
    } catch {
      // Keep the verified planning draft visible if a future spec contract rejects its input.
    }
  }
  $('#chatMessages').append(bubble); scrollChat();
}

function addReviewNotice(result) {
  const note = `${t('Human review is needed before a plan can be prepared.')}${result.language?.text ? ` ${t('Reviewed goal')}: “${result.language.text}”` : ''}`;
  addBubble(note, 'assistant');
}

const historyActions = {
  en: ['Delete', 'Delete this conversation from history?'],
  sq: ['Fshi', 'Ta fshish këtë bisedë nga historiku?'],
  fr: ['Supprimer', 'Supprimer cette conversation de l’historique ?']
};

function deleteConversation(session, title) {
  const index = sessions.indexOf(session);
  const labels = historyActions[document.documentElement.lang] || historyActions.en;
  if (index < 0 || !window.confirm(labels[1] + '\n\n' + title)) return;
  sessions.splice(index, 1);
  const reviewKey = message => message.reviewKey ?? message.result?.requestId;
  const remaining = new Set(sessions.flatMap(item => item.messages.map(reviewKey)));
  const removedHtml = [session.generatedHtml];
  for (const message of session.messages) {
    const key = reviewKey(message);
    if (key && !remaining.has(key)) {
      removedHtml.push(specificationReviews.get(key)?.builtHtml);
      specificationReviews.delete(key);
    }
  }
  if (session.id === activeId) {
    cancelPending();
    if (!sessions.length) sessions.push({id:nextId++, name:'New conversation', messages:[]});
    activeId = sessions[0].id;
    $('#prompt').value = '';
    $('#planSteps').value = '';
    updateCount();
  }
  const boardId = html => html?.match(/<html lang="en" data-board="([a-f0-9-]+)"/)?.[1];
  const liveBoards = new Set([...sessions.map(item => item.generatedHtml), ...Array.from(specificationReviews.values(), draft => draft.builtHtml)].map(boardId));
  const obsolete = new Set(removedHtml.map(boardId).filter(id => id && !liveBoards.has(id)));
  if (obsolete.size) restoreWorkspacePart('boards', readWorkspacePart('boards').filter(([id]) => !obsolete.has(id)));
  renderMessages();
}

function renderHistory() {
  const list = $('#historyList'); list.replaceChildren();
  sessions.forEach(session => {
    const btn = document.createElement('button'); btn.type = 'button';
    btn.textContent = session.name === 'New conversation' ? t('New conversation') : session.name;
    btn.classList.toggle('active', session.id === activeId);
    btn.addEventListener('click', () => { cancelPending(); activeId = session.id; renderMessages(); $('#chatHistory').classList.add('hidden'); $('#historyBtn').setAttribute('aria-expanded', 'false'); });
    const labels = historyActions[document.documentElement.lang] || historyActions.en;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = labels[0];
    remove.setAttribute('aria-label', labels[0] + ' · ' + btn.textContent);
    remove.addEventListener('click', () => deleteConversation(session, btn.textContent));
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px';
    row.append(btn, remove);
    list.append(row);
  });
}

const boardActionsCopy = {
  sq: {
    title:'Ndrysho tabelën', assign:'Cakto anëtarët', filter:'Shto filtrin sipas anëtarit', open:'Hap parapamjen',
    assignmentRequest:'Çdo detyrë t’i caktohet një anëtari të ekipit.',
    filterRequest:'Shto një filtër sipas anëtarit të ekipit.'
  },
  en: {
    title:'Edit task board', assign:'Assign team members', filter:'Add member filter', open:'Open preview',
    assignmentRequest:'Assign each task to a team member.', filterRequest:'Filter tasks by team member.'
  },
  fr: {
    title:'Modifier le tableau', assign:'Affecter les membres', filter:'Ajouter le filtre par membre', open:'Ouvrir l’aperçu',
    assignmentRequest:'Assigner chaque tâche à un membre de l’équipe.', filterRequest:'Filtrer les tâches par membre de l’équipe.'
  }
};

function renderBoardActions(html) {
  $('#boardActions')?.remove();
  if (!html?.includes('id="save-board"')) return;
  const copy = boardActionsCopy[document.documentElement.lang] || boardActionsCopy.en;
  const group = document.createElement('fieldset');
  group.id = 'boardActions';
  group.className = 'chat-suggestions';
  const legend = document.createElement('legend');
  legend.textContent = copy.title;
  group.append(legend);
  function addButton(label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    group.append(button);
  }
  function suggest(request) {
    $('#prompt').value = request;
    $('#planSteps').value = '';
    updateCount();
    saveRefreshState('builder');
    $('#prompt').focus();
  }
  if (!html.includes('id="task-assignee"')) addButton(copy.assign, () => suggest(copy.assignmentRequest));
  if (!html.includes('id="member-filter"')) addButton(copy.filter, () => suggest(copy.filterRequest));
  addButton(copy.open, () => showGeneratedHtml(html, true));
  $('#chatMessages').append(group);
}

function renderMessages() {
  const target = $('#chatMessages'); target.replaceChildren();
  const session = current();
  if(session.generatedFiles && ['index.html','styles.css','main.js'].every(p=>typeof session.generatedFiles[p]==='string')) showGeneratedFiles(session.generatedFiles,false);
  else showGeneratedHtml(session.generatedHtml ?? null);
  if (!session.messages.length) {
    const welcome = document.createElement('div'); welcome.className = 'chat-welcome';
    const welcomeTitle = document.createElement('h2'); welcomeTitle.textContent = t('What will you build today?');
    const welcomeText = document.createElement('p'); welcomeText.textContent = t('Describe an app goal and list explicit plan steps. The connected bridge reviews the English goal and validates a safe draft.');
    welcome.append(welcomeTitle, welcomeText);
    const suggestions = document.createElement('div'); suggestions.className = 'chat-suggestions';
    for (const template of Object.values(appTemplates)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `${t(template.label)} ↗`;
      btn.addEventListener('click', () => fillTemplate(template));
      suggestions.append(btn);
    }
    welcome.append(suggestions); target.append(welcome);
  }
  session.messages.forEach(message => {
    if (message.role === 'plan') addPlan(message.result, message.reviewKey);
    else if (message.role === 'review') addReviewNotice(message.result);
    else addBubble(message.text, message.role);
  });
  const tip = document.createElement('div'); tip.className = 'chat-tip'; tip.textContent = t('Authenticated request to the XSUS Hyper–Future bridge. Drafts are temporary and never execute.'); target.append(tip);
  renderBoardActions(session.generatedHtml);
  renderHistory(); iconRefresh();
  saveRefreshState('builder');
}

const appTemplates = {
  booking: {
    label: 'Booking platform',
    goal: 'Plan a booking app with a calendar and customer dashboard.',
    steps: ['List booking requirements', 'Define calendar and customer dashboard']
  },
  tasks: {
    label: 'Task manager',
    goal: 'Plan a task manager with projects, deadlines, and team boards.',
    steps: ['List project requirements', 'Define task and deadline workflows']
  },
  store: {
    label: 'Online store',
    goal: 'Plan an online store with products, a cart and checkout.',
    steps: ['List product and checkout requirements', 'Define cart and order workflow']
  }
};

function fillTemplate(template) {
  $('#prompt').value = template.goal;
  $('#planSteps').value = template.steps.join('\n');
  updateCount();
  $('#prompt').focus();
  saveRefreshState('builder');
}

function updateCount() { $('#promptCount').textContent = `${$('#prompt').value.length} / 2000`; }
function showError(code) {
  const messages = {
    invalid_steps: 'Add 1–100 non-empty plan steps, each no longer than 4096 characters.',
    invalid_input: 'Enter an English goal and at least one plan step.',
    official_site_only: 'The connected core is available only on the official XSUS Studio website.',
    sign_in_required: 'Sign in to XSUS Studio before sending a plan request.',
    review_required: 'The request needs human review or failed plan validation. Revise it and try again.',
    rate_limited: 'Too many requests. Wait a moment, then try again.',
    timeout: 'The request timed out. Check your connection and try again.',
    service_unavailable: 'The connected XSUS Core service is temporarily unavailable. Try again later.',
    invalid_response: 'The connected service returned a response that could not be verified.',
    request_rejected: 'The connected service rejected this request. Check the English goal and steps.'
  };
  return t(messages[code] || 'The plan request could not be completed.');
}

function cancelPending() {
  requestController?.abort(); requestController = null; busy = false;
  $('#chatProgress').classList.add('hidden'); $('#sendBtn').disabled = false;
}

const assignmentRequests = new Set([
  'cdo detyre t i caktohet nje anetari te ekipit',
  'cakto cdo detyre nje anetari te ekipit',
  'assign each task to a team member',
  'assign tasks to team members',
  'assigner chaque tache a un membre de l equipe'
]);

const filterRequests = new Set([
  'me lejo t i filtroj detyrat sipas anetarit te ekipit',
  'filtro detyrat sipas anetarit te ekipit',
  'filter tasks by team member',
  'let me filter tasks by team member',
  'filtrer les taches par membre de l equipe'
]);

// Match the whole request so negations and additional actions remain distinct.
const albanianFilterRequests = [
  /^(?:shto|shtoni|vendos) (?:nje filter|filtrin) (?:te detyrave |per detyrat )?sipas (?:anetarit(?: te ekipit)?|personit pergjegjes)$/,
  /^(?:filtro|filtroji|dua t i filtroj|a mund t i filtroj|me lejo t i filtroj) detyrat sipas (?:anetarit(?: te ekipit)?|personit pergjegjes)$/,
  /^(?:me shfaq|me trego|shfaq) detyrat sipas (?:anetarit(?: te ekipit)?|personit pergjegjes)$/
];

function requestedBoardEdit(goal) {
  const words = goal.trim().replace(/^[“”"]+|[“”"]+$/g, '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/['’]/g, ' ').replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
  const request = words.replace(/^te lutem,? /, '').replace(/,? te lutem$/, '');
  if (filterRequests.has(request) || albanianFilterRequests.some(pattern => pattern.test(request))) return 'filter';
  if (assignmentRequests.has(request)) return 'assign';
  return null;
}

async function send() {
  if (busy) return;
  const input = $('#prompt'); const goal = input.value.trim();
  if (!goal) { toast(t('Enter an English goal and at least one plan step.')); input.focus(); return; }
  const session = current();
  const original = session.generatedHtml;
  const rawSteps = $('#planSteps').value;
  const intent = requestedBoardEdit(goal);
  const compatible = rawSteps.split(/\r?\n/).filter(line => line.trim()).every(line => {
    const step = requestedBoardEdit(line.replace(/^\s*[-•]\s*/, ''));
    return step === intent || (intent === 'filter' && step === 'assign');
  });
  const edit = original?.includes('id="save-board"') && compatible && intent;
  const filtering = edit === 'filter';
  const edited = edit && (filtering ? enableMemberFilter(original) : enableTaskAssignments(original));
  const editGoal = filtering ? 'Filter tasks by team member.' : 'Assign each task to a team member.';
  const editStep = filtering ? 'Add a team member filter to the task board.' : 'Add a team member field to tasks.';
  const labels = {
    sq: ['Caktimi i detyrave është aktiv.', 'U shtua fusha për anëtarin e ekipit.', 'Ky version i tabelës nuk e mbështet këtë ndryshim.'],
    en: ['Task assignment is already enabled.', 'Added the team member field.', 'This board version does not support this change.'],
    fr: ['L’affectation des tâches est déjà activée.', 'Le champ du membre de l’équipe a été ajouté.', 'Cette version du tableau ne prend pas en charge cette modification.']
  };
  const filterLabels = {
    sq: ['Filtri sipas anëtarit të ekipit është aktiv.', 'U shtua filtri sipas anëtarit të ekipit.'],
    en: ['The team member filter is already enabled.', 'Added the team member filter.'],
    fr: ['Le filtre par membre est déjà activé.', 'Le filtre par membre a été ajouté.']
  };
  const lang = document.documentElement.lang;
  const feedback = labels[lang] || labels.en;
  const messages = filtering ? (filterLabels[lang] || filterLabels.en) : feedback;
  if (edit && edited === original) {
    const field = filtering ? 'member-filter' : 'task-assignee';
    toast(original.includes('id="' + field + '"') ? messages[0] : feedback[2]);
    return;
  }
  // Hyper Core now proposes steps when the user supplies only a goal.
  // Explicit steps are still accepted for user-directed plans.
  let steps;
  try { steps = edit ? parsePlanSteps(editStep) : rawSteps.trim() ? parsePlanSteps(rawSteps) : undefined; }
  catch (error) { toast(t('Add 1–100 non-empty plan steps, each no longer than 4096 characters.')); $('#planSteps').focus(); return; }
  if (!session.messages.length) session.name = goal.slice(0, 35) + (goal.length > 35 ? '…' : '');
  session.messages.push({ role: 'user', text: edit ? goal : `${goal}\n\n${t('Plan steps')}:\n${(steps?.map(step => `• ${step.task}`).join('\n') || t('Steps will be proposed by Hyper XSUS Core'))}` });
  input.value = ''; $('#planSteps').value = ''; updateCount(); renderMessages();
  busy = true;
  const controller = new AbortController();
  requestController = controller;
  $('#chatProgress').classList.remove('hidden'); $('#sendBtn').disabled = true;
  const sessionId = activeId;
  // Application generation must not depend on the optional planning service.
  // The Build Engine is the primary path for new apps; planning remains for edits.
  if (!edit) {
    try {
      const generated = await buildFromChatGoal(goal,{signal:controller.signal});
      if(requestController===controller && sessionId===activeId){
        session.generatedHtml=generated.html;
        session.generatedFiles=generated.files;
        session.generatedSourceHistory=appendGeneratedSourceRevision(session.generatedSourceHistory,generated.files);
        storeSourceFiles(session);
        showGeneratedFiles(generated.files,true);
        session.messages.push({role:'assistant',text:'Application generated. Open Code or Preview to inspect index.html, styles.css and main.js.'});
        renderMessages();
        saveRefreshState('builder');
      }
    } catch(error) {
      if(error?.name!=='AbortError' && requestController===controller && sessionId===activeId){
        session.messages.push({role:'assistant',text:'Application generation failed: '+(error?.message||'Build Engine unavailable')});
        renderMessages();
        saveRefreshState('builder');
      }
    } finally {
      if(requestController===controller){
        requestController=null;busy=false;$('#chatProgress').classList.add('hidden');$('#sendBtn').disabled=false;
      }
    }
    return;
  }
  try {
    const result = await createDraftPlan({ goal: edit ? editGoal : goal, steps, signal: controller.signal });
    if (requestController === controller && sessionId === activeId) {
      let approved = result.status === 'completed' && !result.language?.review_required;
      if (edit && session.generatedHtml === original && result.status === 'review_required' &&
          result.language?.review_required === true && result.plan?.dependencyGraphValid === true) {
        const questions = {
          sq: ['Të shtohet fusha për anëtarin e ekipit te detyrat?', 'Të shtohen caktimi dhe filtrimi i detyrave sipas anëtarit të ekipit?'],
          en: ['Add the team member field to tasks?', 'Enable assigning and filtering tasks by team member?'],
          fr: ['Ajouter le champ du membre de l’équipe aux tâches ?', 'Activer l’affectation et le filtrage des tâches par membre ?']
        };
        approved = window.confirm((questions[lang] || questions.en)[filtering ? 1 : 0]);
        if (!approved) {
          const cancelled = {sq:'Ndryshimi u anulua.', en:'Change cancelled.', fr:'Modification annulée.'};
          session.messages.push({role:'assistant', text:cancelled[lang] || cancelled.en});
          input.value = goal;
          $('#planSteps').value = rawSteps;
          updateCount();
          renderMessages();
          return;
        }
      }
      if (edit && approved && session.generatedHtml === original) {
        session.generatedHtml = edited;
        for (const message of session.messages) {
          const draft = specificationReviews.get(message.reviewKey ?? message.result?.requestId);
          if (draft?.builtHtml === original) draft.builtHtml = edited;
        }
        session.messages.push({role:'assistant', text:messages[1]});
        renderMessages();
        showGeneratedHtml(edited, true);
        return;
      }
      if (edit) {
        session.messages.push({role:'assistant', text:showError('review_required')});
        input.value = goal;
        updateCount();
      } else session.messages.push(result.plan ? { role: 'plan', result } : { role: 'review', result });
      renderMessages();
      // Build Engine is independent; the AI composer is the only build entry point.
      if (!edit && requestController === controller && sessionId === activeId) {
        try {
          const generated = await buildFromChatGoal(goal,{signal:controller.signal});
          if(requestController===controller && sessionId===activeId){
            session.generatedHtml=generated.html;
            session.generatedFiles=generated.files;
            session.generatedSourceHistory=appendGeneratedSourceRevision(session.generatedSourceHistory,generated.files);
            storeSourceFiles(session);
            session.messages.push({role:'assistant',text:'Build Engine generated index.html, styles.css and main.js. Static starter app ready for review in Editor / Preview.'});
            renderMessages();
            showGeneratedFiles(generated.files,true);
            saveRefreshState('builder');
          }
        } catch(buildError) {
          if(buildError?.name!=='AbortError' && requestController===controller && sessionId===activeId){
            session.messages.push({role:'assistant',text:'Build Engine: '+(buildError?.message||'Generation failed')+'. The draft plan is still available.'});
            renderMessages();
          }
        }
      }
    }
  } catch (error) {
    if (error?.name !== 'AbortError' && requestController === controller && sessionId === activeId) {
      session.messages.push({ role: 'assistant', text: showError(error instanceof BridgeRequestError ? error.code : 'service_unavailable') });
      $('#prompt').value = goal;
      $('#planSteps').value = rawSteps;
      updateCount();
      renderMessages();
    }
  } finally {
    if (requestController === controller) {
      requestController = null; busy = false; $('#chatProgress').classList.add('hidden'); $('#sendBtn').disabled = false;
    }
  }
}

export function initChat() {
  document.addEventListener('xsus:restore-generated-revision',event=>{
    const session=current();
    const files=findGeneratedSourceRevision(session?.generatedSourceHistory,event.detail?.id);
    if(!session||!files)return;
    // A restore is itself a new checkpoint; users can undo it using History.
    if(validSourceFiles(session.generatedFiles))
      session.generatedSourceHistory=appendGeneratedSourceRevision(session.generatedSourceHistory,session.generatedFiles);
    session.generatedFiles=files;
    showGeneratedFiles(files,true);
    session.generatedHtml=getGeneratedPreviewHtml();
    session.generatedSourceHistory=appendGeneratedSourceRevision(session.generatedSourceHistory,files);
    storeSourceFiles(session);
    saveRefreshState('builder');
    document.dispatchEvent(new Event('xsus:generated-revision-restored'));
  });

  // Persist source edits on the active conversation, not only in the transient editor.
  document.addEventListener('xsus:generated-files-updated',event=>{
    const files=event.detail?.files;
    if(!files || !['index.html','styles.css','main.js'].every(path=>typeof files[path]==='string'&&files[path].length<=250000))return;
    const session=current();
    if(!session)return;
    session.generatedFiles=Object.fromEntries(['index.html','styles.css','main.js'].map(path=>[path,files[path]]));
    session.generatedHtml=event.detail.html;
    if(event.detail.checkpoint)session.generatedSourceHistory=appendGeneratedSourceRevision(session.generatedSourceHistory,files);
    storeSourceFiles(session);
    saveRefreshState('builder');
  });
  registerRefreshState('builder', () => ({
    sessions, reviews: [...specificationReviews], activeId, nextId,
    goal: $('#prompt').value, steps: $('#planSteps').value
  }), saved => {
    cancelPending();
    sessions.splice(0, sessions.length, ...(saved?.sessions || [{id:1, name:'New conversation', messages:[]}]));
    activeId = saved?.activeId || 1;
    nextId = saved?.nextId || 2;
    for(const session of sessions){
      restoreSourceFiles(session);
      if(session.generatedHtml && !validSourceFiles(session.generatedFiles))session.generatedHtml=upgradeTaskBoard(session.generatedHtml);
    }
    specificationReviews.clear();
    for (const [id, draft] of saved?.reviews || []) {
      if (draft.builtHtml) draft.builtHtml = upgradeTaskBoard(draft.builtHtml);
      specificationReviews.set(id, draft);
    }
    $('#prompt').value = saved?.goal || '';
    $('#planSteps').value = saved?.steps || '';
    updateCount();
    renderMessages();
  });
  for (const type of ['input', 'click']) {
    document.addEventListener(type, event => {
      if (event.target.closest('#chatPanel, [data-app-template], #chatHistory, #newConversationBtn')) saveRefreshState('builder');
    });
  }
  window.__xsusChatReady = true;
  $('#sendBtn').addEventListener('click', send);
  $('#prompt').addEventListener('input', updateCount);
  for (const id of ['prompt', 'planSteps']) $( `#${id}`).addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(); } });
  $('#cancelConceptBtn').addEventListener('click', () => { cancelPending(); toast(t('Request cancelled.')); });
  $('#newConversationBtn').addEventListener('click', () => { cancelPending(); sessions.unshift({ id: nextId++, name: 'New conversation', messages: [] }); activeId = sessions[0].id; renderMessages(); $('#prompt').value = ''; $('#planSteps').value = ''; updateCount(); });
  $('#historyBtn').addEventListener('click', () => { const isOpen = $('#chatHistory').classList.toggle('hidden') === false; $('#historyBtn').setAttribute('aria-expanded', String(isOpen)); renderHistory(); });
  $$('[data-app-template]').forEach(button => button.addEventListener('click', () => {
    fillTemplate(appTemplates[button.dataset.appTemplate]);
  }));
  $$('[data-toast]').forEach(button => button.addEventListener('click', () => toast(button.dataset.toast)));
  document.addEventListener('xsus:language-changed', renderMessages);
  renderMessages(); updateCount(); iconRefresh();
}
