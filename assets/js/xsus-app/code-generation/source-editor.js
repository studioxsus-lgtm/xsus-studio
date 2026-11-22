import { validateSourceFiles } from './source-validator.js';
import { composeSourcePreview } from './live-preview.js';

const names = ['index.html', 'styles.css', 'app.js'];
const MAX_FILE_LENGTH = 500000;

export function openSourceEditor(initialFiles, onSave = null, initialHistory = []) {
  const files = Object.fromEntries(names.map(name => [name, initialFiles[name]]));
  let history = Array.isArray(initialHistory) ? structuredClone(initialHistory) : [];
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'XSUS source code editor');
  dialog.style.cssText = 'width:min(98vw,1250px);height:min(94dvh,900px);padding:0;border:1px solid #6988ad;border-radius:12px;background:#f7f9fc;color:#17243a';
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px';
  const title = document.createElement('strong');
  title.textContent = 'XSUS App · Source Editor';
  title.style.marginRight = 'auto';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Select source file');
  for (const name of names) {
    const option = document.createElement('option'); option.value = name;
    option.textContent = name; select.append(option);
  }
  const refresh = document.createElement('button');
  refresh.type = 'button'; refresh.textContent = 'Update preview';
  const validate = document.createElement('button');
  validate.type = 'button'; validate.textContent = 'Validate build';
  const report = document.createElement('div');
  report.setAttribute('role','status');
  report.style.cssText = 'max-height:105px;overflow:auto;padding:4px 12px;font:12px/1.4 system-ui';
  const download = document.createElement('button');
  download.type = 'button'; download.textContent = 'Download files';
  const reset = document.createElement('button');
  reset.type = 'button'; reset.textContent = 'Reset edits';
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = 'Close';
  const revisions = document.createElement('select');
  revisions.setAttribute('aria-label', 'Saved source versions');
  const restore = document.createElement('button');
  restore.type = 'button'; restore.textContent = 'Restore version';
  function renderRevisions() {
    revisions.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = ''; placeholder.textContent = 'Version history';
    revisions.append(placeholder);
    history.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = new Date(entry.createdAt).toLocaleString() + ' · v' + (index + 1);
      revisions.append(option);
    });
  }
  renderRevisions();
  header.append(title,select,refresh,validate,revisions,restore,download,reset,close);
  const workspace = document.createElement('div');
  workspace.className = 'xsus-source-workspace';
  const responsive = document.createElement('style');
  responsive.textContent = '@media(max-width:760px){.xsus-source-workspace{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto minmax(200px,1fr) minmax(200px,1fr)}.xsus-source-workspace nav{flex-direction:row!important;flex-wrap:wrap}}';
  workspace.style.cssText = 'display:grid;grid-template-columns:minmax(125px,170px) minmax(0,1fr) minmax(0,1fr);height:calc(100% - 104px);gap:8px;padding:8px;box-sizing:border-box;overflow:auto';
  const explorer = document.createElement('nav');
  explorer.setAttribute('aria-label','Project file explorer');
  explorer.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:125px';
  const explorerTitle = document.createElement('strong'); explorerTitle.textContent = 'PROJECT FILES';
  explorer.append(explorerTitle);
  const fileButtons = new Map();
  for (const name of names) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = name;
    button.style.cssText = 'text-align:left;padding:8px;overflow-wrap:anywhere';
    button.addEventListener('click', () => { select.value = name; select.dispatchEvent(new Event('change')); });
    explorer.append(button); fileButtons.set(name,button);
  }
  function updateExplorer() {
    for (const [name,button] of fileButtons) {
      const active = name === select.value;
      button.setAttribute('aria-current', active ? 'page' : 'false');
      button.style.fontWeight = active ? '700' : '400';
    }
  }
  updateExplorer();
  const textarea = document.createElement('textarea');
  textarea.setAttribute('aria-label','Edit selected source file');
  textarea.spellcheck = false;
  textarea.style.cssText = 'width:100%;height:100%;box-sizing:border-box;resize:none;font:12px/1.5 monospace;padding:12px;border:1px solid #b4c8db;border-radius:8px';
  const frame = document.createElement('iframe');
  frame.title = 'Sandboxed live code preview';
  frame.setAttribute('sandbox','allow-scripts');
  frame.style.cssText = 'width:100%;height:100%;border:1px solid #b4c8db;border-radius:8px;background:white;box-sizing:border-box';
  workspace.append(explorer,textarea,frame);
  const status = document.createElement('p');
  status.setAttribute('role','status');
  status.style.cssText = 'margin:0;padding:2px 12px;font-size:12px';
  dialog.append(responsive,header,workspace,report,status);
  const readEditor = () => {
    if (textarea.value.length > MAX_FILE_LENGTH) {
      status.textContent = 'File exceeds the 500 KB editor limit.';
      return false;
    }
    files[select.value] = textarea.value;
    return true;
  };
  let dirty = false;
  textarea.addEventListener('input', () => { dirty = true; status.textContent = 'Unsaved source changes'; });
  const save = document.createElement('button');
  save.type = 'button'; save.textContent = 'Save to project';
  header.insertBefore(save, download);
  save.addEventListener('click', () => {
    if (!readEditor()) return;
    if (typeof onSave !== 'function') { status.textContent = 'Project saving is unavailable.'; return; }
    try {
      const result = onSave(Object.fromEntries(names.map(name => [name, files[name]])));
      if (Array.isArray(result)) { history = structuredClone(result); renderRevisions(); }
      dirty = false;
      status.textContent = 'Source files saved to this XSUS project.';
    } catch { status.textContent = 'Could not save source files to the project.'; }
  });
  const runValidation = () => {
    if (!readEditor()) return false;
    const result = validateSourceFiles(files);
    report.replaceChildren();
    const summary = document.createElement('strong');
    summary.textContent = result.ok ? 'Static preflight: no blocking errors' : 'Static preflight: blocking errors found';
    report.append(summary);
    for (const issue of result.issues) {
      const line = document.createElement('div');
      line.textContent = issue.level.toUpperCase() + ' · ' + issue.file + ': ' + issue.message;
      report.append(line);
    }
    return result.ok;
  };
  validate.addEventListener('click', runValidation);
  const updatePreview = () => {
    if (!readEditor()) return;
    try { frame.srcdoc = composeSourcePreview(files); status.textContent = 'Preview updated (isolated sandbox).'; }
    catch (error) { status.textContent = error.message; }
  };
  select.addEventListener('change', event => {
    const previous = event.target.dataset.previous || names[0];
    if (textarea.value.length <= MAX_FILE_LENGTH) files[previous] = textarea.value;
    else { select.value = previous; status.textContent = 'File exceeds the 500 KB editor limit.'; return; }
    textarea.value = files[select.value];
    select.dataset.previous = select.value;
    updateExplorer();
  });
  refresh.addEventListener('click', updatePreview);
  restore.addEventListener('click', () => {
    const index = Number(revisions.value);
    if (revisions.value === '' || !history[index]?.files) return;
    if (!window.confirm('Restore this saved version? Unsaved edits in this editor will be replaced.')) return;
    for (const name of names) files[name] = history[index].files[name];
    textarea.value = files[select.value];
    updatePreview();
    dirty = true;
    status.textContent = 'Previous version loaded. Press Save to project to keep it.';
  });
  download.addEventListener('click', () => {
    if (!runValidation()) { status.textContent = 'Fix blocking validation errors before exporting.'; return; }
    for (const name of names) {
      const url = URL.createObjectURL(new Blob([files[name]], {type:'text/plain;charset=utf-8'}));
      const a = document.createElement('a'); a.href=url; a.download=name; a.click();
      setTimeout(() => URL.revokeObjectURL(url),30000);
    }
    status.textContent = 'Three source files prepared for download.';
  });
  reset.addEventListener('click', () => {
    if (!window.confirm('Discard all source edits in this editor?')) return;
    for (const name of names) files[name] = initialFiles[name];
    textarea.value = files[select.value];
    dirty = true;
    updatePreview();
  });
  close.addEventListener('click', () => { if (!dirty || window.confirm('Close with unsaved source changes?')) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (dirty && !window.confirm('Close with unsaved source changes?')) event.preventDefault(); });
  dialog.addEventListener('close', () => { frame.removeAttribute('srcdoc'); dialog.remove(); }, {once:true});
  select.dataset.previous = names[0];
  textarea.value = files[names[0]];
  document.body.append(dialog);
  dialog.showModal();
  updatePreview();
}
