// Server-owned configuration. Endpoints must be provisioned by the operator.
export function createCoreTransport({endpoint,token,timeoutMs=20000,fetchImpl=globalThis.fetch}={}) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search) throw Error("Invalid core endpoint");
  if (typeof token !== "string" || token.length < 32 || /[\s\x00-\x1f]/.test(token)) throw Error("Invalid service credential");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) throw Error("Invalid timeout");
  return async function transport(payload) {
    const body=JSON.stringify(payload);
    if (typeof body !== "string" || Buffer.byteLength(body)>262144) throw Error("Invalid core request size");
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetchImpl(url.href,{method:"POST",redirect:"error",headers:{"Content-Type":"application/json","Accept":"application/json","Authorization":"Bearer "+token},body,signal:controller.signal});
      if (!response.ok) { await response.body?.cancel(); throw Error("Core service rejected request: "+response.status); }
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type")??"")) { await response.body?.cancel(); throw Error("Invalid core response type"); }
      if (!response.body) throw Error("Missing core response");
      const reader=response.body.getReader();
      const chunks=[];let size=0;
      try {
        while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw Error("Core response too large");}chunks.push(Buffer.from(value));}
      } finally {reader.releaseLock();}
      const result=JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!result || typeof result!=="object" || Array.isArray(result)) throw Error("Invalid core response");
      return result;
    } finally {clearTimeout(timer);}
  };
}
