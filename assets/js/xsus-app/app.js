import { initModalCoordinator } from './modal-coordinator.js';
initModalCoordinator();
// XSUS App — design-only entry point. Independent from Studio demo scripts.
import { initEditor } from './editor.js?v=20261123-previewsource6';
import { initChat } from './chat.js?v=20261123-previewsource6';
import { initNavigation } from './navigation.js?v=20261120-templates1';
import { initDashboard } from './dashboard.js';
initEditor();
initChat();
initNavigation();

initDashboard();

import { initProjectManager } from './project-manager.js?v=20261122-unified2';
initProjectManager();

import { initVersionHistory } from './version-history.js';
initVersionHistory();

import { initTestingDiagnostics } from './testing-diagnostics.js';
initTestingDiagnostics();

import { initPublishing } from './publishing.js';
initPublishing();

import { initSettings } from './settings.js';
initSettings();

import { initRefreshState } from './refresh-state.js?v=20261122-unified2';
initRefreshState();

import { initAccountProjects } from './account-projects.js?v=20261122-unified2';
initAccountProjects();
