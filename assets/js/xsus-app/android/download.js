import {buildApk,createSigningKey} from './v1/apk.js';

function openSigningDatabase() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('xsus-android-signing-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('keys');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

async function projectKey(id) {
  const db=await openSigningDatabase();
  try {
    const existing=await new Promise((resolve,reject)=>{
      const request=db.transaction('keys').objectStore('keys').get(id);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    if(existing) return existing;
    const candidate=await createSigningKey();
    // Recheck inside a single write transaction when multiple tabs export at once.
    return await new Promise((resolve,reject)=>{
      const transaction=db.transaction('keys','readwrite');
      const store=transaction.objectStore('keys');
      const request=store.get(id);
      let keys;
      request.onsuccess=()=>{
        keys=request.result||candidate;
        if(!request.result) store.add(keys,id);
      };
      transaction.oncomplete=()=>resolve(keys);
      transaction.onabort=()=>reject(transaction.error||new Error('Android signing key could not be saved'));
    });
  } finally { db.close(); }
}

export async function downloadProjectApk(files,projectId) {
  const title=new DOMParser().parseFromString(files['index.html'],'text/html').title.trim()||'XSUS App';
  const response=await fetch(new URL('./v1/host.json',import.meta.url));
  if(!response.ok) throw new Error('Android runtime unavailable');
  const apk=await buildApk({files,title,projectId,keys:await projectKey(projectId),host:await response.json()});
  const url=URL.createObjectURL(new Blob([apk],{type:'application/vnd.android.package-archive'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=(title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,60)||'XSUS-App')+'.apk';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
