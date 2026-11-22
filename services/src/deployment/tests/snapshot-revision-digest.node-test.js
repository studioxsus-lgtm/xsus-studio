import test from 'node:test';
import assert from 'node:assert/strict';
import {digestPersistedSnapshot} from '../snapshot-revision-digest.js';
test('different JSONB key orders produce the same digest',()=>{
 const a={version:1,session:{messages:[],generatedHtml:'hello'},boards:[]};
 const b={boards:[],session:{generatedHtml:'hello',messages:[]},version:1};
 assert.equal(digestPersistedSnapshot(a),digestPersistedSnapshot(b));
});
test('real content edits change the digest',()=>{
 assert.notEqual(digestPersistedSnapshot({version:1,session:{goal:'A'}}),
  digestPersistedSnapshot({session:{goal:'B'},version:1}));
});
test('array element order remains significant',()=>{
 assert.notEqual(digestPersistedSnapshot({steps:[1,2]}),
  digestPersistedSnapshot({steps:[2,1]}));
});
test('rejects invalid or excessive snapshots',()=>{
 for(const value of [null,[],42,'text',{bad:undefined},{bad:Infinity},
  {huge:'x'.repeat(4194305)}]) assert.equal(digestPersistedSnapshot(value),null);
});
test('digest is deterministic, hexadecimal, and does not expose content',()=>{
 const digest=digestPersistedSnapshot({secret:'private user data'});
 assert.match(digest,/^[a-f0-9]{64}$/);
 assert.equal(digest.includes('private'),false);
});

test('deeply nested snapshots fail closed without unbounded recursion',()=>{
 let value='leaf';
 for(let i=0;i<80;i++) value={next:value};
 assert.equal(digestPersistedSnapshot(value),null);
});
test('cyclic snapshots fail closed',()=>{
 const snapshot={version:1};
 snapshot.self=snapshot;
 assert.equal(digestPersistedSnapshot(snapshot),null);
});
test('repeated noncyclic references are serialized consistently',()=>{
 const shared={value:'ok'};
 assert.equal(digestPersistedSnapshot({a:shared,b:shared}),
  digestPersistedSnapshot({b:{value:'ok'},a:{value:'ok'}}));
});
