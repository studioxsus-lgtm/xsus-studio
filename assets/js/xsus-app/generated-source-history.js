import {copyProjectSource,validProjectSource} from './project-source-snapshot.js';
export const GENERATED_SOURCE_HISTORY_LIMIT=20;
export function appendGeneratedSourceRevision(history,files,createdAt=new Date().toISOString(),id=crypto.randomUUID()){
  const previous=Array.isArray(history)?history.filter(item=>validProjectSource(item?.files)&&typeof item.id==='string').slice(-GENERATED_SOURCE_HISTORY_LIMIT):[];
  const snapshot=copyProjectSource(files);
  if(previous.length&&Object.keys(snapshot).every(path=>previous.at(-1).files[path]===snapshot[path]))return previous;
  return [...previous,{id,createdAt,files:snapshot}].slice(-GENERATED_SOURCE_HISTORY_LIMIT);
}
export function findGeneratedSourceRevision(history,id){
  const revision=Array.isArray(history)?history.find(item=>item?.id===id):null;
  return validProjectSource(revision?.files)?copyProjectSource(revision.files):null;
}
