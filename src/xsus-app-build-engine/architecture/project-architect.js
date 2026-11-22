export const PROJECT_ARCHITECT_VERSION="1.0.0";
const SLUG=/^[a-z][a-z0-9-]{1,47}$/;
const ID=/^[a-z][a-zA-Z0-9]{0,63}$/;
const ALLOWED_KINDS=new Set(["page","component","service","model"]);
function assertItems(items,label,max) {
  if (!Array.isArray(items) || items.length>max) throw new TypeError(`Invalid ${label} list`);
  return items;
}
function unique(items,label) {
  const seen=new Set();
  for(const item of items) {
    if(seen.has(item.id)) throw new TypeError(`Duplicate ${label} identifier`);
    seen.add(item.id);
  }
}
export function createProjectArchitecture(input) {
  if(!input || typeof input!=="object" || Array.isArray(input)) throw new TypeError("Architecture input must be an object");
  const {name,slug,modules=[],routes=[]}=input;
  if(typeof name!=="string" || !name.trim() || name.length>100) throw new TypeError("Invalid project name");
  if(typeof slug!=="string" || !SLUG.test(slug)) throw new TypeError("Invalid project slug");
  const normalizedModules=assertItems(modules,"modules",200).map(item=>{
    if(!item || typeof item!=="object" || !ID.test(item.id??"") || !ALLOWED_KINDS.has(item.kind)) throw new TypeError("Invalid project module");
    return Object.freeze({id:item.id,kind:item.kind});
  });
  unique(normalizedModules,"module");
  const moduleIds=new Set(normalizedModules.map(item=>item.id));
  const normalizedRoutes=assertItems(routes,"routes",100).map(item=>{
    if(!item || typeof item!=="object" || !ID.test(item.id??"") || typeof item.path!=="string" || !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(item.path)) throw new TypeError("Invalid project route");
    if(!moduleIds.has(item.moduleId)) throw new TypeError("Route refers to unknown module");
    return Object.freeze({id:item.id,path:item.path,moduleId:item.moduleId});
  });
  unique(normalizedRoutes,"route");
  if(new Set(normalizedRoutes.map(item=>item.path)).size!==normalizedRoutes.length) throw new TypeError("Duplicate route path");
  return Object.freeze({version:PROJECT_ARCHITECT_VERSION,name:name.trim(),slug,modules:Object.freeze(normalizedModules),routes:Object.freeze(normalizedRoutes)});
}
