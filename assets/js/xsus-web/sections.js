import { $, listButton } from './dom.js';
import { currentPage, currentSection, nextSectionId, state, t } from './state.js';

export const types = { hero: 'hero', work: 'work', text: 'textSection', contact: 'contact' };

export function makeSection(kind, title, body) {
  const defaultBody = { hero: 'blankBody', work: 'studioWorkBody', text: 'textBody', contact: 'contactBody' };
  return { id: nextSectionId(), kind, title: title ?? t(types[kind]), body: body ?? t(defaultBody[kind]), action: '', target: '', space: 56 };
}

export function renderSections(renderEditor, saveProject) {
  const page = currentPage();
  const current = currentSection();
  $('#section-list').replaceChildren(...page.sections.map(item => listButton(item.title || t(types[item.kind]), item.id === current.id, () => {
    state.activeSectionId = item.id;
    saveProject();
    renderEditor();
    $('#section-list [aria-pressed=true]').focus();
  })));
  const index = page.sections.indexOf(current);
  $('#move-up').disabled = index === 0;
  $('#move-down').disabled = index === page.sections.length - 1;
  $('#remove-section').disabled = page.sections.length === 1;
}

function moveSection(offset, renderEditor, saveProject) {
  const sections = currentPage().sections;
  const index = sections.indexOf(currentSection());
  const destination = index + offset;
  if (destination < 0 || destination >= sections.length) return;
  [sections[index], sections[destination]] = [sections[destination], sections[index]];
  saveProject();
  renderEditor();
}

export function bindSections(renderEditor, setPanel, saveProject) {
  $('#add-section').addEventListener('change', event => {
    const kind = event.target.value;
    if (!Object.hasOwn(types, kind)) return;
    const section = makeSection(kind);
    currentPage().sections.push(section);
    state.activeSectionId = section.id;
    event.target.value = '';
    saveProject();
    renderEditor();
  });
  $('#move-up').addEventListener('click', () => moveSection(-1, renderEditor, saveProject));
  $('#move-down').addEventListener('click', () => moveSection(1, renderEditor, saveProject));
  $('#remove-section').addEventListener('click', () => {
    const page = currentPage();
    if (page.sections.length === 1) return;
    const removed = state.activeSectionId;
    const index = page.sections.indexOf(currentSection());
    page.sections.splice(index, 1);
    page.sections.forEach(section => { if (section.target === removed) section.target = ''; });
    state.activeSectionId = page.sections[Math.min(index, page.sections.length - 1)].id;
    saveProject();
    renderEditor();
  });

  function selectCanvasSection(event) {
    const target = event.target.closest('[data-editable]');
    if (!target) return;
    state.activeSectionId = target.id;
    saveProject();
    renderEditor();
    if (matchMedia('(max-width:850px)').matches) setPanel('properties');
    $('#section-title').focus();
  }

  $('#canvas').addEventListener('click', selectCanvasSection);
  $('#canvas').addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    selectCanvasSection(event);
  });
}
