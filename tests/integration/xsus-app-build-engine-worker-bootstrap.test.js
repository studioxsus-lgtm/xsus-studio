import {describe,it,expect} from "vitest";
import {createBuildWorkerServer,startBuildWorkerServer} from "../../services/src/build-worker/standalone-worker.js";
describe("XSUS Build Worker bootstrap",()=>{
 it("creates HTTP server",()=>{const s=createBuildWorkerServer();expect(typeof s.listen).toBe("function");});
 it("rejects invalid PORT",()=>expect(()=>startBuildWorkerServer({env:{PORT:"bad"}})).toThrow("PORT"));
 it("defaults to fail-closed build service",()=>{const s=createBuildWorkerServer();expect(s.listening).toBe(false);});
});
