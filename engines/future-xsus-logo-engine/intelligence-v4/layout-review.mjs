import {paths} from './edit.mjs';
export function layoutReview(d){
 const boxes=[],issues=[];
 for(const l of d.layers){
  let rings;try{rings=paths(l)}catch{issues.push({code:'unmeasured_bounds',layer:l.id});continue}
  let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
  for(const ring of rings)for(const [a,b] of ring){x=Math.min(x,a);y=Math.min(y,b);right=Math.max(right,a);bottom=Math.max(bottom,b)}
  if(!Number.isFinite(x))continue;
  boxes.push({id:l.id,x,y,right,bottom,type:l.type});
  if(x<-.5||y<-.5||right>d.width+.5||bottom>d.height+.5){
   issues.push({code:'outside',layer:l.id,dx:Math.max(0,-x)+Math.min(0,d.width-right),dy:Math.max(0,-y)+Math.min(0,d.height-bottom)});
  }
 }
 for(const [i,a] of boxes.entries())for(const b of boxes.slice(i+1)){
  if(a.type!=='text'&&b.type!=='text')continue;
  if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)issues.push({code:'overlap_bounds',layer:a.type==='text'?a.id:b.id,peer:a.type==='text'?b.id:a.id});
 }
 return {boxes,issues};
}
