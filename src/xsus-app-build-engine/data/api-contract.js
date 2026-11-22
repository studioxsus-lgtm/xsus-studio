export const API_CONTRACT_VERSION="0.1.0";
const METHODS=new Set(["GET","POST","PUT","PATCH","DELETE"]);
export function createApiRequest({method="GET",path,body=null}={}) {
  if(!METHODS.has(method)) throw new TypeError("Unsupported API method");
  if(typeof path!=="string" || !/^\/api\/[a-zA-Z0-9/_-]+$/.test(path) || path.includes("//") || path.split("/").includes("..")) throw new TypeError("Invalid relative API path");
  if((method==="GET"||method==="DELETE") && body!==null) throw new TypeError("Body not allowed for this method");
  if(body!==null && (typeof body!=="object" || Array.isArray(body))) throw new TypeError("API body must be an object");
  return Object.freeze({version:API_CONTRACT_VERSION,method,path,body:body===null?null:JSON.parse(JSON.stringify(body))});
}
