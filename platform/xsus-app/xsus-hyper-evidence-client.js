/**
 * XSUS App -> Hyper XSUS Core evidence verification transport.
 * Browser-only read operation through the authenticated Node backend.
 * Never sends service-role keys or evidence HMAC secrets.
 */
export async function verifyXsusHyperEvidence({
  observationId, accessToken, endpoint="/api/xsus-app/hyper/evidence/verify",
  fetchImpl=globalThis.fetch, signal
}={}) {
  if(typeof observationId!=="string" || !/^[A-Za-z0-9_-]{1,128}$/.test(observationId))
    throw new TypeError("Invalid observation ID.");
  if(typeof accessToken!=="string" || !/^[A-Za-z0-9_.-]{16,8192}$/.test(accessToken))
    throw new TypeError("A valid Supabase access token is required.");
  if(endpoint!=="/api/xsus-app/hyper/evidence/verify")
    throw new TypeError("Only the same-origin Hyper verification route is allowed.");
  if(typeof fetchImpl!=="function")throw new TypeError("A fetch implementation is required.");
  const response=await fetchImpl(endpoint,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${accessToken}`},
    body:JSON.stringify({action:"evidence.verify",observationId}),
    credentials:"omit",cache:"no-store",redirect:"error",signal
  });
  if(!response || typeof response.ok!=="boolean" || typeof response.json!=="function")
    throw new Error("Invalid Hyper backend response.");
  if(!response.ok) {
    if(response.status===503)throw new Error("Hyper verification is not enabled or unavailable.");
    if(response.status===401 || response.status===403)
      throw new Error("Hyper verification authorization failed.");
    throw new Error("Hyper verification request failed.");
  }
  const data=await response.json();
  if(!data || typeof data!=="object" || Array.isArray(data))
    throw new Error("Invalid Hyper verification response.");
  return data;
}
