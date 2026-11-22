import {describe,it,expect,vi} from "vitest";
import {createRemoteSandboxProvider} from "../../src/xsus-app-build-engine/sandbox/remote-sandbox-provider.js";
import {createTrustedRuntimeAdapter} from "../../src/xsus-app-build-engine/sandbox/trusted-runtime-adapter.js";
const manifest={project:"demo-app",files:[{path:"index.html",content:"<!doctype html><title>Demo</title>"}]};
const args={manifest,policy:{timeoutMs:1000},executionId:"execution-0001",artifactDigest:"a".repeat(64)};
const config={endpoint:"https://sandbox.example.test/v1/execute",allowedOrigin:"https://sandbox.example.test"};
describe("XSUS phase 26 remote sandbox provider contract",()=>{
  it("requires authenticated transport",()=>expect(()=>createRemoteSandboxProvider(config)).toThrow("transport"));
  it("rejects non-HTTPS endpoints",()=>expect(()=>createRemoteSandboxProvider({transport:async()=>({}),endpoint:"http://sandbox.example.test",allowedOrigin:"http://sandbox.example.test"})).toThrow("HTTPS"));
  it("rejects cross-origin endpoints",()=>expect(()=>createRemoteSandboxProvider({transport:async()=>({}),endpoint:config.endpoint,allowedOrigin:"https://evil.example.test"})).toThrow("origin"));
  it("passes a validated manifest and restrictive policy",async()=>{const transport=vi.fn(async()=>({success:true,diagnostics:[]}));const provider=createRemoteSandboxProvider({...config,transport});await provider.execute(args);expect(transport.mock.calls[0][0].body.policy).toMatchObject({network:"disabled",privileged:false,timeoutMs:1000});});
  it("rejects invalid digest before transport",async()=>{const transport=vi.fn();const provider=createRemoteSandboxProvider({...config,transport});await expect(provider.execute({...args,artifactDigest:"bad"})).rejects.toThrow("digest");expect(transport).not.toHaveBeenCalled();});
  it("rejects malformed provider responses",async()=>{const provider=createRemoteSandboxProvider({...config,transport:async()=>({success:"yes",diagnostics:[]})});await expect(provider.execute(args)).rejects.toThrow("response");});
  it("does not invent attestation",async()=>{const provider=createRemoteSandboxProvider({...config,transport:async()=>({success:true,diagnostics:[]})});expect((await provider.execute(args)).attestation).toBe(null);});
  it("remains unverified through the trusted runtime without attestation",async()=>{const provider=createRemoteSandboxProvider({...config,transport:async()=>({success:true,diagnostics:[]})});const runtime=createTrustedRuntimeAdapter({provider,digest:async()=>"a".repeat(64),verifyAttestation:async()=>true});const result=await runtime.run(manifest,{executionId:args.executionId});expect(result.verifiedIsolation).toBe(false);expect(result.success).toBe(false);});
  it("rejects cancelled requests before transport",async()=>{const transport=vi.fn();const provider=createRemoteSandboxProvider({...config,transport});await expect(provider.execute({...args,signal:{aborted:true}})).rejects.toThrow("cancelled");expect(transport).not.toHaveBeenCalled();});
});
