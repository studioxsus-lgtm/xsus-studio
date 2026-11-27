import test from 'node:test';
import assert from 'node:assert/strict';
import {extendedProfiles,extendedTimeline,playbackTime,animatedSVG} from './brand-v5/motion-export.mjs';
import {validateTimeline,frameSVG} from './brand-v5/animation.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const profile of extendedProfiles)test('V5 extended profile '+profile,()=>{const t=extendedTimeline(doc,{profile});assert.ok(validateTimeline(doc,t));assert.ok(new Set([0,.75,1.5,2.25,3].map(x=>frameSVG(doc,t,x))).size>1);});
test('V5 playback loop reverse ping pong and reduced motion',()=>{assert.equal(playbackTime(3,4,{loop:true}),1);assert.equal(playbackTime(3,1,{reverse:true}),2);assert.equal(playbackTime(3,4,{pingPong:true}),2);assert.equal(playbackTime(3,7,{pingPong:true,loop:true}),1);assert.equal(playbackTime(3,0,{reducedMotion:true}),3);assert.throws(()=>playbackTime(3,-1));});
test('V5 animated SVG contains actual timed frames',()=>{const t=extendedTimeline(doc,{duration:1});const svg=animatedSVG(doc,t,{fps:4});assert.equal((svg.match(/<animate /g)||[]).length,4);assert.match(svg,/repeatCount="indefinite"/);assert.match(animatedSVG(doc,t,{fps:4,loop:false}),/repeatCount="1"/);assert.ok(!animatedSVG(doc,t,{reducedMotion:true}).includes('<animate '));});
test('V5 animated SVG enforces budgets',()=>{const t=extendedTimeline(doc,{duration:30});assert.throws(()=>animatedSVG(doc,t,{fps:30}));assert.throws(()=>animatedSVG(doc,t,{fps:0}));assert.throws(()=>extendedTimeline(doc,{profile:'constructor'}));});
