import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {animatedVideo,videoOptions,videoArgs} from './brand-v5/video.mjs';import {extendedTimeline} from './brand-v5/motion-export.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]},t=extendedTimeline(doc,{duration:1});
test('video validates bounded options',()=>{assert.equal(videoOptions(doc,t,{fps:4,width:64}).count,4);assert.throws(()=>videoOptions(doc,t,{format:'avi'}));assert.throws(()=>videoOptions(doc,t,{width:9999}));});
test('video arguments use explicit codecs',()=>{assert.ok(videoArgs(videoOptions(doc,t),'/tmp/test').includes('libx264'));assert.ok(videoArgs(videoOptions(doc,t,{format:'webm'}),'/tmp/test').includes('libvpx-vp9'));});
const available=spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0;
for(const format of ['mp4','webm'])test('real video '+format,{skip:!available},async()=>{const v=await animatedVideo(doc,t,{format,width:64,fps:3});assert.equal(v.mime,'video/'+format);assert.ok(v.bytes.length>100);});
