/**
 * XSUS App browser controller. Keeps App Engine and XSUS AI Core separate.
 * The App Engine remains the primary architecture engine; AI is a distinct
 * backend enrichment step, not a replacement for App Engine output.
 */
import {processXsusAppRequest,getXsusAppBridgeStatus} from "./xsus-app-bridge.js";
import {requestXsusAI} from "./xsus-ai-backend-client.js";

export function createXsusAppController({
  documentRef=globalThis.document,
  processApp=processXsusAppRequest,
  requestAI=requestXsusAI,
  aiEndpoint=globalThis.XSUS_AI_API_ENDPOINT || "/api/chat",
  getStatus=getXsusAppBridgeStatus
}={}){
  const find=id=>documentRef.getElementById(id);
  const form=find("app-form"),prompt=find("prompt"),platform=find("platform");
  const button=find("generate-button"),result=find("result"),message=find("message");
  const dot=find("status-dot"),statusText=find("status-text"),metric=find("bridge-metric");
  if([form,prompt,platform,button,result,message,dot,statusText,metric].some(x=>!x))
    throw new TypeError("XSUS App interface is incomplete.");
  let busy=false;
  function status(){
    try{
      const state=getStatus();
      const connected=state?.connected===true;
      dot.className=connected?"xsus-status-dot xsus-status-active":"xsus-status-dot";
      statusText.textContent=connected?"XSUS App Engine connected.":"XSUS App Engine not connected.";
      metric.textContent=connected?"Connected":"Inactive";
    }catch{
      dot.className="xsus-status-dot";
      statusText.textContent="Bridge status unavailable.";
      metric.textContent="Unavailable";
    }
  }
  async function submit(event){
    event?.preventDefault?.();
    if(busy)return;
    const text=prompt.value.trim();
    if(!text){message.textContent="Please enter an application description.";return;}
    busy=true;button.disabled=true;button.textContent="Processing...";
    message.textContent="Building architecture with XSUS App Engine...";
    try{
      const app=await processApp({
        prompt:text,platform:platform.value,useIntelligence:true,retrieveKnowledge:true
      });
      if(!app || app.success!==true){
        result.textContent=JSON.stringify({app},null,2);
        message.textContent="XSUS App Engine could not complete the request.";
        return;
      }
      // The AI endpoint is independent. A failure must never discard App output.
      result.textContent=JSON.stringify({app,ai:{status:"pending"}},null,2);
      message.textContent="Architecture ready. Requesting XSUS AI analysis...";
      try{
        const ai=await requestAI({prompt:
          "Analyze the following application specification for "+platform.value+
          ". Provide architecture recommendations, security considerations and implementation steps:\n"+text,
          language:"en",endpoint:aiEndpoint
        });
        result.textContent=JSON.stringify({app,ai:{status:"completed",...ai}},null,2);
        message.textContent="XSUS App architecture and XSUS AI analysis completed.";
      }catch{
        result.textContent=JSON.stringify({app,ai:{status:"unavailable"}},null,2);
        message.textContent="XSUS App architecture completed; XSUS AI backend is unavailable.";
      }
    }catch{
      result.textContent=JSON.stringify({success:false,error:{code:"APP_REQUEST_FAILED"}},null,2);
      message.textContent="XSUS App Engine request failed.";
    }finally{
      busy=false;button.disabled=false;
      button.textContent="Generate Application Architecture →";
      status();
    }
  }
  form.addEventListener("submit",submit);
  status();
  return Object.freeze({dispose(){form.removeEventListener("submit",submit);}});
}
if(typeof document!=="undefined" && document.getElementById("app-form"))
  createXsusAppController();
