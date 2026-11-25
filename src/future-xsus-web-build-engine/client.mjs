export function createApiClient({resource,getToken,fetchImpl=globalThis.fetch}={}){
 if(typeof resource!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(resource)||typeof getToken!=='function'||typeof fetchImpl!=='function')throw new TypeError('Invalid client configuration');
 async function request(method,id,data){
  if(id!==undefined&&(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)))throw new TypeError('Invalid record id');
  const token=await getToken();
  if(typeof token!=='string'||!token||/\s/.test(token))throw new Error('Authentication required');
  const response=await fetchImpl('/'+resource+(id?'/'+id:''),{method,credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+token,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(!response.ok)throw new Error('API request failed: '+response.status);
  return response.json();
 }
 return Object.freeze({list:()=>request('GET'),get:id=>request('GET',id),create:data=>request('POST',undefined,data),update:(id,data)=>request('PATCH',id,data),remove:id=>request('DELETE',id)});
}
export function filterRecords(records,query,fields){
 if(!Array.isArray(records)||!Array.isArray(fields)||typeof query!=='string')throw new TypeError('Invalid filter');
 const q=query.trim().toLowerCase();
 return records.filter(record=>fields.some(field=>Object.hasOwn(record,field)&&String(record[field]).toLowerCase().includes(q))||!q);
}
export function mountCrud({document,container,client,fields}){
 if(!document||!container||!client||!fields||!Object.keys(fields).length)throw new TypeError('Invalid UI configuration');
 const entries=Object.entries(fields);
 if(entries.some(([k,t])=>!/^[a-z][a-z0-9_]{0,62}$/.test(k)||!['string','number','boolean'].includes(t)))throw new TypeError('Invalid fields');
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
 const form=el('form'),status=el('output'),search=el('input'),table=el('table'),submit=el('button','Save'),cancel=el('button','Cancel');
 status.setAttribute('aria-live','polite');search.type='search';search.setAttribute('aria-label','Search records');submit.type='submit';cancel.type='button';
 const inputs=entries.map(([key,type])=>{const label=el('label',key),input=el('input');input.type=type==='boolean'?'checkbox':type==='number'?'number':'text';if(type==='number')input.step='any';input.required=type!=='boolean';label.append(input);form.append(label);return [key,type,input]});
 form.append(submit,cancel);container.replaceChildren(form,search,status,table);
 let records=[],editing=null,busy=false;
 function reset(){editing=null;form.reset()}
 function render(){const head=el('tr');for(const key of [...Object.keys(fields),'Actions'])head.append(el('th',key));table.replaceChildren(head);for(const record of filterRecords(records,search.value,Object.keys(fields))){const row=el('tr');for(const [key] of entries)row.append(el('td',String(record[key]??'')));const actions=el('td'),edit=el('button','Edit'),remove=el('button','Delete');edit.type=remove.type='button';edit.onclick=()=>{if(busy)return;editing=record.id;for(const [k,t,input] of inputs){if(t==='boolean')input.checked=record[k];else input.value=String(record[k]??'')}};remove.onclick=()=>run(async()=>{await client.remove(record.id);if(editing===record.id)reset();await refresh()});actions.append(edit,remove);row.append(actions);table.append(row)}}
 async function refresh(){records=await client.list();render()}
 async function run(fn){if(busy)return;busy=true;submit.disabled=true;try{await fn();status.textContent='Ready'}catch{status.textContent='Operation failed'}finally{busy=false;submit.disabled=false}}
 form.onsubmit=e=>{e.preventDefault();return run(async()=>{const data=Object.fromEntries(inputs.map(([k,t,input])=>[k,t==='boolean'?input.checked:t==='number'?input.valueAsNumber:input.value]));if(editing)await client.update(editing,data);else await client.create(data);reset();await refresh()})};
 cancel.onclick=()=>{if(!busy)reset()};search.oninput=render;
 return {refresh:()=>run(refresh)};
}
