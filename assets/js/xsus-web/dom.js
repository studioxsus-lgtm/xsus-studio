export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];

export function setPressed(selector, dataKey, value) {
  $$(selector).forEach(button => button.setAttribute('aria-pressed', String(button.dataset[dataKey] === value)));
}

export function listButton(text, pressed, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.setAttribute('aria-pressed', String(pressed));
  button.addEventListener('click', action);
  return button;
}
