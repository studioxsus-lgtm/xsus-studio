import test from 'node:test';import assert from 'node:assert/strict';import {precisionVector} from './creative-v2/precision-vector.mjs';import {symmetryRefinement} from './creative-v2/symmetry-refinement.mjs';import {combine,area,similarity,transform} from './creative-v2/contours.mjs';
const square=[[0,0],[100,0],[100,100],[0,100]];
test('micro hole is removed while meaningful hole remains',()=>{const p=combine([square],[[[20,20],[21,20],[21,21],[20,21]],[[40,40],[60,40],[60,60],[40,60]]],'cut');const r=precisionVector(p);assert.equal(r.length,2);assert.ok(similarity(p,r)>.988);});
test('precision preserves meaningful separated components',()=>{const p=[square,[[120,0],[150,0],[150,30],[120,30]]];assert.equal(precisionVector(p).length,2);});
test('near symmetric outline becomes symmetric without large change',()=>{const p=[[[0,0],[100,0],[100,100],[1,100]]],r=symmetryRefinement(p);assert.ok(similarity(p,r)>.965);assert.ok(similarity(r,transform(r,(x,y)=>[100-x,y]))>.999);});
test('asymmetric design is preserved',()=>{const p=[[[0,0],[100,0],[0,100]]];assert.deepEqual(symmetryRefinement(p),p);});
