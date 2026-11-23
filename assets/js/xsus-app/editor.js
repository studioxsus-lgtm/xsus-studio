import { registerRefreshState, saveRefreshState } from './refresh-state.js?v=20261122-unified2';
import { t } from './i18n/language-manager.js?v=20261119-r2';
import { renderVisualDesign, handleVisualDesignClick, handleVisualDesignInput } from './visual-editor.js';
import { $, $$, state, refreshIcons } from './state.js';

// Independent, local-only design samples. Nothing is executed, compiled, or persisted.
const samples = {
  'App.jsx': `export default function App() {\n  return (\n    <main className="app">\n      <h1>Welcome to My App</h1>\n      <p>Build something great.</p>\n      <button>Explore</button>\n    </main>\n  );\n}`,
  'styles.css': `.app {\n  padding: 32px;\n  font-family: Inter, sans-serif;\n}\n.app h1 {\n  color: #17243a;\n}\nbutton {\n  background: #2563eb;\n  color: white;\n}`,
  'components/Header.jsx': `export function Header() {\n  return (\n    <header>\n      <strong>My App</strong>\n      <nav>Home · Explore</nav>\n    </header>\n  );\n}`,
  'package.json': `{\n  "name": "xsus-design-sample",\n  "private": true,\n  "version": "0.0.0-demo"\n}`
};
let generatedHtml = null;
const previewTasks = new Map();
window.addEventListener('message', event => {
  const frame = document.querySelector('[data-generated-preview]');
  if (!frame || event.source !== frame.contentWindow || event.origin !== 'null') return;
  const message = event.data;
  if (message?.type === 'xsus-board-state' && frame.dataset.board === message.board && Array.isArray(message.tasks)) {
    previewTasks.set(message.board, message.tasks);
    saveRefreshState('boards');
  }
});

export function showGeneratedHtml(html, openPreview = false) {
  if (html !== generatedHtml) {
    generatedHtml = html;
    currentFile = html === null ? 'App.jsx' : 'index.html';
    renderEditor();
  }
  if (openPreview) {
    updateMode('preview');
    $('[data-mobile="editor"]')?.click();
    $('[data-mode="preview"]')?.focus();
  }
}

const fileContent = () => generatedHtml ?? samples[currentFile];

