export const POSTGRES_PROJECT_PERSISTENCE_VERSION="0.1.0";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=new Set(["succeeded","failed","uncertain"]);
/** Server-only, parameterized access to existing public.projects.
 * Authorization MUST be enforced by trusted backend identity AND RLS.
 * No user-supplied SQL, table names or owner impersonation.
 */
export function createPostgresProjectPersistence({query,authorizeProject}={}){
 if(typeof query!=="function"||typeof authorizeProject!=="function")throw new TypeError("Trusted project persistence dependencies required");
 async function access(ownerId,projectId,action){
  if(!UUID.test(ownerId)||!UUID.test(projectId))throw new TypeError("Invalid project UUID");
  if(await authorizeProject({ownerId,projectId,action})!==true)throw new Error("Project access denied");
 }
 async function execute(sql,params){
  const response=await query(sql,params);
  if(!response||!Array.isArray(response.rows)||response.rows.length>1)throw new TypeError("Invalid PostgreSQL project response");
  return response.rows;
 }
 return Object.freeze({
  async readProject({ownerId,projectId}={}){
   await access(ownerId,projectId,"read");
   const rows=await execute("SELECT id,owner_id,name,project_type,prompt,content,created_at,updated_at FROM public.projects WHERE id=$1 AND owner_id=$2",[projectId,ownerId]);
   return rows[0]??null;
  },
  async recordBuild({ownerId,projectId,executionId,operationId,status,artifactId=null}={}){
   await access(ownerId,projectId,"write");
   if(typeof executionId!=="string"||!/^[a-zA-Z0-9_-]{8,128}$/.test(executionId)||typeof operationId!=="string"||!/^[a-zA-Z0-9_-]{8,128}$/.test(operationId)||!STATES.has(status)||artifactId!==null&&(typeof artifactId!=="string"||artifactId.length>256))throw new TypeError("Invalid build result");
   // This is project metadata, NOT a durable operation ledger.
   // Preserve unrelated content and do not store generated source or secrets.
   const result={executionId,operationId,status,artifactId};
   const rows=await execute("UPDATE public.projects SET content=jsonb_set(COALESCE(content,'{}'::jsonb),'{lastBuild}', $3::jsonb,true),updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING id,owner_id,updated_at",[projectId,ownerId,JSON.stringify(result)]);
   if(rows.length!==1)throw new Error("Project not found or inaccessible");
   return Object.freeze({projectId,ownerId,...result});
  }
 });
}
