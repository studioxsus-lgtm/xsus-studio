/**
 * Hyper XSUS Core — Audit filesystem preflight v1.2.0.
 * Best-effort preflight for trusted local directories. This is NOT a
 * race-free openat/O_NOFOLLOW capability boundary.
 */
import {lstat} from "node:fs/promises";
import {isAbsolute,resolve,dirname,parse} from "node:path";
export const AUDIT_FILESYSTEM_GUARD_VERSION="1.2.0";
const denied=reason=>Object.assign(new Error("Unsafe audit filesystem path: "+reason),{
 code:"XSUS_AUDIT_UNSAFE_PATH"});
export function createAuditFilesystemGuard({filePath,fsOps={}}={}){
 if(typeof filePath!=="string"||!isAbsolute(filePath)||
  resolve(filePath)!==filePath||filePath.includes("\0")||
  filePath.endsWith("/")||filePath.endsWith("\\"))
  throw denied("absolute normalized file path required");
 const stat=fsOps.lstat??lstat;
 const paths=[filePath,filePath+".lock"];
 const root=parse(filePath).root;
 let dir=dirname(filePath);
 while(dir!==root){paths.push(dir);dir=dirname(dir);}
 paths.push(root);
 async function check(){
  for(const p of paths){
   let info;
   try{info=await stat(p);}
   catch(e){if(e?.code==="ENOENT")continue;throw e;}
   if(info.isSymbolicLink())throw denied("symbolic link");
   if(p===filePath||p===filePath+".lock"){
    if(!info.isFile())throw denied("non-file journal or lock");
    if(process.platform!=="win32"&&(info.mode&0o077)!==0)
     throw denied("journal or lock accessible by group/others");
   }else if(!info.isDirectory())throw denied("non-directory parent");
  }
  return true;
 }
 return Object.freeze({version:AUDIT_FILESYSTEM_GUARD_VERSION,check});
}
