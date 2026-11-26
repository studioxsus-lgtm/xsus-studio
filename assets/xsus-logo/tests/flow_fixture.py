fixture = """
const owner=()=>sessionStorage.owner||'user-a';
const auth={getUser:async()=>({data:{user:{id:owner()}}}),getSession:async()=>({data:{session:{access_token:'test'}}})};
function from(){
 let op='list',body,filters={};const q={
 select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(){return q.exec()},
 insert(v){op='insert';body=v;return q},update(v){op='update';body=v;return q},
 single(){return q.exec(true)},maybeSingle(){return q.exec(true)},
 async exec(one){let rows=JSON.parse(localStorage.rows||'[]'),items=rows.filter(r=>r.owner_id===owner()&&Object.entries(filters).every(([k,v])=>r[k]===v));
 if(op==='insert'){items=[{...body,id:crypto.randomUUID(),owner_id:owner(),revision:1}];rows.unshift(items[0])}
 if(op==='update')items.forEach(r=>Object.assign(r,body,{revision:r.revision+1}));
 localStorage.rows=JSON.stringify(rows);return {data:one?items[0]||null:items}}};return q}
import {mountStudio} from '/studio-controller.mjs';
mountStudio(document.querySelector('main'),{auth,from});
"""
shell = '<meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/studio.css"><select id="language-select"><option>en</option><option>fr</option><option>sq</option></select><main></main><script type="module">'+fixture+'</script>'
