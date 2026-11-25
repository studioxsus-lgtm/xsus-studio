import {studioText} from './studio-language.mjs';
import {projectPreferences} from './project-preferences.mjs';
import {createSessionAdapter} from './auth-session.mjs';
import {createUnifiedWorkspace} from './unified-workspace.mjs';
import {mountUnifiedView} from './unified-view.mjs?v=3';
export function mountPublicWorkspace({document,container,auth,baseUrl='https://future-xsus-web-build-engine.onrender.com',fetchImpl}={}){
 if(!document||!container)throw TypeError('Invalid host');
 let app=null,view=null,session=null,disposed=false,identity=null;
 const status=document.createElement('p');status.setAttribute('role','status');container.append(status);
 function clear(){view?.dispose();app?.reset();view=null;app=null}
 function render(id){identity=id;clear();if(disposed)return;status.textContent=id?'':studioText(document,'Sign in to generate and save websites.');if(!id||!session)return;
 const owner=id;
 app=createUnifiedWorkspace({baseUrl,fetchImpl,getToken:async()=>{if(disposed||identity!==owner)throw Error('Session changed');const token=await session.getToken();if(disposed||identity!==owner)throw Error('Session changed');return token}});
 let storage;try{storage=document.defaultView.localStorage}catch{}
 view=mountUnifiedView({document,container,app,preferences:projectPreferences(storage,owner)});
 setTimeout(()=>{if(!disposed&&identity===owner)view?.refresh()});
 }
 session=createSessionAdapter({auth,onIdentityChange:render});
 if(identity)render(identity);
 if(!identity)status.textContent=studioText(document,'Sign in to generate and save websites.');
 const ready=session.getToken().then(()=>true,()=>false);
 return Object.freeze({ready,dispose(){if(disposed)return;disposed=true;clear();session.dispose();status.remove()}});
}

