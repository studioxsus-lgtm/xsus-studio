const escapeText = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const section = (name, items) => items.length ? `<section><h2>${name}</h2><ul>${items.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul></section>` : '';

export function buildScaffold(spec) {
  if (spec?.state !== 'approved_for_next_phase' || spec.review?.acceptedByUser !== true) {
    throw new Error('Approve the specification first.');
  }
  const { pages, components, dataModels, interactions } = spec.proposedStructure;
  const links = pages.map((page, i) => `<a href="#screen-${i + 1}">${escapeText(page)}</a>`).join(' ');
  const screens = pages.map((page, i) => `<section id="screen-${i + 1}"><h2>${escapeText(page)}</h2></section>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(spec.product.label)}</title>
<style>body{max-width:60rem;margin:auto;padding:1.5rem;font:1rem/1.6 system-ui;color:#16273a;background:#f3f6fa;overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:1rem}section{background:white;border:1px solid #c7d5e1;border-radius:.6rem;margin:1rem 0;padding:1rem}h2{margin:0}a{color:#14559b}</style></head>
<body><header><h1>${escapeText(spec.product.label)}</h1><p>${escapeText(spec.product.goal)}</p></header><nav aria-label="Screens">${links}</nav><main>${screens}
${section('Components', components)}${section('Data models', dataModels)}${section('Planned interactions', interactions)}${section('Requirements', spec.requirements)}</main></body></html>`;
}

export function appendScaffoldControls(card, spec, t) {
  const controls = document.createElement('div');
  controls.className = 'app-specification-actions';
  const build = document.createElement('button');
  build.type = 'button';
  build.textContent = t('Build starter app');
  controls.append(build);
  card.append(controls);
  build.addEventListener('click', () => {
    const html = buildScaffold(spec);
    const preview = document.createElement('iframe');
    preview.setAttribute('sandbox', '');
    preview.title = t('Starter app preview');
    preview.style.cssText = 'width:100%;height:24rem;border:0;margin-top:1rem';
    preview.srcdoc = html;
    const download = document.createElement('button');
    download.type = 'button';
    download.textContent = t('Download HTML');
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'xsus-starter.html';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    });
    controls.replaceChildren(download);
    card.append(preview);
    download.focus();
  });
}
