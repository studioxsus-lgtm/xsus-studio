import {describe,it,expect,vi} from "vitest";
import {createXsusAppController} from "../../platform/xsus-app/xsus-app-controller.js";
function fixture(){
  const nodes=new Map();
  for(const id of ["app-form","prompt","platform","generate-button","result","message","status-dot","status-text","bridge-metric"]){
    nodes.set(id,{value:"",textContent:"",className:"",disabled:false,
      addEventListener:vi.fn(),removeEventListener:vi.fn()});
  }
  nodes.get("prompt").value="Build a secure app";
  nodes.get("platform").value="web";
  return {nodes,documentRef:{getElementById:id=>nodes.get(id)}};
}
describe("XSUS App controller — independent engine integration",()=>{
  it("processes App first then AI, retaining both outputs",async()=>{
    const {nodes,documentRef}=fixture();
    const order=[];
    const controller=createXsusAppController({documentRef,
      processApp:async()=>{order.push("app");return {success:true,architecture:"modular"};},
      requestAI:async()=>{order.push("ai");return {answer:"Use separate adapters",version:"1.2.0"};},
      getStatus:()=>({connected:true})
    });
    const submit=nodes.get("app-form").addEventListener.mock.calls[0][1];
    await submit({preventDefault(){}});
    expect(order).toEqual(["app","ai"]);
    expect(JSON.parse(nodes.get("result").textContent).ai.answer).toBe("Use separate adapters");
    expect(nodes.get("generate-button").disabled).toBe(false);
    controller.dispose();
  });
  it("preserves App output when AI is unavailable",async()=>{
    const {nodes,documentRef}=fixture();
    createXsusAppController({documentRef,
      processApp:async()=>({success:true,architecture:"ready"}),
      requestAI:async()=>{throw Error("network");},getStatus:()=>({connected:true})
    });
    await nodes.get("app-form").addEventListener.mock.calls[0][1]({preventDefault(){}});
    const output=JSON.parse(nodes.get("result").textContent);
    expect(output.app.architecture).toBe("ready");
    expect(output.ai.status).toBe("unavailable");
  });
  it("does not call AI when App Engine fails",async()=>{
    const {nodes,documentRef}=fixture();
    const requestAI=vi.fn();
    createXsusAppController({documentRef,
      processApp:async()=>({success:false}),requestAI,getStatus:()=>({connected:false})
    });
    await nodes.get("app-form").addEventListener.mock.calls[0][1]({preventDefault(){}});
    expect(requestAI).not.toHaveBeenCalled();
  });
});
