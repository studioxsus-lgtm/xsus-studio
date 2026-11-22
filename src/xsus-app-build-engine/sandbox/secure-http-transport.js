export const SECURE_HTTP_TRANSPORT_VERSION="0.1.0";
const MAX_RESPONSE_BYTES=65536;
export function createSecureHttpTransport({fetchImpl,getAccessToken,allowedOrigin,timeoutMs=30000}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("Server-side fetch implementation required");
  if(typeof getAccessToken!=="function")throw new TypeError("Server-side token provider required");
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw new RangeError("Invalid transport timeout");
  let origin;
  try{origin=new URL(allowedOrigin);}catch{throw new TypeError("Pinned HTTPS origin required");}
  if(origin.protocol!=="https:"||origin.pathname!=="/"||origin.search||origin.hash||origin.username||origin.password)throw new TypeError("Pinned HTTPS origin required");
  return async function transport({endpoint,method,body,signal}={}){
    let url;
    try{url=new URL(endpoint);}catch{throw new TypeError("Invalid sandbox endpoint");}
    if(url.protocol!=="https:"||url.origin!==origin.origin||url.username||url.password||url.hash)throw new TypeError("Sandbox endpoint origin mismatch");
    if(method!=="POST"||!body||typeof body!=="object")throw new TypeError("Invalid sandbox request");
    if(signal?.aborted)throw new Error("Sandbox request cancelled");
    const token=await getAccessToken();
    if(typeof token!=="string"||token.length<16||token.length>8192||/[\r\n]/.test(token))throw new TypeError("Invalid sandbox credential");
    if(signal?.aborted)throw new Error("Sandbox request cancelled");
    const controller=new AbortController();
    const abort=()=>controller.abort();
    signal?.addEventListener?.("abort",abort,{once:true});
    const timer=setTimeout(abort,timeoutMs);
    try{
      const response=await fetchImpl(url.href,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",headers:{"content-type":"application/json","accept":"application/json","authorization":`Bearer ${token}`},body:JSON.stringify(body),signal:controller.signal});
      if(controller.signal.aborted)throw new Error("Sandbox transport timed out or cancelled");
      if(!response||response.ok!==true||typeof response.status!=="number"||response.status<200||response.status>=300)throw new Error("Sandbox transport request failed");
      const type=response.headers?.get?.("content-type")??"";
      if(!/^application\/json(?:\s*;|\s*$)/i.test(type))throw new TypeError("Invalid sandbox response content type");
      const length=response.headers?.get?.("content-length");
      if(length!==null&&length!==undefined&&(!/^\d+$/.test(length)||Number(length)>MAX_RESPONSE_BYTES))throw new RangeError("Sandbox response exceeds size limit");
      if(!response.body||typeof response.body.getReader!=="function")throw new TypeError("Streaming response body required");
      const reader=response.body.getReader();
      const decoder=new TextDecoder("utf-8",{fatal:true});
      let bytes=0,content="";
      try{
        while(true){
          if(controller.signal.aborted)throw new Error("Sandbox transport timed out or cancelled");
          const {done,value}=await reader.read();
          if(done)break;
          if(!(value instanceof Uint8Array))throw new TypeError("Invalid sandbox response chunk");
          bytes+=value.byteLength;
          if(bytes>MAX_RESPONSE_BYTES)throw new RangeError("Sandbox response exceeds size limit");
          content+=decoder.decode(value,{stream:true});
        }
        content+=decoder.decode();
      }finally{reader.releaseLock();}
      if(controller.signal.aborted)throw new Error("Sandbox transport timed out or cancelled");
      let result;
      try{result=JSON.parse(content);}catch{throw new TypeError("Invalid sandbox JSON response");}
      if(!result||typeof result!=="object"||Array.isArray(result))throw new TypeError("Invalid sandbox JSON response");
      return result;
    }finally{
      clearTimeout(timer);
      signal?.removeEventListener?.("abort",abort);
    }
  };
}
