import {validProjectSource} from './project-source-snapshot.js';
// Validate account snapshots before they can replace local workspace state.
export function inspectAccountProjectSnapshot(project){
  if(!project||project.version!==1||!project.session||!Array.isArray(project.session.messages)||
     !Array.isArray(project.reviews)||!Array.isArray(project.boards))return {ok:false,reason:'invalid-contract'};
  const session=project.session;
  if(session.generatedFiles!=null&&!validProjectSource(session.generatedFiles))return {ok:false,reason:'invalid-source'};
  if(session.generatedHtml!=null&&typeof session.generatedHtml!=='string')return {ok:false,reason:'invalid-preview'};
  if(session.messages.some(message=>!message||typeof message!=='object'))return {ok:false,reason:'invalid-messages'};
  if(session.generatedSourceHistory!=null){
    if(!Array.isArray(session.generatedSourceHistory)||session.generatedSourceHistory.length>20||
       session.generatedSourceHistory.some(item=>!item||typeof item.id!=='string'||!validProjectSource(item.files)))
      return {ok:false,reason:'invalid-history'};
  }
  if(project.reviews.some(item=>!Array.isArray(item)||item.length!==2)||
     project.boards.some(item=>!Array.isArray(item)||item.length!==2))return {ok:false,reason:'invalid-relations'};
  return {ok:true,reason:null};
}
