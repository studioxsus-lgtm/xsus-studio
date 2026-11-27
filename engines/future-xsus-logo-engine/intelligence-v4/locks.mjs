const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function assertLocks(before,after,memory){
 for(const l of before.layers){const next=after.layers.find(x=>x.id===l.id),lock=memory.locks?.[l.id]??[];
  if(lock.includes('layer')&&(!same(l,next)||before.layers.indexOf(l)!==after.layers.findIndex(x=>x.id===l.id)))throw Error('locked_layer');
  if(lock.includes('color')&&(!next||['fill','gradient','stroke'].some(k=>!same(l[k],next[k]))))throw Error('locked_color');
  if(lock.includes('type')&&(!next||['text','fontId','fontSize','fontWeight','trackingEm','outline','type'].some(k=>!same(l[k],next[k]))))throw Error('locked_type');
 }
}
