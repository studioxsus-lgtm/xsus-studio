import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPersistentGateway} from '../persistent-gateway.mjs';
const origin='https://www.xsusstudio.com';
test('rejects unsafe origin configuration',()=>assert.throws(()=>createPersistentGateway({runtime:{generate(){},get(){},list(){},download(){}},allowedOrigins:['*']})));
test('browser origin isolation and preflight',async()=>{
 const runtime={generate(){},get(){},list(){return []},download(){}};
 const {server}=createPersistentGateway({runtime,allowedOrigins:[origin]});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
 const url='http://127.0.0.1:'+server.address().port+'/projects';
 const pre=await fetch(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
 assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),origin);
 const denied=await fetch(url,{headers:{Origin:'https://evil.example',Authorization:'Bearer test'}});
 assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
 const unauth=await fetch(url,{headers:{Origin:origin}});assert.equal(unauth.status,401);
 const allowed=await fetch(url,{headers:{Origin:origin,Authorization:'Bearer test'}});assert.equal(allowed.status,200);
 const invalid=await fetch(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'DELETE'}});assert.equal(invalid.status,403);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
