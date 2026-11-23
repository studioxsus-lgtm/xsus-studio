import {describe,expect,it} from 'vitest';
import {JSDOM} from 'jsdom';
import {createBuildWorkerServer} from '../../services/src/build-worker/standalone-worker.js';
import {createStandaloneDeploymentServer} from '../../services/src/deployment/standalone-server.js';

const origin = 'https://xsusstudio.com';
const secret = 'x'.repeat(40);
const barber = {version:1,rule:'exclusive-time-range',resource:'barber',serviceMinutes:{haircut:30,trim:15,styling:60}};
const table = {version:1,rule:'exclusive-time-range',resource:'table',ruleCapacity:'party-fits-table',seats:[2,4,6],durationMinutes:90};
async function listen(server) {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return 'http://127.0.0.1:'+server.address().port;
}
async function build(spec) {
  const worker=createBuildWorkerServer({sharedSecret:secret,previewEnabled:true});
  const workerUrl=await listen(worker);
  const api=createStandaloneDeploymentServer({allowedOrigins:[origin],userPreviewEnabled:true,
    createUserPreviewClient:()=>({auth:{getUser:async()=>({data:{user:{id:'fixture'}}})}}),
    previewProxy:async request=>(await fetch(workerUrl+'/internal/static-preview',{method:'POST',
      headers:{authorization:'Bearer '+secret},body:JSON.stringify(request)})).json()});
  try {
    const apiUrl=await listen(api);
    const response=await fetch(apiUrl+'/api/build/from-goal',{method:'POST',headers:{origin,
      authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({goal:'Reservations',appSpec:spec})});
    expect(response.status).toBe(200);
    const {files}=await response.json();
    const dom=new JSDOM(files.find(f=>f.path==='index.html').content,{url:origin,runScripts:'outside-only'});
    dom.window.eval(files.find(f=>f.path==='main.js').content);
    return dom;
  } finally {
    await Promise.all([api,worker].map(server=>new Promise(resolve=>server.close(resolve))));
  }
}
function ui(dom) {
  const form=dom.window.document.querySelector('form');
  const fields=form.elements;
  function change(name,value){
    fields[name].value=value;
    fields[name].dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  }
  function book(resource){
    fields.customer.value='Client';
    fields.resource.value=resource;
    form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  }
  return {change,book,options:()=>Array.from(fields.resource.options,o=>o.value),
    count:()=>dom.window.document.querySelectorAll('li').length};
}
describe('reservation AppSpec through the goal API and authenticated worker',()=>{
  it('blocks overlaps for the selected barber and allows another barber or an adjacent appointment',async()=>{
    const dom=await build(barber);
    const app=ui(dom);
    app.change('time','2027-02-10T10:00');app.book('0');
    app.change('time','2027-02-10T10:15');
    expect(app.options()).toEqual(['1']);
    app.book('0');expect(app.count()).toBe(1);
    app.book('1');expect(app.count()).toBe(2);
    app.change('time','2027-02-10T10:30');expect(app.options()).toEqual(['0']);
    dom.window.close();
  });
  it('filters by capacity and occupancy and releases a cancelled table',async()=>{
    const dom=await build(table);
    const app=ui(dom);
    app.change('time','2027-02-10T19:00');app.change('party','6');
    expect(app.options()).toEqual(['2']);
    app.book('1');expect(app.count()).toBe(0);
    app.book('2');expect(app.count()).toBe(1);
    app.change('time','2027-02-10T20:00');app.change('party','6');
    expect(app.options()).toEqual(['']);
    dom.window.document.querySelector('li button').click();
    expect(app.options()).toEqual(['2']);
    dom.window.close();
  });
});
