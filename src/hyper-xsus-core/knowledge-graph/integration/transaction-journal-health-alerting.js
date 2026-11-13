/**
 * Hyper XSUS Core — advisory health history alerts v5.2.0.
 * Pure evaluation: never mutates diagnostics, locks, or persistent history.
 */
import { diagnosePersistentHealthHistory } from "./transaction-journal-health-diagnostics.js";

export const HEALTH_HISTORY_ALERTING_VERSION="5.2.0";
const STATUSES=new Set(["healthy","missing","invalid"]);
const LEVELS=new Set(["healthy","attention","unknown","critical"]);
const ALERTS=Object.freeze({
  invalid:Object.freeze({code:"HISTORY_INVALID",severity:"critical"}),
  missing:Object.freeze({code:"HISTORY_MISSING",severity:"warning"}),
  lock:Object.freeze({code:"HISTORY_LOCK_PRESENT",severity:"warning"}),
  attention:Object.freeze({code:"LATEST_HEALTH_ATTENTION",severity:"warning"}),
  unknown:Object.freeze({code:"LATEST_HEALTH_UNKNOWN",severity:"warning"}),
  critical:Object.freeze({code:"LATEST_HEALTH_CRITICAL",severity:"critical"}),
});
export function evaluateHealthHistoryAlerts(diagnostic,{previousDiagnostics=[],repeatThreshold=3}={}){
  if(!diagnostic||typeof diagnostic!=="object"||!STATUSES.has(diagnostic.status)||
     typeof diagnostic.lockPresent!=="boolean"||
     (diagnostic.status==="healthy" && (typeof diagnostic.entryCount!=="number"||
       !Number.isSafeInteger(diagnostic.entryCount)||diagnostic.entryCount<0||
       (diagnostic.latestLevel!==null&&!LEVELS.has(diagnostic.latestLevel)))))
    throw new TypeError("Invalid health history diagnostic.");
  if(!Array.isArray(previousDiagnostics)||
     !Number.isSafeInteger(repeatThreshold)||repeatThreshold<2||repeatThreshold>1000)
    throw new TypeError("Invalid alert evaluation options.");
  const classify=(item)=>{
    if(!item||typeof item!=="object"||!STATUSES.has(item.status)||
       typeof item.lockPresent!=="boolean")throw new TypeError("Invalid previous diagnostic.");
    const codes=[];
    if(item.status==="invalid")codes.push(ALERTS.invalid.code);
    if(item.status==="missing")codes.push(ALERTS.missing.code);
    if(item.lockPresent)codes.push(ALERTS.lock.code);
    if(item.status==="healthy"&&item.latestLevel&&item.latestLevel!=="healthy"){
      if(!LEVELS.has(item.latestLevel))throw new TypeError("Invalid previous health level.");
      codes.push(ALERTS[item.latestLevel].code);
    }
    return codes;
  };
  const currentCodes=classify(diagnostic);
  const previous=previousDiagnostics.map(classify);
  const definitions=Object.values(ALERTS);
  const alerts=currentCodes.map(code=>{
    let consecutive=1;
    for(let i=previous.length-1;i>=0&&previous[i].includes(code);i--)consecutive++;
    const definition=definitions.find(item=>item.code===code);
    return Object.freeze({code,severity:definition.severity,consecutive,
      repeated:consecutive>=repeatThreshold});
  });
  return Object.freeze({
    version:HEALTH_HISTORY_ALERTING_VERSION,
    status:alerts.some(a=>a.severity==="critical")?"critical":alerts.length?"attention":"healthy",
    alerts:Object.freeze(alerts),alertCount:alerts.length,
    readOnly:true,advisory:true,notificationsSent:false,cleanupPerformed:false,
  });
}
export async function inspectHealthHistoryAlerts(filePath,{previousDiagnostics=[],repeatThreshold=3,...diagnosticOptions}={}){
  const diagnostic=await diagnosePersistentHealthHistory(filePath,diagnosticOptions);
  return Object.freeze({
    diagnostic,
    evaluation:evaluateHealthHistoryAlerts(diagnostic,{previousDiagnostics,repeatThreshold}),
  });
}
