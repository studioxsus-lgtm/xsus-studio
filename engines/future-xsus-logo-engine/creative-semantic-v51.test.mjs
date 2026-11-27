import test from 'node:test';import assert from 'node:assert/strict';import {semanticDirections} from './creative-v2/semantic-direction.mjs';
test('semantic direction differentiates premium and futuristic brands',()=>{assert.equal(semanticDirections({traits:{audience:['premium']}})[0],'crown');assert.equal(semanticDirections({traits:{style:['futuristic']}})[0],'orbit');});
test('industry family influences generic requests',()=>{assert.equal(semanticDirections({profile:{family:'network'}})[0],'lattice');});
test('all eight directions remain available without duplicates',()=>{const d=semanticDirections({traits:{mood:['trust']},profile:{family:'network'}});assert.equal(d.length,8);assert.equal(new Set(d).size,8);});
