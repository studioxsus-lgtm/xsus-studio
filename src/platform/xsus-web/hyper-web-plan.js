import {timingSafeEqual} from 'node:crypto';
export function planWebDraft(body){
 const i=body?.intent;
 if(body?.contractVersion!=='1.0.0'||body.executionAllowed!==false||i?.contractVersion!=='1.0.0'||i.status!=='ready'||i.executionAllowed!==false||typeof i.prompt!=='string'||!i.prompt.trim()||i.prompt.length>12000||typeof body.name!=='string'||!body.name.trim()||body.name.length>120||!['en','sq','fr'].includes(body.language)||i.language!==body.language)throw Error('Invalid web contract');
 const labels={en:['Home','About','Contact','Services','Catalog'],sq:['Ballina','Rreth nesh','Kontakt','Shërbimet','Katalogu'],fr:['Accueil','À propos','Contact','Services','Catalogue']}[body.language];
 const prompt=i.prompt.toLowerCase();
 const commerce=/shop|store|commerce|dyqan|boutique|magasin/.test(prompt);
 const paths=['index.html','about.html','contact.html',commerce?'catalog.html':'services.html'];
 const titles=[...labels.slice(0,3),labels[commerce?4:3]];
 return {contractVersion:'1.0.0',reviewRequired:true,executable:false,specification:{pages:paths.map((path,index)=>({path,title:titles[index],sections:[{kind:'hero',title:index===0?body.name:titles[index],body:titles[index]}]})),resources:[],capabilities:[],design:{}}};
}
export function createWebPlanRoute(env){
 if(env.XSUS_WEB_PLAN_ENABLED!=='true')return null;
 const token=env.XSUS_WEB_PLAN_TOKEN;
 if(typeof token!=='string'||!/^[A-Za-z0-9._~-]{32,256}$/.test(token))throw Error('Invalid Web planning token');
 const expected=Buffer.from('Bearer '+token);
 return Object.freeze({authorized(header){const actual=Buffer.from(typeof header==='string'?header:'');return actual.length===expected.length&&timingSafeEqual(actual,expected)},plan:planWebDraft});
}
