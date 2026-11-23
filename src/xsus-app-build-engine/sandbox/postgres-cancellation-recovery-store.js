export const POSTGRES_CANCELLATION_RECOVERY_STORE_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const REASONS=new Set(["timeout","external-cancellation","lock-lost","process-failure"]);
const FIELDS="execution_id,operation_id,reason,stop_requested,status,revision,reviewer_id,evidence_id";
const id=x=>typeof x==="string"&&ID.test(x);
function validate(x){if(!x||!id(x.executionId)||!id(x.operationId)||!REASONS.has(x.reason)||typeof x.stopRequested!=="boolean"||!["uncertain","reviewed"].includes(x.status)||!Number.isSafeInteger(x.revision)||x.revision<1||x.status==="reviewed"&&(!id(x.reviewerId)||!id(x.evidenceId)))throw new TypeError("Invalid cancellation record");}
function parse(row){if(!row)throw new TypeError("Missing cancellation row");const n=Number(row.revision);if(!/^[1-9][0-9]*$/.test(String(row.revision))||!Number.isSafeInteger(n))throw new TypeError("Invalid database revision");const x={executionId:row.execution_id,operationId:row.operation_id,reason:row.reason,stopRequested:row.stop_requested,status:row.status,revision:n};if(row.reviewer_id!==null&&row.reviewer_id!==undefined)x.reviewerId=row.reviewer_id;if(row.evidence_id!==null&&row.evidence_id!==undefined)x.evidenceId=row.evidence_id;validate(x);return Object.freeze(x);}
function rows(r){if(!r||!Array.isArray(r.rows)||r.rows.length>1)throw new TypeError("Invalid PostgreSQL result");return r.rows;}
function same(a,b){return Object.keys(b).every(k=>a[k]===b[k]);}
export function createPostgresCancellationRecoveryStore({query}={}){
 if(typeof query!=="function")throw new TypeError("Trusted PostgreSQL query required");
 return Object.freeze({
  async read(executionId,operationId){
   if(!id(executionId)||!id(operationId))throw new TypeError("Invalid cancellation identity");
   const found=rows(await query(`SELECT ${FIELDS} FROM xsus_internal.build_cancellation_receipts WHERE execution_id=$1 AND operation_id=$2`,[executionId,operationId]));
   if(!found.length)return null;const x=parse(found[0]);if(x.executionId!==executionId||x.operationId!==operationId)throw new Error("Database cancellation identity mismatch");return x;
  },
  async createIfAbsent(receipt){
   validate(receipt);if(receipt.status!=="uncertain"||receipt.revision!==1||receipt.reviewerId!==undefined||receipt.evidenceId!==undefined)throw new TypeError("Invalid initial cancellation receipt");
   const found=rows(await query(`INSERT INTO xsus_internal.build_cancellation_receipts (execution_id,operation_id,reason,stop_requested,status,revision) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (execution_id,operation_id) DO NOTHING RETURNING ${FIELDS}`,[receipt.executionId,receipt.operationId,receipt.reason,receipt.stopRequested,receipt.status,receipt.revision]));
   if(!found.length)return false;if(!same(parse(found[0]),receipt))throw new Error("Cancellation insertion mismatch");return true;
  },
  async compareAndSwap(current,next){
   validate(current);validate(next);
   if(current.executionId!==next.executionId||current.operationId!==next.operationId||current.reason!==next.reason||current.stopRequested!==next.stopRequested||current.status!=="uncertain"||next.status!=="reviewed"||next.revision!==current.revision+1||!id(next.reviewerId)||!id(next.evidenceId))throw new TypeError("Invalid cancellation review transition");
   const found=rows(await query(`UPDATE xsus_internal.build_cancellation_receipts SET status=$7,revision=$8,reviewer_id=$9,evidence_id=$10 WHERE execution_id=$1 AND operation_id=$2 AND reason=$3 AND stop_requested=$4 AND status=$5 AND revision=$6 RETURNING ${FIELDS}`,[current.executionId,current.operationId,current.reason,current.stopRequested,current.status,current.revision,next.status,next.revision,next.reviewerId,next.evidenceId]));
   if(!found.length)return false;if(!same(parse(found[0]),next))throw new Error("Cancellation review mismatch");return true;
  }
 });
}
