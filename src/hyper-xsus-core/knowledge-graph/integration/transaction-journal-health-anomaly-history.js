/**
 * Hyper XSUS Core — bounded in-memory anomaly history and trend analysis v6.3.0.
 * Observational only: no file writes, notifications or automatic cleanup.
 */
export const ANOMALY_HISTORY_VERSION="6.3.0";
const RANK=Object.freeze({healthy:0,attention:1,critical:2});
const SEVERITIES=new Set(["warning","critical"]);

export function createAnomalyHistory({maxEntries=100}={}){
 if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>10000)
  throw new RangeError("maxEntries must be between 1 and 10000.");
 const entries=[];
 function record(evaluation,{timestamp=Date.now()}={}){
  if(!evaluation||typeof evaluation!=="object"||Array.isArray(evaluation)||
     !Object.hasOwn(RANK,evaluation.status)||!Array.isArray(evaluation.anomalies)||
     !Number.isSafeInteger(evaluation.anomalyCount)||
     evaluation.anomalyCount!==evaluation.anomalies.length||
     !Number.isSafeInteger(timestamp)||timestamp<0)
   throw new TypeError("Invalid anomaly history observation.");
  const seen=new Set();
  const anomalies=evaluation.anomalies.map(anomaly=>{
   if(!anomaly||typeof anomaly!=="object"||Array.isArray(anomaly)||
      typeof anomaly.code!=="string"||!anomaly.code||
      !SEVERITIES.has(anomaly.severity)||seen.has(anomaly.code)||
      (anomaly.consecutive!==undefined&&(!Number.isSafeInteger(anomaly.consecutive)||anomaly.consecutive<1))||
      (anomaly.repeated!==undefined&&typeof anomaly.repeated!=="boolean"))
    throw new TypeError("Invalid anomaly history item.");
   seen.add(anomaly.code);
   // Preserve documented monitor metadata while detaching nested input references.
   const copy=structuredClone(anomaly);
   return deepFreeze(copy);
  });
  if((evaluation.status==="healthy"&&anomalies.length!==0)||
     (evaluation.status==="critical"&&!anomalies.some(a=>a.severity==="critical"))||
     (evaluation.status==="attention"&&(anomalies.length===0||anomalies.some(a=>a.severity==="critical"))))
   throw new TypeError("Inconsistent anomaly history status.");
  const entry=Object.freeze({timestamp,status:evaluation.status,
   anomalyCount:anomalies.length,anomalies:Object.freeze(anomalies)});
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
  for(const entry of entries)for(const anomaly of entry.anomalies)
   frequencies.set(anomaly.code,(frequencies.get(anomaly.code)??0)+1);
  const repeatedAnomalies=Object.freeze([...frequencies]
   .filter(([,occurrences])=>occurrences>=2)
   .sort(([a],[b])=>a.localeCompare(b))
   .map(([code,occurrences])=>Object.freeze({code,occurrences})));
  return Object.freeze({version:ANOMALY_HISTORY_VERSION,sampleCount:entries.length,
   firstTimestamp:entries[0]?.timestamp??null,latestTimestamp:latest?.timestamp??null,
   previousStatus:previous?.status??null,latestStatus:latest?.status??null,
   direction,repeatedAnomalies,persistence:"memory-only",readOnly:true,
   notificationsSent:false,cleanupPerformed:false});
 }
 return Object.freeze({record,list,analyze});
}
function deepFreeze(value){
 if(value&&typeof value==="object"){
  for(const child of Object.values(value))deepFreeze(child);
  Object.freeze(value);
 }
 return value;
}
