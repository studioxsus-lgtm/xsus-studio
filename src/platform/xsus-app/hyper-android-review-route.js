import {createHash,timingSafeEqual} from "node:crypto";
export const ANDROID_REVIEW_PATH="/internal/android/review";
function canonical(v,depth=0){
 if(depth>32)throw Error("Snapshot depth");
 if(v===null||typeof v==="boolean"||typeof v==="string"||Number.isSafeInteger(v))return JSON.stringify(v);
 if(Array.isArray(v))return "["+v.map(x=>canonical(x,depth+1)).join(",")+"]";
 if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k],depth+1)).join(",")+"}";
 throw Error("Invalid snapshot");
}
export function reviewAndroidSnapshot(body){
 const s=body?.specification;
 if(body?.schema_version!=="1.0"||body.operation!=="project.review"||body.source!=="future-xsus-core"||body.destination!=="hyper-xsus-core"||body.execution_authorized!==false||
 typeof body.project_id!=="string"||!body.project_id.trim()||!Number.isSafeInteger(body.revision)||body.revision<0||
 s?.project_id!==body.project_id||s?.revision!==body.revision||!s.application||!Array.isArray(s.application.features)||
 createHash("sha256").update(canonical(s)).digest("hex")!==body.snapshot_digest)throw Error("Invalid snapshot");
 const findings=[];
 if(s.application.platform!=="android")findings.push("unsupported_platform");
 const features=s.application.features;
 const tasks=features.includes("task_management")&&features.every(f=>["task_management","search","filter"].includes(f));
 const restaurant=features.length===1&&features[0]==="restaurant_orders";
 if(!tasks&&!restaurant)findings.push("unsupported_features");
 if(!Array.isArray(s.database)||s.database.length||s.security!==null)findings.push("unsupported_security_or_database");
 return {schema_version:"1.0",project_id:body.project_id,revision:body.revision,snapshot_digest:body.snapshot_digest,status:findings.length?"needs_changes":"accepted",findings};
}
export function createAndroidReviewRoute(env){
 if(env.XSUS_ANDROID_REVIEW_ENABLED!=="true")return null;
 const token=env.XSUS_ANDROID_REVIEW_TOKEN;
 if(typeof token!=="string"||!/^[A-Za-z0-9._~-]{32,256}$/.test(token))throw Error("Invalid Android review token");
 const expected=Buffer.from("Bearer "+token);
 return {authorized(header){const actual=Buffer.from(typeof header==="string"?header:"");return actual.length===expected.length&&timingSafeEqual(actual,expected);},review:reviewAndroidSnapshot};
}

