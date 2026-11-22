import {describe,it,expect,vi} from "vitest";
import {EventEmitter} from "node:events";
import {createSecureProcessRunner} from "../../src/xsus-app-build-engine/sandbox/secure-process-runner.js";
const name="xsus-execution-0001";
const args=["run","--rm","--name",name,"--network","none","example@sha256:"+"a".repeat(64)];
const options={killContainerName:name,timeoutMs:1000,maxOutputBytes:1024};
function fixture({exitCode=0,output=""}={}){
 const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=vi.fn();
 const spawn=vi.fn(()=>{queueMicrotask(()=>{if(output)child.stdout.emit("data",Buffer.from(output));child.emit("close",exitCode);});return child;});
 const terminateContainer=vi.fn(async()=>{});
 return {child,spawn,terminateContainer,runner:createSecureProcessRunner({spawn,terminateContainer})};
}
describe("XSUS phase 31 secure process runner",()=>{
 it("requires trusted spawn and cleanup",()=>expect(()=>createSecureProcessRunner({spawn:()=>{}})).toThrow("cleanup"));
 it("rejects non-Docker binaries",async()=>await expect(fixture().runner("sh",args,options)).rejects.toThrow("Docker"));
 it("rejects shell newlines",async()=>await expect(fixture().runner("docker",[...args,"bad\ncommand"],options)).rejects.toThrow("Docker"));
 it("rejects mismatched container names",async()=>await expect(fixture().runner("docker",args,{...options,killContainerName:"xsus-another-0001"})).rejects.toThrow("identity"));
 it("executes without shell and with restricted environment",async()=>{const x=fixture();expect((await x.runner("docker",args,options)).exitCode).toBe(0);expect(x.spawn.mock.calls[0][2]).toMatchObject({shell:false,env:{PATH:"/usr/bin:/bin"}});});
 it("cleans the container after successful exit",async()=>{const x=fixture();await x.runner("docker",args,options);expect(x.terminateContainer).toHaveBeenCalledWith(name);});
 it("preserves nonzero exit code",async()=>expect((await fixture({exitCode:2}).runner("docker",args,options)).exitCode).toBe(2));
 it("rejects oversized output and invokes cleanup",async()=>{const x=fixture({output:"x".repeat(1100)});await expect(x.runner("docker",args,options)).rejects.toThrow("output limit");expect(x.terminateContainer).toHaveBeenCalledWith(name);});
 it("rejects pre-cancelled execution",async()=>{const x=fixture();await expect(x.runner("docker",args,{...options,signal:{aborted:true}})).rejects.toThrow("cancelled");expect(x.spawn).not.toHaveBeenCalled();});
 it("rejects invalid timeout limits",async()=>await expect(fixture().runner("docker",args,{...options,timeoutMs:50000})).rejects.toThrow("limits"));
});
