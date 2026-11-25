import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedArchive} from '../../assets/js/xsus-web/workspace/archive-export.mjs';
import {importArchiveBlob} from '../../assets/js/xsus-web/workspace/archive-import.mjs';
import {projectPreferences} from '../../assets/js/xsus-web/workspace/project-preferences.mjs';

test('current ZIP preserves every page and UTF-8 edits', async()=>{
  const files={'index.html':'<a href="menu.html">Menu</a>','menu.html':'Crème brûlée','contact.html':'E shtunë · 21:00'};
  const restored=await importArchiveBlob(await verifiedArchive(files));
  assert.deepEqual(restored.files,files);
});
test('project navigation is scoped to the account',()=>{
  const map=new Map(),storage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)};
  const first=projectPreferences(storage,'first'),other=projectPreferences(storage,'other');
  first.remember('project',{name:'Restaurant',language:'sq'});
  assert.equal(first.read().projects.project.name,'Restaurant');
  assert.deepEqual(other.read(),{});
});
