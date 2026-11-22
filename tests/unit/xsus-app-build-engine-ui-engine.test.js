import {describe,it,expect} from "vitest";
import {renderComponentTree,validateComponentTree} from "../../src/xsus-app-build-engine/ui/component-engine.js";
const tree={id:"layout",type:"stack",children:[{id:"title",type:"heading",text:"Dashboard"},{id:"form",type:"card",children:[{id:"email",type:"input",text:"Email",inputType:"email"},{id:"submit",type:"button",text:"Continue"}]}]};
describe("XSUS component and UI engine",()=>{
  it("renders nested components",()=>{const result=renderComponentTree(tree);expect(result.html).toContain("<h2");expect(result.html).toContain('type="email"');expect(result.css).toContain(".xsus-card");});
  it("escapes unsafe user content",()=>{const result=renderComponentTree({id:"x",type:"paragraph",text:'<script>alert("x")</script>'});expect(result.html).toContain("&lt;script&gt;");expect(result.html).not.toContain("<script>");});
  it("rejects duplicate IDs",()=>{expect(()=>validateComponentTree({id:"root",type:"stack",children:[{id:"same",type:"paragraph"},{id:"same",type:"button"}]})).toThrow("duplicate");});
  it("rejects unapproved input types",()=>{expect(()=>renderComponentTree({id:"unsafe",type:"input",inputType:"file"})).toThrow("Unsupported");});
  it("rejects leaf children",()=>{expect(()=>renderComponentTree({id:"x",type:"button",children:[{id:"y",type:"paragraph"}]})).toThrow("Leaf");});
  it("rejects excessive nesting",()=>{let node={id:"leaf",type:"paragraph"};for(let i=0;i<14;i++)node={id:"node"+i,type:"stack",children:[node]};expect(()=>renderComponentTree(node)).toThrow("deep");});
});
