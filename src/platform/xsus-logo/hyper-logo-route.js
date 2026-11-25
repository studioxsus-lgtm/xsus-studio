import {timingSafeEqual} from 'node:crypto';
import {decideLogo} from './hyper-logo-design.js';
export function createLogoPlanRoute(env={}){
 if(env.XSUS_LOGO_PLAN_ENABLED!=='true') return null;
 const token=env.XSUS_LOGO_PLAN_TOKEN;
 if(typeof token!=='string'||! /^[A-Za-z0-9._~-]{32,256}$/.test(token)) throw new Error('Invalid logo service token');
 const expected=Buffer.from('Bearer '+token);
 return Object.freeze({
 authorized(value){if(typeof value!=='string')return false;const actual=Buffer.from(value);return actual.length===expected.length&&timingSafeEqual(actual,expected);},
 plan(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='brief,operation,requestId,version')throw new TypeError('Invalid contract');
 const brief=data.brief;
 if(!brief||typeof brief!=='object'||Array.isArray(brief)||Object.keys(brief).some(k=>!['name','primary','secondary','industry','style'].includes(k)))throw new TypeError('Invalid brief');
 for(const k of ['industry','style'])if(brief[k]!=null&&(typeof brief[k]!=='string'||brief[k].length>64))throw new TypeError('Invalid brief');
 return decideLogo(data);
 }
 });
}
