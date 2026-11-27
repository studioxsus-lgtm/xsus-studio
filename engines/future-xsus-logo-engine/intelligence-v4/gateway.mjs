import {projectAction} from './project.mjs';
export async function editProject({url,headers,owner,input,fetchImpl,plan}){
 const endpoint=new URL('/rest/v1/logo_projects',url);
 endpoint.search=new URLSearchParams({id:'eq.'+input.projectId,owner_id:'eq.'+owner,select:'id,name,revision,document'});
 const options={headers,redirect:'error',signal:AbortSignal.timeout(8000)};
 const read=await fetchImpl(endpoint,options);if(!read.ok)return {status:503,body:{error:'storage_unavailable'}};
 const [row]=await read.json();if(!row)return {status:404,body:{error:'project_not_found'}};
 let change;
 try{change=await projectAction(row,input,plan)}catch(e){
 const error=/^[a-z][a-z_]{1,60}$/.test(e.message)?e.message:'invalid_edit';
 return {status:error==='project_conflict'?409:error==='core_unavailable'?503:422,body:{error}};
 }
 if(!change.document)return {status:200,body:change.result};
 endpoint.searchParams.set('revision','eq.'+input.revision);endpoint.searchParams.set('select','id,revision');
 const response=await fetchImpl(endpoint,{...options,method:'PATCH',signal:AbortSignal.timeout(8000),headers:{...headers,'content-type':'application/json',prefer:'return=representation'},body:JSON.stringify({document:change.document})});
 if(!response.ok)return {status:503,body:{error:'storage_unavailable'}};
 const [saved]=await response.json();return saved?{status:200,body:{...change.result,revision:saved.revision}}:{status:409,body:{error:'project_conflict'}};
}
