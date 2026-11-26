import {Resolver} from 'node:dns/promises';
import {normalizeDomain} from './index.mjs';
export async function inspectMailPolicies(input,{resolver=new Resolver({timeout:2000,tries:2}),selectors=[]}={}){
 const domain=normalizeDomain(input);
 if(!Array.isArray(selectors)||selectors.length>10||selectors.some(s=>typeof s!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(s)))throw new TypeError('Invalid DKIM selector');
 async function lookup(name,pattern){
  try{const rows=await resolver.resolveTxt(name);const records=rows.map(r=>r.join('')).filter(r=>pattern.test(r));return {status:records.length===1?'present':records.length?'multiple':'missing',records};}
  catch(e){return {status:['ENODATA','ENOTFOUND'].includes(e.code)?'missing':'unknown',records:[]};}
 }
 const [spf,dmarc,...dkim]=await Promise.all([lookup(domain,/^v=spf1(?:\s|$)/i),lookup('_dmarc.'+domain,/^v=DMARC1(?:\s*;|$)/i),...selectors.map(s=>lookup(s+'._domainkey.'+domain,/^(?:v=DKIM1\s*;|\s*p=)/i))]);
 const policy=dmarc.records.length===1?dmarc.records[0].match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\s*(?:;|$)/i)?.[1]?.toLowerCase():null;
 return {domain,spf,dmarc:{...dmarc,policy:policy||null},dkim:selectors.map((selector,i)=>({selector,...dkim[i]})),scope:'record_presence_not_delivery_verification'};
}
