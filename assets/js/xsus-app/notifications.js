import { t } from './i18n/language-manager.js';
let timer;
let activeToastKey = null;
document.addEventListener('xsus:language-changed', () => {
  const node = document.querySelector('.toast');
  if (node && activeToastKey !== null) node.textContent = t(activeToastKey);
});
export function toast(message) {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div');
  node.className = 'toast';
  activeToastKey = message;
  node.textContent = t(message);
  document.body.appendChild(node);
  clearTimeout(timer);
  timer = setTimeout(() => { node.remove(); activeToastKey = null; }, 3300);
}
