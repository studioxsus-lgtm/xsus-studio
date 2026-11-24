import {createCoreTransport} from "../services/src/build-worker/android-core-transport.js";
import {requestAndroidHyperReview} from "../services/src/build-worker/android-hyper-review-adapter.js";
import {assessAndroidCompatibility} from "../services/src/build-worker/android-compatibility-gateway.js";
try {
 const plan=createCoreTransport({endpoint:process.env.XSUS_ANDROID_PLANNING_URL,token:process.env.XSUS_ANDROID_PLANNING_TOKEN});
 const review=createCoreTransport({endpoint:process.env.XSUS_ANDROID_REVIEW_URL,token:process.env.XSUS_ANDROID_REVIEW_TOKEN});
 const draft=await plan({project_id:"connectivity-probe",prompts:["Krijo aplikacion Android për menaxhimin e detyrave"],application_id:"com.xsus.connectivity",display_name:"XSUS Connectivity",min_sdk:26,accept_storage_profile:true});
 if(draft.status!=="draft_ready"||draft.execution_authorized!==false)throw Error("Planning not ready");
 const result=await requestAndroidHyperReview(draft.reviewRequest,review);
 const compatibility=assessAndroidCompatibility(draft.plan,result);
 if(compatibility.status!=="compatible")throw Error("Review not compatible");
 console.log(JSON.stringify({planning:"ready",review:"accepted",compatibility:"compatible",buildExecuted:false}));
}catch{
 console.error("Android core connectivity probe failed");
 process.exitCode=1;
}
