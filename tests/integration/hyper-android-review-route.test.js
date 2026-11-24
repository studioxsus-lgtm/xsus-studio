import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {reviewAndroidSnapshot,createAndroidReviewRoute} from "../../src/platform/xsus-app/hyper-android-review-route.js";
function request(features=["task_management"]){const specification={application:{features,platform:"android"},database:[],project_id:"p",revision:1,security:null};return {schema_version:"1.0",operation:"project.review",source:"future-xsus-core",destination:"hyper-xsus-core",execution_authorized:false,project_id:"p",revision:1,specification,snapshot_digest:createHash("sha256").update(JSON.stringify(specification)).digest("hex")}}
describe("Android snapshot review",()=>{
 it("accepts supported snapshot",()=>expect(reviewAndroidSnapshot(request()).status).toBe("accepted"));
 it("flags unsupported feature",()=>expect(reviewAndroidSnapshot(request(["payments"])).status).toBe("needs_changes"));
 it("rejects tampering",()=>{const r=request();r.specification.revision=2;expect(()=>reviewAndroidSnapshot(r)).toThrow()});
 it("rejects digest mismatch",()=>expect(()=>reviewAndroidSnapshot({...request(),snapshot_digest:"a".repeat(64)})).toThrow());
 it("defaults disabled",()=>expect(createAndroidReviewRoute({})).toBeNull());
 it("checks service credential",()=>{const token="x".repeat(40);const r=createAndroidReviewRoute({XSUS_ANDROID_REVIEW_ENABLED:"true",XSUS_ANDROID_REVIEW_TOKEN:token});expect(r.authorized("Bearer "+token)).toBe(true);expect(r.authorized("Bearer "+"y".repeat(40))).toBe(false)});
});
