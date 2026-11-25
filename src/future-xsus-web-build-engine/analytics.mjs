import {defineResource} from './backend.mjs';
const q=k=>'"'+k+'"';
export function compileReport(resource,owner,{operation='count',field,groupBy,limit=100}={}){
 const s=defineResource(resource.name,resource.fields);
 if(typeof owner!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner))throw new TypeError('Invalid owner');
 if(!['count','sum','avg','min','max'].includes(operation)||!Number.isInteger(limit)||limit<1||limit>500)throw new TypeError('Invalid report');
 if(operation!=='count'&&(!Object.hasOwn(s.fields,field)||s.fields[field]!=='number'))throw new TypeError('Numeric field required');
 if(groupBy!==undefined&&(!Object.hasOwn(s.fields,groupBy)||!['string','boolean'].includes(s.fields[groupBy])))throw new TypeError('Invalid grouping');
 const aggregate=operation==='count'?'COUNT(*)':operation.toUpperCase()+'('+q(field)+')';
 const group=groupBy===undefined?'':q(groupBy);
 return {sql:'SELECT '+(group?group+' AS "group", ':'')+aggregate+' AS "value" FROM '+q(s.name)+' WHERE "owner_id" = $1'+(group?' GROUP BY '+group+' ORDER BY '+group:'')+' LIMIT $2',args:[owner,limit]};
}
export function createAnalyticsRuntime(resource,{query,verifyIdentity}={}){
 if(typeof query!=='function'||typeof verifyIdentity!=='function')throw new TypeError('Adapters required');
 const schema=defineResource(resource.name,resource.fields);
 return Object.freeze({async report(token,options){const p=await verifyIdentity(token);if(!p||typeof p.id!=='string')throw new Error('Unauthorized');const {sql,args}=compileReport(schema,p.id,options);const result=await query(sql,args);if(!Array.isArray(result?.rows))throw new Error('Invalid response');return result.rows}});
}
export function exportReportCsv(rows,{grouped=false}={}){
 if(!Array.isArray(rows)||rows.length>500||typeof grouped!=='boolean')throw new TypeError('Invalid report');
 function cell(v){if(v!==null&&!['string','number','boolean'].includes(typeof v))throw new TypeError('Invalid cell');let s=String(v??'');if(s.length>10000)throw new TypeError('Cell too long');if(typeof v==='string'&&/^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
 return [(grouped?'group,value':'value'),...rows.map(r=>grouped?[cell(r.group),cell(r.value)].join(','):cell(r.value))].join('\r\n')+'\r\n';
}
