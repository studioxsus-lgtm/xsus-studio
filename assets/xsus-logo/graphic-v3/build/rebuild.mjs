import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),out=resolve(here,'..');
if(!process.env.LOGO_ENGINE_DIR)throw Error('Set LOGO_ENGINE_DIR to the graphic engine checkout');
const engine=resolve(process.env.LOGO_ENGINE_DIR);
for(const file of ['scene','style','curves','composition','color','typography']){
 await copyFile(resolve(engine,'graphic-v3',file+'.mjs'),resolve(out,file+'.mjs'));
}
await copyFile(resolve(engine,'graphic-v3/fonts/catalog.json'),resolve(out,'catalog.json'));
await copyFile(resolve(engine,'zip.mjs'),resolve(out,'zip.mjs'));
const opts={bundle:true,minify:true,format:'esm',platform:'browser'};
await build({...opts,stdin:{contents:
 'export {booleanPaths,operations} from '+JSON.stringify(resolve(engine,'graphic-v3/boolean.mjs'))+';'+
 'export {flatten,layer} from '+JSON.stringify(resolve(engine,'creative-v2/contours.mjs'))+';'+
 'export {parse} from "opentype.js";',resolveDir:here},outfile:resolve(out,'vector-tools.mjs')});
await build({...opts,entryPoints:[resolve(here,'pdf-entry.mjs')],external:['html2canvas','dompurify','canvg'],outfile:resolve(out,'pdf-tools.mjs')});
