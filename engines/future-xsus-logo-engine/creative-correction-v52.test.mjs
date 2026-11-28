import test from 'node:test';import assert from 'node:assert/strict';import {reviewCandidate,retryableGeometry} from './creative-v2/candidate-review.mjs';import {layer,regular} from './creative-v2/contours.mjs';
const intent={colors:['violet','deepBlue'],forbidden:[],traits:{layout:[]}};
const doc={layers:[layer('mark',[regular(6,80)],'#743cd3'),{id:'brand-name',type:'text',text:'AXION',fill:'#743cd3'}]};
test('missing requested accent rejected',()=>{assert.deepEqual(reviewCandidate(doc,intent,'AXION').reasons,['missing_requested_color']);});
test('both real vector colors accepted',()=>{const d={layers:[...doc.layers,layer('accent',[regular(3,30)],'#142857')]};assert.equal(reviewCandidate(d,intent,'AXION').acceptable,true);assert.equal(reviewCandidate(d,{...intent,forbidden:['deepBlue']},'AXION').acceptable,false);});
test('wordmark and icon constraints checked',()=>{assert.ok(reviewCandidate(doc,{...intent,colors:[]},'OTHER').reasons.includes('wordmark_mismatch'));assert.ok(reviewCandidate(doc,{...intent,colors:[],traits:{layout:['icon']}},'AXION').reasons.includes('wordmark_mismatch'));});
test('only known geometry failures retry',()=>{assert.equal(retryableGeometry(new RangeError('mark_bounds')),true);assert.equal(retryableGeometry(new Error('mark_bounds')),false);assert.equal(retryableGeometry(new RangeError('unknown')),false);});
