import test from 'node:test';import assert from 'node:assert/strict';import {rankCreative,attachCreativeRanking} from './graphic-v3/creative-ranking.mjs';
const v=(offset=.02,acceptable=true)=>({quality:{pixel:{coverage:.25,centerOffset:offset,edgeInk:0,width:96,height:96,acceptable,warnings:[]},contrast:[{onWhite:7,onBlack:3}],heuristics:{review:[]}}});
test('measured balance ranks better candidate without reordering gallery',()=>{const variants=[v(.4),v(.02)];const kit=attachCreativeRanking({variants});assert.equal(kit.creativeRanking.recommendedIndex,1);assert.equal(kit.variants,variants);});
test('ineligible and missing measurements never recommended',()=>{assert.equal(attachCreativeRanking({variants:[v(.01,false),{}]}).creativeRanking.recommendedIndex,null);});
test('ties stable and scores bounded',()=>{const r=rankCreative([v(),v()]);assert.deepEqual(r.map(x=>x.index),[0,1]);assert.ok(r.every(x=>x.score>=0&&x.score<=100));});
