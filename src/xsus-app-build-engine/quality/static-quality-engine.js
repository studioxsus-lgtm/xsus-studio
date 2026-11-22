export const STATIC_QUALITY_VERSION="0.1.0";
const RULES=Object.freeze(["HTML_ENTRY","HTML_DOCUMENT","HTML_TITLE","INLINE_SCRIPT","REMOTE_SCRIPT","EVAL_USAGE","SECRET_PATTERN","MISSING_STYLESHEET"]);
function diagnostic(rule,severity,path,message){return Object.freeze({rule,severity,path,message});}
export function analyzeStaticProject(manifest){
  if(!manifest || !Array.isArray(manifest.files))throw new TypeError("Expected validated build manifest");
  const results=[];
  const files=new Map();
  for(const file of manifest.files){
    if(!file || typeof file.path!=="string" || typeof file.content!=="string")throw new TypeError("Invalid project file");
    if(files.has(file.path))throw new TypeError("Duplicate project file");
    files.set(file.path,file.content);
  }
  const html=files.get("index.html");
  if(html===undefined){results.push(diagnostic("HTML_ENTRY","error","index.html","Missing HTML entry point"));}
  else{
    if(!/<!doctype\s+html\s*>/i.test(html))results.push(diagnostic("HTML_DOCUMENT","warning","index.html","Missing HTML doctype"));
    if(!/<title(?:\s[^>]*)?>[\s\S]*?<\/title\s*>/i.test(html))results.push(diagnostic("HTML_TITLE","warning","index.html","Missing document title"));
    if(/<script\b[^>]*>\s*[\s\S]*?\S[\s\S]*?<\/script\s*>/i.test(html))results.push(diagnostic("INLINE_SCRIPT","warning","index.html","Inline script requires review"));
    if(/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i.test(html))results.push(diagnostic("REMOTE_SCRIPT","warning","index.html","Remote script requires review"));
    if(!files.has("styles.css")&&!/<link\b[^>]*rel\s*=\s*["']stylesheet["']/i.test(html))results.push(diagnostic("MISSING_STYLESHEET","info","index.html","No stylesheet detected"));
  }
  for(const [path,content] of files){
    if(!/\.(?:js|mjs|cjs|ts)$/.test(path))continue;
    if(/\beval\s*\(|\bnew\s+Function\s*\(/.test(content))results.push(diagnostic("EVAL_USAGE","error",path,"Dynamic code evaluation detected"));
    if(/(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{24,}["']/i.test(content))results.push(diagnostic("SECRET_PATTERN","warning",path,"Possible embedded secret; manual review required"));
  }
  return Object.freeze({version:STATIC_QUALITY_VERSION,passed:!results.some(item=>item.severity==="error"),diagnostics:Object.freeze(results),rules:RULES,mode:"static-heuristic"});
}
