import {createBookingRuntime} from './booking.mjs';
import {createNotificationRuntime} from './notifications.mjs';
import {createMediaRuntime} from './media.mjs';
import {createSecurityRuntime} from './security.mjs';
import {createSearchRuntime} from './query.mjs';
import {createAnalyticsRuntime} from './analytics.mjs';
import {createWorkflowRuntime,defineWorkflow} from './workflow.mjs';
import {quoteCart,prepareCheckout} from './commerce.mjs';
import {createApplicationState} from './runtime.mjs';
import {planRelations} from './relations.mjs';
const factories=Object.freeze({
 booking:c=>createBookingRuntime(c),
 notifications:c=>createNotificationRuntime(c),
 media:c=>createMediaRuntime(c),
 security:c=>createSecurityRuntime(c),
 query:c=>createSearchRuntime(c.resource,c),
 analytics:c=>createAnalyticsRuntime(c.resource,c),
 workflow:c=>createWorkflowRuntime(defineWorkflow(c.definition),c),
 commerce:()=>Object.freeze({quoteCart,prepareCheckout}),
 runtime:c=>createApplicationState(c.initial),
 relations:()=>Object.freeze({planRelations})
});
export function composeRuntime(plan,{approvedCapabilities=[],configuration={}}={}){
 if(!plan||plan.reviewRequired!==true||plan.executable!==false||!Array.isArray(plan.integrations)||!Array.isArray(approvedCapabilities))throw TypeError('Invalid integration plan');
 const names=plan.integrations.map(i=>i.engine);
 if(names.length>10||new Set(names).size!==names.length||names.some(n=>!Object.hasOwn(factories,n)))throw TypeError('Invalid engine selection');
 const approved=new Set(approvedCapabilities);
 if(approved.size!==approvedCapabilities.length||approvedCapabilities.some(n=>!names.includes(n)))throw TypeError('Invalid approval');
 const instances=Object.create(null),status=[];
 for(const engine of names){
 if(!approved.has(engine)){status.push({engine,status:'approval_required'});continue}
 if(!Object.hasOwn(configuration,engine)&&!['commerce','relations','runtime'].includes(engine)){status.push({engine,status:'configuration_required'});continue}
 const config=Object.hasOwn(configuration,engine)?configuration[engine]:{};
 instances[engine]=factories[engine](config);status.push({engine,status:'initialized'});
 }
 return Object.freeze({instances:Object.freeze(instances),status:Object.freeze(status.map(Object.freeze)),publicationAuthorized:false,externalDeliveryVerified:false});
}
