import {describe,it,expect} from "vitest";
import {generateAndroidTasks} from "../../services/src/build-worker/android-task-generator.js";
const input={applicationId:"com.xsus.tasks",displayName:"Tasks"};
const screen=()=>generateAndroidTasks(input)[2].content;
describe("Android task generator",()=>{
 it("generates four files",()=>expect(generateAndroidTasks(input)).toHaveLength(4));
 it("generates task model",()=>expect(generateAndroidTasks(input)[3].content).toContain("data class Task"));
 it("creates tasks",()=>expect(screen()).toContain("tasks + Task(nextId++"));
 it("updates tasks",()=>expect(screen()).toContain("it.copy(title = title.trim())"));
 it("deletes tasks",()=>expect(screen()).toContain("tasks.filterNot"));
 it("toggles completion",()=>expect(screen()).toContain("it.copy(done = checked)"));
 it("searches and filters",()=>{expect(screen()).toContain("ignoreCase = true");expect(screen()).toContain("!pendingOnly || !it.done");});
 it("bounds input",()=>{expect(screen()).toContain("it.take(200)");expect(screen()).toContain("tasks.size < 1000");});
 it("rejects unsupported navigation",()=>expect(()=>generateAndroidTasks(input,{navigation:"bottom_bar"})).toThrow());
 it("preserves theme",()=>expect(generateAndroidTasks(input,{theme:"dark"})[1].content).toContain("if (true)"));
 it("is deterministic",()=>expect(generateAndroidTasks(input)).toEqual(generateAndroidTasks(input)));
});
