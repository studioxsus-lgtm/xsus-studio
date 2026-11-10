import { initModalCoordinator } from './modal-coordinator.js';
initModalCoordinator();
// XSUS App — design-only entry point. Independent from Studio demo scripts.
import { initEditor } from './editor.js';
import { initChat } from './chat.js';
import { initNavigation } from './navigation.js';
import { initDashboard } from './dashboard.js';
initEditor();
initChat();
initNavigation();

initDashboard();

import { initProjectManager } from './project-manager.js';
initProjectManager();

import { initVersionHistory } from './version-history.js';
initVersionHistory();

import { initTestingDiagnostics } from './testing-diagnostics.js';
initTestingDiagnostics();

import { initPublishing } from './publishing.js';
initPublishing();

import { initSettings } from './settings.js';
initSettings();
