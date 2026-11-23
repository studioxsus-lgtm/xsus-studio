export const POSTGRES_HOST_OPERATION_STORE_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const OPS=new Set(["launch","stop","cleanup"]);
const STATES=new Set(["pending","applied","uncertain"]);
function id(x){return typeof x==="string"&&ID.test(x);}
function fence(x){return Number.isSafeInteger(x)&&x>0;}
function validate(x){if(!x||!id(x.executionId)||!id(x.operationId)||!id(x.holderId)||!fence(x.fence)||!OPS.has(x.operation)||!STATES.has(x.status))throw new TypeError("Invalid host operation record");}
function parseInt64(x){if(!["string","number"].includes(typeof x)||!/^[1-9][0-9]*$/.test(String(x)))throw new TypeError("Invalid database fence");const n=Number(x);if(!Number.isSafeInteger(n))throw new TypeError("Unsafe database fence");return n;}
function parse(row){if(!row||!id(row.execution_id)||!id(row.operation_id)||!id(row.holder_id))throw new TypeError("Invalid database operation identity");const record={executionId:row.execution_id,operationId:row.operation_id,holderId:row.holder_id,fence:parseInt64(row.fence),operation:row.operation,status:row.status};validate(record);return Object.freeze(record);}
function rows(response){if(!response||!Array.isArray(response.rows)||response.rows.length>1)throw new TypeError("Invalid PostgreSQL response");return response.rows;}
const FIELDS="execution_id,operation_id,holder_id,fence,operation,status";
export function createPostgresHostOperationStore({query}={}){
 if(typeof query!=="function")throw new TypeError("Trusted PostgreSQL query required");
 return Object.freeze({
  async read(executionId,operationId){
   if(!id(executionId)||!id(operationId))throw new TypeError("Invalid operation identity");
   const result=rows(await query(`SELECT ${FIELDS} FROM xsus_internal.build_host_operations WHERE execution_id=$1 AND operation_id=$2`,[executionId,operationId]));
   if(!result.length)return null;
   const record=parse(result[0]);if(record.executionId!==executionId||record.operationId!==operationId)throw new Error("Database operation identity mismatch");return record;
  },
  async createIfAbsent(record){
   validate(record);
   if(record.status!=="pending")throw new TypeError("Initial operation must be pending");
   const result=rows(await query(`INSERT INTO xsus_internal.build_host_operations (${FIELDS}) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (execution_id,operation_id) DO NOTHING RETURNING ${FIELDS}`,[record.executionId,record.operationId,record.holderId,record.fence,record.operation,record.status]));
   if(!result.length)return false;
   const inserted=parse(result[0]);if(Object.keys(record).some(k=>inserted[k]!==record[k]))throw new Error("Database insertion mismatch");
   return true;
  },
  async compareAndSwap(current,next){
   validate(current);validate(next);
   if(current.executionId!==next.executionId||current.operationId!==next.operationId||current.holderId!==next.holderId||current.fence!==next.fence||current.operation!==next.operation||current.status!=="pending"||!["applied","uncertain"].includes(next.status))throw new TypeError("Invalid operation state transition");
   const result=rows(await query(`UPDATE xsus_internal.build_host_operations SET status=$7 WHERE execution_id=$1 AND operation_id=$2 AND holder_id=$3 AND fence=$4 AND operation=$5 AND status=$6 RETURNING ${FIELDS}`,[current.executionId,current.operationId,current.holderId,current.fence,current.operation,current.status,next.status]));
   if(!result.length)return false;
   const updated=parse(result[0]);if(Object.keys(next).some(k=>updated[k]!==next[k]))throw new Error("Database update mismatch");return true;
  }
 });
}
