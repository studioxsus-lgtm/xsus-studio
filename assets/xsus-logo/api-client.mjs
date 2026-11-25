const endpoint='https://future-xsus-logo-engine.onrender.com/v1/public/generate';
export function createLogoClient({getSession,fetchImpl=fetch}={}){
 if(typeof getSession!=='function')throw new TypeError('Session provider required');
 return Object.freeze({async generate({prompt,language='en',signal}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||!['en','fr','sq'].includes(language))throw new TypeError('Invalid brand brief');
 const session=await getSession();
 if(!session?.access_token)throw new Error('authentication_required');
 const timeout=AbortSignal.timeout(45000);
 const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',credentials:'omit',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({prompt,language}),signal:signal?AbortSignal.any([signal,timeout]):timeout});
 if(!response.ok)throw new Error(({401:'authentication_required',429:'rate_limit',503:'generation_unavailable'})[response.status]??'generation_failed');
 const result=await response.json();
 if(result?.version!=='1.0.0'||typeof result.requestId!=='string'||!['generated','review_required'].includes(result.status))throw new Error('invalid_response');
 if(result.status==='generated'&&(!Array.isArray(result.kit?.variants)||!result.kit.variants.length||result.kit.variants.length>16||result.kit.variants.some(v=>!v.document||typeof v.svg!=='string')))throw new Error('invalid_response');
 return result;
 }});
}