let currentFile = 'App.jsx';
let explorerOpen = true;
let splitRatio = 50;
let previewScale = 100;
let showGrid = false;
let selectedElement = 'Hero Section';
const escapeHtml = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui = value => escapeHtml(t(value));
const icon = name => `<i data-lucide="${name}"></i>`;
function fileTree() {
  return `<aside class="file-explorer ${explorerOpen ? '' : 'is-collapsed'}" aria-label="${ui(generatedHtml ? 'EXPLORER' : 'Demo file explorer')}"><div class="explorer-title">${icon('folder-tree')} <span>${ui('EXPLORER')}</span><button type="button" class="editor-mini" data-editor-action="toggle-explorer" aria-label="${ui('Toggle file explorer')}">${icon(explorerOpen?'panel-left-close':'panel-left-open')}</button></div>${explorerOpen ? `<div class="explorer-group">${icon('folder-open')} <span>${generatedHtml ? 'HTML' : ui('MY APP / DEMO')}</span></div>${(generatedHtml ? ['index.html'] : Object.keys(samples)).map(name=>`<button type="button" class="explorer-file ${currentFile===name?'selected':''}" data-file="${escapeHtml(name)}">${icon(name.endsWith('.css')?'file-type':'file-code-2')}<span>${escapeHtml(name)}</span></button>`).join('')}<div class="explorer-foot">${ui(generatedHtml ? 'READ ONLY' : 'Local samples · Read only')}</div>` : ''}</aside>`;
}
function codePane() {
  const content = escapeHtml(fileContent());
  const numbered = content.split('\n').map((line,index)=>`<div class="code-line"><span class="line-number">${index+1}</span><span>${line || ' '}</span></div>`).join('');
  return `<section class="advanced-code-pane" aria-label="${generatedHtml ? 'index.html' : ui('Code editor sample')}">${fileTree()}<div class="code-main"><div class="file-tabs"><span class="file-tab active">${icon('file-code-2')} ${escapeHtml(currentFile)} <span class="file-readonly">${ui('READ ONLY')}</span></span><button type="button" class="editor-mini" data-editor-action="copy-code" title="${ui(generatedHtml ? 'Copy' : 'Copy demo code')}" aria-label="${ui(generatedHtml ? 'Copy' : 'Copy demo code')}">${icon('copy')}</button></div><div class="code-sample" role="region" tabindex="0" aria-label="${ui(generatedHtml ? 'READ ONLY' : 'Read-only sample code')}">${numbered}</div><div class="code-footer">${icon('shield-check')} ${generatedHtml ? 'index.html' : ui('Design sample · No code execution')}</div></div></section>`;
}
function canvas() {
  if (generatedHtml) return `<iframe sandbox="" data-generated-preview title="${ui('Starter app preview')}" class="app-canvas ${state.device}" style="--preview-scale:${previewScale/100};height:100%;min-height:16rem;border:0"></iframe>`;
  return `<div class="app-canvas ${state.device === 'desktop' ? '' : state.device}" style="--preview-scale:${previewScale/100}"><div class="canvas-header">My App <span style="font-weight:400;font-size:10px">Home · Explore</span></div><div class="canvas-hero"><h3>Welcome to My App</h3><p>A beautiful starting point for your next application.</p><span>Explore Now</span></div><div class="canvas-cards"><div></div><div></div><div></div><div></div></div></div>`;
}
function previewPane() {
  return `<section class="advanced-preview-pane" aria-label="${ui('Static application preview')}"><div class="preview-toolbar"><span>${icon('eye')} ${ui('Preview')} · ${ui(state.device)}</span><div class="preview-controls"><button class="editor-mini" type="button" data-editor-action="zoom-out" aria-label="${ui('Zoom out')}">${icon('minus')}</button><span>${previewScale}%</span><button class="editor-mini" type="button" data-editor-action="zoom-in" aria-label="${ui('Zoom in')}">${icon('plus')}</button><button class="editor-mini ${showGrid?'active':''}" type="button" data-editor-action="grid" aria-label="${ui('Toggle preview grid')}" aria-pressed="${showGrid}">${icon('grid-2x2')}</button></div></div><div class="advanced-preview-surface ${showGrid?'with-grid':''}">${canvas()}</div><div class="preview-note">${ui(generatedHtml ? 'Starter app preview' : 'Static mockup · Device width simulation only')}</div></section>`;
}
function modeContent() {
  if(state.mode==='split') return `<div class="advanced-split" style="--split-ratio:${splitRatio}%"><div class="split-cell">${codePane()}</div><div class="split-divider" role="separator" tabindex="0" aria-label="${ui('Resize code and preview panels')}" aria-orientation="vertical" aria-valuenow="${splitRatio}" aria-valuemin="30" aria-valuemax="70" title="${ui('Drag to resize · Arrow keys to adjust')}"></div><div class="split-cell">${previewPane()}</div></div>`;
  if(state.mode==='code') return `<div class="advanced-single">${codePane()}</div>`;
  if(state.mode==='preview') return `<div class="advanced-single">${previewPane()}</div>`;
  return renderVisualDesign();
}
export function renderEditor() {
  const target = $('#editorBody');
  if(!target) return;
  target.innerHTML = modeContent();
  const preview = target.querySelector('[data-generated-preview]');
  if (preview) {
    if (generatedHtml.includes('<meta http-equiv="Content-Security-Policy"')) {
      preview.setAttribute('sandbox', 'allow-scripts allow-forms allow-downloads');
    }
    const id = generatedHtml.match(/<html lang="en" data-board="([a-f0-9-]+)"/)?.[1];
    if (id) preview.dataset.board = id;
    const saved = previewTasks.get(id);
    preview.srcdoc = saved ? generatedHtml.replace('<html lang="en"', () =>
      '<html lang="en" data-tasks="' + encodeURIComponent(JSON.stringify(saved)) + '"') : generatedHtml;
  }
  refreshIcons();
}
function updateMode(mode) {
  state.mode=mode;
  $$('[data-mode]').forEach(button=>{const selected=button.dataset.mode===mode;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
  renderEditor();
}
function updateDevice(device) {
  state.device=device;
  $$('[data-device]').forEach(button=>{const selected=button.dataset.device===device;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  renderEditor();
}
function toast(message) { const node = $('#toast'); if(node) { node.textContent=message; node.classList.add('show'); setTimeout(()=>node.classList.remove('show'),2600); } }
function onEditorClick(event) {
  if (event.target.closest('[data-visual-action], [data-visual-add], [data-visual-select]')) { handleVisualDesignClick(event); renderEditor(); return; }
  const file=event.target.closest('[data-file]');
  if(file){currentFile=file.dataset.file;renderEditor();return;}
  const action=event.target.closest('[data-editor-action]')?.dataset.editorAction;
  if(!action) return;
  if(action==='toggle-explorer') explorerOpen=!explorerOpen;
  if(action==='zoom-in') previewScale=Math.min(150,previewScale+10);
  if(action==='zoom-out') previewScale=Math.max(60,previewScale-10);
  if(action==='grid') showGrid=!showGrid;
  if(action==='copy-code') { if (!navigator.clipboard?.writeText) { toast(t('Copy unavailable in this browser')); return; } navigator.clipboard.writeText(fileContent()).then(()=>toast(t(generatedHtml ? 'Copied' : 'Demo code copied'))).catch(()=>toast(t('Copy unavailable in this browser')));return; }
  renderEditor();
}
export function initEditor() {
  registerRefreshState('boards', () => [...previewTasks], saved => {
    previewTasks.clear();
    for (const [id, tasks] of saved || []) previewTasks.set(id, tasks);
    renderEditor();
  });
  $$('[data-mode]').forEach(button=>button.addEventListener('click',()=>updateMode(button.dataset.mode)));
  $$('[data-device]').forEach(button=>button.addEventListener('click',()=>updateDevice(button.dataset.device)));
  const target=$('#editorBody');
  target?.addEventListener('click',onEditorClick);
  target?.addEventListener('change',event=>{if(event.target.id==='demo-element')selectedElement=event.target.value; if(event.target.matches('[data-visual-input]')) {handleVisualDesignInput(event);renderEditor();}});
  target?.addEventListener('input',event=>{if(event.target.matches('[data-visual-range]')){handleVisualDesignInput(event);const node=target.querySelector('[data-visual-selected]');if(node)node.style.borderRadius=event.target.value+'px';}});
  target?.addEventListener('keydown',event=>{if(!event.target.matches('.split-divider'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();splitRatio=Math.max(30,Math.min(70,splitRatio+(event.key==='ArrowRight'?5:-5)));renderEditor();target.querySelector('.split-divider')?.focus();}});
  let dragging=false;
  target?.addEventListener('pointerdown',event=>{if(!event.target.matches('.split-divider'))return;dragging=true;event.target.setPointerCapture(event.pointerId);});
  target?.addEventListener('pointermove',event=>{if(!dragging)return;const split=target.querySelector('.advanced-split');if(!split)return;const rect=split.getBoundingClientRect();splitRatio=Math.max(30,Math.min(70,Math.round((event.clientX-rect.left)/rect.width*100)));split.style.setProperty('--split-ratio',`${splitRatio}%`);const divider=split.querySelector('.split-divider');divider?.setAttribute('aria-valuenow',String(splitRatio));});
  target?.addEventListener('pointerup',()=>{dragging=false;});
  target?.addEventListener('pointercancel',()=>{dragging=false;});
  renderEditor();
}

document.addEventListener('xsus:language-changed', () => renderEditor());
