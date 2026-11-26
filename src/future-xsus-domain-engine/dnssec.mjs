import {normalizeDomain} from './index.mjs';
export async function inspectDNSSEC(input,{fetcher=fetch}={}){
 const domain=normalizeDomain(input);
 const url=new URL('https://dns.google/resolve');
 url.searchParams.set('name',domain);url.searchParams.set('type','DS');url.searchParams.set('do','1');url.searchParams.set('cd','0');
 try{
 const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{accept:'application/dns-json'}});
 if(!response.ok)return {domain,status:'unknown',reason:'http_error'};
 const data=await response.json();
 if(data.Status!==0)return {domain,status:'unknown',reason:'dns_status_'+data.Status};
 const ds=(Array.isArray(data.Answer)?data.Answer:[]).filter(x=>x.type===43&&String(x.name).toLowerCase().replace(/\.$/,'')===domain);
 return {domain,status:ds.length?(data.AD===true?'authenticated_ds':'unverified_ds'):'no_ds_observed',records:ds.map(x=>x.data),source:'google_public_dns',scope:'resolver_reported_ds_not_full_chain_validation'};
 }catch{return {domain,status:'unknown',reason:'lookup_failed'};}
}
