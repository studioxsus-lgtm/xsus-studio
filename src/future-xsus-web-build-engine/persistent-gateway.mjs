import {createServer} from 'node:http';
import {createObservability} from './observability.mjs';
import {createAdmission} from './admission.mjs';
export function createPersistentGateway({runtime,maxBodyBytes=65536,admission=createAdmission(),allowedOrigins=[]}={}){
 if(!runtime||['generate','get','list','download'].some(k=>typeof runtime[k]!=='function')||!Number.isInteger(maxBodyBytes)||maxBodyBytes<1024||maxBodyBytes>1048576)throw TypeError('Invalid gateway configuration');
 if(!Array.isArray(allowedOrigins)||allowedOrigins.length>10||allowedOrigins.some(origin=>{try{const u=new URL(origin);return u.protocol!=='https:'||u.origin!==origin}catch{return true}}))throw TypeError('Invalid allowed origins');
 const origins=new Set(allowedOrigins);
 const metrics=createObservability();
 let ready=true;
 const server=createServer(async(req,res)=>{
 const end=metrics.begin();res.once('finish',()=>end(res.statusCode));res.once('close',()=>end(null));
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const send=(status,data)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
 const origin=req.headers.origin;
 if(origin&&origins.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Vary']='Origin';headers['Access-Control-Expose-Headers']='Content-Disposition'}
 let release;
 try{
 if(req.method==='GET'&&req.url==='/health')return send(200,{status:'alive'});
 if(req.method==='GET'&&req.url==='/ready')return send(ready?200:503,{ready});
 if(!ready)return send(503,{error:'Service unavailable'});
 const match=/^\/projects(?:\/([a-f0-9-]{36})(\/download)?)?$/.exec(req.url);
 const versionMatch=/^\/projects\/([a-f0-9-]{36})\/versions(?:\/([1-9][0-9]{0,14})(\/restore)?)?$/.exec(req.url);
 if(!match&&!versionMatch)return send(404,{error:'Not found'});
 if(origin&&!origins.has(origin))return send(403,{error:'Origin forbidden'});
 if(req.method==='OPTIONS'){
 if(!origin||!['GET','POST'].includes(req.headers['access-control-request-method']))return send(403,{error:'Preflight forbidden'});
 const requested=(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
 if(requested.some(x=>!['authorization','content-type'].includes(x)))return send(403,{error:'Preflight forbidden'});
 res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'});return res.end();
 }
 const auth=/^Bearer ([^\s]{1,8192})$/.exec(req.headers.authorization||'');if(!auth)return send(401,{error:'Unauthorized'});
 release=admission.acquire(req.socket.remoteAddress||'unknown');
 const token=auth[1];
 if(versionMatch){
 const [,project,number,restore]=versionMatch;
 if(typeof runtime.listVersions!=='function')return send(404,{error:'Not found'});
 if(req.method==='GET'&&!restore)return send(200,number?await runtime.getVersion(token,project,Number(number)):await runtime.listVersions(token,project));
 if(req.method!=='POST'||(number&&!restore))return send(405,{error:'Method not allowed'});
 if(!/^application[/]json(?:\s*;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'Unsupported content type'});
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>maxBodyBytes){send(413,{error:'Body too large'});return}chunks.push(chunk)}
 let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return send(400,{error:'Invalid JSON'})}
 if(!input||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw TypeError('Invalid revision');
 return send(201,restore?await runtime.restoreVersion(token,project,Number(number),input.expectedRevision):await runtime.saveVersion(token,project,input.files,input.expectedRevision));
 }
 const id=match[1];
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
 }catch(e){const status=e instanceof TypeError?400:({'Unauthorized':401,'Not found':404,'Artifact unavailable':409,'Revision conflict':409,'Version not found':404,'History quota exceeded':507,'Draft unavailable':422,'Generation capacity exceeded':429,'Registry capacity exceeded':429,'Rate limit exceeded':429,'Rate capacity exceeded':429,'Service capacity exceeded':503,'Quota exceeded':507}[e?.message]||500);return send(status,{error:status===500?'Internal error':status===400?'Invalid input':e.message})}finally{release?.()}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
 return Object.freeze({server,stopAccepting(){ready=false},isReady:()=>ready,metrics:()=>metrics.snapshot()});
}
