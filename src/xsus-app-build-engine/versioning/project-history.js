import {validateBuildManifest} from "../build/build-manifest.js";
export const PROJECT_HISTORY_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{1,80}$/;
export function createProjectHistory({maxVersions=50}={}){
  if(!Number.isSafeInteger(maxVersions)||maxVersions<1||maxVersions>500)throw new RangeError("Invalid version limit");
  const projects=new Map();
  function get(project){return projects.get(project)??[];}
  return Object.freeze({
    save(input,{versionId,parentVersionId=null}={}){
      const manifest=validateBuildManifest(input);
      if(typeof versionId!=="string"||!ID.test(versionId))throw new TypeError("Invalid version ID");
      const history=get(manifest.project);
      if(history.some(v=>v.id===versionId))throw new Error("Duplicate version ID");
      if(history.length>=maxVersions)throw new RangeError("Project version limit reached");
      if(parentVersionId!==null && !history.some(v=>v.id===parentVersionId))throw new Error("Unknown parent version");
      const version=Object.freeze({id:versionId,parentVersionId,revision:history.length+1,manifest});
      projects.set(manifest.project,[...history,version]);
      return version;
    },
    list(project){
      if(typeof project!=="string")throw new TypeError("Project required");
      return Object.freeze(get(project).map(({id,parentVersionId,revision})=>Object.freeze({id,parentVersionId,revision})));
    },
    restore(project,versionId){
      const version=get(project).find(v=>v.id===versionId);
      if(!version)throw new Error("Unknown project version");
      return version.manifest;
    },
    latest(project){const history=get(project);return history.length?history[history.length-1]:null;}
  });
}
