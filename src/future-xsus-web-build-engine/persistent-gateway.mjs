import {createServer} from 'node:http';
import {createAdmission} from './admission.mjs';
export function createPersistentGateway({runtime,maxBodyBytes=65536,admission=createAdmission()}={}){
 if(!runtime||['generate','get','list','download'].some(k=>typeof runtime[k]!=='function')||!Number.isInteger(maxBodyBytes)||maxBodyBytes<1024||maxBodyBytes>1048576)throw TypeError('Invalid gateway configuration');
 let ready=true;
 const server=createServer(async(req,res)=>{
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const send=(status,data)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
 let release;
 try{
 if(req.method==='GET'&&req.url==='/health')return send(200,{status:'alive'});
 if(req.method==='GET'&&req.url==='/ready')return send(ready?200:503,{ready});
 if(!ready)return send(503,{error:'Service unavailable'});
 const match=/^\/projects(?:\/([a-f0-9-]{36})(\/download)?)?$/.exec(req.url);
 if(!match)return send(404,{error:'Not found'});
 const auth=/^Bearer ([^\s]{1,8192})$/.exec(req.headers.authorization||'');if(!auth)return send(401,{error:'Unauthorized'});
 release=admission.acquire(req.socket.remoteAddress||'unknown');
 const token=auth[1],id=match[1];
 if(req.method==='GET'){
 if(!id)return send(200,await runtime.list(token));
 if(!match[2])return send(200,await runtime.get(token,id));
 const result=await runtime.download(token,id);
 res.writeHead(200,{...headers,'Content-Type':'application/zip','Content-Disposition':'attachment; filename="website.zip"','Content-Length':result.archive.length});return res.end(result.archive);
 }
 if(req.method==='POST'&&!id){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'Unsupported content type'});
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>maxBodyBytes){send(413,{error:'Body too large'});return}chunks.push(chunk)}
 let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return send(400,{error:'Invalid JSON'})}
 return send(201,await runtime.generate(token,input));
 }
 return send(405,{error:'Method not allowed'});
 }catch(e){const status=e instanceof TypeError?400:({'Unauthorized':401,'Not found':404,'Artifact unavailable':409,'Draft unavailable':422,'Generation capacity exceeded':429,'Registry capacity exceeded':429,'Rate limit exceeded':429,'Rate capacity exceeded':429,'Service capacity exceeded':503,'Quota exceeded':507}[e?.message]||500);return send(status,{error:status===500?'Internal error':status===400?'Invalid input':e.message})}finally{release?.()}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
 return Object.freeze({server,stopAccepting(){ready=false},isReady:()=>ready});
}
