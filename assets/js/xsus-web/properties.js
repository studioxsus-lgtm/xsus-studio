import { $ } from './dom.js';
import { types } from './sections.js';
import { currentPage, currentSection, t } from './state.js';

export function renderProperties() {
  const page = currentPage();
  const section = currentSection();
  $('#page-name').value = page.name;
  $('#selected-kind').textContent = t(types[section.kind]);
  $('#section-title').value = section.title;
  $('#section-body').value = section.body;
  $('#section-action').value = section.action;
  $('#section-spacing').value = section.space;
  $('#section-target').replaceChildren(new Option(t('noTarget'), ''), ...page.sections.filter(item => item.id !== section.id).map(item => new Option(item.title || t(types[item.kind]), item.id)));
  $('#section-target').value = section.target;
  $('#page-accent').value = page.accent;
  $('#page-font').value = page.font;
}

export function bindProperties(renderLists, renderCanvas, saveProject) {
  for (const [selector, key] of [['#section-title','title'], ['#section-body','body'], ['#section-action','action'], ['#section-target','target'], ['#section-spacing','space']]) {
    $(selector).addEventListener('input', event => {
      currentSection()[key] = key === 'space' ? Number(event.target.value) : event.target.value;
      saveProject();
      if (key === 'title') renderLists();
      renderCanvas();
    });
    if (key === 'title') $(selector).addEventListener('change', renderProperties);
  }
  for (const [selector, key] of [['#page-accent','accent'], ['#page-font','font']]) {
    $(selector).addEventListener('input', event => {
      currentPage()[key] = event.target.value;
      saveProject();
      renderCanvas();
    });
  }
}
