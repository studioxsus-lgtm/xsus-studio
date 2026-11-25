import {randomUUID} from 'node:crypto';
const channels=['email','sms','in_app'];
export function createNotificationRuntime({verifyIdentity,adapters={},clock=Date.now,maxAttempts=3}={}){
 if(typeof verifyIdentity!=='function'||typeof clock!=='function'||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>5)throw new TypeError('Invalid configuration');
 const preferences=new Map(),jobs=new Map();
 async function identity(token){const p=await verifyIdentity(token);if(!p||typeof p.id!=='string'||!p.id)throw Error('Unauthorized');return p}
 return Object.freeze({
 async setPreferences(token,enabled){const p=await identity(token);if(!Array.isArray(enabled)||enabled.some(c=>!channels.includes(c)))throw TypeError('Invalid channels');preferences.set(p.id,new Set(enabled));return [...preferences.get(p.id)]},
 async enqueue(token,{channel,message}){const p=await identity(token);if(!channels.includes(channel)||typeof message!=='string'||!message.trim()||message.length>2000||jobs.size>=10000)throw TypeError('Invalid notification');if(!preferences.get(p.id)?.has(channel))throw Error('Consent required');const j={id:randomUUID(),owner:p.id,channel,message,status:'queued',attempts:0,nextAt:clock()};jobs.set(j.id,j);return {...j}},
 async list(token){const p=await identity(token);return [...jobs.values()].filter(j=>j.owner===p.id).map(j=>({...j}))},
 async dispatch(token){const p=await identity(token);if(!Array.isArray(p.roles)||!p.roles.includes('notification_worker'))throw Error('Forbidden');const results=[];for(const j of jobs.values()){if(j.status!=='queued'||j.nextAt>clock())continue;if(!preferences.get(j.owner)?.has(j.channel)){j.status='cancelled';continue}const send=Object.hasOwn(adapters,j.channel)?adapters[j.channel]:null;if(typeof send!=='function')continue;j.status='sending';j.attempts++;try{await send({id:j.id,owner:j.owner,channel:j.channel,message:j.message});j.status='delivered'}catch{j.status=j.attempts>=maxAttempts?'failed':'queued';j.nextAt=clock()+1000*2**(j.attempts-1)}results.push({id:j.id,status:j.status});if(results.length>=100)break}return results}
 });
}
