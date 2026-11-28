import test from 'node:test';import assert from 'node:assert/strict';import {geometricHarmony,preferHarmoniousFusion} from './creative-v2/geometric-harmony.mjs';import {regular} from './creative-v2/contours.mjs';
test('symmetric balanced geometry scores highly',()=>{const p=[regular(6,100)];const q=geometricHarmony(p);assert.ok(q.acceptable);assert.ok(q.score>.85);});
test('extreme aspect ratio rejected',()=>{assert.equal(geometricHarmony([[[0,0],[200,0],[200,10],[0,10]]]).acceptable,false);});
test('fusion introducing tiny fragments rejected',()=>{const p=[regular(6,100)],f=[...p,regular(3,2,110,0),regular(3,2,-110,0),regular(3,2,0,110)];assert.equal(preferHarmoniousFusion(p,f),false);assert.equal(preferHarmoniousFusion(p,p),true);});
