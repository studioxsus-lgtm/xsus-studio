import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {creativeConcepts} from './creative.mjs';
export function createLogoServer({token,orchestrator,userGateway}={}){if(typeof token!=='string'||token.length<32)throw new Error('Service token required');const expected=Buffer.from('Bearer '+token);return createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))};try{
if(req.url==='/v1/public/generate'||req.url==='/v4/public/edit'||req.url==='/v5/public/brand'){
 const origin=req.headers.origin;
 if(origin&&!['https://www.xsusstudio.com','https://xsusstudio.com'].includes(origin))return send(403,{error:'origin_denied'});
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
 if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.writeHead(204);return res.end()}
 if(req.method!=='POST')return send(405,{error:'method_not_allowed'});
 if(!userGateway)return send(503,{error:'gateway_unavailable'});
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))return send(415,{error:'unsupported_media_type'});
 let size=0;const parts=[];
 for await(const chunk of req){size+=chunk.length;if(size>32768)return send(413,{error:'payload_too_large'});parts.push(chunk)}
 const input=JSON.parse(Buffer.concat(parts).toString('utf8'));
 const result=await userGateway({authorization:req.headers.authorization,input,...(req.url==='/v4/public/edit'?{route:'edit'}:req.url==='/v5/public/brand'?{route:'brand'}:{})});
 if(result.artifact){const {mime,bytes}=result.artifact;res.writeHead(200,{'content-type':mime,'content-disposition':'attachment','cache-control':'no-store','x-content-type-options':'nosniff','content-length':bytes.length});return res.end(bytes);}
 return send(result.status,result.body);
}
if(req.method==='GET'&&req.url==='/health')return send(200,{status:'ok',service:'future-xsus-logo-engine'});const auth=Buffer.from(req.headers.authorization??'');if(auth.length!==expected.length||!timingSafeEqual(auth,expected))return send(401,{error:'unauthorized'});if(req.method!=='POST'||!['/v1/concepts','/v1/generate'].includes(req.url))return send(404,{error:'not_found'});if(req.url==='/v1/generate'&&!orchestrator)return send(503,{error:'core_adapters_unavailable'});if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))return send(415,{error:'unsupported_media_type'});let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>32768){send(413,{error:'payload_too_large'});return}chunks.push(chunk)}const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));const result=req.url==='/v1/concepts'?{concepts:creativeConcepts(input)}:await orchestrator.generate(input);return send(200,result)}catch(e){if(!res.headersSent)send(e instanceof TypeError||e instanceof RangeError||e instanceof SyntaxError?400:500,{error:'request_failed'})}})}
