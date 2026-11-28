import test from 'node:test';import assert from 'node:assert/strict';import {designReview} from './graphic-v3/design-review.mjs';import {rankCreative} from './graphic-v3/creative-ranking.mjs';
const rect=(x,y,w)=>[['M',x,y],['L',x+w,y],['L',x+w,y+w],['L',x,y+w],['Z']];
const review=layers=>designReview({layers},{heuristics:{review:[]}},{smallScale:true,scaleStable:true});
test('final vector review detects isolated microscopic fragment',()=>{const r=review([{type:'path',commands:rect(0,0,100)},{type:'path',commands:rect(110,110,1)}]);assert.equal(r.microContours,1);assert.equal(r.recommended,false);});
test('adjacent color regions do not create false micro contour warnings',()=>{assert.equal(review([{type:'path',commands:rect(0,0,100)},{type:'path',commands:rect(100,0,100)}]).recommended,true);});
test('ranking does not recommend a failed final design review',()=>{const pixel={coverage:.2,centerOffset:0,edgeInk:0,width:64,height:64,acceptable:true};const r=rankCreative([{quality:{pixel,design:{recommended:false,warnings:['micro_contours']}}},{quality:{pixel}}]);assert.equal(r[0].index,1);assert.equal(r[1].eligible,false);});
