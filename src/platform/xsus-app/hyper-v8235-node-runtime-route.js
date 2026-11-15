/**
 * Hyper v8.2.35 — hardened Node HTTP runtime boundary for XSUS App.
 * Deliberately not mounted; production activation requires independent gates.
 */
import { StringDecoder } from "node:string_decoder";
export const HYPER_NODE_RUNTIME_VERSION = "8.2.35";
const MAX_BYTES = 2048;
const PATH = "/api/xsus-app/hyper/evidence/verify";
const respond = (res,status,body) => {
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  });
  res.end(JSON.stringify(body));
};
export function createHyperNodeRuntimeRoute({composition,enabled=false}={}) {
  if (!composition || typeof composition.handle !== "function")
    throw new TypeError("Hyper Node route requires a backend composition.");
  return Object.freeze({
    version:HYPER_NODE_RUNTIME_VERSION,
    path:PATH,
    productionEligible:false,
    async handle(req,res) {
      if (enabled !== true) {
        respond(res,503,{ok:false,code:"RUNTIME_DISABLED"});
        return;
      }
      if (req.method !== "POST") {
        respond(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"});
        return;
      }
      const declared = req.headers?.["content-length"];
      if (declared !== undefined &&
          (typeof declared !== "string" || !/^(0|[1-9][0-9]*)$/.test(declared))) {
        respond(res,400,{ok:false,code:"INVALID_CONTENT_LENGTH"});
        return;
      }
      if (declared !== undefined && Number(declared)>MAX_BYTES) {
        respond(res,413,{ok:false,code:"INVALID_BODY_SIZE"});
        return;
      }
      let rawBody="";
      let bytes=0;
      const decoder=new StringDecoder("utf8");
      try {
        for await (const chunk of req) {
          if (!Buffer.isBuffer(chunk) && typeof chunk!=="string")
            throw Error("invalid chunk");
          const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          bytes+=buffer.length;
          if (bytes>MAX_BYTES) {
            respond(res,413,{ok:false,code:"INVALID_BODY_SIZE"});
            return;
          }
          rawBody+=decoder.write(buffer);
        }
        rawBody+=decoder.end();
      } catch {
        respond(res,400,{ok:false,code:"BODY_READ_FAILED"});
        return;
      }
      if (declared !== undefined && bytes!==Number(declared)) {
        respond(res,400,{ok:false,code:"CONTENT_LENGTH_MISMATCH"});
        return;
      }
      try {
        const result=await composition.handle({
          method:req.method,headers:req.headers,rawBody
        });
        if (!Number.isInteger(result?.status) || result.status<200 ||
            result.status>599 || !result.body || typeof result.body!=="object" ||
            Array.isArray(result.body))
          throw Error("invalid response");
        respond(res,result.status,result.body);
      } catch {
        respond(res,503,{ok:false,code:"RUNTIME_UNAVAILABLE"});
      }
    }
  });
}
