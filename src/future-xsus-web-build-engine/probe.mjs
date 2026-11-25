import {createCoreTransport} from './core-transport.mjs';
import {verifyCoreCompatibility} from './compatibility.mjs';
import {readRuntimeConfig} from './bootstrap.mjs';
export async function probeConfiguredCores({env,fetchImpl=globalThis.fetch}={}){
 const config=readRuntimeConfig(env);
 for(const key of ['XSUS_FUTURE_TOKEN','XSUS_HYPER_TOKEN'])if(typeof env[key]!=='string'||!env[key].trim())throw TypeError('Missing '+key);
 const transport=createCoreTransport({...config,fetchImpl,getToken:async core=>core==='future'?env.XSUS_FUTURE_TOKEN:env.XSUS_HYPER_TOKEN});
 return verifyCoreCompatibility(transport);
}
