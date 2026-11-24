import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {readFile,access} from "node:fs/promises";
import {createAndroidArtifactVerifier} from "../../services/src/build-worker/android-artifact-verifier.js";
const bytes=Buffer.from("504b03040102","hex"),applicationId="com.xsus.tasks";
const artifact={bytes,size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
const badging="package: name='com.xsus.tasks' versionCode='1'\nlaunchable-activity: name='com.xsus.tasks.MainActivity'";
function setup(stdout=badging){const run=vi.fn(async()=>({stdout}));return {run,verify:createAndroidArtifactVerifier({apksigner:"/sdk/apksigner",aapt2:"/sdk/aapt2",run})};}
describe("Android artifact verification",()=>{
 it("requires absolute SDK executable paths",()=>expect(()=>createAndroidArtifactVerifier({apksigner:"apksigner",aapt2:"/sdk/aapt2"})).toThrow());
 it("rejects invalid package IDs",async()=>{const {verify,run}=setup();await expect(verify(artifact,"../bad")).rejects.toThrow();expect(run).not.toHaveBeenCalled();});
 it("rejects invalid buffers",async()=>{const {verify}=setup();await expect(verify({...artifact,bytes:"invalid"},applicationId)).rejects.toThrow();});
 it("rejects size mismatch",async()=>{const {verify}=setup();await expect(verify({...artifact,size:99},applicationId)).rejects.toThrow();});
 it("rejects digest mismatch",async()=>{const {verify,run}=setup();await expect(verify({...artifact,sha256:"0".repeat(64)},applicationId)).rejects.toThrow();expect(run).not.toHaveBeenCalled();});
 it("rejects non-ZIP data even with valid hash",async()=>{const b=Buffer.from("not apk");const {verify}=setup();await expect(verify({bytes:b,size:b.length,sha256:createHash("sha256").update(b).digest("hex")},applicationId)).rejects.toThrow();});
 it("verifies signature and package with fixed SDK arguments",async()=>{const {verify,run}=setup();run.mockImplementation(async(exe,args)=>{expect(await readFile(args.at(-1))).toEqual(bytes);return {stdout:badging};});const result=await verify(artifact,applicationId);expect(result).toMatchObject({status:"verified_debug_apk",signatureVerified:true,applicationIdVerified:true,launcherVerified:true,installationVerified:false});expect(run.mock.calls[0][0]).toBe("/sdk/apksigner");expect(run.mock.calls[0][1][0]).toBe("verify");expect(run.mock.calls[1][1].slice(0,2)).toEqual(["dump","badging"]);await expect(access(run.mock.calls[0][1][1])).rejects.toThrow();});
 it("rejects signature failure and cleans up",async()=>{const {verify,run}=setup();run.mockRejectedValueOnce(Error("signature failure"));await expect(verify(artifact,applicationId)).rejects.toThrow();expect(run).toHaveBeenCalledTimes(1);await expect(access(run.mock.calls[0][1][1])).rejects.toThrow();});
 it("rejects wrong package identity",async()=>{const {verify}=setup(badging.replace("com.xsus.tasks","com.xsus.other"));await expect(verify(artifact,applicationId)).rejects.toThrow();});
 it("rejects missing launcher",async()=>{const {verify}=setup("package: name='com.xsus.tasks'");await expect(verify(artifact,applicationId)).rejects.toThrow();});
 it("rejects ambiguous package declarations",async()=>{const {verify}=setup(badging+"\npackage: name='com.xsus.other'");await expect(verify(artifact,applicationId)).rejects.toThrow();});
 it("rejects badging tool failure and cleans up",async()=>{const {verify,run}=setup();run.mockResolvedValueOnce({stdout:""}).mockRejectedValueOnce(Error("badging failed"));await expect(verify(artifact,applicationId)).rejects.toThrow();await expect(access(run.mock.calls[0][1][1])).rejects.toThrow();});
});
