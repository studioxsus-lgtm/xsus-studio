// XSUS App only: per-request, RLS-enforced Supabase REST client.
// Never use a service_role/secret key here. Every DB request carries the
// caller's verified bearer token; no cross-request mutable auth state.
export function createSupabaseRestReviewClient({url,publishableKey,accessToken,fetchImpl=fetch}={}) {
 if(typeof url!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)||
    typeof publishableKey!=='string'||!publishableKey.startsWith('sb_publishable_')||
    typeof accessToken!=='string'||!/^[A-Za-z0-9._~+/-]+=*$/.test(accessToken)||
    accessToken.length<16||accessToken.length>8192||typeof fetchImpl!=='function')
  throw new TypeError('Trusted Supabase URL, publishable key, token and fetch required');
 const base=url.replace(/\/$/,'');
 const headers=()=>({apikey:publishableKey,authorization:'Bearer '+accessToken,accept:'application/json'});
 async function getUser(token) {
  if(token!==accessToken)return {data:{user:null},error:{message:'token_mismatch'}};
  try {
   const res=await fetchImpl(base+'/auth/v1/user',{headers:headers(),signal:AbortSignal.timeout(8000)});
   if(!res.ok)return {data:{user:null},error:{message:'auth_rejected'}};
   const user=await res.json();
   return {data:{user},error:null};
  } catch{return {data:{user:null},error:{message:'auth_unavailable'}};}
 }
 function from(table) {
  if(table!=='xsus_builder_projects')throw new TypeError('Unexpected table');
  const filters=new Map();let columns=null;
  const query={
   select(value){
    if(value!=='id,owner_id'&&value!=='id,owner_id,snapshot')throw new TypeError('Unexpected columns');
    columns=value;return query;
   },
   eq(key,value){
    if(key!=='id'&&key!=='owner_id')throw new TypeError('Unexpected filter');
    filters.set(key,value);return query;
   },
   async maybeSingle(){
    if(!columns||!filters.has('id')||!filters.has('owner_id'))
     return {data:null,error:{message:'unscoped_query'}};
    const params=new URLSearchParams({select:columns,id:'eq.'+filters.get('id'),owner_id:'eq.'+filters.get('owner_id')});
    try {
     const res=await fetchImpl(base+'/rest/v1/xsus_builder_projects?'+params.toString(),{
      headers:{...headers(),accept:'application/vnd.pgrst.object+json'},signal:AbortSignal.timeout(8000)});
     if(res.status===406)return {data:null,error:null};
     if(!res.ok)return {data:null,error:{message:'database_rejected'}};
     return {data:await res.json(),error:null};
    }catch{return {data:null,error:{message:'database_unavailable'}};}
   }
  };
  return query;
 }
 return Object.freeze({auth:Object.freeze({getUser}),from});
}
