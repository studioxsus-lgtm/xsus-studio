/**
 * Hyper XSUS Core — advisory alert history anomaly monitor v6.2.0.
 * Compares read-only diagnostics; never mutates history, locks, or sends alerts.
 */
import {diagnosePersistentAlertHistory} from "./transaction-journal-health-alert-diagnostics.js";

export const ALERT_HISTORY_MONITOR_VERSION="6.2.0";
const STATUSES=new Set(["healthy","missing","invalid"]);
const LEVELS=new Set(["healthy","attention","critical"]);
const RANK={healthy:0,attention:1,critical:2};

function validate(d){
 if(!d||typeof d!=="object"||!STATUSES.has(d.status)||
    typeof d.lockPresent!=="boolean"||d.readOnly!==true||
    (d.status==="healthy"&&(!Number.isSafeInteger(d.entryCount)||d.entryCount<0||
      (d.latestStatus!==null&&!LEVELS.has(d.latestStatus))))||
    (d.status!=="healthy"&&d.entryCount!==null))
   throw new TypeError("Invalid alert history diagnostic.");
}
export function evaluateAlertHistoryAnomalies(current,{previousDiagnostics=[],repeatThreshold=3}={}){
 validate(current);
 if(!Array.isArray(previousDiagnostics)||!Number.isSafeInteger(repeatThreshold)||repeatThreshold<2)
  throw new TypeError("Invalid monitoring options.");
 for(const previous of previousDiagnostics)validate(previous);
 const prior=previousDiagnostics.at(-1)??null;
 const anomalies=[];
 const add=(code,severity,details={})=>anomalies.push(Object.freeze({code,severity,...details}));
 if(current.status!=="healthy"){
  let repeated=1;
  for(let i=previousDiagnostics.length-1;i>=0&&previousDiagnostics[i].status===current.status;i--)repeated++;
  add(current.status==="invalid"?"HISTORY_INVALID":"HISTORY_MISSING",
      current.status==="invalid"?"critical":"warning",
      {consecutive:repeated,repeated:repeated>=repeatThreshold});
 }
 if(current.lockPresent){
  let consecutive=1;
  for(let i=previousDiagnostics.length-1;i>=0&&previousDiagnostics[i].lockPresent;i--)consecutive++;
  add("LOCK_PRESENT","warning",{consecutive,repeated:consecutive>=repeatThreshold});
 }
 if(prior){
  if(prior.status==="healthy"&&current.status!=="healthy")
   add("STATUS_DEGRADED",current.status==="invalid"?"critical":"warning");
  if(prior.status==="healthy"&&current.status==="healthy"){
   if(current.entryCount<prior.entryCount)
    add("ENTRY_COUNT_DECREASED","warning",{previousCount:prior.entryCount,currentCount:current.entryCount});
   if(prior.latestTimestamp!==null&&current.latestTimestamp!==null&&
      current.latestTimestamp<prior.latestTimestamp)
    add("LATEST_TIMESTAMP_REGRESSED","warning");
   if(prior.latestStatus!==null&&current.latestStatus!==null&&
      RANK[current.latestStatus]>RANK[prior.latestStatus])
    add("LATEST_ALERT_WORSENED",current.latestStatus==="critical"?"critical":"warning");
  }
 }
 const status=anomalies.some(x=>x.severity==="critical")?"critical":anomalies.length?"attention":"healthy";
 return Object.freeze({version:ALERT_HISTORY_MONITOR_VERSION,status,
  anomalies:Object.freeze(anomalies),anomalyCount:anomalies.length,
  readOnly:true,advisory:true,notificationsSent:false,cleanupPerformed:false});
}
export async function inspectAlertHistoryAnomalies(filePath,{previousDiagnostics=[],repeatThreshold=3,maxEntries=100}={}){
 const diagnostic=await diagnosePersistentAlertHistory(filePath,{maxEntries});
 return Object.freeze({diagnostic,evaluation:evaluateAlertHistoryAnomalies(diagnostic,{previousDiagnostics,repeatThreshold})});
}
