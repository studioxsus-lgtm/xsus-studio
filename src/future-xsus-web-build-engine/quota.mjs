export function createQuotaManager({maxBytes=100000000,maxOwnerBytes=20000000,maxReservations=1000}={}){
 for(const n of [maxBytes,maxOwnerBytes,maxReservations])if(!Number.isSafeInteger(n)||n<1)throw TypeError('Invalid quota');
 if(maxOwnerBytes>maxBytes)throw TypeError('Invalid owner quota');
 const entries=new Map(),owners=new Map();let total=0;
 return Object.freeze({
 reserve(owner,id,bytes){if(typeof owner!=='string'||!owner||owner.length>200||typeof id!=='string'||!id||id.length>200||!Number.isSafeInteger(bytes)||bytes<1)throw TypeError('Invalid reservation');
 if(entries.has(id))throw Error('Duplicate reservation');
 const used=owners.get(owner)||0;
 if(entries.size>=maxReservations||bytes>maxBytes-total||bytes>maxOwnerBytes-used)throw Error('Quota exceeded');
 entries.set(id,{owner,bytes});owners.set(owner,used+bytes);total+=bytes;return {id,bytes}},
 release(owner,id){const r=entries.get(id);if(!r||r.owner!==owner)return false;entries.delete(id);total-=r.bytes;const remaining=owners.get(owner)-r.bytes;if(remaining)owners.set(owner,remaining);else owners.delete(owner);return true},
 usage(owner){return {bytes:owners.get(owner)||0,limit:maxOwnerBytes}},
 diagnostics(){return {bytes:total,limit:maxBytes,reservations:entries.size}}
 });
}
