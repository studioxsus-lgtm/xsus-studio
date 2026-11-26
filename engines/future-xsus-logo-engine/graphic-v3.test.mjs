import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {styles,treatments} from './graphic-v3/style.mjs';
import {layouts} from './graphic-v3/composition.mjs';
import {faces,catalog} from './graphic-v3/font-files.mjs';
import {enhance,graphicOptions} from './graphic-v3/professional.mjs';
import {typeset} from './graphic-v3/typography.mjs';
import {renderGraphic} from './graphic-v3/scene.mjs';
import {convert,analysis,palette} from './graphic-v3/color.mjs';
import {arcCubics,editNode,splitBezier} from './graphic-v3/curves.mjs';
import {booleanPaths,operations} from './graphic-v3/boolean.mjs';
import {composeCreative} from './creative-v2/compose.mjs';
import {area} from './creative-v2/contours.mjs';
import {createOrchestrator} from './orchestrator.mjs';
const prompt='Create a logo for "AXION" with letter A and a network.';
const creative={version:'2.0.0',count:3,seed:38};
const {kit}=await composeCreative({prompt,creative,language:'en',brief:{name:'AXION'},strategy:{approved:true}});
const one={...kit,variants:kit.variants.slice(0,1)},hashes=new Set();
for(const style of Object.keys(styles))for(const treatment of treatments)test(style+' / '+treatment,()=>{
 const v=enhance(one,{styles:[style],treatment}).variants[0];
 const signature=JSON.stringify(v.document.layers);assert.ok(!hashes.has(signature));hashes.add(signature);assert.equal(v.svg,renderGraphic(v.document));
});
for(const meta of catalog)test('licensed multilingual outlines '+meta.family,()=>{
 const root=new URL('./node_modules/@fontsource/'+meta.id+'/',import.meta.url);
 assert.match(readFileSync(new URL('LICENSE',root),'utf8'),/SIL OPEN FONT LICENSE/i);
 const bytes=readFileSync(new URL('files/'+meta.id+'-latin-400-normal.woff',root));assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);
 const layer=typeset({text:'Été Æ Œ Ÿ Ç Ë ë ç',fontSize:24,x:100,y:70},faces(meta.id));assert.ok(layer.outline.length>12);
});
for(const layout of layouts)test('layout '+layout,()=>{
 for(const [width,height] of [[512,512],[1600,900],[900,1600],[800,600],[900,600],[1000,500],[830,630]]){
 const v=enhance(one,{layout,width,height,slogan:'Design for tomorrow',finish:'radial'}).variants[0];
 assert.equal(v.document.width,width);assert.equal(v.document.layers.some(l=>l.type==='text'),layout!=='symbol');assert.ok(v.svg.includes('radialGradient')||layout==='text');
 }
});
test('safe documents and finite gradients',()=>{
 const d=enhance(one,{finish:'metallic'}).variants[0].document;
 d.layers[0].gradient.stops[1].color='url(https://example.org)';assert.throws(()=>renderGraphic(d));assert.throws(()=>graphicOptions({unknown:'x'}));
});
test('three-core contract gates enhancement',async()=>{
 const orch=createOrchestrator({interpret:async r=>({...r,brief:{name:'AXION'}}),plan:async r=>({...r,approved:true,review_required:false})});
 const r=await orch.generate({prompt,creative,graphic:{styles:['luxury','minimalist'],width:800,height:400},language:'en',requestId:'check-v3'});
 assert.equal(r.kit.version,'3.0.0');assert.equal(r.kit.variants[0].document.graphic.layout,'central');
});
test('Boolean topology and partition area',()=>{
 const a=[[[0,0],[10,0],[10,10],[0,10]]],b=[[[5,0],[15,0],[15,10],[5,10]]];
 for(const op of operations)assert.ok(booleanPaths(op,a,b).length>0);
 assert.equal(area(booleanPaths('xor',a,b)[0]),100);assert.equal(booleanPaths('divide',a,b).reduce((n,p)=>n+area(p),0),150);
 assert.ok(area(booleanPaths('inset',a)[0])<100);
});
test('Bezier split continuity, smooth handles and elliptical arc endpoint',()=>{
 const halves=splitBezier([[0,0],[6,8],[10,0]]);assert.deepEqual(halves[0].at(-1),halves[1][0]);
 assert.deepEqual(arcCubics([0,0],[12,10,45,0,1,20,10]).at(-1).slice(-2),[20,10]);
 const path=[['M',0,0],['L',5,3],['L',9,5]];assert.equal(editNode(path,1,'smooth')[1][0],'C');assert.equal(editNode(path,1,'split').length,4);
});
test('color spaces and harmony',()=>{assert.equal(convert('hsv',[0,1,1]),'#ff0000');assert.equal(convert('cmyk',[0,1,1,0]),'#ff0000');assert.ok(Math.abs(analysis('#ffffff').oklab[0]-1)<.001);assert.equal(palette(280,'triadic').length,3)});
test('path typography follows a supplied baseline with width adjustment',()=>{
 const l={fontSize:20,x:60,y:80,text:'Élan'},fonts=faces('alegreya');
 const a=typeset(l,fonts,{along:[[0,5],[30,10],[90,40]],stretch:.76}),b=typeset(l,fonts,{stretch:.76});
 assert.notDeepEqual(a.outline,b.outline);assert.equal(a.along.length,3);
});
test('inner stroke is a local mask and malformed sources cannot introduce SVG content',()=>{
 const d=enhance(one,{styles:['outline']}).variants[0].document;d.layers[0].strokeAlignment='inner';
 assert.match(renderGraphic(d),/<mask/);d.layers[0].gradient={kind:'linear',stops:[{at:0,color:'red"/><script>'},{at:1,color:'#ffffff'}]};
 assert.throws(()=>renderGraphic(d));
});
test('style inference, negative instructions and explicit overrides',()=>{
 assert.deepEqual(enhance(one,{},'Une marque élégante et luxe').variants[0].document.graphic.styles,['elegant','luxury']);
 assert.deepEqual(enhance(one,{},'logo luksoz pa gradient').variants[0].document.graphic.styles,['luxury']);
 assert.deepEqual(enhance(one,{styles:['bauhaus']},'luxury').variants[0].document.graphic.styles,['bauhaus']);
});
test('V3 composition quality reports actual final artboard and contrast',()=>{
 const v=enhance(one,{width:720,height:480}).variants[0];assert.ok(v.quality.bounds.every(b=>b.xmin>=0&&b.xmax<=720));assert.ok(v.quality.contrast[0].onWhite>=1);
});
