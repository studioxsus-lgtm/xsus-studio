import {createPreviewDocument} from "./preview-document.js";
export const PREVIEW_SESSION_VERSION="0.1.0";
export function createPreviewSession(){
  let revision=0;
  let current=null;
  const subscribers=new Set();
  return Object.freeze({
    snapshot(){return Object.freeze({revision,document:current});},
    update(manifest){
      const next=createPreviewDocument(manifest);
      revision++;
      current=next;
      const snapshot=Object.freeze({revision,document:current});
      for(const listener of [...subscribers]){try{listener(snapshot);}catch{/* subscribers cannot roll back updates */}}
      return snapshot;
    },
    subscribe(listener){
      if(typeof listener!=="function")throw new TypeError("Preview listener must be a function");
      subscribers.add(listener);
      return ()=>subscribers.delete(listener);
    }
  });
}
