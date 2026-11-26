import {isIP} from 'node:net';
import {lookup} from 'node:dns/promises';
import {normalizeDomain} from './index.mjs';
export function isPublicIPv4(ip){
 if(isIP(ip)!==4)return false;
 const [a,b,c]=ip.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export async function resolvePublicTarget(input,{resolve=lookup}={}){
 const domain=normalizeDomain(input);
 const rows=await resolve(domain,{all:true,verbatim:true});
 if(!Array.isArray(rows)||!rows.length||rows.length>64||rows.some(r=>r.family===4&&!isPublicIPv4(r.address)||![4,6].includes(r.family)||isIP(r.address)!==r.family))throw new Error('Unsafe or invalid DNS target');
 const ipv4=rows.filter(r=>r.family===4);
 if(!ipv4.length)throw new Error('IPv4 public target required');
 return {domain,address:ipv4[0].address,family:4};
}
