import {describe,it,expect} from "vitest";
import {generateAndroidUI} from "../../services/src/build-worker/android-ui-generator.js";
const input={applicationId:"com.xsus.app",displayName:"XSUS"};
describe("Android UI generator",()=>{
 it("generates Compose components",()=>{const s=generateAndroidUI(input)[2].content; for(const x of ["Card(","OutlinedTextField(","Button(","rememberSaveable","Scaffold("]) expect(s).toContain(x);});
 it("generates navigation",()=>expect(generateAndroidUI(input,{navigation:"bottom_bar"})[2].content).toContain("NavigationBarItem("));
 it("defaults to single screen",()=>expect(generateAndroidUI(input)[2].content).not.toContain("NavigationBarItem("));
 it("supports dark theme",()=>expect(generateAndroidUI(input,{theme:"dark"})[1].content).toContain("if (true)"));
 it("supports light theme",()=>expect(generateAndroidUI(input,{theme:"light"})[1].content).toContain("if (false)"));
 it("supports color",()=>expect(generateAndroidUI(input,{primarySeed:"#123abc"})[1].content).toContain("Color(0xFF123ABC)"));
 it("rejects unsupported options",()=>{for(const o of [{theme:"bad"},{primarySeed:"red"},{navigation:"drawer"}]) expect(()=>generateAndroidUI(input,o)).toThrow();});
 it("preserves activity",()=>expect(generateAndroidUI(input)[0].content).toContain("AppTheme { AppScreen() }"));
 it("is deterministic",()=>expect(generateAndroidUI(input)).toEqual(generateAndroidUI(input)));
});
