import {normalizeDomain} from './index.mjs';
import {isIP} from 'node:net';
export function planWebsiteDNS(input,target,{ttl=300}={}){
 const domain=normalizeDomain(input);
 if(!Number.isInteger(ttl)||ttl<60||ttl>86400||!target||typeof target.value!=='string')throw new TypeError('Invalid configuration');
 let record;
 if(target.type==='A'||target.type==='AAAA'){
 if(isIP(target.value)!==(target.type==='A'?4:6))throw new TypeError('Invalid address');
 record={name:domain,type:target.type,value:target.value,ttl};
 }else if(target.type==='CNAME'){
 const value=normalizeDomain(target.value),name=normalizeDomain('www.'+domain);
 if(value===name)throw new TypeError('CNAME loop');
 record={name,type:'CNAME',value,ttl};
 }else throw new TypeError('Unsupported target');
 return {domain,operations:[{action:'upsert',record}],mode:'draft',requiresOwnership:true,requiresApproval:true,executed:false,warnings:['Check existing records and provider constraints before applying.']};
}
