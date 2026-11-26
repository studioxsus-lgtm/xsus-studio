import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, inspectDNS } from '../index.mjs';
test('normalizes ASCII and IDN', () => {
  assert.equal(normalizeDomain(' Example.COM. '), 'example.com');
  assert.equal(normalizeDomain('bücher.de'), 'xn--bcher-kva.de');
});
for (const value of ['https://example.com','a..com','-a.com','a-.com','127.0.0.1','localhost','a_b.com','a.com/path',null]) {
  test('rejects invalid domain '+value, () => assert.throws(() => normalizeDomain(value)));
}
test('preserves real resolver responses and does not infer registration availability', async () => {
  const resolver = {resolve: async (name,type) => {assert.equal(name,'example.com'); if(type==='A') return ['192.0.2.1']; throw Object.assign(new Error(),{code:'ENODATA'});}};
  const result = await inspectDNS('example.com',{resolver,types:['A','MX']});
  assert.deepEqual(result.records.A,{status:'resolved',values:['192.0.2.1']});
  assert.equal(result.records.MX.status,'no_data');
  assert.equal(result.registrationAvailability,'unknown');
});
test('timeout remains unknown', async () => {
  const resolver={resolve:async()=>{throw Object.assign(new Error(),{code:'ETIMEOUT'});}};
  assert.equal((await inspectDNS('example.com',{resolver,types:['A']})).records.A.status,'unknown');
});
test('rejects unsupported DNS type', async () => {
  await assert.rejects(inspectDNS('example.com',{types:['ANY']}));
});
