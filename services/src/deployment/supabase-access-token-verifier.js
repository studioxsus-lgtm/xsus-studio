// XSUS App only. Ask Supabase Auth to verify the bearer token; never decode JWT claims locally.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
export function createSupabaseAccessTokenVerifier(client) {
 if(typeof client?.auth?.getUser!=='function')
  throw new TypeError('Trusted Supabase Auth client required');
 return async function verifyAccessToken(accessToken) {
  if(typeof accessToken!=='string'||accessToken.length<16||accessToken.length>8192||
     /\s/.test(accessToken)) return null;
  try {
   const {data,error}=await client.auth.getUser(accessToken);
   const id=data?.user?.id;
   if(error||!isPersistedBuilderProjectId(id)) return null;
   return Object.freeze({sub:id});
  } catch {return null;}
 };
}
