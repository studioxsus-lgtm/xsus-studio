import {describe,it,expect} from "vitest";
import {requestAndroidHyperReview as review} from "../../services/src/build-worker/android-hyper-review-adapter.js";
const binding={schema_version:"1.0",project_id:"p",revision:1,snapshot_digest:"a".repeat(64)};
const request={...binding,operation:"project.review",source:"future-xsus-core",destination:"hyper-xsus-core",execution_authorized:false,specification:{project_id:"p",revision:1,application:{platform:"android"}}};
const response={...binding,status:"accepted",findings:[]};
describe("Hyper review adapter",()=>{
 it("binds accepted review without execution permission",async()=>expect(await review(request,async()=>response)).toEqual({...response,execution_authorized:false}));
 it("preserves rejection",async()=>expect((await review(request,async()=>({...response,status:"rejected"}))).status).toBe("rejected"));
 it("rejects stale revision",async()=>await expect(review(request,async()=>({...response,revision:2}))).rejects.toThrow("Invalid review response"));
 it("rejects digest mismatch",async()=>await expect(review(request,async()=>({...response,snapshot_digest:"b".repeat(64)}))).rejects.toThrow());
 it("rejects extra authorization",async()=>await expect(review(request,async()=>({...response,execution_authorized:true}))).rejects.toThrow());
 it("rejects invalid findings",async()=>await expect(review(request,async()=>({...response,findings:[42]}))).rejects.toThrow());
 it("rejects non Android",async()=>await expect(review({...request,specification:{...request.specification,application:{platform:"web"}}},async()=>response)).rejects.toThrow());
 it("propagates transport failure",async()=>await expect(review(request,async()=>{throw Error("offline")})).rejects.toThrow("offline"));
});
