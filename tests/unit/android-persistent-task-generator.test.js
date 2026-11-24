import {describe,it,expect} from "vitest";
import {generatePersistentAndroidTasks} from "../../services/src/build-worker/android-persistent-task-generator.js";
const input={applicationId:"com.xsus.tasks",displayName:"Tasks"};
describe("Persistent Android tasks",()=>{
 const files=()=>generatePersistentAndroidTasks(input);
 it("adds storage source",()=>expect(files()).toHaveLength(5));
 it("uses private storage and atomic writes",()=>{expect(files()[4].content).toContain("context.filesDir");expect(files()[4].content).toContain("AtomicFile");expect(files()[4].content).toContain("file.failWrite(stream)");});
 it("bounds reads",()=>expect(files()[4].content).toContain("output.size() + count <= 2000000"));
 it("validates restored IDs",()=>expect(files()[4].content).toContain("distinct().size == tasks.size"));
 it("loads on initialization",()=>expect(files()[2].content).toContain("store.load()"));
 it("blocks overwrite after read failure",()=>expect(files()[2].content).toContain("if (loaded.isFailure) return false"));
 it("persists before state update",()=>expect(files()[2].content).toContain("store.save(updated)\n            tasks = updated"));
 it("persists all mutations",()=>{const s=files()[2].content;expect(s).toContain("persist(updated)");expect(s).toContain("persist(tasks.map");expect(s).toContain("persist(tasks.filterNot");});
 it("reports storage errors",()=>expect(files()[2].content).toContain("Unable to save tasks"));
 it("is deterministic",()=>expect(files()).toEqual(files()));
});
