import {randomUUID,createHash} from 'node:crypto';
import {normalizeDomain} from './index.mjs';
const operations=new Set(['register','transfer','renew']);
export function createRegistrarGateway(provider){
 if(!provider||typeof provider.id!=='string'||!provider.id||typeof provider.quote!=='function')throw new TypeError('Invalid registrar adapter');
 return Object.freeze({id:provider.id,async quote(input,operation,years=1){
 const domain=normalizeDomain(input);
 if(!operations.has(operation)||!Number.isInteger(years)||years<1||years>10)throw new TypeError('Invalid operation');
 const q=await provider.quote({domain,operation,years});
 if(!q||q.domain!==domain||q.operation!==operation||q.years!==years||!Number.isSafeInteger(q.amountMinor)||q.amountMinor<0||!/^[A-Z]{3}$/.test(q.currency)||typeof q.id!=='string'||!q.id||!Number.isFinite(q.expiresAt)||q.expiresAt<=Date.now())throw new Error('Invalid provider quote');
 return {providerId:provider.id,domain,operation,years,amountMinor:q.amountMinor,currency:q.currency,quoteId:q.id,expiresAt:q.expiresAt};
 }});
}
export function createOperationDraft(quote,accountId,now=Date.now()){
 if(typeof accountId!=='string'||!accountId.trim()||accountId.length>128||!quote||!operations.has(quote.operation)||!Number.isFinite(now)||!Number.isFinite(quote.expiresAt)||quote.expiresAt<=now||!Number.isSafeInteger(quote.amountMinor)||quote.amountMinor<0||!/^[A-Z]{3}$/.test(quote.currency)||!Number.isInteger(quote.years)||quote.years<1||quote.years>10||typeof quote.providerId!=='string'||!quote.providerId||typeof quote.quoteId!=='string'||!quote.quoteId)throw new TypeError('Invalid draft');
 const payload={accountId,domain:normalizeDomain(quote.domain),operation:quote.operation,years:quote.years,providerId:quote.providerId,quoteId:quote.quoteId,amountMinor:quote.amountMinor,currency:quote.currency,expiresAt:quote.expiresAt};
 const digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 return Object.freeze({...payload,id:randomUUID(),digest,status:'draft',requiresApproval:true,executed:false});
}
export function operationKey(accountId,requestId){
 if([accountId,requestId].some(v=>typeof v!=='string'||!v.trim()||v.length>128))throw new TypeError('Invalid key');
 return createHash('sha256').update(JSON.stringify([accountId,requestId])).digest('hex');
}
