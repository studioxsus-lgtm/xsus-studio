// The injected client must be a trusted server-side PostgreSQL client.
export function createPostgresOperationStore(client){
 if(typeof client?.query!=='function')throw new TypeError('PostgreSQL client required');
 return Object.freeze({
 async insertOnce(account,key,payload){
 await client.query('INSERT INTO xsus_domain.operations (account_id,operation_key,revision,payload) VALUES ($1,$2,0,$3::jsonb) ON CONFLICT (account_id,operation_key) DO NOTHING',[account,key,JSON.stringify(payload)]);
 const result=await client.query('SELECT payload FROM xsus_domain.operations WHERE account_id=$1 AND operation_key=$2',[account,key]);
 if(result.rows.length!==1)throw new Error('Operation persistence failed');
 return result.rows[0].payload;
 },
 async get(account,key){
 const result=await client.query('SELECT payload FROM xsus_domain.operations WHERE account_id=$1 AND operation_key=$2',[account,key]);
 return result.rows[0]?.payload??null;
 },
 async compareAndSet(account,key,revision,payload){
 if(!Number.isSafeInteger(revision)||revision<0||payload.revision!==revision+1||payload.accountId!==account||payload.key!==key)throw new TypeError('Invalid revision or scope');
 const result=await client.query('UPDATE xsus_domain.operations SET revision=$3+1,payload=$4::jsonb WHERE account_id=$1 AND operation_key=$2 AND revision=$3',[account,key,revision,JSON.stringify(payload)]);
 return result.rowCount===1;
 }
 });
}
