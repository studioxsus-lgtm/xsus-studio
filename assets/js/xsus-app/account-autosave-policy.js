// Pure decision policy for XSUS App account autosave.
export function classifyAccountSaveResult(error,returnedId,expectedId){
  if(error)return 'retryable-error';
  if(!expectedId||returnedId!==expectedId)return 'revision-conflict';
  return 'saved';
}
export function shouldQueueAccountSave({busy=false,saving=false,pending=false}={}){
  return Boolean(busy||saving||pending);
}
