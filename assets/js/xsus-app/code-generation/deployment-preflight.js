import { inspectBuildReadiness } from './build-diagnostics.js';
import { verifyBuildArtifacts } from './artifact-integrity.js';

// Preparation only: no network calls, credentials, or deployment side effects.
export async function prepareDeploymentPlan(artifacts, target = 'static-host') {
  if (target !== 'static-host') throw new TypeError('Unsupported deployment target');
  const integrity = await verifyBuildArtifacts(artifacts);
  if (!integrity.ok) return {ready:false,errors:integrity.errors,plan:null};
  const files = Object.fromEntries(['index.html','styles.css','app.js'].map(name=>[name,artifacts[name]]));
  const readiness = inspectBuildReadiness(files);
  if (!readiness.canBuild) return {ready:false,errors:readiness.issues.filter(x=>x.level==='error').map(x=>x.message),plan:null};
  const manifest = JSON.parse(artifacts['xsus-build-manifest.json']);
  return {
    ready:true,errors:[],
    plan:{
      schemaVersion:1,target:'static-host',status:'prepared-not-deployed',
      entrypoint:'index.html',assets:['styles.css','app.js'],
      buildTimestamp:manifest.builtAt,
      files:manifest.files.map(({name,bytes,sha256})=>({name,bytes,sha256})),
      manualSteps:[
        'Download all build artifacts and keep them together',
        'Upload index.html, styles.css, and app.js to a static web host',
        'Configure HTTPS and verify links and runtime behavior',
        'Review accessibility, security, and privacy before production use'
      ],
      warnings:readiness.checks.filter(check=>!check.passed).map(check=>check.label),
      limitations:readiness.limitations
    }
  };
}
