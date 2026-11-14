/**
 * Browser-side transport only. Never import Hyper XSUS Core or signing keys.
 * Caller must provide a short-lived authenticated access token.
 */
export async function fetchXsusHyperAssurance({
 token,endpoint="/api/xsus-app/hyper/assurance",fetchImpl=fetch
}={}){
 if(typeof token!=="string"||!token.trim())
  throw new TypeError("Authenticated access token required.");
 if(typeof endpoint!=="string"||!endpoint.startsWith("/")||endpoint.startsWith("//"))
  throw new TypeError("Use a same-origin API endpoint.");
 const response=await fetchImpl(endpoint,{
  method:"GET",
  headers:{Authorization:"Bearer "+token.trim()},
  credentials:"omit",
  cache:"no-store",
  redirect:"error"
 });
 if(!response.ok)throw new Error("Hyper XSUS verification is unavailable.");
 const data=await response.json();
 if(!data||data.adapterVersion!=="1.0.0"||data.coreVersion!=="8.0.0"||
  typeof data.safeToResume!=="boolean"||!Array.isArray(data.blockers))
  throw new Error("Invalid Hyper XSUS verification response.");
 return Object.freeze({
  status:data.status,
  safeToResume:data.safeToResume,
  consistent:data.consistent===true,
  rounds:data.rounds,
  blockers:Object.freeze([...data.blockers])
 });
}
