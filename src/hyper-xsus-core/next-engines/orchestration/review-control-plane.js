import {createReviewDeadline} from "./review-deadline.js";
import {createReviewCircuitBreaker} from "./review-circuit-breaker.js";
import {createReviewHealthMonitor} from "./review-health.js";
import {createReviewTrustBoundary} from "./review-trust-boundary.js";

/**
 * Local review-only composition: circuit -> deadline -> resource guard -> journal.
 * Untrusted input is isolated before admission; circuit failures reflect
 * caller-visible outcomes; a timeout does not cancel
 * a pending journal write. No execution authorization or automatic retries.
 */
export function createReviewControlPlane({
  timeoutMs=30000,maxInFlight=8,maxRequestBytes=65536,
  failureThreshold=3,cooldownMs=30000,clock=Date.now,
  maxDepth=16,maxNodes=4096
}={}) {
  const deadline=createReviewDeadline({timeoutMs,maxInFlight,maxRequestBytes});
  const circuit=createReviewCircuitBreaker({failureThreshold,cooldownMs,clock});
  const health=createReviewHealthMonitor({source:deadline,clock});
  const boundary=createReviewTrustBoundary({maxBytes:maxRequestBytes,maxDepth,maxNodes});
  function run(input,store,options){
    return circuit.run(()=>deadline.run(boundary.isolate(input),store,options));
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
