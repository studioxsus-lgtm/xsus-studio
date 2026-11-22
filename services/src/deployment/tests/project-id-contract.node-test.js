import test from 'node:test';
import assert from 'node:assert/strict';
import {isPersistedBuilderProjectId,requirePersistedBuilderProjectId} from '../project-id-contract.js';
const uuid='12345678-1234-4234-8234-123456789abc';
test('accepts persisted builder UUIDs',()=>{
 assert.equal(isPersistedBuilderProjectId(uuid),true);
 assert.equal(requirePersistedBuilderProjectId(uuid),uuid);
});
test('rejects legacy temporary identifiers without converting them',()=>{
 for(const id of ['project_1','',null,undefined,'../../private','12345678123442348234123456789abc']){
  assert.equal(isPersistedBuilderProjectId(id),false);
  assert.throws(()=>requirePersistedBuilderProjectId(id),TypeError);
 }
});
test('does not trim or silently normalize IDs',()=>{
 assert.equal(isPersistedBuilderProjectId(' '+uuid),false);
 assert.equal(isPersistedBuilderProjectId(uuid+' '),false);
});
