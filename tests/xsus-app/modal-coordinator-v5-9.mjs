import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../../assets/js/xsus-app/', import.meta.url);
const source = readFileSync(new URL('modal-coordinator.js', root), 'utf8');
const app = readFileSync(new URL('app.js', root), 'utf8');
for (const id of ['pmOverlay', 'vhOverlay', 'tdOverlay', 'pubOverlay', 'stOverlay']) {
  assert.match(source, new RegExp(id), `${id} missing`);
}
assert.match(source, /MutationObserver/);
assert.match(source, /entry\.close\.click\(\)/);
assert.match(source, /reconciling/);
assert.match(app, /initModalCoordinator\(\)/);
console.log('V5.9 modal coordinator: 9 static assertions passed');
