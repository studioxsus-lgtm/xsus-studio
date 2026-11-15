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
  if(endpoint!=="/api/xsus-app/hyper/evidence/verify") {
    let url;
    try { url=new URL(endpoint); } catch { throw new TypeError("Invalid Hyper endpoint."); }
    const host=url.hostname.toLowerCase();
    const renderHost=host==="xsus-studio.onrender.com";
    if(url.protocol!=="https:" || !renderHost ||
       url.pathname!=="/api/xsus-app/hyper/evidence/verify" ||
       url.search || url.hash || url.username || url.password || url.port)
      throw new TypeError("Only HTTPS Render Hyper verification endpoints are allowed.");
  }
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
    if(response.status===404)throw new Error("Hyper evidence was not found.");
    if(response.status===429)throw new Error("Hyper verification rate limit reached.");
    if(response.status===401 || response.status===403)
      throw new Error("Hyper verification authorization failed.");
    throw new Error("Hyper verification request failed.");
  }
  const data=await response.json();
  if(!data || typeof data!=="object" || Array.isArray(data))
    throw new Error("Invalid Hyper verification response.");
  if(data.ok!==true || data.verified!==true)
    throw new Error("Hyper evidence verification was not confirmed.");
  // Never display a successful verification for a different observation.
  if(Object.hasOwn(data,"observationId") && data.observationId!==observationId)
    throw new Error("Hyper evidence verification ID mismatch.");
  return data;
}
