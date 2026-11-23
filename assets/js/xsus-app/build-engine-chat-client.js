import {getUserAccessToken} from './auth-session.js';
const ENDPOINT='https://xsus-app-build-api-staging.onrender.com/api/build/from-goal';
export async function buildFromChatGoal(goal,{signal}={}){
  if(typeof goal!=='string'||!goal.trim()||goal.length>2000)throw new TypeError('Invalid application goal');
  const token=await getUserAccessToken();
  if(!token)throw new Error('Sign in to XSUS Studio to generate an application.');
  const response=await fetch(ENDPOINT,{method:'POST',mode:'cors',cache:'no-store',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({goal}),signal});
  if(!response.ok)throw new Error(response.status===401?'Session expired. Sign in again.':'Build Engine unavailable ('+response.status+').');
  const result=await response.json();
  if(result?.kind!=='static-preview'||result.requiresReview!==true||!Array.isArray(result.files)||result.files.length!==3)throw new Error('Invalid Build Engine response');
  const files=new Map(result.files.map(file=>[file.path,file.content]));
  if(files.size!==3||!['index.html','styles.css','main.js'].every(p=>typeof files.get(p)==='string'&&files.get(p).length>0&&files.get(p).length<=250000))throw new Error('Invalid generated files');
  const doc=new DOMParser().parseFromString(files.get('index.html'),'text/html');
  doc.querySelectorAll('script,link,iframe,object,embed,base,form,meta[http-equiv]').forEach(node=>node.remove());
  doc.querySelectorAll('*').forEach(node=>{for(const attr of [...node.attributes]){if(/^on/i.test(attr.name)||['src','srcset','srcdoc','formaction','target'].includes(attr.name.toLowerCase())||(node.localName==='a'&&attr.name.toLowerCase()==='href'))node.removeAttribute(attr.name);}});
  const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";doc.head.prepend(csp);
  const style=doc.createElement('style');style.textContent=files.get('styles.css');doc.head.append(style);
  const script=doc.createElement('script');script.textContent=files.get('main.js');doc.body.append(script);
  return {html:'<!doctype html>'+doc.documentElement.outerHTML,files:Object.fromEntries(files),requiresReview:true};
}
