import {validateBuildManifest} from "../build/build-manifest.js";
export const PROJECT_DIFF_VERSION="0.1.0";
export function compareProjectVersions(beforeInput,afterInput){
  const before=validateBuildManifest(beforeInput),after=validateBuildManifest(afterInput);
  if(before.project!==after.project)throw new TypeError("Cannot compare different projects");
  const left=new Map(before.files.map(f=>[f.path,f.content]));
  const right=new Map(after.files.map(f=>[f.path,f.content]));
  const added=[],removed=[],modified=[],unchanged=[];
  for(const [path,content] of right){
    if(!left.has(path))added.push(path);
    else if(left.get(path)!==content)modified.push(path);
    else unchanged.push(path);
  }
  for(const path of left.keys())if(!right.has(path))removed.push(path);
  for(const group of [added,removed,modified,unchanged])group.sort();
  return Object.freeze({version:PROJECT_DIFF_VERSION,project:before.project,added:Object.freeze(added),removed:Object.freeze(removed),modified:Object.freeze(modified),unchanged:Object.freeze(unchanged)});
}
