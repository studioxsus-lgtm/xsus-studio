import {createProjectArchitecture} from "../../../src/xsus-app-build-engine/architecture/project-architect.js";
import {generateStaticApp} from "../../../src/xsus-app-build-engine/generator/code-generator.js";
import {validateBuildManifest} from "../../../src/xsus-app-build-engine/build/build-manifest.js";
const SAFE=/^[a-z][a-z0-9-]{1,47}$/;
const escapeSlug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45);
export function generateWorkerStaticPreview({name}={}){
 if(typeof name!=="string"||!name.trim()||name.length>100)throw new TypeError("Invalid preview name");
 const slug=escapeSlug(name);
 const project=SAFE.test(slug)?slug:"xsus-preview";
 const architecture=createProjectArchitecture({name,slug:project,modules:[{id:"home",kind:"page"}],routes:[{id:"home",path:"/",moduleId:"home"}]});
 const manifest=validateBuildManifest(generateStaticApp(architecture));
 return Object.freeze({project:manifest.project,files:manifest.files.map(({path,content})=>({path,content})),kind:"static-preview",requiresReview:true});
}
