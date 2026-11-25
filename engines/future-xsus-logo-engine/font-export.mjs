import {outlineProfessional} from './font-adapter.mjs';
import {exportPDF} from './pdf.mjs';
import {exportBrandArchive} from './package.mjs';
export async function exportTypographyPDF(document,{library,fontId}={}){const outlined=await outlineProfessional(document,{fontId,shape:library?.shape});return exportPDF(outlined)}
export async function exportTypographyArchive(document,{library,fontId,formats=['svg','pdf','json'],...options}={}){const outlined=await outlineProfessional(document,{fontId,shape:library?.shape});return exportBrandArchive(outlined,{...options,formats})}
