import { $, $$, setPressed } from './dom.js';
import { state, t } from './state.js';
import { template } from './templates.js';

export function setPanel(panel) {
  $('.editor-grid').dataset.panel = panel;
  setPressed('.mobile-panels button', 'panel', panel);
}

function openProject(kind, renderEditor, saveProject) {
  if (state.project && !window.confirm(t('replaceProject'))) return;
  const page = template(kind);
  state.project = { language: state.language, pages: [page] };
  state.activePageId = page.id;
  state.activeSectionId = page.sections[0].id;
  state.view = 'design';
  state.device = matchMedia('(max-width:850px)').matches ? 'phone' : 'desktop';
  $('#templates').close();
  showBuilder(renderEditor);
  saveProject();
}

function showBuilder(renderEditor) {
  $('#landing').hidden = true;
  $('#builder').hidden = false;
  $('.views').hidden = false;
  setPanel('canvas');
  renderEditor();
  $('[data-view="design"]').focus();
  window.scrollTo(0, 0);
}

export function bindNavigation(renderEditor, saveProject) {
  $('#start').addEventListener('click', () => state.project ? showBuilder(renderEditor) : $('#templates').showModal());
  $('#new-project').addEventListener('click', () => $('#templates').showModal());
  $$('[data-template]').forEach(button => button.addEventListener('click', () => openProject(button.dataset.template, renderEditor, saveProject)));
  $('#home-link').addEventListener('click', event => {
    event.preventDefault();
    $('#landing').hidden = false;
    $('#builder').hidden = true;
    $('.views').hidden = true;
    window.scrollTo(0, 0);
  });
  $$('.mobile-panels button').forEach(button => button.addEventListener('click', () => setPanel(button.dataset.panel)));
}
