import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedTheme} from './thematic-symbols.mjs';
import {brandKit} from './brand.mjs';
for(const [theme,terms] of Object.entries({botanical:['leaf','gjethe','feuille'],mountain:['mountain','mal','montagne'],coffee:['coffee','kafe','café']})){
 test(theme+' briefs produce three editable marks',()=>{
  for(const term of terms) assert.equal(requestedTheme('Logo "Orion" '+term,'Orion'),theme);
  const {variants}=brandKit({name:'Orion',theme});
  assert.equal(new Set(variants.map(v=>JSON.stringify(v.document.layers))).size,3);
  for(const v of variants){assert.match(v.svg,/<path/);assert.equal(v.document.layers.at(-1).text,'Orion')}
 });
}
test('long names fit and the brand name alone does not pick an industry',()=>{
 const name='W'.repeat(75);
 const v=brandKit({name,theme:'coffee'}).variants[0];
 assert.ok(v.document.layers.at(-1).fontSize*name.length<512);
 assert.equal(requestedTheme('Design a leaf for "Mountain"','Mountain'),'botanical');
 assert.equal(requestedTheme('Brand "Coffee"','Coffee'),undefined);
});

test('Albanian coffee inflections match whole words',()=>{
 for(const word of ['kafesë','kafese','kafenë','kafeja','kafenesë','kafesë'.normalize('NFD')])
   assert.equal(requestedTheme('Logo e '+word+' "VELORA"','VELORA'),'coffee');
 assert.equal(requestedTheme('Logo për kafshët "VELORA"','VELORA'),undefined);
});

for(const [theme,words] of Object.entries({music:['music','muzikës','musique'],marine:['ocean','detit','nautique'],architecture:['architecture','arkitekturës','architectes']})){
 test(theme+' marks respond to category and brand',()=>{
  for(const word of words) assert.equal(requestedTheme('Logo "ECHO" '+word,'ECHO'),theme);
  const variants=name=>brandKit({name,theme}).variants.map(v=>v.symbol);
  assert.equal(new Set(variants('ECHO')).size,3);
  assert.deepEqual(variants('ECHO'),variants('ECHO'));
  assert.notDeepEqual(new Set(variants('ECHO')),new Set(variants('ORBIT')));
 });
}
