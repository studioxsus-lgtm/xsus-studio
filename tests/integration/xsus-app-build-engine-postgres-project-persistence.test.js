import {describe,it,expect,vi} from "vitest";
import {createPostgresProjectPersistence} from "../../src/xsus-app-build-engine/integration/postgres-project-persistence.js";
const ownerId="11111111-1111-4111-8111-111111111111",projectId="22222222-2222-4222-8222-222222222222";
const result={ownerId,projectId,executionId:"execution-0001",operationId:"operation-0001",status:"succeeded"};
function setup(){const query=vi.fn(async()=>({rows:[{id:projectId,owner_id:ownerId}]})),authorizeProject=vi.fn(async()=>true);return {api:createPostgresProjectPersistence({query,authorizeProject}),query,authorizeProject};}
describe("XSUS phase 72 existing Postgres project persistence",()=>{
 it("requires trusted adapters",()=>expect(()=>createPostgresProjectPersistence()).toThrow("dependencies"));
 it("reads owner-scoped project",async()=>{const x=setup();await x.api.readProject({ownerId,projectId});expect(x.query.mock.calls[0][0]).toContain("owner_id=$2");});
 it("rejects invalid project UUID",async()=>await expect(setup().api.readProject({ownerId,projectId:"bad"})).rejects.toThrow("UUID"));
 it("fails closed on authorization denial",async()=>{const x=setup();x.authorizeProject.mockResolvedValue(false);await expect(x.api.readProject({ownerId,projectId})).rejects.toThrow("denied");expect(x.query).not.toHaveBeenCalled();});
 it("records last build without replacing project content",async()=>{const x=setup();await x.api.recordBuild(result);expect(x.query.mock.calls[0][0]).toContain("jsonb_set");expect(x.query.mock.calls[0][0]).toContain("owner_id=$2");});
 it("uses parameterized SQL",async()=>{const x=setup();await x.api.recordBuild(result);expect(x.query.mock.calls[0][1]).toHaveLength(3);expect(x.query.mock.calls[0][1][0]).toBe(projectId);});
 it("rejects invalid status",async()=>await expect(setup().api.recordBuild({...result,status:"running"})).rejects.toThrow("result"));
 it("rejects invalid operation identity",async()=>await expect(setup().api.recordBuild({...result,operationId:"../escape"})).rejects.toThrow("result"));
 it("rejects absent project",async()=>{const x=setup();x.query.mockResolvedValue({rows:[]});await expect(x.api.recordBuild(result)).rejects.toThrow("not found");});
 it("rejects malformed database response",async()=>{const x=setup();x.query.mockResolvedValue({rows:[{},{}]});await expect(x.api.readProject({ownerId,projectId})).rejects.toThrow("response");});
 it("returns immutable metadata",async()=>expect(Object.isFrozen(await setup().api.recordBuild(result))).toBe(true));
 it("does not include source in build metadata",async()=>{const x=setup();await x.api.recordBuild(result);expect(x.query.mock.calls[0][1][2]).not.toContain("manifest");});
});
