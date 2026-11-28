import {inks} from './intent.mjs';
import {area,flatten} from './contours.mjs';
export function reviewCandidate(document,intent,name){
 const marks=document.layers.filter(l=>l.type==='path'),text=document.layers.filter(l=>l.type==='text'),reasons=[];
 const colors=new Set(marks.filter(l=>area(flatten(l.commands))>=100).map(l=>l.fill.toLowerCase()));
 for(const key of intent.colors.slice(0,2))if(inks[key]&&!colors.has(inks[key].toLowerCase()))reasons.push('missing_requested_color');
 for(const key of intent.forbidden)if(inks[key]&&document.layers.some(l=>l.fill.toLowerCase()===inks[key].toLowerCase()))reasons.push('forbidden_color');
 if(intent.traits.layout.includes('icon')?text.length!==0:!text.some(l=>l.id==='brand-name'&&l.text===name))reasons.push('wordmark_mismatch');
 return {acceptable:reasons.length===0,reasons:[...new Set(reasons)]};
}
export function retryableGeometry(error){return error instanceof RangeError&&['path_budget','mark_bounds','mark_area','wordmark_bounds','svg_budget'].includes(error.message);}
