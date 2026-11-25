import {timingSafeEqual} from 'node:crypto';
export function planWebDraft(body){
 const i=body?.intent;
 if(body?.contractVersion!=='1.0.0'||body.executionAllowed!==false||i?.contractVersion!=='1.0.0'||i.status!=='ready'||i.executionAllowed!==false||typeof i.prompt!=='string'||!i.prompt.trim()||i.prompt.length>12000||typeof body.name!=='string'||!body.name.trim()||body.name.length>120||!['en','sq','fr'].includes(body.language)||i.language!==body.language)throw Error('Invalid web contract');
 const labels={en:['Home','About','Contact','Services','Catalog'],sq:['Ballina','Rreth nesh','Kontakt','Shërbimet','Katalogu'],fr:['Accueil','À propos','Contact','Services','Catalogue']}[body.language];
 const prompt=i.prompt.toLowerCase();
 const commerce=/shop|store|commerce|dyqan|boutique|magasin/.test(prompt);
 const extra=[
 ['portfolio','Portfolio','Portofoli','Portfolio',/portfolio|portofol|réalisations/],
 ['blog','Blog','Blog','Blog',/\bblog\b/],
 ['pricing','Pricing','Çmimet','Tarifs',/pricing|çmimet|tarifs/],
 ['faq','FAQ','Pyetje të shpeshta','FAQ',/\bfaq\b|pyetje të shpeshta/],
 ['gallery','Gallery','Galeria','Galerie',/gallery|galeri/]
 ];
 const paths=['index.html','about.html','contact.html',commerce?'catalog.html':'services.html'];
 const titles=[...labels.slice(0,3),labels[commerce?4:3]];
 const langIndex={en:1,sq:2,fr:3}[body.language];
 for(const row of extra)if(row[4].test(prompt)){paths.push(row[0]+'.html');titles.push(row[langIndex])}
 const countMatch=prompt.match(/\b([1-9][0-9]?)\s*(?:pages?|faqe)\b/);
 const words=prompt.match(/\b(five|pesë|pese|cinq|six|gjashtë|gjasht[eë]|seven|shtatë|sept)\s+(?:pages?|faqe)\b/u);
 const count=countMatch?Number(countMatch[1]):words?({five:5,'pesë':5,pese:5,cinq:5,six:6,'gjashtë':6,gjashte:6,seven:7,'shtatë':7,sept:7}[words[1]]):null;
 if(count){for(const row of extra){if(paths.length>=count)break;if(!paths.includes(row[0]+'.html')){paths.push(row[0]+'.html');titles.push(row[langIndex])}}while(paths.length<count){paths.push('page-'+(paths.length+1)+'.html');titles.push(({en:'Page',sq:'Faqja',fr:'Page'}[body.language])+' '+(paths.length))}paths.length=count;titles.length=count}
 const premium=/premium|modern|neon|dark|errët|sombre/.test(prompt);
 return {contractVersion:'1.0.0',reviewRequired:true,executable:false,specification:{pages:paths.map((path,index)=>({path,title:titles[index],sections:[{kind:'hero',title:index===0?body.name:titles[index],body:titles[index]}]})),resources:[],capabilities:[],design:premium?{palette:'studio',layout:'grid',density:'spacious',motion:/anim|motion/.test(prompt)}:{}}};
}
export function createWebPlanRoute(env){
 if(env.XSUS_WEB_PLAN_ENABLED!=='true')return null;
 const token=env.XSUS_WEB_PLAN_TOKEN;
 if(typeof token!=='string'||!/^[A-Za-z0-9._~-]{32,256}$/.test(token))throw Error('Invalid Web planning token');
 const expected=Buffer.from('Bearer '+token);
 return Object.freeze({authorized(header){const actual=Buffer.from(typeof header==='string'?header:'');return actual.length===expected.length&&timingSafeEqual(actual,expected)},plan:planWebDraft});
}
