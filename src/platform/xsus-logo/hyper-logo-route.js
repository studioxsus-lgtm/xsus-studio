import {createHash,timingSafeEqual} from 'node:crypto';
import {decideLogo} from './hyper-logo-design.js';
export function createLogoPlanRoute(env={}){
 if(env.XSUS_LOGO_PLAN_ENABLED!=='true') return null;
 const token=env.XSUS_LOGO_PLAN_TOKEN;
 if(typeof token!=='string'||! /^[A-Za-z0-9._~-]{32,256}$/.test(token)) throw new Error('Invalid logo service token');
 const expected=Buffer.from('Bearer '+token);
 return Object.freeze({
 authorized(value){if(typeof value!=='string')return false;const actual=Buffer.from(value);return actual.length===expected.length&&timingSafeEqual(actual,expected);},
 plan(data){
 if(data?.operation==='brand.plan')return planBrand(data);
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='brief,operation,requestId,version')throw new TypeError('Invalid contract');
 const brief=data.brief;
 if(!brief||typeof brief!=='object'||Array.isArray(brief)||Object.keys(brief).some(k=>!['name','primary','secondary','industry','style'].includes(k)))throw new TypeError('Invalid brief');
 for(const k of ['industry','style'])if(brief[k]!=null&&(typeof brief[k]!=='string'||brief[k].length>64))throw new TypeError('Invalid brief');
 return decideLogo(data);
 }
 });
}

export function planBrand(data){const {version,requestId,revision,sourceHash,intent,digest}=data;if(version!=='5.0.0'||typeof requestId!=='string'||! /^[A-Za-z0-9_-]{1,80}$/.test(requestId)||!Number.isSafeInteger(revision)||revision<0||! /^[a-f0-9]{64}$/.test(sourceHash)||!intent||Object.keys(intent).sort().join(',')!=='action,format,language,mockup,name,profile')throw TypeError('Invalid brand contract');const expected=createHash('sha256').update(JSON.stringify({sourceHash,revision,intent})).digest('hex');if(digest!==expected)throw TypeError('Invalid digest');const approved=['guidelines','mockup','animation','package'].includes(intent.action)&&['en','fr','sq'].includes(intent.language)&&typeof intent.name==='string'&&intent.name.trim().length>0&&intent.name.length<=120&&['svg','png','gif','mp4','webm'].includes(intent.format)&&typeof intent.profile==='string'&&intent.profile.length<=64&&typeof intent.mockup==='string'&&intent.mockup.length<=100;return {version,requestId,digest,approved,review_required:!approved};}
