import {describe,it,expect,vi} from "vitest";
import {createAuthoritativeLeaseVerifier} from "../../src/xsus-app-build-engine/sandbox/authoritative-lease-verifier.js";
const executionId="execution-0001",holderId="worker-0001",fence=3;
const request={executionId,holderId,fence};
const row={execution_id:executionId,holder_id:holderId,fence:"3",expires_at_ms:"200",unexpired:true};
function setup(rows=[row]){const query=vi.fn(async()=>({rows}));return {verifier:createAuthoritativeLeaseVerifier({query}),query};}
describe("XSUS phase 46 authoritative PostgreSQL lease verification",()=>{
 it("requires trusted query",()=>expect(()=>createAuthoritativeLeaseVerifier()).toThrow("query"));
 it("verifies matching active lease",async()=>expect(await setup().verifier.verify(request)).toEqual({valid:true,reason:"active"}));
 it("rejects expired lease",async()=>expect(await setup([{...row,unexpired:false}]).verifier.verify(request)).toEqual({valid:false,reason:"expired"}));
 it("rejects missing lease",async()=>expect(await setup([]).verifier.verify(request)).toEqual({valid:false,reason:"missing-or-stale"}));
 it("uses database clock rather than local time",async()=>{const x=setup();await x.verifier.verify(request);expect(x.query.mock.calls[0][0]).toContain("clock_timestamp()");});
 it("binds identity and fence in SQL",async()=>{const x=setup();await x.verifier.verify(request);expect(x.query.mock.calls[0][1]).toEqual([executionId,holderId,fence]);});
 it("rejects malformed identity",async()=>await expect(setup().verifier.verify({...request,executionId:"../bad"})).rejects.toThrow("request"));
 it("rejects invalid fence",async()=>await expect(setup().verifier.verify({...request,fence:0})).rejects.toThrow("request"));
 it("rejects contradictory database identity",async()=>await expect(setup([{...row,holder_id:"worker-0002"}]).verifier.verify(request)).rejects.toThrow("mismatch"));
 it("rejects nonboolean expiry",async()=>await expect(setup([{...row,unexpired:"true"}]).verifier.verify(request)).rejects.toThrow("expiry"));
 it("rejects unsafe database integers",async()=>await expect(setup([{...row,fence:"9007199254740993"}]).verifier.verify(request)).rejects.toThrow("integer"));
 it("rejects duplicate rows",async()=>await expect(setup([row,row]).verifier.verify(request)).rejects.toThrow("response"));
});
