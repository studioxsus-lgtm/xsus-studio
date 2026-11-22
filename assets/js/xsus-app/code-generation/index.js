// XSUS App Phase 13: deterministic, review-gated source generator.
// Does not execute user content, access credentials, or deploy projects.
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026').replace(/\\u2028/g, '\\u2028').replace(/\\u2029/g, '\\u2029');
const allowed = ['pages', 'components', 'dataModels', 'interactions'];
function checkItems(items) {
  return Array.isArray(items) && items.length <= 40 &&
    items.every(item => typeof item === 'string' && item.trim() && item.length <= 240);
}
export function planSourceFiles(spec) {
  if (spec?.state !== 'approved_for_next_phase' || spec.review?.acceptedByUser !== true ||
      !spec.proposedStructure || !spec.product || typeof spec.product.goal !== 'string' ||
      !spec.product.goal.trim() || spec.product.goal.length > 4096 ||
      !allowed.every(key => checkItems(spec.proposedStructure[key])) ||
      !checkItems(spec.requirements) || spec.proposedStructure.pages.length === 0 ||
      spec.requirements.length === 0) {
    throw new TypeError('A reviewed, valid application specification is required.');
  }
  return Object.freeze({
    format: 'xsus-source-bundle-v1',
    framework: 'html-css-javascript',
    files: ['index.html', 'styles.css', 'app.js'],
    executableOnServer: false,
    deploymentRequested: false
  });
}
export function generateSourceFiles(spec) {
  const plan = planSourceFiles(spec);
  const structure = spec.proposedStructure;
  const pages = structure.pages.map((name, index) => ({ id: 'page-' + (index + 1), name }));
  const data = { title: spec.product.label || 'XSUS Application', goal: spec.product.goal,
    pages, components: structure.components, models: structure.dataModels,
    interactions: structure.interactions, requirements: spec.requirements };
  const nav = pages.map(page => '<a href="#' + page.id + '">' + escapeHtml(page.name) + '</a>').join('');
  const sections = pages.map(page => '<section id="' + page.id + '"><h2>' + escapeHtml(page.name) +
    '</h2><p>Ready for implementation.</p></section>').join('');
  const index = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\'; script-src \'self\'; base-uri \'none\'; form-action \'none\'">' +
    '<title>' + escapeHtml(data.title) + '</title><link rel="stylesheet" href="styles.css">' +
    '<script src="app.js" defer></script></head><body><header><h1>' + escapeHtml(data.title) +
    '</h1><p>' + escapeHtml(data.goal) + '</p></header><nav aria-label="Screens">' + nav +
    '</nav><main>' + sections + '<section><h2>Planned features</h2><ul id="features"></ul></section></main>' +
    '<footer>XSUS App · Reviewed starter source</footer></body></html>';
  const css = ':root{font:16px/1.6 system-ui;color:#16273a;background:#f3f6fa}' +
    'body{max-width:64rem;margin:auto;padding:1.5rem}nav{display:flex;flex-wrap:wrap;gap:1rem}' +
    'a{color:#14559b}section{background:white;border:1px solid #c7d5e1;border-radius:12px;' +
    'padding:1rem;margin:1rem 0}h1,h2{line-height:1.25}';
  const js = '/* XSUS reviewed starter: no remote services or dynamic code evaluation. */\n' +
    'const project = ' + safeJson(data) + ';\n' +
    'const features = document.getElementById("features");\n' +
    'for (const item of project.interactions) { const li = document.createElement("li");' +
    ' li.textContent = item; features.append(li); }\n';
  return Object.freeze({ plan, files: Object.freeze({
    'index.html': index, 'styles.css': css, 'app.js': js
  }) });
}
