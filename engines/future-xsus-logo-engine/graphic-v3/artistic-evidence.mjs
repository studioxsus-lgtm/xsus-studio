import {pixelQuality} from './pixel-quality.mjs';
export function artisticEvidence(svg,harmony){
 const scales=[32,64].map(size=>pixelQuality(svg,{size}));
 const smallScale=scales.every(p=>p.acceptable&&p.occupied>=4);
 const coverageDrift=Math.abs(scales[0].coverage-scales[1].coverage);
 return {scales,smallScale,coverageDrift,scaleStable:coverageDrift<=.08,harmony:Number.isFinite(harmony?.score)?Math.max(0,Math.min(1,harmony.score)):null,method:'geometric-and-raster-heuristics'};
}
