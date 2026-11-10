import { t, formatUi } from './i18n/language-manager.js';
import { $, $$, state } from './state.js';
import { toast } from './notifications.js';
import { showDashboard, hideDashboard } from './dashboard.js';
export function setMobile(which) {
  state.mobile = which;
  if (!$('#dashboardPanel').classList.contains('hidden')) return;
  const small = matchMedia('(max-width:700px)').matches;
  $('#chatPanel').classList.toggle('hidden', small && which !== 'chat');
  $('#editorPanel').classList.toggle('hidden', small && which !== 'editor');
  $$('[data-mobile]').forEach(button => {
    const selected = button.dataset.mobile === which;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
export function showBuilder() {
  document.dispatchEvent(new Event('xsus:close-mobile-navigation'));
  $('#landing').classList.add('hidden');
  $('#workspace').classList.remove('hidden');
  location.hash = 'builder';
  setMobile('chat');
  $('#workspace').focus({preventScroll:true});
}
export function showLanding() {
  document.dispatchEvent(new Event('xsus:close-mobile-navigation'));
  hideDashboard();
  setMobile('chat');
  $('#workspace').classList.add('hidden');
  $('#landing').classList.remove('hidden');
  history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  $('#landing').focus({preventScroll:true});
}
export function initNavigation() {
  const siteMenu = $('#siteMenuBtn');
  const mobileNav = $('#siteMobileNav');
  siteMenu?.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('hidden') === false;
    siteMenu.setAttribute('aria-expanded', String(isOpen));
    siteMenu.setAttribute('aria-label', isOpen ? t('Close module navigation') : t('Open module navigation'));
  });
  mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mobileNav.classList.add('hidden');
    siteMenu?.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileNav && !mobileNav.classList.contains('hidden')) {
      mobileNav.classList.add('hidden');
      siteMenu?.setAttribute('aria-expanded', 'false');
      siteMenu?.focus();
    }
  });
  $('[data-section-shortcut="Settings"]')?.addEventListener('click', () => $('[data-section="Settings"]')?.click());
  $$('[data-open-builder]').forEach(button => button.addEventListener('click', showBuilder));
  $$('[data-template-prompt]').forEach(button => button.addEventListener('click', () => {
    $('#prompt').value = button.dataset.templatePrompt;
    showBuilder();
    $('#prompt').focus();
  }));
  $('#exitBtn').addEventListener('click', showLanding);
  const railToggle = $('#menuBtn');
  const rail = $('#rail');
  const closeRail = (restoreFocus = false) => {
    if (!rail.classList.contains('open')) return;
    rail.classList.remove('open');
    railToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) railToggle.focus();
  };
  railToggle.addEventListener('click', () => {
    const expanded = rail.classList.toggle('open');
    railToggle.setAttribute('aria-expanded', String(expanded));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && rail.classList.contains('open')) {
      closeRail(true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (rail.classList.contains('open') && !rail.contains(event.target) && !railToggle.contains(event.target)) closeRail();
  });
  window.addEventListener('resize', () => {
    if (matchMedia('(min-width: 701px)').matches) closeRail();
  });
  document.addEventListener('xsus:close-mobile-navigation', () => closeRail());
  $$('[data-mobile]').forEach(button => button.addEventListener('click', () => setMobile(button.dataset.mobile)));
  window.addEventListener('resize', () => setMobile(state.mobile));
  $$('[data-section]').forEach(button => button.addEventListener('click', () => {
    $$('[data-section]').forEach(item => item.classList.toggle('active', item === button));
    if (button.dataset.section === 'Settings') { hideDashboard(); closeRail(); document.dispatchEvent(new CustomEvent('xsus:open-settings')); return; }
    if (button.dataset.section === 'Publish') { hideDashboard(); closeRail(); document.dispatchEvent(new CustomEvent('xsus:open-publishing')); return; }
    if (button.dataset.section === 'Tests') { hideDashboard(); closeRail(); document.dispatchEvent(new CustomEvent('xsus:open-testing')); return; }
    if (button.dataset.section === 'Versions') { hideDashboard(); closeRail(); document.dispatchEvent(new CustomEvent('xsus:open-version-history')); return; }
    if (button.dataset.section === 'Dashboard') { showDashboard(); return; }
    hideDashboard();
    $('#sectionTitle').textContent = t(button.dataset.section);
    closeRail();
    if (button.dataset.section === 'Visual Editor') { $('[data-mode="design"]').click(); setMobile('editor'); }
    else if (button.dataset.section === 'Code Editor') { $('[data-mode="code"]').click(); setMobile('editor'); }
    else if (button.dataset.section === 'AI Builder') setMobile('chat');
    else toast(formatUi('{section}: interface placeholder — functionality will be designed in later stages.', {section: t(button.dataset.section)}));
  }));
  if (location.hash === '#builder') showBuilder();
}

document.addEventListener('xsus:language-changed', () => { const current = document.querySelector('[data-section].active'); const title = document.getElementById('sectionTitle'); if (current && title) title.textContent = t(current.dataset.section); const menu = document.getElementById('siteMenuBtn'); if(menu) menu.setAttribute('aria-label', t(menu.getAttribute('aria-expanded') === 'true' ? 'Close module navigation' : 'Open module navigation')); });
