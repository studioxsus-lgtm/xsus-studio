const identifier=/^[a-z][a-z0-9_]{0,62}$/;
function valid(v){return typeof v==='string'&&identifier.test(v)&&!['constructor','prototype'].includes(v)}
export function defineWorkflow({states,initial,transitions}={}){
 if(!Array.isArray(states)||!states.length||states.length>50||states.some(s=>!valid(s))||new Set(states).size!==states.length||!states.includes(initial)||!Array.isArray(transitions)||transitions.length>200)throw new TypeError('Invalid workflow');
 const seen=new Set();
 const rules=transitions.map(t=>{
 if(!t||!states.includes(t.from)||!states.includes(t.to)||!valid(t.action)||!Array.isArray(t.roles)||!t.roles.length||t.roles.length>30||t.roles.some(r=>!valid(r)))throw new TypeError('Invalid transition');
 const k=t.from+':'+t.action;if(seen.has(k))throw new TypeError('Ambiguous transition');seen.add(k);
 return Object.freeze({from:t.from,to:t.to,action:t.action,roles:Object.freeze([...new Set(t.roles)])});
 });
 return Object.freeze({states:Object.freeze([...states]),initial,transitions:Object.freeze(rules)});
}
export function createWorkflowRuntime(definition,{verifyIdentity}={}){
 const workflow=defineWorkflow(definition);
 if(typeof verifyIdentity!=='function')throw new TypeError('Identity verifier required');
 const records=new Map();
 async function identity(token){const p=await verifyIdentity(token);if(!p||typeof p.id!=='string'||!p.id||!Array.isArray(p.roles)||p.roles.some(r=>!valid(r)))throw new Error('Unauthorized');return p}
 return Object.freeze({
 async create(token,id){const p=await identity(token);if(!valid(id)||records.has(id)||records.size>=10000)throw new Error('Invalid record');const r={id,owner:p.id,state:workflow.initial,revision:0};records.set(id,r);return {...r}},
 async get(token,id){const p=await identity(token),r=records.get(id);if(!r||r.owner!==p.id)throw new Error('Not found');return {...r}},
 async transition(token,id,action,expected){const p=await identity(token),r=records.get(id);if(!r||r.owner!==p.id)throw new Error('Not found');if(r.revision!==expected)throw new Error('Revision conflict');const rule=workflow.transitions.find(t=>t.from===r.state&&t.action===action);if(!rule)throw new Error('Invalid transition');if(!rule.roles.some(role=>p.roles.includes(role)))throw new Error('Forbidden');const next={...r,state:rule.to,revision:r.revision+1};records.set(id,next);return {...next}}
 });
}
