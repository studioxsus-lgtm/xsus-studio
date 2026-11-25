import {generateCustomWebsite} from './universal.mjs';
import {composeRuntime} from './integration.mjs';
import {createFullStackService} from './service.mjs';
export function assembleApplication(spec,{verifyIdentity,query,approvedCapabilities=[],configuration={},approveApi=false,maxBodyBytes=65536}={}){
 if(typeof approveApi!=='boolean')throw TypeError('Invalid API approval');
 const {plan,project}=generateCustomWebsite(spec);
 if(project.status!=='draft'||project.validation?.valid!==true)throw Error('Project validation failed');
 const runtime=composeRuntime(plan,{approvedCapabilities,configuration});
 const routes=plan.resources.flatMap(r=>[
 {method:'GET',path:'/'+r.name},{method:'POST',path:'/'+r.name},
 ...['GET','PATCH','DELETE'].map(method=>({method,path:'/'+r.name+'/:id'}))
 ]);
 let server=null;
 if(approveApi&&plan.resources.length){
 if(typeof verifyIdentity!=='function')throw TypeError('Identity adapter required');
 if(query!==undefined&&typeof query!=='function')throw TypeError('Invalid database adapter');
 server=createFullStackService({resources:spec.resources,verifyIdentity,query,maxBodyBytes});
 }
 return {plan,project,runtime,server,routes,apiStatus:server?'initialized':routes.length?'approval_required':'not_required',databaseMode:server?(query?'injected':'memory'):'inactive',frontendConnected:false,publicationAuthorized:false};
}
