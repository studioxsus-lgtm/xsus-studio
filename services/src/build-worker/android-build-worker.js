import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, isAbsolute } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { generateAndroidGradleProject } from "./android-gradle-generator.js";

const execute = promisify(execFile);

// Trusted local worker only. Never expose compiler configuration to public requests.
export async function buildAndroidDebug(input, options = {}, config = {}) {
  const { gradleExecutable, timeoutMs = 600000 } = config;
  if (typeof gradleExecutable !== "string" || !isAbsolute(gradleExecutable)) throw new Error("Absolute Gradle executable required");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 900000) throw new Error("Invalid build timeout");
  const files = generateAndroidGradleProject(input, options);
  const workspace = await mkdtemp(join(tmpdir(), "xsus-android-"));
  try {
    const seen = new Set();
    for (const file of files) {
      if (!/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(file.path) ||
          file.path.split("/").some(p => p === "." || p === "..") || seen.has(file.path)) throw new Error("Invalid generated path");
      seen.add(file.path);
      const destination = join(workspace, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, file.content, { flag: "wx", encoding: "utf8" });
    }
    await execute(gradleExecutable, ["--no-daemon", "--console=plain", ":app:assembleDebug"], {
      cwd: workspace, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
      env: Object.fromEntries(["PATH","JAVA_HOME","ANDROID_HOME","ANDROID_SDK_ROOT","HOME","USERPROFILE","SystemRoot","TEMP","TMP","LANG"].filter(k => process.env[k] !== undefined).map(k => [k,process.env[k]]))
    });
    const path = join(workspace, "app/build/outputs/apk/debug/app-debug.apk");
    const info = await stat(path);
    if (!info.isFile() || info.size < 4 || info.size > 128 * 1024 * 1024) throw new Error("Invalid build artifact size");
    const apk = await readFile(path);
    if (apk.length !== info.size || apk.subarray(0,4).toString("hex") !== "504b0304") throw new Error("Invalid artifact header");
    return { kind:"apk", variant:"debug", bytes:apk, size:apk.length,
      sha256:createHash("sha256").update(apk).digest("hex"), signatureVerified:false, installationVerified:false };
  } finally {
    await rm(workspace, {recursive:true, force:true});
  }
}
