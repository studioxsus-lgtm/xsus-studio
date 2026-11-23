// APK Signature Scheme v2, stored ZIP entries, Android API 24+.
const encoder = new TextEncoder();
const bytes = (...values) => Uint8Array.from(values);
const u16 = n => bytes(n, n >>> 8);
const u32 = n => bytes(n, n >>> 8, n >>> 16, n >>> 24);
const u64 = n => join(u32(n), u32(0));
function join(...parts) {
  const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
const sized = p => join(u32(p.length), p);
const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const digest = async p => new Uint8Array(await crypto.subtle.digest('SHA-256', p));
const sign = async (key, p) => new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, p));
export const createSigningKey = () => crypto.subtle.generateKey({
  name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:bytes(1,0,1), hash:'SHA-256'
}, false, ['sign','verify']);

function der(tag, ...parts) {
  const body = join(...parts);
  const length = body.length;
  const size = length < 128 ? bytes(length) : length < 256 ? bytes(129,length) : bytes(130,length >>> 8,length);
  return join(bytes(tag),size,body);
}
async function certificate(key, publicKey) {
  const sequence = (...items) => der(0x30,...items);
  const algorithm = sequence(der(6,bytes(42,134,72,134,247,13,1,1,11)),der(5));
  const name = sequence(der(0x31,sequence(der(6,bytes(85,4,3)),der(12,encoder.encode('XSUS App local signing')))));
  const dates = sequence(der(23,encoder.encode('200101000000Z')),der(24,encoder.encode('20991231235959Z')));
  const tbs = sequence(der(2,bytes(1)),algorithm,name,dates,name,publicKey);
  return sequence(tbs,algorithm,der(3,bytes(0),await sign(key,tbs)));
}

