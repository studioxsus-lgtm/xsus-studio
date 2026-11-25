import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateUnifiedProject} from '../pipeline.mjs';
import {buildArchive} from '../build.mjs';
import {importArchive,importArchiveBlob} from '../archive-import.mjs';
function fixture(){const project=generateUnifiedProject({name:'Site',pages:[{path:'index.html',title:'Home',sections:[{kind:'hero',title:'Home',body:'Welcome'}]},{path:'about.html',title:'About',sections:[{kind:'hero',title:'About',body:'About us'}]}]});return {project,archive:buildArchive(project).archive}}
test('roundtrip generated source',()=>{const {project,archive}=fixture();assert.deepEqual(importArchive(archive).files,{...project.files})});
test('blob import',async()=>{const {archive}=fixture();assert.equal((await importArchiveBlob(new Blob([archive]))).fileCount,3)});
test('reject truncated archive',()=>assert.throws(()=>importArchive(fixture().archive.subarray(0,-1))));
test('reject corrupted content',()=>{const {archive}=fixture();archive[30+archive.readUInt16LE(26)]^=1;assert.throws(()=>importArchive(archive))});
test('reject compressed flag',()=>{const {archive}=fixture();archive.writeUInt16LE(8,8);assert.throws(()=>importArchive(archive))});
test('reject invalid central offset',()=>{const {archive}=fixture();archive.writeUInt32LE(0,archive.length-6);assert.throws(()=>importArchive(archive))});
test('reject invalid input',()=>assert.throws(()=>importArchive('zip')));
test('never execute or publish',()=>{const r=importArchive(fixture().archive);assert.equal(r.executable,false);assert.equal(r.publicationAuthorized,false)});
