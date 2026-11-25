import {prepareExport} from './quality.mjs';
import {planResource} from './backend.mjs';
export function planMigration(resources){
 if(!Array.isArray(resources)||!resources.length||resources.length>30)throw new TypeError('Invalid resources');
 const plans=resources.map(r=>planResource(r.name,r.fields));
 if(new Set(plans.map(p=>p.schema.name)).size!==plans.length)throw new TypeError('Duplicate resource');
 const statements=plans.flatMap(p=>{
 const table='"'+p.schema.name+'"';
 return [p.sql,'ALTER TABLE '+table+' ENABLE ROW LEVEL SECURITY;','ALTER TABLE '+table+' FORCE ROW LEVEL SECURITY;','CREATE POLICY owner_access ON '+table+' FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());'];
 });
 return {dialect:'supabase-postgresql',sql:['BEGIN;',...statements,'COMMIT;'].join('\n'),resources:plans.map(p=>p.schema),reviewRequired:true,executable:false};
}
export function assembleFullStack(input,{resources,interactive={},metadata={}}={}){
 const migration=planMigration(resources);
 const website=prepareExport(input,interactive,metadata);
 const routes=migration.resources.flatMap(r=>planResource(r.name,r.fields).routes);
 return {status:'draft',website,migration,routes,configuration:{required:['DATABASE_URL','AUTH_ISSUER'],secretsIncluded:false},integration:{httpRuntime:'http.mjs',databaseRuntime:'database.mjs',frontendRuntime:'client.mjs',wired:false},reviewRequired:true,executable:false,publicationAuthorized:false};
}
