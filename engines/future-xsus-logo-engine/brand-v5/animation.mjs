import {renderEditor} from '../editor.mjs';
const props={x:[-8192,8192,0],y:[-8192,8192,0],rotation:[-3600,3600,0],scale:[.001,20,1],opacity:[0,1,1]};
const easings={linear:t=>t,in:t=>t*t,out:t=>1-(1-t)**2,inOut:t=>t<.5?2*t*t:1-2*(1-t)**2};
export function validateTimeline(doc,timeline){
 renderEditor(doc);
 if(!timeline||timeline.version!=='5.0.0'||!Number.isFinite(timeline.duration)||timeline.duration<.1||timeline.duration>30||!Array.isArray(timeline.tracks)||timeline.tracks.length>256)throw TypeError('Invalid timeline');
 const ids=new Set(doc.layers.map(l=>l.id)),seen=new Set();let count=0;
 for(const t of timeline.tracks){
 if(!ids.has(t.layerId)||!Object.hasOwn(props,t.property)||!Array.isArray(t.keys)||!t.keys.length||t.keys.length>120)throw TypeError('Invalid track');
 const key=t.layerId+':'+t.property;if(seen.has(key))throw TypeError('Duplicate track');seen.add(key);
 let prev=-1;for(const k of t.keys){const [min,max]=props[t.property];if(!Number.isFinite(k.time)||k.time<=prev||k.time<0||k.time>timeline.duration||!Number.isFinite(k.value)||k.value<min||k.value>max||!Object.hasOwn(easings,k.easing??'linear'))throw TypeError('Invalid keyframe');prev=k.time;if(++count>4096)throw RangeError('Keyframe budget');}
 }return true;
}
function sample(keys,time){if(time<=keys[0].time)return keys[0].value;for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(time<=b.time){const t=easings[b.easing??'linear']((time-a.time)/(b.time-a.time));return a.value+(b.value-a.value)*t;}}return keys.at(-1).value;}
export function animationFrame(doc,timeline,time){
 validateTimeline(doc,timeline);if(!Number.isFinite(time)||time<0||time>timeline.duration)throw RangeError('Invalid time');
 const out=structuredClone(doc);out.graphic={...out.graphic,version:'3.0.0'};
 const values=new Map();for(const t of timeline.tracks){if(!values.has(t.layerId))values.set(t.layerId,{});values.get(t.layerId)[t.property]=sample(t.keys,time);}
 for(const l of out.layers){const v=values.get(l.id);if(!v)continue;const angle=(v.rotation??0)*Math.PI/180,s=v.scale??1,c=Math.cos(angle)*s,d=Math.sin(angle)*s;
 const [a,b,e,f,x,y]=l.matrix??[1,0,0,1,0,0],cx=doc.width/2,cy=doc.height/2,tx=cx-c*cx+d*cy+(v.x??0),ty=cy-d*cx-c*cy+(v.y??0);
 l.matrix=[c*a-d*b,d*a+c*b,c*e-d*f,d*e+c*f,c*x-d*y+tx,d*x+c*y+ty];if(v.opacity!==undefined)l.opacity=(l.opacity??1)*v.opacity;
 }renderEditor(out);return out;
}
export const animationProfiles=Object.freeze(['fade','slide-up','slide-left','zoom','rotate','assemble','stagger']);
export function createTimeline(doc,{profile='fade',duration=3}={}){
 renderEditor(doc);if(!animationProfiles.includes(profile)||!Number.isFinite(duration)||duration<.1||duration>30)throw TypeError('Invalid animation profile');
 const tracks=[];for(const [i,l] of doc.layers.entries()){
 const start=profile==='stagger'?duration*.5*i/Math.max(1,doc.layers.length):0;
 const add=(property,value,end)=>tracks.push({layerId:l.id,property,keys:[{time:0,value},...(start>0?[{time:start,value}]:[]),{time:duration,value:end,easing:'out'}]});
 if(['fade','stagger','assemble'].includes(profile))add('opacity',0,1);
 if(profile==='slide-up')add('y',doc.height*.2,0);
 if(profile==='slide-left')add('x',doc.width*.2,0);
 if(profile==='zoom')add('scale',.2,1);
 if(profile==='rotate')add('rotation',-90,0);
 if(profile==='assemble'){add('x',(i%2?1:-1)*doc.width*.2,0);add('scale',.6,1);}
 }const timeline={version:'5.0.0',duration,tracks};validateTimeline(doc,timeline);return timeline;
}
export function frameSVG(doc,timeline,time){return renderEditor(animationFrame(doc,timeline,time));}
export function* frameSequence(doc,timeline,fps=24){validateTimeline(doc,timeline);if(!Number.isInteger(fps)||fps<1||fps>60||Math.ceil(timeline.duration*fps)>600)throw RangeError('Frame budget');const n=Math.ceil(timeline.duration*fps);for(let i=0;i<=n;i++){const time=Math.min(i/fps,timeline.duration);yield {index:i,time,svg:frameSVG(doc,timeline,time)};}}
