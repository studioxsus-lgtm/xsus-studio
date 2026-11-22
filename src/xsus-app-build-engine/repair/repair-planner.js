export const REPAIR_PLANNER_VERSION="0.1.0";
const SUPPORTED=Object.freeze({
  HTML_DOCUMENT:{path:"index.html",description:"Add a missing HTML5 doctype"},
  HTML_TITLE:{path:"index.html",description:"Add a missing document title"},
  MISSING_STYLESHEET:{path:"styles.css",description:"Create a stylesheet file"}
});
export function planRepairs(report){
  if(!report || !Array.isArray(report.diagnostics))throw new TypeError("Expected quality report");
  const seen=new Set();
  const proposals=[];
  for(const item of report.diagnostics){
    if(!item || typeof item!=="object" || typeof item.rule!=="string")throw new TypeError("Invalid diagnostic");
    const rule=SUPPORTED[item.rule];
    if(!rule || seen.has(item.rule))continue;
    seen.add(item.rule);
    proposals.push(Object.freeze({id:`repair-${item.rule.toLowerCase().replace(/_/g,"-")}`,rule:item.rule,path:rule.path,description:rule.description,automatic:false,requiresReview:true}));
  }
  return Object.freeze({version:REPAIR_PLANNER_VERSION,proposals:Object.freeze(proposals),unresolved:report.diagnostics.filter(item=>!Object.hasOwn(SUPPORTED,item.rule)).length});
}
