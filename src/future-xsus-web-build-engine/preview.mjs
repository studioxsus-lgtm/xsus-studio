import {createServer} from 'node:http';
import {validateProject} from './quality.mjs';
const csp="default-src 'none'; style-src 'self'; img-src 'self'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; sandbox";
export function createPreviewServer(project){
 if(project?.status!=='draft'||project.publicationAuthorized!==false||!project.files)throw new TypeError('Invalid draft');
 const files=Object.assign(Object.create(null),project.files);
 if(!validateProject(files).valid)throw new Error('Invalid project');
 if(Object.keys(files).length>500||Object.values(files).some(v=>typeof v!=='string')||Object.values(files).reduce((n,v)=>n+Buffer.byteLength(v),0)>20000000)throw new Error('Preview limits exceeded');
 const server=createServer({requestTimeout:5000,headersTimeout:5000,maxHeaderSize:8192},(req,res)=>{
 res.setHeader('Content-Security-Policy',csp);
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Frame-Options','DENY');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end()}
 const raw=req.url;
 if(typeof raw!=='string'||!/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*(?:\.(?:html|css))?$/.test(raw)){res.writeHead(404);return res.end()}
 const path=raw==='/'?'index.html':raw.slice(1);
 if(!Object.hasOwn(files,path)||! /\.(html|css)$/.test(path)){res.writeHead(404);return res.end()}
 const body=files[path];res.writeHead(200,{'Content-Type':path.endsWith('.html')?'text/html; charset=utf-8':'text/css; charset=utf-8','Content-Length':Buffer.byteLength(body)});res.end(req.method==='HEAD'?undefined:body);
 });
 server.maxConnections=16;server.keepAliveTimeout=1000;
 return {async start(){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',reject);resolve()})});return 'http://127.0.0.1:'+server.address().port},async stop(){await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))},scriptExecution:false,publicationAuthorized:false};
}
