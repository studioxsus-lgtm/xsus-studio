import {validProjectSource} from './project-source-snapshot.js';
export function hasProjectWork(builder){
  if(!builder||typeof builder!=='object')return false;
  if(String(builder.goal||'').trim()||String(builder.steps||'').trim())return true;
  return Array.isArray(builder.sessions)&&builder.sessions.some(session=>
    !!session?.accountProject||!!session?.generatedHtml||
    validProjectSource(session?.generatedFiles)||
    (Array.isArray(session?.generatedSourceHistory)&&session.generatedSourceHistory.length>0)||
    (Array.isArray(session?.messages)&&session.messages.length>0));
}
export function canCaptureProject(builder,session){
  return !!session && (hasProjectWork({...builder,sessions:[session]})||
    Array.isArray(builder?.reviews)&&builder.reviews.length>0);
}
