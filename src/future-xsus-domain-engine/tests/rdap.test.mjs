import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverDomain} from '../rdap.mjs';
const mock=(status,body)=>async url=>String(url).includes('iana.org')?{ok:true,json:async()=>({services:[[['com'],['https://rdap.example/']]]})}:{status,ok:status===200,json:async()=>body};
test('registered domain',async()=>assert.equal((await discoverDomain('example.com',{fetcher:mock(200,{objectClassName:'domain',ldhName:'EXAMPLE.COM'})})).registrationStatus,'registered'));
test('404 is not proof of availability',async()=>assert.equal((await discoverDomain('example.com',{fetcher:mock(404)})).availability,'unknown'));
test('rate limit remains unknown',async()=>assert.equal((await discoverDomain('example.com',{fetcher:mock(429)})).registrationStatus,'unknown'));
test('mismatched domain rejected',async()=>assert.equal((await discoverDomain('example.com',{fetcher:mock(200,{objectClassName:'domain',ldhName:'other.com'})})).registrationStatus,'unknown'));
