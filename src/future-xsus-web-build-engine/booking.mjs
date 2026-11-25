import {randomUUID} from 'node:crypto';
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
function interval(start,end){if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end-start>31*86400000)throw new TypeError('Invalid interval')}
export function createBookingRuntime({resources,verifyIdentity,clock=Date.now}={}){
 if(!Array.isArray(resources)||!resources.length||resources.length>1000||typeof verifyIdentity!=='function'||typeof clock!=='function')throw new TypeError('Invalid configuration');
 const capacity=new Map(),records=new Map();
 for(const r of resources){if(!r||!id(r.id)||capacity.has(r.id)||!Number.isInteger(r.capacity)||r.capacity<1||r.capacity>10000)throw new TypeError('Invalid resource');capacity.set(r.id,r.capacity)}
 async function owner(token){const p=await verifyIdentity(token);if(!p||typeof p.id!=='string'||!p.id)throw new Error('Unauthorized');return p.id}
 function available(resource,start,end){interval(start,end);if(!capacity.has(resource))throw new Error('Unknown resource');const events=[[start,0],[end,0]];for(const r of records.values()){if(r.resource===resource&&r.status==='confirmed'&&r.start<end&&r.end>start){events.push([Math.max(start,r.start),r.quantity],[Math.min(end,r.end),-r.quantity])}}events.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let used=0,peak=0;for(const [,delta] of events){used+=delta;peak=Math.max(peak,used)}return capacity.get(resource)-peak}
 return Object.freeze({
 async availability(token,{resource,start,end}){await owner(token);return {remaining:available(resource,start,end)}},
 async reserve(token,{resource,start,end,quantity=1}){const user=await owner(token);interval(start,end);if(start<clock()||!Number.isInteger(quantity)||quantity<1||records.size>=10000)throw new TypeError('Invalid reservation');if(available(resource,start,end)<quantity)throw new Error('Insufficient capacity');const r={id:randomUUID(),owner:user,resource,start,end,quantity,status:'confirmed'};records.set(r.id,r);return {...r}},
 async list(token){const user=await owner(token);return [...records.values()].filter(r=>r.owner===user).map(r=>({...r}))},
 async cancel(token,id){const user=await owner(token),r=records.get(id);if(!r||r.owner!==user)throw new Error('Not found');if(r.status!=='confirmed'||r.start<=clock())throw new Error('Cannot cancel');r.status='cancelled';return {...r}}
 });
}
