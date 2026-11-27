import test from 'node:test';import assert from 'node:assert/strict';import {pixelQuality} from './graphic-v3/pixel-quality.mjs';
const svg=body=>'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'+body+'</svg>';
test('centered mark measures actual alpha coverage',()=>{const q=pixelQuality(svg('<rect x="25" y="25" width="50" height="50" fill="#123456"/>'));assert.ok(Math.abs(q.coverage-.25)<.02);assert.ok(q.centerOffset<.01);assert.equal(q.acceptable,true);});
test('empty mark is rejected by metric',()=>{assert.equal(pixelQuality(svg('')).acceptable,false);});
test('edge and imbalance warnings are measurable',()=>{const q=pixelQuality(svg('<rect width="20" height="20"/>'));assert.ok(q.warnings.includes('edge_contact'));assert.ok(q.warnings.includes('off_center_ink'));});
