import {createProjectArchitecture} from "../architecture/project-architect.js";
export const CODE_GENERATOR_VERSION="0.1.0";
const escapeHtml=value=>String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
function makeFile(path,content) {
  if(typeof path!=="string" || !/^[a-zA-Z0-9_./-]+$/.test(path) || path.startsWith("/") || path.split("/").some(part=>part===".." || part==="." || !part)) throw new TypeError("Unsafe generated file path");
  if(typeof content!=="string" || content.length>500000) throw new TypeError("Invalid generated file content");
  return Object.freeze({path,content});
}
export function generateStaticApp(architecture) {
  const project=createProjectArchitecture(architecture);
  const pages=project.modules.filter(module=>module.kind==="page");
  if(pages.length===0) throw new TypeError("At least one page module is required");
  const files=[
    makeFile("index.html",`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(project.name)}</title><link rel="stylesheet" href="./styles.css"></head><body><main id="app"><h1>${escapeHtml(project.name)}</h1><nav aria-label="Pages"><ul id="routes"></ul></nav><section id="page" aria-live="polite"></section></main><script type="module" src="./main.js"></script></body></html>
`),
    makeFile("styles.css",`:root{font-family:system-ui,sans-serif;color-scheme:light dark}body{max-width:960px;margin:0 auto;padding:2rem}nav a{display:inline-block;padding:.5rem}a:focus-visible{outline:3px solid currentColor}`),
    makeFile("main.js",`const routes=${JSON.stringify(project.routes.map(route=>({path:route.path,moduleId:route.moduleId})))};
const list=document.getElementById("routes");
const page=document.getElementById("page");
for(const route of routes){const li=document.createElement("li");const a=document.createElement("a");a.href=route.path;a.textContent=route.moduleId;li.append(a);list.append(li);}
const current=routes.find(route=>route.path===location.pathname)||routes.find(route=>route.path==="/")||routes[0];
page.textContent=current?"Page: "+current.moduleId:"No route configured";
`)
  ];
  return Object.freeze({version:CODE_GENERATOR_VERSION,project:project.slug,files:Object.freeze(files),requiresReview:true});
}
