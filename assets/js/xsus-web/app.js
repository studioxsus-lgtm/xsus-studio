import { $, $$ } from './dom.js';
import { bindNavigation, setPanel } from './navigation.js';
import { bindPages, renderPages } from './pages.js';
import { bindPreview, renderCanvas } from './preview.js';
import { bindProperties, renderProperties } from './properties.js';
import { bindSections, renderSections, types } from './sections.js';
import { renderSite } from './site-renderer.js';
import { restoreProject, state, t } from './state.js';
import { template } from './templates.js';
import { createProjectStorage } from './project-storage.js';

const storage = createProjectStorage();
const restored = storage.load();
let saveStatus = restored.status;
if (restored.snapshot) restoreProject(restored.snapshot);

const statusKeys = {
  saved: 'savedLocal',
  unavailable: 'saveUnavailable',
  invalid: 'restoreUnavailable',
  conflict: 'saveConflict',
};

function updateSaveStatus() {
  const message = statusKeys[saveStatus] ? t(statusKeys[saveStatus]) : '';
  const status = $('#save-status');
  if (status.textContent !== message) status.textContent = message;
  status.dataset.status = saveStatus;
  const warning = $('#restore-status');
  warning.hidden = !['invalid', 'unavailable', 'conflict'].includes(saveStatus);
  warning.textContent = warning.hidden ? '' : message;
  $('#start').textContent = t(state.project ? 'resume' : 'start');
  $('#new-project').hidden = !state.project;
}

function saveProject() {
  saveStatus = storage.save(state);
  updateSaveStatus();
}

function renderLists() {
  renderPages(renderEditor, saveProject);
  renderSections(renderEditor, saveProject);
}

function renderEditor() {
  renderLists();
  renderProperties();
  renderCanvas();
}

function updateLanguage() {
  document.documentElement.lang = state.language;
  $('#language').value = state.language;
  $$('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  $$('[data-label]').forEach(element => element.setAttribute('aria-label', t(element.dataset.label)));
  $('#preview').title = t('preview');
  const sections = Object.entries(types).map(([value, key]) => new Option(t(key), value));
  $('#add-section').replaceChildren(new Option(t('addSection'), ''), ...sections);
  $('#sample').innerHTML = renderSite(template('studio'));
  if (state.project) renderEditor();
  updateSaveStatus();
}

$('#language').addEventListener('change', event => {
  state.language = event.target.value;
  updateLanguage();
  if (state.project) saveProject();
});
bindNavigation(renderEditor, saveProject);
bindPages(renderEditor, renderLists, renderCanvas, saveProject);
bindSections(renderEditor, setPanel, saveProject);
bindProperties(renderLists, renderCanvas, saveProject);
bindPreview(setPanel, saveProject);
updateLanguage();
