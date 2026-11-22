import { createIntegrityRecords } from './artifact-integrity.js';
import { validateSourceFiles } from './source-validator.js';

const NAMES = ['index.html','styles.css','app.js'];
export async function prepareBuild(files, projectName = 'XSUS App') {
  const validation = validateSourceFiles(files);
  if (!validation.ok) return {ok:false,validation,artifacts:null};
  const artifacts = Object.fromEntries(NAMES.map(name => [name,files[name]]));
  const manifest = {
    schemaVersion:2,
    hashAlgorithm:'SHA-256',
    generator:'XSUS App',
    project:String(projectName).slice(0,160),
    builtAt:new Date().toISOString(),
    files:await createIntegrityRecords(files),
    warnings:validation.issues.filter(issue => issue.level === 'warning')
  };
  artifacts['xsus-build-manifest.json'] = JSON.stringify(manifest,null,2) + '\n';
  return {ok:true,validation,artifacts};
}
