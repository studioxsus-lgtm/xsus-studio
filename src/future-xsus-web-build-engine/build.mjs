import {createHash} from 'node:crypto';
import {validateProject} from './quality.mjs';
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
export function buildArchive(project){
 if(project?.status!=='draft'||project.publicationAuthorized!==false||!project.files||!Array.isArray(project.manifest))throw new TypeError('Invalid draft');
 const paths=Object.keys(project.files).sort();
 if(!paths.length||paths.length>500||project.manifest.length!==paths.length)throw new Error('Invalid manifest');
 const validation=validateProject(project.files);if(!validation.valid)throw new Error('Validation failed');
 const local=[],central=[];let offset=0,total=0;
 for(const path of paths){
 const content=Buffer.from(project.files[path]),name=Buffer.from(path),matches=project.manifest.filter(m=>m.path===path);
 total+=content.length;if(total>20000000)throw new Error('Archive too large');
 if(matches.length!==1||matches[0].bytes!==content.length||matches[0].sha256!==createHash('sha256').update(content).digest('hex'))throw new Error('Integrity mismatch');
 const crc=crc32(content),h=Buffer.alloc(30),d=Buffer.alloc(46);
 h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(content.length,18);h.writeUInt32LE(content.length,22);h.writeUInt16LE(name.length,26);
 d.writeUInt32LE(0x02014b50,0);d.writeUInt16LE(20,4);d.writeUInt16LE(20,6);d.writeUInt16LE(33,14);d.writeUInt32LE(crc,16);d.writeUInt32LE(content.length,20);d.writeUInt32LE(content.length,24);d.writeUInt16LE(name.length,28);d.writeUInt32LE(offset,42);
 local.push(h,name,content);central.push(d,name);offset+=h.length+name.length+content.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(paths.length,8);end.writeUInt16LE(paths.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 const archive=Buffer.concat([...local,directory,end]);
 return {archive,sha256:createHash('sha256').update(archive).digest('hex'),fileCount:paths.length,validation,publicationAuthorized:false};
}
