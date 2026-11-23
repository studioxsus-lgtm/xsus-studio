import { initModalCoordinator } from './modal-coordinator.js';

// XSUS App — functional builder entry point. Independent from Studio demo scripts.
import { initEditor } from './editor.js?v=20261123-toolbar31';
import { initChat } from './chat.js?v=android1';
import { initNavigation } from './navigation.js?v=20261120-templates1';
import { initDashboard } from './dashboard.js';






import { initProjectManager } from './project-manager.js?v=20261122-unified2';


import { initVersionHistory } from './version-history.js?v=20261123-history11';


import { initTestingDiagnostics } from './testing-diagnostics.js';


import { initPublishing } from './publishing.js';


import { initSettings } from './settings.js';


import { initRefreshState } from './refresh-state.js?v=20261122-unified2';


import { initAccountProjects } from './account-projects.js?v=20261123-reconnect18';


// Keep independent controls available if one optional panel fails during startup.
const xsusInitializers = [
  ['modal', initModalCoordinator],
  ['editor', initEditor],
  ['chat', initChat],
  ['navigation', initNavigation],
  ['dashboard', initDashboard],
  ['projects', initProjectManager],
  ['history', initVersionHistory],
  ['testing', initTestingDiagnostics],
  ['publishing', initPublishing],
  ['settings', initSettings],
  ['account-projects', initAccountProjects],
  ['refresh-state', initRefreshState],
];
for (const [name, initialize] of xsusInitializers) {
  try {
    const pending = initialize();
    if (pending && typeof pending.catch === 'function') {
      pending.catch(error => console.error('[xsus-app:init:' + name + ']', error));
    }
  } catch (error) {
    console.error('[xsus-app:init:' + name + ']', error);
  }
}
