import { describe, test, expect, vi } from "vitest";
import { createPrivateChatPersistence } from "../../assets/js/xsus-ai/adapters/xsus-private-chat-persistence.js";
const C = "33333333-3333-4333-8333-333333333333";
const O = "44444444-4444-4444-8444-444444444444";
const req = { localConversationId: "local-a", localMessageId: "local-message", content: "Hello XSUS" };
function setup() {
  const createConversation = vi.fn(async () => ({ id: C }));
  const saveUserMessage = vi.fn(async data => ({ id: "saved", ...data }));
  const createOperationId = vi.fn(() => O);
  const service = createPrivateChatPersistence({ createConversation, saveUserMessage, createOperationId });
  return { service, createConversation, saveUserMessage, createOperationId };
}
describe("XSUS opt-in private chat persistence", () => {
  test("01. maps local conversation to authenticated database conversation", async () => {
    const h = setup(); await h.service.save(req);
    expect(h.createConversation).toHaveBeenCalledWith({ title: "New conversation" });
    expect(h.saveUserMessage).toHaveBeenCalledWith({ conversationId: C, operationId: O, content: req.content });
  });
  test("02. reuses database conversation for another message", async () => {
    const h = setup(); await h.service.save(req);
    await h.service.save({ ...req, localMessageId: "another" });
    expect(h.createConversation).toHaveBeenCalledTimes(1);
  });
  test("03. retry preserves operation ID", async () => {
    const h = setup(); await h.service.save(req); await h.service.save(req);
    expect(h.createOperationId).toHaveBeenCalledTimes(1);
    expect(h.saveUserMessage).toHaveBeenCalledTimes(2);
  });
  test("04. same message ID with changed content fails closed", async () => {
    const h = setup(); await h.service.save(req);
    await expect(h.service.save({ ...req, content: "changed" })).rejects.toThrow("Message ID reused");
  });
  test("05. invalid message does not create database conversation", async () => {
    const h = setup(); await expect(h.service.save({ ...req, content: " " })).rejects.toThrow(TypeError);
    expect(h.createConversation).not.toHaveBeenCalled();
  });
  test("06. concurrent sends share conversation creation", async () => {
    const h = setup(); await Promise.all([h.service.save(req), h.service.save({ ...req, localMessageId: "two" })]);
    expect(h.createConversation).toHaveBeenCalledTimes(1);
  });
  test("07. conversation creation failure does not write a message", async () => {
    const h = setup(); h.createConversation.mockRejectedValueOnce(new Error("RLS denied"));
    await expect(h.service.save(req)).rejects.toThrow("RLS denied");
    expect(h.saveUserMessage).not.toHaveBeenCalled();
  });
  test("08. invalidation prevents late conversation result from writing", async () => {
    let resolve; const h = setup();
    h.createConversation.mockImplementation(() => new Promise(r => { resolve = r; }));
    const task = h.service.save(req);
    h.service.invalidate(); resolve({ id: C });
    await expect(task).rejects.toThrow("invalidated");
    expect(h.saveUserMessage).not.toHaveBeenCalled();
  });
  test("09. destroy rejects further operations", async () => {
    const h = setup(); h.service.destroy();
    await expect(h.service.save(req)).rejects.toThrow("invalidated");
  });
  test("10. dependency validation fails closed", () => {
    expect(() => createPrivateChatPersistence({})).toThrow(TypeError);
  });
});
