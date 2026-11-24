import {describe,it,expect} from "vitest";
import {generateAndroidGradleProject} from "../../services/src/build-worker/android-gradle-generator.js";
const input={applicationId:"com.xsus.tasks",displayName:"XSUS Tasks"};
const project=(options)=>Object.fromEntries(generateAndroidGradleProject(input,options).map(f=>[f.path,f.content]));
describe("Android Gradle project generator",()=>{
 it("generates eleven unique files",()=>{const f=generateAndroidGradleProject(input);expect(f).toHaveLength(11);expect(new Set(f.map(x=>x.path)).size).toBe(11);});
 it("includes application module",()=>expect(project()["settings.gradle.kts"]).toContain('include(":app")'));
 it("pins plugins",()=>expect(project()["build.gradle.kts"]).toContain('version "8.7.3"'));
 it("enables Compose",()=>expect(project()["app/build.gradle.kts"]).toContain("compose = true"));
 it("configures SDK",()=>expect(project({minSdk:28})["app/build.gradle.kts"]).toContain("minSdk = 28"));
 it("rejects invalid SDK",()=>{for(const minSdk of [22,36,"26",26.5])expect(()=>project({minSdk})).toThrow();});
 it("binds application ID",()=>expect(project()["app/build.gradle.kts"]).toContain('applicationId = "com.xsus.tasks"'));
 it("includes launcher",()=>expect(project()["app/src/main/AndroidManifest.xml"]).toContain("android.intent.category.LAUNCHER"));
 it("does not request network permission",()=>expect(project()["app/src/main/AndroidManifest.xml"]).not.toContain("uses-permission"));
 it("escapes XML",()=>expect(generateAndroidGradleProject({...input,displayName:"A & B < C"}).at(-1).content).toContain("A &amp; B &lt; C"));
 it("preserves persistent source",()=>expect(project()["app/src/main/java/com/xsus/tasks/data/TaskStore.kt"]).toContain("AtomicFile"));
 it("is deterministic",()=>expect(project()).toEqual(project()));
});
