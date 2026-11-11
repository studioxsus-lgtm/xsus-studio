import { types } from './sections.js';
import { state, t } from './state.js';

const pageStyles = await (await fetch(new URL('../../css/xsus-web/page.css', import.meta.url))).text();
const fonts = { sans: 'system-ui,sans-serif', serif: 'Georgia,serif', mono: 'ui-monospace,monospace' };
const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function accentInk(hex) {
  const linear = channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  const [r,g,b] = [1,3,5].map(offset => linear(parseInt(hex.slice(offset,offset+2),16)/255));
  return .2126*r + .7152*g + .0722*b > .179 ? '#000000' : '#ffffff';
}

export function renderSite(page, { editable = false, documentHeading = false } = {}) {
  const accent = /^#[\da-f]{6}$/i.test(page.accent) ? page.accent : '#b9e6a9';
  const sections = page.sections.map((section, index) => {
    const target = page.sections.find(item => item.id === section.target);
    const action = !section.action ? '' : target && !editable
      ? '<a href="#' + target.id + '">' + escapeHtml(section.action) + '</a>'
      : '<span class="demo-cta">' + escapeHtml(section.action) + '</span>';
    const edit = editable ? ' data-editable tabindex="0" aria-label="' + escapeHtml(t(types[section.kind])) + '"' + (section.id === state.activeSectionId ? ' data-selected' : '') : '';
    const heading = documentHeading && index === 0 ? 'h1' : 'h2';
    return '<section class="demo-section demo-' + section.kind + '" id="' + section.id + '" style="--space:' + section.space + 'px"' + edit + '><' + heading + '>' + escapeHtml(section.title) + '</' + heading + '><p>' + escapeHtml(section.body) + '</p>' + action + '</section>';
  }).join('\n');
  return '<div class="demo-site" style="--accent:' + accent + ';--accent-ink:' + accentInk(accent) + ';--page-font:' + fonts[page.font] + '">\n' + sections + '\n</div>';
}

export function documentHtml(page) {
  return '<!doctype html>\n<html lang="' + state.project.language + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + escapeHtml(page.name) + '</title>\n<style>body{margin:0}\n' + pageStyles + '</style>\n</head>\n<body>\n' + renderSite(page, { documentHeading: true }) + '\n</body>\n</html>';
}
