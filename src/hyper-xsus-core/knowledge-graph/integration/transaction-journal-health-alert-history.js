/**
 * Hyper XSUS Core — bounded, in-memory alert history and trends v5.3.0.
 * Does not write files, send notifications, or modify diagnostic results.
 */
export const HEALTH_ALERT_HISTORY_VERSION="5.3.0";
const RANK=Object.freeze({healthy:0,attention:1,critical:2});
const SEVERITIES=new Set(["warning","critical"]);
export function createHealthAlertHistory({maxEntries=100}={}){
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>10000)
    throw new RangeError("maxEntries must be between 1 and 10000.");
  const entries=[];
  function record(evaluation,{timestamp=Date.now()}={}){
    if(!evaluation||typeof evaluation!=="object"||
       !Object.hasOwn(RANK,evaluation.status)||
       !Array.isArray(evaluation.alerts)||
       !Number.isSafeInteger(timestamp)||timestamp<0)
      throw new TypeError("Invalid alert history observation.");
    const seen=new Set();
    const alerts=evaluation.alerts.map(alert=>{
      if(!alert||typeof alert!=="object"||
         typeof alert.code!=="string"||!alert.code||
         !SEVERITIES.has(alert.severity)||
         !Number.isSafeInteger(alert.consecutive)||alert.consecutive<1||
         typeof alert.repeated!=="boolean"||seen.has(alert.code))
        throw new TypeError("Invalid alert history item.");
      seen.add(alert.code);
      return Object.freeze({code:alert.code,severity:alert.severity,
        consecutive:alert.consecutive,repeated:alert.repeated});
    });
    if((evaluation.status==="healthy"&&alerts.length!==0)||
       (evaluation.status==="critical"&&!alerts.some(a=>a.severity==="critical"))||
       (evaluation.status==="attention"&&(alerts.length===0||alerts.some(a=>a.severity==="critical"))))
      throw new TypeError("Inconsistent alert history status.");
    const entry=Object.freeze({timestamp,status:evaluation.status,
      alertCount:alerts.length,alerts:Object.freeze(alerts)});
    entries.push(entry);
    if(entries.length>maxEntries)entries.splice(0,entries.length-maxEntries);
    return entry;
  }
  function list(){return Object.freeze([...entries]);}
  function analyze(){
    const latest=entries.at(-1)??null,previous=entries.at(-2)??null;
    const direction=!previous?"insufficient-data":
      RANK[latest.status]>RANK[previous.status]?"worsening":
      RANK[latest.status]<RANK[previous.status]?"improving":"stable";
    const frequencies=new Map();
    for(const entry of entries)
      for(const alert of entry.alerts)
        frequencies.set(alert.code,(frequencies.get(alert.code)??0)+1);
    const repeatedAlerts=Object.freeze([...frequencies]
      .filter(([,occurrences])=>occurrences>=2)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([code,occurrences])=>Object.freeze({code,occurrences})));
    return Object.freeze({
      version:HEALTH_ALERT_HISTORY_VERSION,sampleCount:entries.length,
      firstTimestamp:entries[0]?.timestamp??null,latestTimestamp:latest?.timestamp??null,
      previousStatus:previous?.status??null,latestStatus:latest?.status??null,
      direction,repeatedAlerts,persistence:"memory-only",readOnly:true,
      notificationsSent:false,cleanupPerformed:false,
    });
  }
  return Object.freeze({record,list,analyze});
}
