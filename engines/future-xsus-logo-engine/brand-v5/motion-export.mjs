import {validateTimeline,frameSVG,createTimeline,animationProfiles} from './animation.mjs';
import {renderEditor} from '../editor.mjs';
const profiles=Object.freeze({
 pulse:{scale:[1,1.12,1]},bounce:{y:[0,-.12,.025,0]},swing:{rotation:[-12,12,-6,0]},spin:{rotation:[-360,0]},breath:{scale:[.94,1.06,.94]},reveal:{opacity:[0,0,1],scale:[.85,.85,1]},drop:{y:[-.3,.04,0]},shake:{x:[0,-.03,.03,-.02,0]},orbit:{x:[0,.12,0,-.12,0],y:[-.12,0,.12,0,-.12]},settle:{scale:[.6,1.1,.97,1]},flash:{opacity:[1,.25,1,.25,1]},glide:{x:[-.2,0],y:[.1,0]},unfold:{rotation:[-45,0],scale:[.2,1]},drift:{x:[-.08,.08,-.08]},emerge:{opacity:[0,1],y:[.15,0],scale:[.8,1]},
 recoil:{x:[0,.09,-.025,0]},spiral:{rotation:[-180,0],scale:[.25,1]},float:{y:[0,-.06,0,.06,0]},vanish:{opacity:[1,0],scale:[1,.7]},pendulum:{rotation:[0,18,0,-18,0]},diagonal:{x:[-.2,0],y:[-.2,0]},overshoot:{x:[-.25,.04,0]},shrink:{scale:[1.6,1]},tilt:{rotation:[20,-8,0],opacity:[.4,1]},heartbeat:{scale:[1,1.15,1,1.08,1]},softLanding:{y:[-.18,.02,0],opacity:[.2,1]},sweep:{x:[.3,-.03,0],rotation:[15,0]},
 ascend:{y:[.3,.1,0],opacity:[0,.8,1]}, descend:{y:[-.25,-.1,0],scale:[1.2,1]}, elasticTurn:{rotation:[-70,15,-5,0]}, zigzag:{x:[-.2,.1,-.05,0],y:[.15,.05,-.05,0]}, focus:{scale:[1.8,.95,1],opacity:[0,1]}, retreat:{x:[0,.25],opacity:[1,0]}, riseSpin:{y:[.25,0],rotation:[180,0]}, orbitIn:{x:[.2,0,-.08,0],y:[0,-.15,0,0],scale:[.5,1]}, nod:{rotation:[0,8,-4,0]}, wave:{y:[0,-.05,.05,-.025,0],rotation:[0,5,-5,0]}, compress:{scale:[1,.7,1]}, flick:{rotation:[0,-25,0],x:[0,.05,0]}, approach:{scale:[.1,.4,1],opacity:[.2,.6,1]}, exitUp:{y:[0,-.3],opacity:[1,0]}, counterTurn:{rotation:[90,-15,0],scale:[.8,1]}, revealHold:{opacity:[0,1,1,1],scale:[.9,1,1,1]}
});
export const extendedProfiles=Object.freeze([...animationProfiles,...Object.keys(profiles)]);
export function extendedTimeline(doc,{profile='fade',duration=3}={}){
 if(animationProfiles.includes(profile))return createTimeline(doc,{profile,duration});
 renderEditor(doc);if(!Object.hasOwn(profiles,profile)||!Number.isFinite(duration)||duration<.1||duration>30)throw TypeError('Invalid profile');
 const tracks=doc.layers.flatMap(l=>Object.entries(profiles[profile]).map(([property,values])=>({layerId:l.id,property,keys:values.map((v,i)=>({time:duration*i/(values.length-1),value:v*(property==='x'?doc.width:property==='y'?doc.height:1),easing:'inOut'}))})));
 const timeline={version:'5.0.0',duration,tracks};validateTimeline(doc,timeline);return timeline;
}
export function playbackTime(duration,elapsed,{loop=false,reverse=false,pingPong=false,reducedMotion=false}={}){
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(elapsed)||elapsed<0)throw RangeError('Invalid playback time');
 if(reducedMotion)return duration;
 let t=elapsed;if(pingPong){t=loop?t%(2*duration):Math.min(t,2*duration);t=t>duration?2*duration-t:t;}else t=loop?t%duration:Math.min(t,duration);
 return reverse?duration-t:t;
}
export function animatedSVG(doc,timeline,{fps=12,loop=true,reducedMotion=false}={}){
 validateTimeline(doc,timeline);
 if(!Number.isInteger(fps)||fps<1||fps>30)throw RangeError('Invalid fps');
 if(reducedMotion)return frameSVG(doc,timeline,timeline.duration);
 const count=Math.ceil(timeline.duration*fps);if(count>120)throw RangeError('Animated SVG frame budget');
 let body='',bytes=0;
 for(let i=0;i<count;i++){
 const start=i/count,end=(i+1)/count;
 const svg=frameSVG(doc,timeline, timeline.duration*(count===1?1:i/(count-1))).replace(/\bid="art-/g,'id="f'+i+'-').replace(/url\(#art-/g,'url(#f'+i+'-');
 const values= i===0?'visible;hidden;hidden':i===count-1?'hidden;visible;visible':'hidden;visible;hidden;hidden';
 const times=i===0?'0;'+end+';1':i===count-1?'0;'+start+';1':'0;'+start+';'+end+';1';
 const animation=count===1?'':'<animate attributeName="visibility" calcMode="discrete" values="'+values+'" keyTimes="'+times+'" dur="'+timeline.duration+'s" repeatCount="'+(loop?'indefinite':'1')+'" fill="freeze"/>';
 body+='<g visibility="'+(i===0?'visible':'hidden')+'">'+svg+animation+'</g>';bytes+=svg.length;if(bytes>3000000)throw RangeError('Animated SVG size budget');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+doc.width+'" height="'+doc.height+'" viewBox="0 0 '+doc.width+' '+doc.height+'">'+body+'</svg>';
}
