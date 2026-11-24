import { mkdir, writeFile } from "node:fs/promises";
import { buildAndroidDebug } from "../services/src/build-worker/android-build-worker.js";

const artifact = await buildAndroidDebug(
  {applicationId:"com.xsus.tasks",displayName:"XSUS Tasks"},
  {minSdk:26,theme:"system"},
  {gradleExecutable:process.env.XSUS_GRADLE_EXECUTABLE,timeoutMs:900000}
);
await mkdir("android-artifacts",{recursive:true});
await writeFile("android-artifacts/xsus-tasks-debug.apk",artifact.bytes);
await writeFile("android-artifacts/receipt.json",JSON.stringify({
  kind:artifact.kind,variant:artifact.variant,size:artifact.size,sha256:artifact.sha256,
  signatureVerified:false,installationVerified:false
},null,2));
console.log("Debug APK generated:",artifact.size,"bytes",artifact.sha256);
