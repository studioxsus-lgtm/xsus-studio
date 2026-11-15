/**
 * XSUS App -> XSUS AI Core HTTP adapter (browser transport only).
 * Never imports either Core into the browser and never forwards conversationId
 * to the unauthenticated endpoint.
 */
const LANGUAGES = new Set(["sq","en","fr","de","es","it","pt","nl","ar","zh","ja","ko","ru"]);
export async function requestXsusAI({prompt,language="en",endpoint="/api/chat",fetchImpl=globalThis.fetch,signal}={}) {
  if(typeof prompt!=="string" || !prompt.trim() || prompt.length>8000)
    throw new TypeError("A nonempty prompt of at most 8000 characters is required.");
  if(!LANGUAGES.has(language))throw new TypeError("Unsupported language.");
  if(typeof endpoint!=="string" || !endpoint.startsWith("/") || endpoint.startsWith("//") ||
     !/^\/api\/chat$/.test(endpoint))
    throw new TypeError("Only the same-origin XSUS AI API endpoint is allowed.");
  if(typeof fetchImpl!=="function")throw new TypeError("A fetch implementation is required.");
  const response=await fetchImpl(endpoint,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({query:prompt.trim(),language}),
    credentials:"omit",cache:"no-store",redirect:"error",signal
  });
  if(!response || !response.ok)throw new Error("XSUS AI backend unavailable.");
  const data=await response.json();
  if(!data || typeof data!=="object" || typeof data.answer!=="string" ||
     typeof data.version!=="string")
    throw new Error("Invalid XSUS AI response.");
  return Object.freeze({answer:data.answer,version:data.version,language:data.language,source:data.source});
}
