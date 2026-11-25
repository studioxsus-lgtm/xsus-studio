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
 const profiles=[
 [/restaurant|restorant|bistro/,[['menu','Menu','Menuja','Menu'],['reservations','Reservations','Rezervime','Réservations']]],
 [/hotel|hôtel|resort/,[['rooms','Rooms','Dhomat','Chambres'],['booking','Booking','Rezervime','Réservation']]],
 [/clinic|klinik|clinique|dentist/,[['team','Team','Ekipi','Équipe'],['appointments','Appointments','Takime','Rendez-vous']]],
 [/school|shkoll|education|éducation|academy|akademi/,[['courses','Courses','Kurset','Cours'],['admissions','Admissions','Regjistrime','Admissions']]],
 [/real estate|imobiliar|immobilier/,[['properties','Properties','Pronat','Biens'],['agents','Agents','Agjentët','Agents']]]
 ];
 const profile=profiles.find(([pattern])=>pattern.test(prompt));
 if(profile){const index=paths.indexOf('services.html');if(index>=0){paths.splice(index,1);titles.splice(index,1)}for(const row of profile[1]){paths.push(row[0]+'.html');titles.push(row[langIndex])}}
 const countMatch=prompt.match(/\b([1-9][0-9]?)\s*(?:pages?|faqe)\b/);
 const words=prompt.match(/\b(five|pesë|pese|cinq|six|gjashtë|gjasht[eë]|seven|shtatë|sept)\s+(?:pages?|faqe)\b/u);
 const count=countMatch?Number(countMatch[1]):words?({five:5,'pesë':5,pese:5,cinq:5,six:6,'gjashtë':6,gjashte:6,seven:7,'shtatë':7,sept:7}[words[1]]):null;
 if(count){for(const row of extra){if(paths.length>=count)break;if(!paths.includes(row[0]+'.html')){paths.push(row[0]+'.html');titles.push(row[langIndex])}}while(paths.length<count){paths.push('page-'+(paths.length+1)+'.html');titles.push(({en:'Page',sq:'Faqja',fr:'Page'}[body.language])+' '+(paths.length))}paths.length=count;titles.length=count}
 const copy={
 en:{intro:'Explore our approach and discover what we can create together.',agency:'Digital strategy, visual identity and responsive web experiences.',features:'Explore our expertise',items:[['Strategy','Define clear goals and a focused digital direction.'],['Design','Create accessible, distinctive visual experiences.'],['Development','Build responsive experiences for modern devices.']],contact:'Tell us about your project and the outcomes you want to achieve.',portfolio:'Explore the types of projects we can develop. Actual work samples can be added here.',about:'Discover our approach, values and working process.',next:'Start a conversation'},
 sq:{intro:'Zbuloni qasjen tonë dhe mundësitë e bashkëpunimit.',agency:'Strategji digjitale, identitet vizual dhe eksperienca web responsive.',features:'Zbuloni ekspertizën tonë',items:[['Strategji','Përcaktoni objektiva të qarta dhe drejtimin digjital.'],['Dizajn','Krijoni eksperienca vizuale të dallueshme dhe të aksesueshme.'],['Zhvillim','Ndërtoni eksperienca responsive për pajisjet moderne.']],contact:'Na tregoni për projektin dhe rezultatet që dëshironi të arrini.',portfolio:'Zbuloni llojet e projekteve që mund të zhvillojmë. Shembujt realë mund të shtohen këtu.',about:'Zbuloni qasjen, vlerat dhe procesin tonë të punës.',next:'Filloni një bashkëbisedim'},
 fr:{intro:'Découvrez notre approche et les possibilités de collaboration.',agency:'Stratégie digitale, identité visuelle et expériences web responsives.',features:'Découvrez notre expertise',items:[['Stratégie','Définissez des objectifs clairs.'],['Design','Créez des expériences visuelles accessibles.'],['Développement','Concevez des expériences adaptées aux appareils modernes.']],contact:'Présentez votre projet et vos objectifs.',portfolio:'Découvrez les types de projets possibles. Des réalisations réelles peuvent être ajoutées ici.',about:'Découvrez notre approche, nos valeurs et notre processus.',next:'Parlons de votre projet'}
 }[body.language];
 const agency=/agenc|agjenc|digital studio|studio digjital/.test(prompt);
 function sections(path,title){
 const hero={kind:'hero',title:path==='index.html'?body.name:title,body:path==='contact.html'?copy.contact:path==='portfolio.html'?copy.portfolio:path==='about.html'?copy.about:agency?copy.agency:copy.intro};
 const result=[hero];
 const sectorItems={
 menu:[['Starters','Main courses','Desserts'],['Antipasta','Pjata kryesore','Ëmbëlsira'],['Entrées','Plats','Desserts']],
 rooms:[['Room types','Amenities','Guest information'],['Llojet e dhomave','Komoditetet','Informacion për vizitorët'],['Types de chambres','Équipements','Informations voyageurs']],
 courses:[['Programs','Learning resources','Enrollment'],['Programet','Materialet mësimore','Regjistrimi'],['Programmes','Ressources pédagogiques','Inscription']],
 properties:[['Residential','Commercial','Property inquiries'],['Banesa','Prona komerciale','Kërkesa për prona'],['Résidentiel','Commercial','Demandes immobilières']],
 catalog:[['Categories','Product details','Availability'],['Kategoritë','Detajet e produkteve','Disponueshmëria'],['Catégories','Détails des produits','Disponibilité']],
 team:[['Specialties','Team profiles','Contact'],['Specializimet','Profilet e ekipit','Kontakti'],['Spécialités','Profils de l’équipe','Contact']]
 };
 const key=path.replace('.html','');
 if(Object.hasOwn(sectorItems,key)){const names=sectorItems[key][langIndex-1];const placeholder={en:'Details to be supplied by the website owner.',sq:'Detajet plotësohen nga pronari i website-it.',fr:'Informations à compléter par le propriétaire du site.'}[body.language];result.push({kind:'features',title,items:names.map(title=>({title,body:placeholder}))})}
 if(['reservations','booking','appointments','admissions','agents'].includes(key))result.push({kind:'cta',title:copy.next,body:copy.contact});

 if(agency&&['index.html','services.html'].includes(path))result.push({kind:'features',title:copy.features,items:copy.items.map(([title,body])=>({title,body}))});
 if(['index.html','services.html','portfolio.html','about.html'].includes(path))result.push({kind:'cta',title:copy.next,body:copy.contact});
 return result;
 }
 const premium=/premium|modern|neon|dark|errët|sombre/.test(prompt);
 return {contractVersion:'1.0.0',reviewRequired:true,executable:false,specification:{pages:paths.map((path,index)=>({path,title:titles[index],sections:sections(path,titles[index])})),resources:[],capabilities:[],design:premium?{palette:'studio',layout:'grid',density:'spacious',motion:/anim|motion/.test(prompt)}:{}}};
}
export function createWebPlanRoute(env){
 if(env.XSUS_WEB_PLAN_ENABLED!=='true')return null;
 const token=env.XSUS_WEB_PLAN_TOKEN;
 if(typeof token!=='string'||!/^[A-Za-z0-9._~-]{32,256}$/.test(token))throw Error('Invalid Web planning token');
 const expected=Buffer.from('Bearer '+token);
 return Object.freeze({authorized(header){const actual=Buffer.from(typeof header==='string'?header:'');return actual.length===expected.length&&timingSafeEqual(actual,expected)},plan:planWebDraft});
}
