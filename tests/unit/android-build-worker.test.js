import {describe,it,expect} from "vitest";
import {buildAndroidDebug} from "../../services/src/build-worker/android-build-worker.js";
const input={applicationId:"com.xsus.tasks",displayName:"Tasks"};
describe("Android build worker configuration",()=>{
 it("requires configured compiler",async()=>await expect(buildAndroidDebug(input)).rejects.toThrow("Absolute Gradle"));
 it("rejects relative compiler",async()=>await expect(buildAndroidDebug(input,{}, {gradleExecutable:"gradle"})).rejects.toThrow("Absolute Gradle"));
 it("rejects invalid timeout",async()=>await expect(buildAndroidDebug(input,{}, {gradleExecutable:"/gradle",timeoutMs:0})).rejects.toThrow("Invalid build timeout"));
 it("rejects invalid application before execution",async()=>await expect(buildAndroidDebug({...input,applicationId:"../bad"},{},{gradleExecutable:"/gradle"})).rejects.toThrow("Invalid Android application ID"));
 it("rejects invalid SDK before execution",async()=>await expect(buildAndroidDebug(input,{minSdk:99},{gradleExecutable:"/gradle"})).rejects.toThrow("Unsupported minimum SDK"));
 it("reports missing compiler",async()=>await expect(buildAndroidDebug(input,{}, {gradleExecutable:"/xsus-nonexistent-gradle-executable"})).rejects.toThrow());
});
