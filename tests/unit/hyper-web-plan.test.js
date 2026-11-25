import {describe,it,expect} from 'vitest';
import {planWebDraft,createWebPlanRoute} from '../../src/platform/xsus-web/hyper-web-plan.js';
const request=(language='en',prompt='Business website')=>({contractVersion:'1.0.0',executionAllowed:false,name:'Example',language,intent:{contractVersion:'1.0.0',status:'ready',executionAllowed:false,prompt,language}});
describe('Hyper Web planning',()=>{
 it('plans four pages without execution',()=>{const r=planWebDraft(request());expect(r.specification.pages).toHaveLength(4);expect(r.executable).toBe(false);expect(r.reviewRequired).toBe(true)});
 it('plans commerce',()=>expect(planWebDraft(request('sq','Dyqan')).specification.pages.some(p=>p.path==='catalog.html')).toBe(true));
 it('localizes French',()=>expect(planWebDraft(request('fr')).specification.pages[0].title).toBe('Accueil'));
 it('rejects execution',()=>expect(()=>planWebDraft({...request(),executionAllowed:true})).toThrow());
 it('rejects version mismatch',()=>expect(()=>planWebDraft({...request(),contractVersion:'2'})).toThrow());
 it('disabled by default',()=>expect(createWebPlanRoute({})).toBeNull());
 it('rejects short token',()=>expect(()=>createWebPlanRoute({XSUS_WEB_PLAN_ENABLED:'true',XSUS_WEB_PLAN_TOKEN:'short'})).toThrow());
 it('requires exact bearer token',()=>{const token='a'.repeat(32);const route=createWebPlanRoute({XSUS_WEB_PLAN_ENABLED:'true',XSUS_WEB_PLAN_TOKEN:token});expect(route.authorized('Bearer '+token)).toBe(true);expect(route.authorized('Bearer '+'b'.repeat(32))).toBe(false)});
});
