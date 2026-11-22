import {validateBuildManifest} from "../build/build-manifest.js";
import {createQualityGate} from "../quality/quality-gate.js";
import {planRepairs} from "./repair-planner.js";
export const REPAIR_ENGINE_VERSION="0.1.0";
const RULES=new Set(["HTML_DOCUMENT","HTML_TITLE","MISSING_STYLESHEET"]);
function applyRule(files,rule){
  if(rule==="HTML_DOCUMENT"){
    const entry=files.find(f=>f.path==="index.html");
    if(!/^\s*<!doctype\s+html\s*>/i.test(entry.content))entry.content="<!doctype html>\n"+entry.content;
  }else if(rule==="HTML_TITLE"){
    const entry=files.find(f=>f.path==="index.html");
    if(!/<title(?:\s[^>]*)?>[\s\S]*?<\/title\s*>/i.test(entry.content)){
      const title="<title>XSUS Application</title>";
      entry.content=/<head(?:\s[^>]*)?>/i.test(entry.content)?entry.content.replace(/<head(?:\s[^>]*)?>/i,match=>match+title):title+entry.content;
    }
  }else if(rule==="MISSING_STYLESHEET" && !files.some(f=>f.path==="styles.css")){
    files.push({path:"styles.css",content:"/* XSUS generated stylesheet */\n"});
  }
}
export function createRepairEngine({qualityGate=createQualityGate()}={}){
  if(!qualityGate || typeof qualityGate.inspect!=="function")throw new TypeError("Quality gate required");
  return Object.freeze({
    propose(input){
      const manifest=validateBuildManifest(input);
      const before=qualityGate.inspect(manifest);
      return Object.freeze({before,plan:planRepairs(before.report)});
    },
    apply(input,{approvedRules=[]}={}){
      if(!Array.isArray(approvedRules)||approvedRules.some(rule=>!RULES.has(rule))||new Set(approvedRules).size!==approvedRules.length)throw new TypeError("Invalid approved repair rules");
      const manifest=validateBuildManifest(input);
      const before=qualityGate.inspect(manifest);
      const plan=planRepairs(before.report);
      const available=new Set(plan.proposals.map(p=>p.rule));
      if(approvedRules.some(rule=>!available.has(rule)))throw new TypeError("Repair rule not proposed");
      const files=manifest.files.map(f=>({path:f.path,content:f.content}));
      for(const rule of approvedRules)applyRule(files,rule);
      const candidate=validateBuildManifest({project:manifest.project,files});
      const after=qualityGate.inspect(candidate);
      const accepted=after.report.diagnostics.filter(d=>d.severity==="error").length<=before.report.diagnostics.filter(d=>d.severity==="error").length;
      return Object.freeze({version:REPAIR_ENGINE_VERSION,applied:accepted?Object.freeze([...approvedRules]):Object.freeze([]),candidate:accepted?candidate:manifest,before,after:accepted?after:before,requiresReview:true});
    }
  });
}
