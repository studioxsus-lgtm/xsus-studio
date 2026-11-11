const key = 'xsus-web:project:v1';
const languages = new Set(['sq', 'en', 'fr']);
const views = new Set(['design', 'code', 'preview']);
const devices = new Set(['desktop', 'tablet', 'phone']);
const kinds = new Set(['hero', 'work', 'text', 'contact']);
const fonts = new Set(['sans', 'serif', 'mono']);
const text = (value, max) => typeof value === 'string' && value.length <= max;
const pageId = value => Number.isSafeInteger(value) && value > 0;
const sectionId = value => typeof value === 'string' && /^section-[1-9]\d{0,14}$/.test(value);

function validSection(section) {
  return Boolean(section && sectionId(section.id) && kinds.has(section.kind)
    && text(section.title, 100) && text(section.body, 350) && text(section.action, 35)
    && (section.target === '' || sectionId(section.target))
    && Number.isInteger(section.space) && section.space >= 32 && section.space <= 96);
}

function validPage(page) {
  if (!page || !pageId(page.id) || typeof page.path !== 'string'
    || !/^(index|page-[1-9]\d{0,14})\.html$/.test(page.path) || !text(page.name, 60)
    || typeof page.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(page.accent)
    || !fonts.has(page.font) || !Array.isArray(page.sections) || !page.sections.length
    || !page.sections.every(validSection)) return false;

  const ids = new Set(page.sections.map(section => section.id));
  return ids.size === page.sections.length
    && page.sections.every(section => section.target === '' || (section.target !== section.id && ids.has(section.target)));
}

function validSnapshot(snapshot) {
  if (snapshot?.version !== 1 || !languages.has(snapshot.language)
    || !views.has(snapshot.view) || !devices.has(snapshot.device)) return false;
  const project = snapshot.project;
  if (!languages.has(project?.language) || !Array.isArray(project.pages)
    || !project.pages.length || !project.pages.every(validPage)) return false;

  const ids = new Set(project.pages.map(page => page.id));
  const paths = new Set(project.pages.map(page => page.path));
  const page = project.pages.find(page => page.id === snapshot.activePageId);
  return ids.size === project.pages.length && paths.size === project.pages.length
    && Boolean(page?.sections.some(section => section.id === snapshot.activeSectionId));
}

export function createProjectStorage(getStorage = () => window.localStorage) {
  let lastRead = null;
  return {
    load() {
      let raw;
      try {
        raw = getStorage().getItem(key);
        lastRead = raw;
      } catch {
        return { status: 'unavailable' };
      }
      if (raw === null) return { status: 'empty' };
      try {
        const snapshot = JSON.parse(raw);
        if (validSnapshot(snapshot)) return { status: 'saved', snapshot };
      } catch {
        return { status: 'invalid' };
      }
      return { status: 'invalid' };
    },

    save(state) {
      const { project, language, view, device, activePageId, activeSectionId } = state;
      if (!project) return 'empty';
      try {
        const storage = getStorage();
        if (storage.getItem(key) !== lastRead) return 'conflict';
        const raw = JSON.stringify({ version: 1, project, language, view, device, activePageId, activeSectionId });
        if (raw !== lastRead) {
          storage.setItem(key, raw);
          lastRead = raw;
        }
        return 'saved';
      } catch {
        return 'unavailable';
      }
    },
  };
}
