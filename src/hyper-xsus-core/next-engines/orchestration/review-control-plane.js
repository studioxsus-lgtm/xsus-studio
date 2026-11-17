import {createReviewDeadline} from "./review-deadline.js";
import {createReviewCircuitBreaker} from "./review-circuit-breaker.js";
import {createReviewHealthMonitor} from "./review-health.js";

/**
 * Local review-only composition: circuit -> deadline -> resource guard -> journal.
 * Circuit failures reflect caller-visible outcomes; a timeout does not cancel
 * a pending journal write. No execution authorization or automatic retries.
 */
export function createReviewControlPlane({
  timeoutMs=30000,maxInFlight=8,maxRequestBytes=65536,
  failureThreshold=3,cooldownMs=30000,clock=Date.now
}={}) {
  const deadline=createReviewDeadline({timeoutMs,maxInFlight,maxRequestBytes});
  const circuit=createReviewCircuitBreaker({failureThreshold,cooldownMs,clock});
  const health=createReviewHealthMonitor({source:deadline,clock});
  function run(input,store,options){
    return circuit.run(()=>deadline.run(input,store,options));
  }
  function snapshot(){
    return Object.freeze({
      health:health.snapshot(),
      circuit:circuit.metrics(),
      executionAuthorized:false,
      sideEffects:false
    });
  }
  return Object.freeze({run,snapshot});
}
