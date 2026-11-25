import {generateUnifiedProject} from './pipeline.mjs';
import {defineResource} from './backend.mjs';
const profiles={
 commerce:{pages:['Home','Catalog','Cart','Orders','Contact'],resources:[{name:'products',fields:{name:'string',price:'number',stock:'number'}},{name:'orders',fields:{total:'number',status:'string'}}],engines:['commerce','query','analytics','media','security']},
 booking:{pages:['Home','Services','Availability','Reservations','Contact'],resources:[{name:'services',fields:{name:'string',capacity:'number'}},{name:'reservations',fields:{start:'number',end:'number',status:'string'}}],engines:['booking','notifications','security']},
 business:{pages:['Home','About','Services','Contact'],resources:[],engines:['media','notifications']},
 dashboard:{pages:['Overview','Records','Reports','Settings'],resources:[{name:'records',fields:{name:'string',value:'number',category:'string'}}],engines:['query','analytics','security']},
 portfolio:{pages:['Home','Projects','About','Contact'],resources:[],engines:['media']},
 education:{pages:['Home','Courses','Lessons','Progress','Contact'],resources:[{name:'courses',fields:{title:'string',description:'string'}},{name:'progress',fields:{completed:'boolean'}}],engines:['workflow','query','security']},
 blog:{pages:['Home','Articles','About','Contact'],resources:[{name:'articles',fields:{title:'string',body:'string'}}],engines:['media','query','security']}
};
export function planBlueprint({name,type,language='en',design={}}={}){
 if(typeof name!=='string'||!name.trim()||name.length>120||!Object.hasOwn(profiles,type)||!['en','sq','fr'].includes(language))throw TypeError('Invalid blueprint');
 const p=profiles[type];
 const pages=p.pages.map((title,i)=>({path:i===0?'index.html':title.toLowerCase()+'.html',title,sections:[{type:'hero',title,text:name+' — '+title}]}));
 return {name:name.trim(),type,language,design:structuredClone(design),pages,resources:p.resources.map(r=>defineResource(r.name,r.fields)),integrations:p.engines.map(engine=>({engine,module:engine+'.mjs',wired:false})),reviewRequired:true,executable:false};
}
export function generateBlueprint(input){
 const plan=planBlueprint(input);
 const project=generateUnifiedProject({name:plan.name,pages:plan.pages,language:plan.language,design:plan.design});
 return {plan,project,publicationAuthorized:false,runtimeConnected:false};
}
