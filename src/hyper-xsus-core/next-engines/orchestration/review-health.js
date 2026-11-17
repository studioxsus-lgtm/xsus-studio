import {EngineContractError,object} from "../contracts.js";

/**
 * Passive, in-process health snapshot of review-only admission and deadlines.
 * No probing, network calls, writes, retries, or execution authorization.
 */
export function createReviewHealthMonitor({source,clock=Date.now}={}) {
  object(source,"source");
  if(typeof source.metrics!=="function"||typeof clock!=="function")
    throw new EngineContractError("INVALID_INPUT","Health monitor requires metrics and clock functions");
  let last;
  function snapshot(){
    const m=object(source.metrics(),"metrics");
    const timestamp=clock();
    if(!Number.isFinite(timestamp)||timestamp<0)
      throw new EngineContractError("INVALID_INPUT","Invalid clock timestamp");
    for(const name of ["inFlight","accepted","rejected","maxInFlight"]){
      if(!Number.isSafeInteger(m[name])||m[name]<0)
        throw new EngineContractError("INVALID_INPUT","Invalid resource metric: "+name);
    }
    if(m.maxInFlight<1||m.inFlight>m.maxInFlight)
      throw new EngineContractError("INVALID_INPUT","Resource metrics violate capacity");
    for(const name of ["timedOut","cancelled"]){
      if(m[name]!==undefined&&(!Number.isSafeInteger(m[name])||m[name]<0))
        throw new EngineContractError("INVALID_INPUT","Invalid deadline metric: "+name);
    }
    if(last&&(m.accepted<last.accepted||m.rejected<last.rejected||
       (m.timedOut??0)<last.timedOut||(m.cancelled??0)<last.cancelled))
      throw new EngineContractError("METRICS_REGRESSION","Health counters moved backwards");
    const atCapacity=m.inFlight===m.maxInFlight;
    const status=atCapacity?"saturated":m.inFlight>0?"busy":"idle";
    const report=Object.freeze({
      timestamp,status,atCapacity,
      inFlight:m.inFlight,maxInFlight:m.maxInFlight,
      accepted:m.accepted,rejected:m.rejected,
      timedOut:m.timedOut??0,cancelled:m.cancelled??0,
      executionAuthorized:false,sideEffects:false
    });
    last=report;
    return report;
  }
  return Object.freeze({snapshot});
}
