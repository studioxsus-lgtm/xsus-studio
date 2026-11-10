import { t } from './i18n/language-manager.js';
// XSUS App V2.3 — sample dashboard only. No project persistence.
import { $, $$, refreshIcons } from './state.js';
import { toast } from './notifications.js';
const prompts = {
  booking: 'Create a booking application with appointments, services and reservation management.',
  tasks: 'Create a task manager with team projects, deadlines and priorities.',
  store: 'Create an online store with a product catalogue and checkout screens.'
};
export function showDashboard() {
  $('#dashboardPanel').classList.remove('hidden');
  $('#chatPanel').classList.add('hidden');
  $('#editorPanel').classList.add('hidden');
  document.querySelector('.mobile-switch').classList.add('hidden');
  $('#sectionTitle').textContent = 'Dashboard';
  $$('[data-section]').forEach(b => b.classList.toggle('active', b.dataset.section === 'Dashboard'));
  $('#rail').classList.remove('open');
  refreshIcons();
}
export function hideDashboard() {
  $('#dashboardPanel').classList.add('hidden');
  document.querySelector('.mobile-switch').classList.remove('hidden');
}
function applyFilter() {
  const q = $('#projectSearch').value.trim().toLowerCase();
  const type = $('#projectFilter').value;
  let visible = 0;
  $$('[data-project]').forEach(card => {
    const matches = (type === 'all' || card.dataset.type === type) && card.dataset.title.toLowerCase().includes(q);
    card.classList.toggle('hidden', !matches);
    if (matches) visible++;
  });
  $('#projectEmpty').classList.toggle('hidden', visible !== 0);
}
export function initDashboard() {
  $('#projectSearch').addEventListener('input', applyFilter);
  $('#projectFilter').addEventListener('change', applyFilter);
  $('#newProjectBtn').addEventListener('click', () => {
    document.querySelector('[data-section="AI Builder"]').click();
    $('#prompt').focus();
    toast(t('New project: visual concept only. Nothing is saved.'));
  });
  $$('[data-demo-open]').forEach(button => button.addEventListener('click', () => {
    $('#prompt').value = prompts[button.dataset.demoOpen] || '';
    document.querySelector('[data-section="AI Builder"]').click();
    $('#prompt').focus();
    toast(t('Sample concept loaded in the prompt.'));
  }));
  $$('[data-quick]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.quick;
    if (action === 'builder') document.querySelector('[data-section="AI Builder"]').click();
    else if (action === 'design') document.querySelector('[data-section="Visual Editor"]').click();
    else { document.querySelector('[data-section="AI Builder"]').click(); document.querySelector('[data-mode="preview"]').click(); }
  }));
}
