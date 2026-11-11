import { translate } from './i18n/index.js';

export const state = {
  language: 'sq',
  view: 'design',
  device: 'desktop',
  project: undefined,
  activePageId: undefined,
  activeSectionId: undefined,
};

let sectionCount = 0;
let pageCount = 0;

export const nextSectionId = () => 'section-' + ++sectionCount;
export const nextPageId = () => ++pageCount;
export const t = key => translate(key, state.language);
export const currentPage = () => state.project.pages.find(page => page.id === state.activePageId);
export const currentSection = () => currentPage().sections.find(section => section.id === state.activeSectionId);

export function restoreProject(snapshot) {
  const { project, language, view, device, activePageId, activeSectionId } = snapshot;
  Object.assign(state, { project, language, view, device, activePageId, activeSectionId });
  for (const page of project.pages) {
    pageCount = Math.max(pageCount, page.id);
    for (const section of page.sections) {
      sectionCount = Math.max(sectionCount, Number(section.id.slice('section-'.length)));
    }
  }
}
