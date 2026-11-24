import {describe,it,expect} from "vitest";
import {assessAndroidCompatibility as assess} from "../../services/src/build-worker/android-compatibility-gateway.js";
const digest="a".repeat(64);
const review={snapshot_digest:digest,project_id:"p",revision:1,status:"accepted",execution_authorized:false};
function plan(){return {functional:{ui:{android:{snapshot_digest:digest,project_id:"p",revision:1,features:["task_management"]},navigation:"single_screen",style:"modern",motion:"system",adaptive_layout:false,typography:"material_default",design_system:"material3",toolkit:"jetpack_compose",theme:"system",primary_seed:"#2563EB"}},storage:["atomic_json"],database:[],requested_controls:[],suggested_controls:[],permissions:[],unresolved:[],execution_authorized:false}}
describe("Android compatibility gateway",()=>{
 it("accepts compatible requirements without execution authorization",()=>expect(assess(plan(),review)).toEqual({status:"compatible",issues:[],execution_authorized:false}));
 it("rejects Room substitution",()=>expect(assess({...plan(),storage:["room"]},review).issues).toContain("unsupported_storage"));
 it("rejects stale review",()=>expect(assess(plan(),{...review,revision:2}).issues).toContain("review_mismatch"));
 it("rejects unsupported features",()=>{const p=plan();p.functional.ui.android.features.push("payments");expect(assess(p,review).issues).toContain("unsupported_features")});
 it("rejects unresolved requirements",()=>expect(assess({...plan(),unresolved:["missing_schema"]},review).issues).toContain("unresolved_requirements"));
 it("rejects security substitution",()=>expect(assess({...plan(),requested_controls:["authentication"]},review).issues).toContain("unsupported_security_or_database"));
 it("rejects unsupported navigation",()=>{const p=plan();p.functional.ui.navigation="drawer";expect(assess(p,review).issues).toContain("unsupported_design")});
 it("rejects malformed plans",()=>expect(()=>assess({},review)).toThrow("Invalid Android plan"));
});