// AAPT emits an unstyled UTF-16 string pool at the start of this fixed manifest.
function manifest(template, packageName, title, versionCode) {
  const view = new DataView(template.buffer, template.byteOffset);
  const start = 8;
  const oldSize = view.getUint32(start+4,true), count = view.getUint32(start+8,true);
  const dataStart = view.getUint32(start+20,true);
  if (view.getUint16(start,true)!==1 || view.getUint32(start+12,true) || view.getUint32(start+16,true))
    throw new Error('Unsupported Android manifest template');
  const pool = template.slice(start,start+dataStart);
  const header = new DataView(pool.buffer);
  const strings = [];
  let size = 0;
  let versionAttribute = -1;
  for (let i=0; i<count; i++) {
    const offset = start+dataStart+header.getUint32(28+i*4,true);
    const length = view.getUint16(offset,true);
    let value = new TextDecoder('utf-16le').decode(template.subarray(offset+2,offset+2+length*2));
    if (value==='com.xsusstudio.app.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') value=packageName;
    if (value==='versionCode') versionAttribute=i;
    if (value==='1.0') value=versionCode+'.0';
    if (value==='XSUS_APPLICATION_TITLE') value=title;
    const data=new Uint8Array(4+value.length*2);
    const out=new DataView(data.buffer);
    out.setUint16(0,value.length,true);
    for(let j=0;j<value.length;j++) out.setUint16(2+j*2,value.charCodeAt(j),true);
    header.setUint32(28+i*4,size,true);
    strings.push(data); size+=data.length;
  }
  const padding = new Uint8Array((4-size%4)%4);
  header.setUint32(4,pool.length+size+padding.length,true);
  const result=join(template.slice(0,start),pool,...strings,padding,template.slice(start+oldSize));
  const xml=new DataView(result.buffer);
  xml.setUint32(4,result.length,true);
  // Patch the typed integer in the manifest start element. The string pool
  // alone only changes versionName, which Android displays to the user.
  let patched=false;
  for(let pos=start+header.getUint32(4,true);pos<result.length;) {
    const chunkSize=xml.getUint32(pos+4,true);
    if(chunkSize<8 || pos+chunkSize>result.length) throw new Error('Invalid manifest chunk');
    if(xml.getUint16(pos,true)===0x0102) {
      const ext=pos+xml.getUint16(pos+2,true);
      const attrs=ext+xml.getUint16(ext+8,true);
      const stride=xml.getUint16(ext+10,true), count=xml.getUint16(ext+12,true);
      for(let i=0;i<count;i++){
        const attr=attrs+i*stride;
        if(xml.getUint32(attr+4,true)===versionAttribute && xml.getUint8(attr+15)===0x10){
          xml.setUint32(attr+16,versionCode,true);
          patched=true;
        }
      }
      break;
    }
    pos+=chunkSize;
  }
  if(!patched) throw new Error('Android manifest lacks a versionCode');
  return result;
}
const crcTable = Uint32Array.from({length:256},(_,n)=>{
  for(let i=0;i<8;i++) n=(n>>>1)^((n&1)?0xedb88320:0);
  return n;
});
function archive(entries) {
  const locals=[], directory=[];
  let offset=0;
  for(const [name,data] of entries) {
    const path=encoder.encode(name);
    let crc=0xffffffff;
    for(const b of data) crc=crcTable[(crc^b)&255]^(crc>>>8);
    const common=join(u16(20),u16(0),u16(0),u16(0),u16(33),u32(~crc),u32(data.length),u32(data.length),u16(path.length));
    const pad=(4-(offset+30+path.length)%4)%4;
    const extra=pad ? join(u16(0xffff),u16(pad),new Uint8Array(pad)) : bytes();
    const local=join(u32(0x04034b50),common,u16(extra.length),path,extra,data);
    locals.push(local);
    directory.push(join(u32(0x02014b50),u16(20),common,u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),path));
    offset+=local.length;
  }
  const central=join(...directory);
  const end=join(u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(central.length),u32(offset),u16(0));
  return {body:join(...locals),central,end};
}
async function signedArchive(entries, keys) {
  const {body,central,end}=archive(entries);
  const chunks=[];
  for(const section of [body,central,end]) {
    for(let i=0;i<section.length;i+=1048576) {
      const chunk=section.subarray(i,i+1048576);
      chunks.push(await digest(join(bytes(0xa5),u32(chunk.length),chunk)));
    }
  }
  const hash=await digest(join(bytes(0x5a),u32(chunks.length),...chunks));
  const pub=new Uint8Array(await crypto.subtle.exportKey('spki',keys.publicKey));
  const cert=await certificate(keys.privateKey,pub);
  const record = data => sized(join(u32(0x0103),sized(data)));
  const signedData=join(sized(record(hash)),sized(sized(cert)),sized(bytes()));
  const signer=join(sized(signedData),sized(record(await sign(keys.privateKey,signedData))),sized(pub));
  const value=sized(sized(signer));
  const pair=join(u64(4+value.length),u32(0x7109871a),value);
  const blockSize=u64(pair.length+24);
  const block=join(blockSize,pair,blockSize,encoder.encode('APK Sig Block 42'));
  new DataView(end.buffer).setUint32(16,body.length+block.length,true);
  return join(body,block,central,end);
}

export async function buildApk({files,title,projectId,keys,host,versionCode=1}) {
  if(!Number.isInteger(versionCode)||versionCode<1||versionCode>2100000000) throw new Error('Invalid Android version');
  if(!/^[a-f0-9]{32}$/.test(projectId)) throw new Error('Invalid Android project ID');
  const entries=[
    ['AndroidManifest.xml',manifest(decode(host.manifest),'com.xsusstudio.app.p'+projectId,String(title||'XSUS App').slice(0,60),versionCode)],
    ['classes.dex',decode(host.dex)]
  ];
  for(const path of ['index.html','styles.css','main.js']) {
    if(typeof files[path]!=='string'||files[path].length>250000) throw new Error('Invalid application source');
    entries.push(['assets/'+path,encoder.encode(files[path])]);
  }
  return signedArchive(entries,keys);
}
