import { showGeneratedHtml } from './editor.js?v=20261120-editor1';
import { appendScaffoldControls } from './scaffold/index.js?v=20261120-editor1';
import { t } from './i18n/language-manager.js?v=20261120-scaffold1';
import { $, $$ } from './state.js';
import { toast } from './notifications.js';
import { createDraftPlan, parsePlanSteps, BridgeRequestError } from './hyper-future-bridge-client.js?v=20261119-bridge2';
import { createAppSpecification } from './app-specification/index.js?v=20261120-scaffold1';
import { approveSpecificationReviewDraft, createSpecificationReviewDraft, parseSpecificationList } from './app-specification/review.js?v=20261120-scaffold1';

// Conversation drafts stay in memory on this page. Credentials and prompts are never persisted here.
const sessions = [{ id: 1, name: 'New conversation', messages: [] }];
const specificationReviews = new Map();
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

function renderSpecificationCard(specification, draft) {
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
      specificationReviews.set(specification.requestId, result.specification);
      specCard.replaceWith(renderSpecificationCard(specification, result.specification));
    });
    const discard = document.createElement('button'); discard.type = 'button'; discard.className = 'app-specification-discard'; discard.textContent = t('Discard draft');
    discard.addEventListener('click', () => {
      specificationReviews.set(specification.requestId, { state: 'discarded' });
      specCard.remove();
    });
    actions.append(approve, discard);
  }
  if (actions.childElementCount) specCard.append(actions);
  if (draft.state === 'approved_for_next_phase') appendScaffoldControls(specCard, draft, t, html => {
    current().generatedHtml = html;
    showGeneratedHtml(html, true);
  });
  return specCard;
}

function addPlan(result) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble assistant';
  const card = document.createElement('article'); card.className = 'concept-card bridge-plan-card';
  const meta = document.createElement('div'); meta.className = 'message-meta'; meta.textContent = t('✦ HYPER XSUS CORE + FUTURE XSUS CORE');
  const needsReview = result.status === 'review_required' || result.language?.review_required === true;
  const heading = document.createElement('h3'); heading.textContent = t(needsReview ? 'Draft plan needs review' : 'Validated draft plan');
  const language = document.createElement('p');
  language.textContent = `${t(needsReview ? 'Future XSUS Core could not fully verify the English goal' : 'Future XSUS Core reviewed the English goal')}: “${result.language.text}” (${result.language.status}).`;
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
  if (result.status === 'completed') {
    try {
      const specification = createAppSpecification(result);
      let reviewDraft = specificationReviews.get(specification.requestId);
      if (reviewDraft?.state !== 'discarded') {
        if (!reviewDraft) {
        reviewDraft = createSpecificationReviewDraft(specification);
        specificationReviews.set(specification.requestId, reviewDraft);
        }
        bubble.append(renderSpecificationCard(specification, reviewDraft));
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

function renderHistory() {
  const list = $('#historyList'); list.replaceChildren();
  sessions.forEach(session => {
    const btn = document.createElement('button'); btn.type = 'button';
    btn.textContent = session.name === 'New conversation' ? t('New conversation') : session.name;
    btn.classList.toggle('active', session.id === activeId);
    btn.addEventListener('click', () => { cancelPending(); activeId = session.id; renderMessages(); $('#chatHistory').classList.add('hidden'); $('#historyBtn').setAttribute('aria-expanded', 'false'); });
    list.append(btn);
  });
}

function renderMessages() {
  const target = $('#chatMessages'); target.replaceChildren();
  const session = current();
  showGeneratedHtml(session.generatedHtml ?? null);
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
    if (message.role === 'plan') addPlan(message.result);
    else if (message.role === 'review') addReviewNotice(message.result);
    else addBubble(message.text, message.role);
  });
  const tip = document.createElement('div'); tip.className = 'chat-tip'; tip.textContent = t('Authenticated request to the XSUS Hyper–Future bridge. Drafts are temporary and never execute.'); target.append(tip);
  renderHistory(); iconRefresh();
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

async function send() {
  if (busy) return;
  const input = $('#prompt'); const goal = input.value.trim();
  if (!goal) { toast(t('Enter an English goal and at least one plan step.')); input.focus(); return; }
  let steps;
  try { steps = parsePlanSteps($('#planSteps').value); }
  catch (error) { toast(t(error instanceof BridgeRequestError ? error.code === 'invalid_steps' ? 'Add 1–100 non-empty plan steps, each no longer than 4096 characters.' : 'Enter an English goal and at least one plan step.' : 'Enter an English goal and at least one plan step.')); $('#planSteps').focus(); return; }
  const session = current();
  if (!session.messages.length) session.name = goal.slice(0, 35) + (goal.length > 35 ? '…' : '');
  session.messages.push({ role: 'user', text: `${goal}\n\n${t('Plan steps')}:\n${steps.map(step => `• ${step.task}`).join('\n')}` });
  input.value = ''; $('#planSteps').value = ''; updateCount(); renderMessages();
  busy = true;
  const controller = new AbortController();
  requestController = controller;
  $('#chatProgress').classList.remove('hidden'); $('#sendBtn').disabled = true;
  const sessionId = activeId;
  try {
    const result = await createDraftPlan({ goal, steps, signal: controller.signal });
    if (sessionId === activeId) {
      session.messages.push(result.plan ? { role: 'plan', result } : { role: 'review', result });
      renderMessages();
    }
  } catch (error) {
    if (error?.name !== 'AbortError' && sessionId === activeId) {
      session.messages.push({ role: 'assistant', text: showError(error instanceof BridgeRequestError ? error.code : 'service_unavailable') });
      $('#prompt').value = goal;
      $('#planSteps').value = steps.map(step => step.task).join('\n');
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
