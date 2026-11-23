import {buildApk,createSigningKey} from './v1/apk.js?v=2';

function openSigningDatabase() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('xsus-android-signing-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('keys');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

async function reserveRelease(id, fingerprint) {
  const db=await openSigningDatabase();
  try {
    const existing=await new Promise((resolve,reject)=>{
      const request=db.transaction('keys').objectStore('keys').get(id);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    const candidate=existing||await createSigningKey();
    // Recheck inside a single write transaction when multiple tabs export at once.
    return await new Promise((resolve,reject)=>{
      const transaction=db.transaction('keys','readwrite');
      const store=transaction.objectStore('keys');
      const request=store.get(id);
      const releaseKey='release:'+id;
      let release;
      request.onsuccess=()=>{
        const priorKey=request.result;
        const keys=priorKey||candidate;
        if(!priorKey) store.add(keys,id);
        const latest=store.get(releaseKey);
        latest.onsuccess=()=>{
          const previous=latest.result;
          // A key without metadata belongs to a project previously exported as v1.
          const lastVersion=previous?.versionCode ?? (priorKey ? 1 : 0);
          const versionCode=previous?.fingerprint===fingerprint ? lastVersion : lastVersion+1;
          if (!Number.isSafeInteger(versionCode)||versionCode<1||versionCode>2100000000) {
            transaction.abort();
            return;
          }
          if(previous?.fingerprint!==fingerprint) store.put({versionCode,fingerprint},releaseKey);
          release={keys,versionCode};
        };
      };
      transaction.oncomplete=()=>resolve(release);
      transaction.onabort=()=>reject(transaction.error||new Error('Android signing key could not be saved'));
    });
  } finally { db.close(); }
}

export async function downloadProjectApk(files,projectId) {
  const title=new DOMParser().parseFromString(files['index.html'],'text/html').title.trim()||'XSUS App';
  const response=await fetch(new URL('./v1/host.json',import.meta.url));
  if(!response.ok) throw new Error('Android runtime unavailable');
  const host=await response.json();
  const source=JSON.stringify([host.manifest,host.dex,files['index.html'],files['styles.css'],files['main.js']]);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
  const fingerprint=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  const release=await reserveRelease(projectId,fingerprint);
  const apk=await buildApk({files,title,projectId,host,...release});
  const url=URL.createObjectURL(new Blob([apk],{type:'application/vnd.android.package-archive'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=(title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,60)||'XSUS-App')+'-v'+release.versionCode+'.apk';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
