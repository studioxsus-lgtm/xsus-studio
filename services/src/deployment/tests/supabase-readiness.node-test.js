import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSupabaseReadiness} from '../supabase-readiness.js';

const valid={SUPABASE_URL:'https://example-project.supabase.co/',SUPABASE_ANON_KEY:'public-test-key',SUPABASE_SERVICE_ROLE_KEY:'private-test-key'};
test('missing configuration fails closed without exposing secrets',()=>{
 const result=inspectSupabaseReadiness({});
 assert.equal(result.configured,false);
 assert.equal(result.deploymentEnabled,false);
 assert.equal(result.issues.length,3);
 assert.equal(JSON.stringify(result).includes('private-test-key'),false);
});
test('valid-shaped configuration is not authorization or deployment readiness',()=>{
 const result=inspectSupabaseReadiness(valid);
 assert.equal(result.configured,true);
 assert.equal(result.authorized,false);
 assert.equal(result.artifactsVerified,false);
 assert.equal(result.deploymentEnabled,false);
});
test('rejects non-Supabase and insecure URL',()=>{
 for(const url of ['http://example-project.supabase.co/','https://evil.example/','https://example-project.supabase.co.evil.example/','https://user:pass@example-project.supabase.co/']) {
  const result=inspectSupabaseReadiness({...valid,SUPABASE_URL:url});
  assert.equal(result.configured,false,url);
 }
});
test('rejects identical keys without printing either key',()=>{
 const result=inspectSupabaseReadiness({...valid,SUPABASE_SERVICE_ROLE_KEY:valid.SUPABASE_ANON_KEY});
 assert.equal(result.configured,false);
 assert.ok(result.issues.includes('KEYS_NOT_DISTINCT'));
 assert.ok(!JSON.stringify(result).includes(valid.SUPABASE_ANON_KEY));
});
test('result cannot be mutated to indicate deployment permission',()=>{
 const result=inspectSupabaseReadiness(valid);
 assert.throws(()=>{result.deploymentEnabled=true;},TypeError);
 assert.throws(()=>{result.issues.push('something');},TypeError);
});
