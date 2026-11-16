import { describe, expect, it } from "vitest";
import { createEvidenceIntegrityMonitor } from "../../src/hyper-xsus-core/knowledge-graph/evidence-integrity-monitor.js";

function setup({ threshold = 2, limit = 3, notify } = {}) {
  let ready = false, tick = 0;
  const supervisor = {
    async check() {
      return { ready, reason: ready ? "verified" : "invalid-anchor", timestamp: ++tick };
    }
  };
  const monitor = createEvidenceIntegrityMonitor({
    supervisor, degradedThreshold: threshold, historyLimit: limit, notify
  });
  return { monitor, setReady(value) { ready = value; } };
}
describe("Hyper XSUS Core — evidence integrity monitor", () => {
  it("opens incidents only after the configured failure threshold", async () => {
    const { monitor } = setup();
    expect((await monitor.poll()).transition).toBeNull();
    const result = await monitor.poll();
    expect(result.transition).toBe("opened");
    expect(result.incident.status).toBe("open");
    expect((await monitor.poll()).transition).toBeNull();
  });
  it("resolves incidents on verified recovery", async () => {
    const { monitor, setReady } = setup();
    await monitor.poll();
    await monitor.poll();
    setReady(true);
    const result = await monitor.poll();
    expect(result.transition).toBe("resolved");
    expect(monitor.status().activeIncident).toBeNull();
  });
  it("emits one notification for each transition", async () => {
    const events = [];
    const { monitor, setReady } = setup({ notify: async event => events.push(event.transition) });
    await monitor.poll();
    await monitor.poll();
    await monitor.poll();
    setReady(true);
    await monitor.poll();
    expect(events).toEqual(["opened", "resolved"]);
  });
  it("does not change incident state if notification fails", async () => {
    const { monitor } = setup({ threshold: 1, notify: async () => { throw new Error("offline"); } });
    expect((await monitor.poll()).transition).toBe("opened");
    expect(monitor.status().activeIncident.status).toBe("open");
  });
  it("bounds history and serializes simultaneous polls", async () => {
    const { monitor } = setup({ limit: 2 });
    await Promise.all([monitor.poll(), monitor.poll(), monitor.poll()]);
    expect(monitor.recent()).toHaveLength(2);
    expect(Object.isFrozen(monitor.recent())).toBe(true);
  });
  it("fails closed on supervisor errors", async () => {
    const monitor = createEvidenceIntegrityMonitor({
      supervisor: { async check() { throw new Error("secret"); } },
      degradedThreshold: 1
    });
    expect(await monitor.poll()).toMatchObject({
      ready: false, reason: "health-check-failed", transition: "opened"
    });
  });
  it("validates configuration and supports closure", async () => {
    expect(() => createEvidenceIntegrityMonitor()).toThrow("supervisor.check");
    const { monitor } = setup();
    monitor.close();
    await expect(monitor.poll()).rejects.toThrow("closed");
  });
});
