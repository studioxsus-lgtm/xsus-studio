import {createServer} from 'node:http';
import {defineResource,createCrudRuntime} from './backend.mjs';
import {createDatabaseRuntime} from './database.mjs';
export function createFullStackService({resources,verifyIdentity,query,maxBodyBytes=65536}={}){
 if(!Array.isArray(resources)||!resources.length||resources.length>30||typeof verifyIdentity!=='function'||!Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<1||maxBodyBytes>1000000||(query!==undefined&&typeof query!=='function'))throw new TypeError('Invalid configuration');
 const runtimes=new Map();
 for(const r of resources){const schema=defineResource(r.name,r.fields);if(runtimes.has(schema.name))throw new TypeError('Duplicate resource');runtimes.set(schema.name,query?createDatabaseRuntime(schema,{query,verifyIdentity}):createCrudRuntime(schema,{verifyIdentity}))}
 return createServer({requestTimeout:10000,headersTimeout:5000,maxHeaderSize:8192},async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 try{
 const match=/^\/([a-z][a-z0-9_]{0,62})(?:\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}))?$/i.exec(req.url);
 const runtime=match&&runtimes.get(match[1]);if(!runtime)return send(404,{error:'Not found'});
 const id=match[2],method=req.method,allowed=id?['GET','PATCH','DELETE']:['GET','POST'];
 if(!allowed.includes(method)){res.setHeader('Allow',allowed.join(', '));return send(405,{error:'Method not allowed'})}
 const token=/^Bearer ([^\s]+)$/.exec(req.headers.authorization??'')?.[1];if(!token)return send(401,{error:'Unauthorized'});
 let body;
 if(method==='POST'||method==='PATCH'){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??''))return send(415,{error:'Unsupported media type'});
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>maxBodyBytes){res.setHeader('Connection','close');send(413,{error:'Payload too large'});return}chunks.push(chunk)}
 try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return send(400,{error:'Invalid JSON'})}
 }
 const result=method==='POST'?await runtime.create(token,body):method==='PATCH'?await runtime.update(token,id,body):method==='DELETE'?await runtime.remove(token,id):id?await runtime.get(token,id):await runtime.list(token);
 return send(method==='POST'?201:200,result);
 }catch(e){const status=e?.message==='Unauthorized'?401:e?.message==='Not found'?404:e instanceof TypeError?400:500;if(!res.headersSent)send(status,{error:status===500?'Internal error':status===400?'Invalid data':e.message})}
 });
}
