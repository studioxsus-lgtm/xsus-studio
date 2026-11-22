import { composeSourcePreview } from './live-preview.js';

const names = ['index.html', 'styles.css', 'app.js'];
const MAX_FILE_LENGTH = 500000;

export function openSourceEditor(initialFiles, onSave = null) {
  const files = Object.fromEntries(names.map(name => [name, initialFiles[name]]));
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
  const download = document.createElement('button');
  download.type = 'button'; download.textContent = 'Download files';
  const reset = document.createElement('button');
  reset.type = 'button'; reset.textContent = 'Reset edits';
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = 'Close';
  header.append(title,select,refresh,download,reset,close);
  const workspace = document.createElement('div');
  workspace.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));height:calc(100% - 104px);gap:8px;padding:8px;box-sizing:border-box';
  const textarea = document.createElement('textarea');
  textarea.setAttribute('aria-label','Edit selected source file');
  textarea.spellcheck = false;
  textarea.style.cssText = 'width:100%;height:100%;box-sizing:border-box;resize:none;font:12px/1.5 monospace;padding:12px;border:1px solid #b4c8db;border-radius:8px';
  const frame = document.createElement('iframe');
  frame.title = 'Sandboxed live code preview';
  frame.setAttribute('sandbox','allow-scripts');
  frame.style.cssText = 'width:100%;height:100%;border:1px solid #b4c8db;border-radius:8px;background:white;box-sizing:border-box';
  workspace.append(textarea,frame);
  const status = document.createElement('p');
  status.setAttribute('role','status');
  status.style.cssText = 'margin:0;padding:2px 12px;font-size:12px';
  dialog.append(header,workspace,status);
  const readEditor = () => {
    if (textarea.value.length > MAX_FILE_LENGTH) {
      status.textContent = 'File exceeds the 500 KB editor limit.';
      return false;
    }
    files[select.value] = textarea.value;
    return true;
  };
  const save = document.createElement('button');
  save.type = 'button'; save.textContent = 'Save to project';
  header.insertBefore(save, download);
  save.addEventListener('click', () => {
    if (!readEditor()) return;
    if (typeof onSave !== 'function') { status.textContent = 'Project saving is unavailable.'; return; }
    try {
      onSave(Object.fromEntries(names.map(name => [name, files[name]])));
      status.textContent = 'Source files saved to this XSUS project.';
    } catch { status.textContent = 'Could not save source files to the project.'; }
  });
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
  });
  refresh.addEventListener('click', updatePreview);
  download.addEventListener('click', () => {
    if (!readEditor()) return;
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
    updatePreview();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { frame.removeAttribute('srcdoc'); dialog.remove(); }, {once:true});
  select.dataset.previous = names[0];
  textarea.value = files[names[0]];
  document.body.append(dialog);
  dialog.showModal();
  updatePreview();
}
