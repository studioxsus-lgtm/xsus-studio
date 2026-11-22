import { composeSourcePreview } from '../code-generation/live-preview.js';
import { generateSourceFiles } from '../code-generation/index.js?v=20261122-summary1';
import { boardMarkup, boardStyles, boardScript } from './task-board.js?v=20261120-undodelete1';

const escapeText = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
// Display a concise product summary; retain the full goal in the reviewed specification.
function productSummary(spec) {
  const label = typeof spec.product?.label === 'string' ? spec.product.label.trim() : '';
  const profile = spec.product?.profileId;
  if (profile === 'task-manager') return 'Organize projects, manage tasks, and track team progress in one workspace.';
  const goal = typeof spec.product?.goal === 'string' ? spec.product.goal.trim() : '';
  const first = goal.split(/(?<=[.!?])\s+/u)[0] || '';
  const summary = first.length <= 180 ? first : first.slice(0, 177).replace(/\s+\S*$/, '') + '…';
  return summary || label || 'Your application workspace.';
}
const section = (name, items) => items.length ? `<section><h2>${name}</h2><ul>${items.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul></section>` : '';

// Upgrade the previous persistent board without replacing its project, board ID or task data.
export function upgradeTaskBoard(html) {
  if (typeof html !== 'string' || !html.includes('id="save-board"')) return html;
  const oldPolicy = ["tXLtmvie5QHo1T2n/6wS7YGpmhkKSibFrR5eW1xHgeM=", "66Pp/3zxzGLAU2Bko7LVErpS8nAvBcemI+zMlGfW+Jw=", "d9wgplLeFmf7n0lb+N8CBdRMYwKF03+5DTrty49HzOU=", "yBz2Obw7ppkkHiuAehX1lGx4XausZq3VcL0Q+IfwQ1I=", "33luuJvv+/j0lCE7uPhC2XLSu6+j9JAO7y4jt+Yg1CE=", "lvCa8gzrH8MzPTnyuFTFyB/EXSz2PamSfAGCQzLecQs=", "bNxZjdVUqWpHAhJ7OOMALGkQfaQ3mMANfHlJ/i067M0=", "884C3H87ZwBBBiwfrh5Ci/gtzz8rhthuZDNyrjiKXaw=", "m4DXEetZsCj+xVfViKbjGPpe82x4OgHKYYqW/NRZKSg=", "G4RBTgNQmo0nKSOkE9tpMWN5ePmFQ4YaiBYt4iRk8hA=", "v9Tcw4hUWT+ml4tTEoLvZNoq4ridJFq+cyuWGkjOyik=", "/1PLKjPUEDaFTGMXZCuW/01giKA5qPemVRTZjDyH86U=", "tcU2M3qXwEovdfGhE6ZBEnb9i/ZS4k7z2iAjgkoZVcU="]
    .map(hash => "script-src 'sha256-" + hash + "'").find(policy => html.includes(policy));
  if (!oldPolicy) return html;
  return html.replace(oldPolicy, "script-src 'sha256-yE7aWz1FUIfHp0RwNMpwNgpk0MiHwBKzTM7JWQ3KW04='")
    .replace(/<script>\(function runTaskBoard\(\)[\s\S]*?<\/script>/, () => '<script>' + boardScript + '</script>');
}

export function enableTaskAssignments(html) {
  if (!html || !html.includes(boardMarkup) || !html.includes(boardScript)) return html;
  const field = '<label>Team member <input id="task-assignee" maxlength="120" autocomplete="off"></label>';
  return html.replace(boardMarkup, () => boardMarkup.replace('  <button id="add-task"', field + '\n  <button id="add-task"'));
}

export function enableMemberFilter(html) {
  const assigned = enableTaskAssignments(html);
  const anchor = '<p id="task-count"';
  if (!assigned?.includes('id="task-assignee"') || !assigned.includes(boardScript) ||
      assigned.includes('id="member-filter"') || !assigned.includes(anchor)) return html;
  return assigned.replace(anchor, '<label>Filter by team member <select id="member-filter"></select></label>\n  ' + anchor);
}

export function buildScaffold(spec) {
  if (spec?.state !== 'approved_for_next_phase' || spec.review?.acceptedByUser !== true) {
    throw new Error('Approve the specification first.');
  }
  const { pages, components, dataModels, interactions } = spec.proposedStructure;
  const links = pages.map((page, i) => `<a href="#screen-${i + 1}">${escapeText(page)}</a>`).join(' ');
  const interactive = spec.product.profileId === 'task-manager';
  const namedBoard = pages.findIndex(page => page.trim().toLowerCase() === 'team board');
  const boardIndex = namedBoard >= 0 ? namedBoard : Math.min(1, pages.length - 1);
  const policy = interactive ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-yE7aWz1FUIfHp0RwNMpwNgpk0MiHwBKzTM7JWQ3KW04='; base-uri 'none'; form-action 'none'">` : '';
  const screens = pages.map((page, i) => `<section id="screen-${i + 1}"><h2>${escapeText(page)}</h2>${interactive && i === boardIndex ? boardMarkup : ''}</section>`).join('\n');
  return `<!doctype html>
<html lang="en"${interactive ? ` data-board="${crypto.randomUUID()}"` : ''}><head><meta charset="utf-8">${policy}<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(spec.product.label)}</title>
<style>body{max-width:60rem;margin:auto;padding:1.5rem;font:1rem/1.6 system-ui;color:#16273a;background:#f3f6fa;overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:1rem}section{background:white;border:1px solid #c7d5e1;border-radius:.6rem;margin:1rem 0;padding:1rem}h2{margin:0}a{color:#14559b}${interactive ? boardStyles : ''}</style></head>
<body><header><h1>${escapeText(spec.product.label)}</h1><p>${escapeText(productSummary(spec))}</p></header><nav aria-label="Screens">${links}</nav><main>${screens}
${section('Components', components)}${section('Data models', dataModels)}${section('Planned interactions', interactions)}${section('Requirements', spec.requirements)}</main>${interactive ? `<script>${boardScript}</script>` : ''}</body></html>`;
}

const builtScaffolds = new WeakMap();

export function appendScaffoldControls(card, spec, t, onBuild) {
  const controls = document.createElement('div');
  controls.className = 'app-specification-actions';
  const build = document.createElement('button');
  build.type = 'button';
  build.textContent = t('Build starter app');
  controls.append(build);
  const source = document.createElement('button');
  source.type = 'button';
  source.textContent = t('Generate source files (HTML / CSS / JS)');
  source.addEventListener('click', () => {
    try {
      const bundle = generateSourceFiles(spec);
      for (const [name, content] of Object.entries(bundle.files)) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch {
      window.alert(t('Review and approve the application specification before generating source files.'));
    }
  });
  controls.append(source);
  const sourcePreview = document.createElement('button');
  sourcePreview.type = 'button';
  sourcePreview.textContent = 'Live Preview (HTML / CSS / JS)';
  sourcePreview.addEventListener('click', () => {
    try {
      const { files } = generateSourceFiles(spec);
      const dialog = document.createElement('dialog');
      dialog.setAttribute('aria-label', 'Generated source live preview');
      dialog.style.cssText = 'width:min(96vw,1100px);height:min(90dvh,850px);padding:0;border:1px solid #6988ad;border-radius:12px;background:#fff;color:#17243a';
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;gap:12px';
      const title = document.createElement('strong');
      title.textContent = 'XSUS App · Live Source Preview';
      const close = document.createElement('button');
      close.type = 'button'; close.textContent = 'Close';
      close.addEventListener('click', () => dialog.close());
      header.append(title, close);
      const frame = document.createElement('iframe');
      frame.title = 'Isolated generated application preview';
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.style.cssText = 'display:block;width:100%;height:calc(100% - 54px);border:0;background:white';
      frame.srcdoc = composeSourcePreview(files);
      dialog.append(header, frame);
      dialog.addEventListener('close', () => dialog.remove(), { once:true });
      document.body.append(dialog);
      dialog.showModal();
    } catch {
      window.alert(t('Review and approve the application specification before generating source files.'));
    }
  });
  controls.append(sourcePreview);
  card.append(controls);
  function showDownload(html) {
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
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.textContent = t('Preview');
    preview.addEventListener('click', () => onBuild(html));
    controls.replaceChildren(preview, download, source, sourcePreview);
  }
  if (spec.builtHtml || builtScaffolds.has(spec)) showDownload(spec.builtHtml || builtScaffolds.get(spec));
  build.addEventListener('click', () => {
    const html = buildScaffold(spec);
    builtScaffolds.set(spec, html);
    showDownload(html);
    onBuild(html);
  });
}
