// UI state only; no backend or persistence.
export const state = { mode: 'split', device: 'desktop', mobile: 'chat' };
export const $ = selector => document.querySelector(selector);
export const $$ = selector => Array.from(document.querySelectorAll(selector));
export function refreshIcons() { window.lucide?.createIcons(); }
