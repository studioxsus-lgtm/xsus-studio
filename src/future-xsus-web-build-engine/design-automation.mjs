import {composeLandingPage} from './visual.mjs';
const profiles={business:['ocean','comfortable','system'],commerce:['sand','comfortable','system'],portfolio:['midnight','spacious','serif'],education:['forest','comfortable','system'],dashboard:['ocean','compact','system'],blog:['sand','spacious','serif'],booking:['forest','comfortable','system'],custom:['ocean','comfortable','system']};
export function recommendDesign({type='custom',tone='neutral',motion=false}={}){
 if(!Object.hasOwn(profiles,type)||!['neutral','formal','creative','technical'].includes(tone)||typeof motion!=='boolean')throw TypeError('Invalid design preferences');
 let [palette,density,typography]=profiles[type];
 if(tone==='formal')typography='serif';
 if(tone==='creative'){palette='midnight';density='spacious'}
 if(tone==='technical'){typography='mono';density='compact'}
 return {theme:{palette,density,motion},typography,source:'deterministic_rules'};
}
export function inspectComposition(sections){
 if(!Array.isArray(sections)||!sections.length||sections.length>40)throw TypeError('Invalid sections');
 const findings=[],seen=new Set();
 for(const [index,s] of sections.entries()){
 if(!s||typeof s.title!=='string'||!s.title.trim())throw TypeError('Invalid section');
 const key=s.title.trim().toLowerCase();
 if(seen.has(key))findings.push({code:'duplicate_title',index});seen.add(key);
 if(s.type==='hero'&&index!==0)findings.push({code:'hero_position',index});
 if(s.type==='cta'&&!s.link)findings.push({code:'missing_action',index});
 }
 if(sections[0].type!=='hero')findings.push({code:'missing_leading_hero',index:0});
 return {score:Math.max(0,100-findings.length*10),findings,method:'structural_heuristic',visualVerified:false};
}
export function automateDesign({title,sections,language='en',preferences={}}={}){
 const recommendation=recommendDesign(preferences);
 const quality=inspectComposition(sections);
 const page=composeLandingPage({title,sections,language,theme:recommendation.theme,typography:recommendation.typography});
 return {recommendation,quality,page,reviewRequired:true,publicationAuthorized:false};
}
