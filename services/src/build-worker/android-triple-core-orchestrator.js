import { requestAndroidHyperReview } from "./android-hyper-review-adapter.js";
import { assessAndroidCompatibility } from "./android-compatibility-gateway.js";
import { buildAndroidDebug } from "./android-build-worker.js";
import { createHash } from "node:crypto";

// Server-owned dependencies only. Never accept transports or authorization callbacks from HTTP clients.
export async function orchestrateAndroidBuild(input, dependencies) {
  const { planProject, reviewTransport, authorize, compiler = buildAndroidDebug, compilerConfig } = dependencies;
  if (![planProject,reviewTransport,authorize,compiler].every(f=>typeof f==="function")) throw new Error("Invalid orchestration dependencies");
  const { plan, reviewRequest } = structuredClone(await planProject(structuredClone(input)));
  const review = await requestAndroidHyperReview(reviewRequest, reviewTransport);
  const compatibility = assessAndroidCompatibility(plan, review);
  if (compatibility.status !== "compatible") return {status:"review_required",issues:compatibility.issues};
  const ui = plan.functional.ui;
  const android = ui.android;
  const buildInput = {applicationId:android.application_id,displayName:android.display_name};
  const options = {minSdk:android.min_sdk,theme:ui.theme,primarySeed:ui.primary_seed,navigation:ui.navigation};
  const binding = {projectId:android.project_id,revision:android.revision,snapshotDigest:android.snapshot_digest,
    buildDigest:createHash("sha256").update(JSON.stringify({buildInput,options})).digest("hex")};
  if (await authorize(structuredClone(binding)) !== true) return {status:"authorization_required"};
  const artifact = await compiler(buildInput,options,compilerConfig);
  if (artifact?.kind !== "apk" || artifact.variant !== "debug" || !Buffer.isBuffer(artifact.bytes) ||
      artifact.bytes.length < 4 || artifact.bytes.length > 128*1024*1024 ||
      artifact.bytes.subarray(0,4).toString("hex") !== "504b0304" ||
      artifact.size !== artifact.bytes.length ||
      artifact.sha256 !== createHash("sha256").update(artifact.bytes).digest("hex")) throw new Error("Invalid compiler artifact");
  return {status:"compiled_pending_verification",binding,artifact:{kind:"apk",variant:"debug",bytes:artifact.bytes,size:artifact.size,sha256:artifact.sha256,signatureVerified:false,installationVerified:false}};
}
