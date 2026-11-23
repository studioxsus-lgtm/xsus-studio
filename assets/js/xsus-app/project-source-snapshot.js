// XSUS App project source contract. Pure functions: no storage, auth or DOM access.
export const SOURCE_PATHS=Object.freeze(['index.html','styles.css','main.js']);
export function validProjectSource(files){
  return files !== null && typeof files === 'object' &&
    SOURCE_PATHS.every(path=>typeof files[path]==='string' &&
      files[path].length>0 && files[path].length<=250000);
}
export function copyProjectSource(files){
  if(!validProjectSource(files))throw new TypeError('Invalid project source');
  return Object.fromEntries(SOURCE_PATHS.map(path=>[path,files[path]]));
}
export function restoreProjectSource(snapshot,cache){
  // A saved account/workspace snapshot wins over any local cache.
  if(validProjectSource(snapshot))return copyProjectSource(snapshot);
  return validProjectSource(cache)?copyProjectSource(cache):null;
}
