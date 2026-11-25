import {createApiClient,mountCrud} from './client.mjs';
import {defineResource} from './backend.mjs';
export function createFrontendRuntime({document,resources,getToken,fetchImpl=globalThis.fetch}={}){
 if(!document||typeof document.createElement!=='function'||!Array.isArray(resources)||resources.length>30||typeof getToken!=='function'||typeof fetchImpl!=='function')throw TypeError('Invalid frontend configuration');
 const schemas=new Map(),mounted=new Map();
 for(const r of resources){const schema=defineResource(r.name,r.fields);if(schemas.has(r.name))throw TypeError('Duplicate resource');schemas.set(r.name,schema)}
 return Object.freeze({
 resources:()=>[...schemas.keys()],
 async mount(resource,container){
 if(!schemas.has(resource)||!container||typeof container.replaceChildren!=='function'||mounted.has(container))throw TypeError('Invalid mount');
 const schema=schemas.get(resource),client=createApiClient({resource,getToken,fetchImpl});
 const host=document.createElement('div');host.setAttribute('aria-busy','true');container.replaceChildren(host);mounted.set(container,host);
 try{const view=mountCrud({document,container:host,client,fields:schema.fields});await view.refresh();host.setAttribute('aria-busy','false');return view}catch(e){if(mounted.get(container)===host){mounted.delete(container);container.replaceChildren();}throw e}
 },
 unmount(container){if(!mounted.has(container))return false;mounted.delete(container);container.replaceChildren();return true}
 });
}
