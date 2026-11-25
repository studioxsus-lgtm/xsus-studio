const valid=s=>typeof s==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(s);
export function createSecurityRuntime({verifyIdentity,policies,clock=Date.now,limit=60,windowMs=60000,maxSubjects=10000,auditLimit=1000}={}){
 if(typeof verifyIdentity!=='function'||typeof clock!=='function'||!Array.isArray(policies)||policies.length>500||![limit,windowMs,maxSubjects,auditLimit].every(n=>Number.isSafeInteger(n)&&n>0)||maxSubjects>100000||auditLimit>10000)throw TypeError('Invalid configuration');
 const rules=new Map(),buckets=new Map(),audit=[];
 for(const p of policies){if(!p||!valid(p.role)||!valid(p.action))throw TypeError('Invalid policy');if(!rules.has(p.role))rules.set(p.role,new Set());rules.get(p.role).add(p.action)}
 function log(subject,tenant,action,outcome,at){audit.push({subject,tenant,action,outcome,at});if(audit.length>auditLimit)audit.shift()}
 return Object.freeze({
 async authorize(token,{tenant,action}={}){
 if(!valid(tenant)||!valid(action))throw TypeError('Invalid request');
 const p=await verifyIdentity(token),now=clock();
 if(!p||!valid(p.id)||!valid(p.tenant)||!Array.isArray(p.roles)||!Number.isSafeInteger(p.expiresAt)||p.expiresAt<=now){log(null,tenant,action,'unauthorized',now);return {allowed:false,reason:'unauthorized'}}
 if(p.tenant!==tenant){log(p.id,tenant,action,'tenant_mismatch',now);return {allowed:false,reason:'forbidden'}}
 const key=JSON.stringify([tenant,p.id]);let b=buckets.get(key);
 if(!b||now>=b.end){if(!b&&buckets.size>=maxSubjects){for(const [k,v] of buckets)if(now>=v.end)buckets.delete(k);if(buckets.size>=maxSubjects){log(p.id,tenant,action,'capacity',now);return {allowed:false,reason:'rate_limited'}}}b={count:0,end:now+windowMs};buckets.set(key,b)}
 if(b.count>=limit){log(p.id,tenant,action,'rate_limited',now);return {allowed:false,reason:'rate_limited'}}b.count++;
 const allowed=p.roles.some(r=>rules.get(r)?.has(action));log(p.id,tenant,action,allowed?'allowed':'forbidden',now);return {allowed,reason:allowed?'allowed':'forbidden'}
 },
 async readAudit(token){const p=await verifyIdentity(token),now=clock();if(!p||!valid(p.id)||!valid(p.tenant)||!Number.isSafeInteger(p.expiresAt)||p.expiresAt<=now||!Array.isArray(p.roles)||!p.roles.some(r=>rules.get(r)?.has('audit.read')))throw Error('Forbidden');return audit.filter(e=>e.tenant===p.tenant).map(e=>({...e}))}
 });
}
