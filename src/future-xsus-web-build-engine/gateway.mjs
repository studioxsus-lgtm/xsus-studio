import {createServer} from 'node:http';
import {createGenerationJobs} from './jobs.mjs';
export function createGenerationGateway({generate,verifyIdentity,jobOptions={},maxBodyBytes=65536}={}){
 if(!Number.isInteger(maxBodyBytes)||maxBodyBytes<1024||maxBodyBytes>1048576)throw TypeError('Invalid body limit');
 const jobs=createGenerationJobs({...jobOptions,generate,verifyIdentity});let ready=true;
 const server=createServer(async(req,res)=>{
 const send=(status,data)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 try{
 const url=req.url,method=req.method;
 if(method==='GET'&&url==='/health')return send(200,{status:'alive'});
 if(method==='GET'&&url==='/ready')return send(ready?200:503,{ready});
 if(!ready)return send(503,{error:'Service unavailable'});
 const match=/^\/jobs(?:\/([a-f0-9-]{36})(\/result)?)?$/.exec(url);
 if(!match)return send(404,{error:'Not found'});
 const auth=/^Bearer ([^\s]{1,8192})$/.exec(req.headers.authorization||'');if(!auth)return send(401,{error:'Unauthorized'});
 const token=auth[1],id=match[1];
 if(method==='POST'&&!id){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'Unsupported content type'});
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>maxBodyBytes){send(413,{error:'Body too large'});return}chunks.push(chunk)}
 let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return send(400,{error:'Invalid JSON'})}
 return send(202,await jobs.submit(token,input));
 }
 if(method==='GET'&&id)return send(200,match[2]?await jobs.result(token,id):await jobs.get(token,id));
 if(method==='DELETE'&&id&&!match[2])return send(200,await jobs.cancel(token,id));
 return send(405,{error:'Method not allowed'});
 }catch(e){const status=e instanceof TypeError?400:({'Unauthorized':401,'Not found':404,'Job capacity exceeded':429,'Result unavailable':409,'Job not queued':409}[e?.message]||500);return send(status,{error:status===500?'Internal error':status===400?'Invalid input':e.message})}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
 return Object.freeze({server,jobs,stopAccepting(){ready=false},isReady:()=>ready});
}
