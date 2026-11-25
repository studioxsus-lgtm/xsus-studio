import {createSourceEditor} from './source-editor.mjs';
export function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
export function importArchive(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<22||bytes.length>22000000)throw TypeError('Invalid archive');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=p=>d.getUint16(p,true),u32=p=>d.getUint32(p,true);
 const fail=()=>{throw Error('Invalid ZIP structure')};
 const end=bytes.length-22;
 if(u32(end)!==0x06054b50||u16(end+4)||u16(end+6)||u16(end+20))fail();
 const count=u16(end+10),start=u32(end+16);
 if(!count||count>500||u16(end+8)!==count||start+u32(end+12)!==end)fail();
 const decoder=new TextDecoder('utf-8',{fatal:true}),files=Object.create(null),seen=new Set();
 let p=start,local=0,total=0;
 for(let i=0;i<count;i++){
 if(p+46>end||u32(p)!==0x02014b50||u16(p+8)||u16(p+10)||u16(p+30)||u16(p+32)||u16(p+34))fail();
 const crc=u32(p+16),size=u32(p+24),n=u16(p+28),offset=u32(p+42);
 if(size!==u32(p+20)||size>1000000||!n||n>200||p+46+n>end||offset!==local||offset+30+n+size>start)fail();
 if(u32(offset)!==0x04034b50||u16(offset+6)||u16(offset+8)||u32(offset+14)!==crc||u32(offset+18)!==size||u32(offset+22)!==size||u16(offset+26)!==n||u16(offset+28))fail();
 const path=decoder.decode(bytes.subarray(p+46,p+46+n));
 if(path!==decoder.decode(bytes.subarray(offset+30,offset+30+n))||!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(html|css|js|mjs)$/.test(path)||seen.has(path.toLowerCase()))fail();
 seen.add(path.toLowerCase());
 const content=bytes.subarray(offset+30+n,offset+30+n+size);
 total+=size;if(total>20000000||crc32(content)!==crc)fail();
 files[path]=decoder.decode(content);local=offset+30+n+size;p+=46+n;
 }
 if(p!==end||local!==start)fail();
 return {files:createSourceEditor(files).snapshot().files,fileCount:count,executable:false,publicationAuthorized:false};
}
export async function importArchiveBlob(blob){if(!blob||typeof blob.arrayBuffer!=='function'||!Number.isSafeInteger(blob.size)||blob.size>22000000)throw TypeError('Invalid archive blob');return importArchive(new Uint8Array(await blob.arrayBuffer()))}

