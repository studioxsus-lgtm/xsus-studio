import {describe,it,expect} from 'vitest';
import {decideLogo} from './hyper-logo-design.js';
const req=(brief={})=>({version:'1.0.0',operation:'logo.plan',requestId:'test',brief:{name:'Nova',...brief}});
describe('logo design decisions',()=>{
 for(const [style,layout] of [['modern','horizontal'],['minimal','icon'],['classic','stacked'],['luxury','stacked']]) it(style,()=>expect(decideLogo(req({style})).design.layout).toBe(layout));
 it('long name',()=>expect(decideLogo(req({name:'A'.repeat(30)})).design.layout).toBe('stacked'));
 it('missing name',()=>expect(decideLogo(req({name:' '})).approved).toBe(false));
 it('low contrast',()=>expect(decideLogo(req({primary:'#ffffff',secondary:'#ffffff'})).review_required).toBe(true));
 it('control characters',()=>expect(decideLogo(req({name:'A\u0000B'})).reasons).toContain('invalid_brand_text'));
 it('usage profiles',()=>expect(decideLogo(req()).design.usage.map(x=>x.target)).toEqual(['website','avatar','print']));
 it('invalid color',()=>expect(()=>decideLogo(req({primary:'url(x)'}))).toThrow());
});
