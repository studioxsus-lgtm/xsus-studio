import {getUserAccessToken} from './auth-session.js';
import {reservationAppSpec} from './app-specification/reservations.js?v=reservation2';
import {createDraftPlan} from './hyper-future-bridge-client.js?v=20261122-goalplan1';

// The installed Build Engine accepts a single goal and classifies its first
// 100 characters. Prioritize the reviewed domain before adding plan detail.
const buildDomains = [
  ['booking', /\b(bookings?|appointments?|reservations?)\b/i],
  ['store', /\b(shops?|stores?|inventory|products?|ecommerce)\b/i],
  ['budget', /\b(budgets?|expenses?|finance)\b/i],
  ['tasks', /\b(tasks?|todos?|kanban|project management|detyr[a-zë]*|projekt[a-zë]*)\b/i]
];
function plannedBuildGoal(goal, result) {
  const reviewed = result.language?.text;
  const tasks = result.plan.steps.map(step => step?.task);
  if (typeof reviewed !== 'string' || !reviewed.trim() || !tasks.length ||
      tasks.some(task => typeof task !== 'string' || !task.trim())) {
    throw new Error('Invalid planning response');
  }
  const detail = tasks.join('\n');
  const domain = [reviewed, goal, detail].map(text =>
    buildDomains.find(([, pattern]) => pattern.test(text))?.[0]
  ).find(Boolean);
  // Put supported capabilities in the short worker name and retain the full
  // reviewed goal and steps in the public API request.
  const search = /\b(search|searchable|rechercher|kërkim)\b/i.test(reviewed + '\n' + detail);
  const header = domain ? '[XSUS ' + domain + (search ? ' search' : '') + ']' : '';
  let brief = [header, reviewed, detail].filter(Boolean).join('\n').slice(0, 2000);
  const encoder = new TextEncoder();
  while (encoder.encode(JSON.stringify({goal:brief})).length > 4096) {
    brief = brief.slice(0, Math.floor(brief.length * 0.9));
  }
  return brief;
}
const ENDPOINT='https://xsus-app-build-api-staging.onrender.com/api/build/from-goal';
export async function buildFromChatGoal(goal,{steps,signal,onPlan}={}){
  if(typeof goal!=='string'||!goal.trim()||goal.length>2000)throw new TypeError('Invalid application goal');
  const plan = await createDraftPlan({goal, steps, signal});
  signal?.throwIfAborted();
  const buildGoal = plannedBuildGoal(goal, plan);
  onPlan?.(plan);
  if (plan.status === 'review_required' || plan.language?.review_required || plan.plan.requiresHumanReview) {
    const labels = {sq:'Të krijohet parapamja sipas këtij plani?', fr:'Créer l’aperçu à partir de ce plan ?', en:'Build a preview from this plan?'};
    const question = labels[document.documentElement.lang] || labels.en;
    if (!window.confirm([question, plan.language?.text, ...plan.plan.steps.map(step => step.task)].join('\n'))) {
      throw new Error('Plan review cancelled.');
    }
  }
  const appSpec = reservationAppSpec(goal, plan);
  const payload = appSpec ? {goal:plan.language.text.trim().slice(0,100), appSpec} : {goal:buildGoal};
  const token=await getUserAccessToken();
  if(!token)throw new Error('Sign in to XSUS Studio to generate an application.');
  const response=await fetch(ENDPOINT,{method:'POST',mode:'cors',cache:'no-store',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload),signal});
  if(!response.ok)throw new Error(response.status===401?'Session expired. Sign in again.':'Build Engine unavailable ('+response.status+').');
  const result=await response.json();
  if(result?.kind!=='static-preview'||result.requiresReview!==true||!Array.isArray(result.files)||result.files.length!==3)throw new Error('Invalid Build Engine response');
  const files=new Map(result.files.map(file=>[file.path,file.content]));
  if(files.size!==3||!['index.html','styles.css','main.js'].every(p=>typeof files.get(p)==='string'&&files.get(p).length>0&&files.get(p).length<=250000))throw new Error('Invalid generated files');
  const doc=new DOMParser().parseFromString(files.get('index.html'),'text/html');
  if (appSpec) {
    const requiredControls = [
      'select[name="resource"]', 'input[name="time"][type="datetime-local"]',
      appSpec.resource === 'table' ? 'input[name="party"][type="number"]' : 'select[name="service"]'
    ];
    if (!requiredControls.every(selector => doc.querySelector('form ' + selector))) {
      const messages = {
        sq: 'Motori ktheu një formular rezervimi pa opsionet e kërkuara. Provo përsëri.',
        fr: 'Le moteur a renvoyé un formulaire sans les options de réservation demandées. Réessayez.',
        en: 'The build engine returned a form without the requested booking options. Please retry.'
      };
      throw new Error(messages[document.documentElement.lang] || messages.en);
    }
  }
  doc.querySelectorAll('script,link,iframe,object,embed,base,meta[http-equiv]').forEach(node=>node.remove());
  doc.querySelectorAll('*').forEach(node=>{for(const attr of [...node.attributes]){if(/^on/i.test(attr.name)||['src','srcset','srcdoc','formaction','target'].includes(attr.name.toLowerCase())||(node.localName==='a'&&attr.name.toLowerCase()==='href'))node.removeAttribute(attr.name);}});
  const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";doc.head.prepend(csp);
  const style=doc.createElement('style');style.textContent=files.get('styles.css');doc.head.append(style);
  const script=doc.createElement('script');script.textContent=files.get('main.js');doc.body.append(script);
  return {html:'<!doctype html>'+doc.documentElement.outerHTML,files:Object.fromEntries(files),requiresReview:true};
}
