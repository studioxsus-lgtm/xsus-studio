import test from 'node:test';
import assert from 'node:assert/strict';
import {handleProjectReviewHttp} from '../project-review-http-handler.js';
const id='d9cc8dbd-1d05-46db-8de1-0c83b46d633c';
const origin='https://www.xsusstudio.com';
const request={method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+ 'x'.repeat(40)},body:JSON.stringify({projectId:id})};
test('authenticated owner blocked by missing builder receives a distinct 409',async()=>{
 const result=await handleProjectReviewHttp(request,{allowedOrigins:[origin],
  createProjectReviewer:()=>({review:async()=>({status:'denied',reason:'BUILD_PREFLIGHT_FAILED',deployed:false})})});
 assert.equal(result.status,409);
 assert.deepEqual(result.body,{status:'blocked',reason:'BUILD_NOT_AVAILABLE',deployed:false});
});
test('unauthorized project remains a generic 403 without leaking ownership',async()=>{
 const result=await handleProjectReviewHttp(request,{allowedOrigins:[origin],
  createProjectReviewer:()=>({review:async()=>({status:'denied',reason:'PROJECT_OWNERSHIP_NOT_VERIFIED',deployed:false})})});
 assert.equal(result.status,403);
 assert.deepEqual(result.body,{status:'denied',reason:'REVIEW_DENIED',deployed:false});
});
test('unexpected backend failure never returns a ready or deployed status',async()=>{
 const result=await handleProjectReviewHttp(request,{allowedOrigins:[origin],
  createProjectReviewer:()=>{throw Error('private backend details')}});
 assert.equal(result.status,503);
 assert.equal(result.body.deployed,false);
 assert.equal(JSON.stringify(result.body).includes('private backend details'),false);
});
