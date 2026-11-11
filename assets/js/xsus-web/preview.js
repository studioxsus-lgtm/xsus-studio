import { $, $$, setPressed } from './dom.js';
import { documentHtml, renderSite } from './site-renderer.js';
import { currentPage, state, t } from './state.js';

const devices = { desktop: 1280, tablet: 768, phone: 390 };

export function renderCanvas() {
  const page = currentPage();
  $('#page-path').textContent = page.path;
  resizeCanvas();
  $('#canvas').hidden = state.view !== 'design';
  $('#preview').hidden = state.view !== 'preview';
  $('#code').hidden = state.view !== 'code';
  $('.devices').hidden = state.view === 'code';
  setPressed('[data-view]', 'view', state.view);
  setPressed('[data-device]', 'device', state.device);
  if (state.view === 'design') $('#canvas').innerHTML = renderSite(page, { editable: true });
  if (state.view === 'code') $('#code').textContent = documentHtml(page);
  if (state.view === 'preview') {
    const html = documentHtml(page);
    if ($('#preview').srcdoc !== html) $('#preview').srcdoc = html;
  }
  $('#canvas-status').textContent = page.path + ' · ' + (state.view === 'code' ? 'HTML' : t(state.device) + ' · ' + devices[state.device] + ' px');
}

function resizeCanvas() {
  const stage = $('#stage');
  const style = getComputedStyle(stage);
  const available = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const width = devices[state.device];
  stage.style.setProperty('--canvas-width', width + 'px');
  stage.style.setProperty('--canvas-scale', String(Math.min(1, Math.max(0.01, available / width))));
}

export function bindPreview(setPanel, saveProject) {
  $$('[data-view]').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view;
    setPanel('canvas');
    saveProject();
    renderCanvas();
  }));
  $$('[data-device]').forEach(button => button.addEventListener('click', () => {
    state.device = button.dataset.device;
    saveProject();
    renderCanvas();
  }));
  new ResizeObserver(resizeCanvas).observe($('#stage'));
}
