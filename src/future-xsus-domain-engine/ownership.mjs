import {randomBytes,timingSafeEqual} from 'node:crypto';
import {Resolver} from 'node:dns/promises';
import {normalizeDomain} from './index.mjs';
export function createOwnershipChallenge(input,accountId,now=Date.now()){
 const domain=normalizeDomain(input);
 if(typeof accountId!=='string'||!accountId.trim()||accountId.length>128||!Number.isFinite(now))throw new TypeError('Invalid challenge context');
 return {domain,accountId,recordName:'_xsus-verification.'+domain,token:'xsus-verification='+randomBytes(32).toString('hex'),expiresAt:now+900000};
}
export async function verifyOwnership(challenge,{accountId,domain,now=Date.now(),resolver=new Resolver({timeout:2000,tries:2})}={}){
 const name=normalizeDomain(domain);
 if(!challenge||typeof accountId!=='string'||!accountId||challenge.accountId!==accountId||challenge.domain!==name||!Number.isFinite(now)||!Number.isFinite(challenge.expiresAt)||now>=challenge.expiresAt||!/^xsus-verification=[a-f0-9]{64}$/.test(challenge.token))return {status:'rejected'};
 try{
 const rows=await resolver.resolveTxt('_xsus-verification.'+name);
 const expected=Buffer.from(challenge.token);
 const match=rows.some(row=>{const actual=Buffer.from(row.join(''));return actual.length===expected.length&&timingSafeEqual(actual,expected);});
 return {status:match?'verified':'not_verified',domain:name,scope:'dns_control_at_check_time'};
 }catch(e){return {status:['ENODATA','ENOTFOUND'].includes(e.code)?'not_verified':'unknown',domain:name};}
}
