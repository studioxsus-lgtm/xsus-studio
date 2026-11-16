import { describe, expect, it, vi } from "vitest";
import { createHyperApplicationDraftStore } from "./hyper-application-draft-store.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const id = "44444444-4444-4444-8444-444444444444";
const requestId = "plan_1";
const draft = { metadata: { status: "architecture-draft", requiresValidation: true } };
const input = { userId, projectId, requestId, draft };
const make = (fetchImpl) => createHyperApplicationDraftStore({
  url: "https://xsus-example.supabase.co", serviceRoleKey: "server-secret", fetchImpl
});
const row = { id, owner_id: userId, project_id: projectId, request_id: requestId };
describe("Hyper architecture draft Supabase persistence", () => {
  it("saves only when Supabase returns exact owner/project/request confirmation", async () => {
    const fetchImpl = vi.fn(async () => ({ status: 201, json: async () => [row] }));
    expect(await make(fetchImpl)(input)).toBe(true);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain("/rest/v1/xsus_app_architecture_drafts?");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer server-secret");
    expect(JSON.parse(options.body)).toMatchObject({
      owner_id: userId, project_id: projectId, request_id: requestId
    });
    expect(options.redirect).toBe("error");
  });
  it.each([
    ["different owner", [{ ...row, owner_id: "22222222-2222-4222-8222-222222222222" }]],
    ["different project", [{ ...row, project_id: id }]],
    ["different request", [{ ...row, request_id: "other" }]],
    ["missing row", []],
    ["duplicate rows", [row, row]],
    ["invalid row", [{ ...row, id: "invalid" }]]
  ])("rejects %s", async (_, rows) => {
    expect(await make(async () => ({ status: 201, json: async () => rows }))(input)).toBe(false);
  });
  it("rejects HTTP failures and transport exceptions", async () => {
    expect(await make(async () => ({ status: 409 }))(input)).toBe(false);
    expect(await make(async () => { throw new Error("offline"); })(input)).toBe(false);
  });
  it("validates context before network access", async () => {
    const fetchImpl = vi.fn();
    const save = make(fetchImpl);
    expect(await save({ ...input, userId: "fake" })).toBe(false);
    expect(await save({ ...input, draft: {} })).toBe(false);
    expect(await save({ ...input, requestId: "../../bad" })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects untrusted endpoints and missing secret", () => {
    expect(() => createHyperApplicationDraftStore({
      url: "https://evil.example", serviceRoleKey: "key", fetchImpl: vi.fn()
    })).toThrow(TypeError);
    expect(() => createHyperApplicationDraftStore({
      url: "https://xsus-example.supabase.co", serviceRoleKey: ""
    })).toThrow(TypeError);
  });
});
