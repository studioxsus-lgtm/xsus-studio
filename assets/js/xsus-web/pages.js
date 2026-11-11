import { $, listButton } from './dom.js';
import { makeSection } from './sections.js';
import { currentPage, nextPageId, state, t } from './state.js';

export function renderPages(renderEditor, saveProject) {
  const page = currentPage();
  const pages = state.project.pages.map(item => listButton(item.name || item.path, item.id === page.id, () => {
    state.activePageId = item.id;
    state.activeSectionId = item.sections[0].id;
    saveProject();
    renderEditor();
    $('#page-list [aria-pressed=true]').focus();
  }));
  $('#page-list').replaceChildren(...pages);
}

export function bindPages(renderEditor, renderLists, renderCanvas, saveProject) {
  $('#add-page').addEventListener('click', () => {
    const id = nextPageId();
    const number = state.project.pages.length + 1;
    const page = { id, path: 'page-' + number + '.html', name: t('page') + ' ' + number, accent: currentPage().accent, font: currentPage().font, sections: [makeSection('hero', t('blankHero'), t('blankBody'))] };
    state.project.pages.push(page);
    state.activePageId = id;
    state.activeSectionId = page.sections[0].id;
    saveProject();
    renderEditor();
    $('#page-name').focus();
  });
  $('#page-name').addEventListener('input', event => {
    currentPage().name = event.target.value.slice(0, 60);
    saveProject();
    renderLists();
    renderCanvas();
  });
}
