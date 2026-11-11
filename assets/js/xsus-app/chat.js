import { t, formatUi } from './i18n/language-manager.js';
import { $, $$ } from './state.js';
import { toast } from './notifications.js';

// Design-only session history in memory. Never persisted or sent to a server.
const sessions = [{ id: 1, name: 'New conversation', messages: [] }];
let activeId = 1;
let nextId = 2;
let busy = false;
let pendingTimer = null;
const current = () => sessions.find(s => s.id === activeId);
function iconRefresh() { window.lucide?.createIcons?.(); }
function addBubble(text, role) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = role === 'user' ? t('YOU') : t('✦ XSUS APP · DEMO');
  const content = document.createElement('div');
  content.textContent = text;
  bubble.append(meta, content);
  $('#chatMessages').append(bubble);
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
  return bubble;
}
function addConcept(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble assistant';
  const card = document.createElement('div'); card.className = 'concept-card';
  const meta = document.createElement('div'); meta.className = 'message-meta'; meta.textContent = t('✦ XSUS APP · CONCEPT ONLY');
  const heading = document.createElement('h3'); heading.textContent = t('Concept preview prepared');
  const description = document.createElement('p'); description.textContent = formatUi('Your idea: {idea}', {idea:text});
  const disclaimer = document.createElement('p'); disclaimer.textContent = t('This is a visual concept card. No code or application has been generated.');
  const badges = document.createElement('div'); badges.className = 'concept-badges';
  ['Design concept', 'Not generated', 'Local only'].forEach(label => { const b=document.createElement('span'); b.textContent=t(label); badges.append(b); });
  const actions = document.createElement('div'); actions.className = 'concept-actions';
  const copy = document.createElement('button'); copy.type='button'; copy.textContent=t('Copy idea'); copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text); toast('Idea copied.'); }
    catch { toast('Clipboard access unavailable in this browser.'); }
  });
  const revise = document.createElement('button'); revise.type='button'; revise.textContent=t('Refine prompt'); revise.addEventListener('click', () => { $('#prompt').value=text; updateCount(); $('#prompt').focus(); });
  actions.append(copy, revise); card.append(meta, heading, description, badges, disclaimer, actions); bubble.append(card);
  $('#chatMessages').append(bubble); $('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;
}
function renderHistory() {
  const list = $('#historyList'); list.replaceChildren();
  sessions.forEach(session => {
    const btn=document.createElement('button'); btn.type='button'; btn.textContent=session.name==='New conversation'?t('New conversation'):session.name;
    btn.classList.toggle('active', session.id===activeId);
    btn.addEventListener('click', () => { cancelPending(); activeId=session.id; renderMessages(); $('#chatHistory').classList.add('hidden'); $('#historyBtn').setAttribute('aria-expanded','false'); });
    list.append(btn);
  });
}
function renderMessages() {
  const target=$('#chatMessages'); target.replaceChildren();
  const s=current();
  if (!s.messages.length) {
    const welcome=document.createElement('div'); welcome.className='chat-welcome';
    welcome.innerHTML='<span class="chat-welcome-icon">✦</span>'; const welcomeTitle=document.createElement('h2'); welcomeTitle.textContent=t('What will you build today?'); const welcomeText=document.createElement('p'); welcomeText.textContent=t('Describe an app idea or choose a starting point. This is a visual prototype.'); welcome.append(welcomeTitle,welcomeText);
    const suggestions=document.createElement('div'); suggestions.className='chat-suggestions';
    ['Booking platform','Task manager','Online store'].forEach((name,i) => {
      const prompts=['Design a modern booking app with a calendar and customer dashboard.','Design a task manager with projects, deadlines and team boards.','Design an online store with products, cart and checkout.'];
      const btn=document.createElement('button'); btn.type='button'; btn.textContent=t(name)+' ↗'; btn.addEventListener('click',()=>{ $('#prompt').value=prompts[i]; updateCount(); $('#prompt').focus(); }); suggestions.append(btn);
    });
    welcome.append(suggestions); target.append(welcome);
  }
  s.messages.forEach(m => m.role==='concept' ? addConcept(m.text) : addBubble(m.text,m.role));
  const tip=document.createElement('div'); tip.className='chat-tip'; tip.textContent=t('ⓘ Design prototype: no AI requests, uploads or persistent storage.'); target.append(tip);
  renderHistory();
}
function updateCount() { $('#promptCount').textContent=`${$('#prompt').value.length} / 2000`; }
function cancelPending() {
  if(pendingTimer!==null) clearTimeout(pendingTimer);
  pendingTimer=null; busy=false; $('#chatProgress').classList.add('hidden'); $('#sendBtn').disabled=false;
}
function send() {
  if(busy) return;
  const input=$('#prompt'); const text=input.value.trim();
  if(!text) { toast('Describe an app idea first.'); input.focus(); return; }
  const s=current();
  if(!s.messages.length) s.name=text.slice(0,35)+(text.length>35?'…':'');
  s.messages.push({role:'user',text}); input.value=''; updateCount(); renderMessages();
  busy=true; $('#chatProgress').classList.remove('hidden'); $('#sendBtn').disabled=true;
  const sessionId=activeId;
  pendingTimer=setTimeout(() => {
    pendingTimer=null;
    if(sessionId===activeId) {
      s.messages.push({role:'concept',text}); renderMessages();
    }
    cancelPending();
  }, 650);
}
export function initChat() {
  $('#sendBtn').addEventListener('click',send);
  $('#prompt').addEventListener('input',updateCount);
  $('#prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
  $('#cancelConceptBtn').addEventListener('click',()=>{cancelPending();toast('Local concept preview cancelled.');});
  $('#newConversationBtn').addEventListener('click',()=>{cancelPending();sessions.unshift({id:nextId++,name:'New conversation',messages:[]});activeId=sessions[0].id;renderMessages();$('#prompt').value='';updateCount();toast('New temporary demo conversation.');});
  $('#historyBtn').addEventListener('click',()=>{const isOpen=$('#chatHistory').classList.toggle('hidden')===false;$('#historyBtn').setAttribute('aria-expanded',String(isOpen));renderHistory();});
  $$('[data-chat-suggestion]').forEach(btn=>btn.addEventListener('click',()=>{$('#prompt').value=btn.dataset.chatSuggestion;updateCount();$('#prompt').focus();}));
  $$('[data-toast]').forEach(btn=>btn.addEventListener('click',()=>toast(btn.dataset.toast)));
  document.addEventListener('xsus:language-changed', () => { renderMessages(); });
  renderMessages(); updateCount(); iconRefresh();
}
