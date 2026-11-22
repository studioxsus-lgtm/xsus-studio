import {validateBuildManifest} from "../build/build-manifest.js";
import {analyzeStaticProject} from "./static-quality-engine.js";
export const QUALITY_GATE_VERSION="0.1.0";
export function createQualityGate({maxWarnings=10}={}){
  if(!Number.isSafeInteger(maxWarnings)||maxWarnings<0||maxWarnings>1000)throw new TypeError("Invalid warning threshold");
  return Object.freeze({
    inspect(input){
      const manifest=validateBuildManifest(input);
      const report=analyzeStaticProject(manifest);
      const warningCount=report.diagnostics.filter(item=>item.severity==="warning").length;
      return Object.freeze({version:QUALITY_GATE_VERSION,approved:report.passed&&warningCount<=maxWarnings,warningCount,report,requiresHumanReview:true});
    }
  });
}
