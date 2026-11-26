import tls from 'node:tls';
import {resolvePublicTarget} from './network.mjs';
import {normalizeDomain} from './index.mjs';
export async function inspectCertificate(input,{resolve,now=Date.now()}={}){
 const domain=normalizeDomain(input);
 let target;
 try{target=await resolvePublicTarget(domain,{resolve});}catch{return {domain,status:'unknown',reason:'target_rejected_or_unresolved'};}
 return new Promise(resolveResult=>{
 let socket,timer,done=false;
 const finish=result=>{if(done)return;done=true;clearTimeout(timer);socket?.destroy();resolveResult({domain,...result});};
 try{
 socket=tls.connect({host:target.address,port:443,servername:domain,rejectUnauthorized:true,minVersion:'TLSv1.2',checkServerIdentity:(_host,cert)=>tls.checkServerIdentity(domain,cert)});
 timer=setTimeout(()=>finish({status:'unknown',reason:'timeout'}),5000);
 socket.once('error',e=>finish({status:'unknown',reason:String(e.code||'TLS_ERROR')}));
 socket.once('secureConnect',()=>{
 const cert=socket.getPeerCertificate();const expiry=Date.parse(cert.valid_to);
 if(!socket.authorized||!Number.isFinite(expiry))return finish({status:'unknown',reason:'invalid_certificate'});
 finish({status:'verified',expiresAt:new Date(expiry).toISOString(),daysRemaining:Math.ceil((expiry-now)/86400000),protocol:socket.getProtocol(),fingerprint:cert.fingerprint256,scope:'single_ipv4_endpoint_port_443'});
 });
 }catch{finish({status:'unknown',reason:'connection_failed'});}
 });
}
