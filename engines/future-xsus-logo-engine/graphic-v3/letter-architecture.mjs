export const letterArchitectures=['original','forward','reverse','taper','flare','facet','tech-wide','tech-cut'];
// Continuous, monotonic horizontal mapping per glyph; preserves contour topology.
export function letterPoint(x,y,size,mode='original'){
 if(!letterArchitectures.includes(mode)||!Number.isFinite(size)||size<=0)throw RangeError('invalid_letter_architecture');
 const h=Math.max(-1,Math.min(1,-y/size));
 switch(mode){
 case 'forward':return [x+h*size*.10,y];
 case 'reverse':return [x-h*size*.08,y];
 case 'taper':return [x*(1-.12*h),y];
 case 'flare':return [x*(1+.12*h),y];
 case 'tech-wide':return [x*(1+.10*Math.max(0,1-Math.abs(h-.5)*2)),y];
 case 'tech-cut':return [x+size*.075*Math.max(0,h-.25),y];
 case 'facet':return [x+size*.055*Math.max(0,h-.35),y];
 default:return [x,y];
 }
}
export function letterDirection(prompt,slot,explicitFont){
 if(explicitFont||! /futuristic|futuriste|futurist|custom typography|typographie personnalisée|tipografi të personalizuar/i.test(prompt))return 'original';
 if(/custom typography|typographie personnalisée|tipografi të personalizuar/i.test(prompt))return ['tech-wide','tech-cut','facet','taper','flare','forward'][slot%6];
 return letterArchitectures[1+slot%5];
}
