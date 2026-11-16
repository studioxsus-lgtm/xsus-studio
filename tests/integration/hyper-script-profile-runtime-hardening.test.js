import { describe, expect, it } from "vitest";
import { createWrittenScriptProfileEngine } from "../../src/hyper-xsus-core/cross-cutting/written-script-profile-engine.js";
import { createStructuredOutputGuard } from "../../src/hyper-xsus-core/cross-cutting/structured-output-guard.js";
import { createRuntimeCircuitBreaker } from "../../src/hyper-xsus-core/cross-cutting/runtime-circuit-breaker.js";
describe("Hyper XSUS Core — script profile and runtime safety", () => {
  it("profiles mixed scripts without claiming to detect language", () => {
    const profile = createWrittenScriptProfileEngine().profile("Përshëndetje Привет");
    expect(profile.dominantScript).toBe("Latin");
    expect(profile.distribution.map(x => x.script)).toEqual(["Latin", "Cyrillic"]);
    expect(profile.languageDetected).toBe(false);
    expect(Object.isFrozen(profile.distribution[0])).toBe(true);
  });
  it("handles empty and non-letter input", () => {
    const profile = createWrittenScriptProfileEngine().profile("123!?");
    expect(profile.dominantScript).toBe(null);
    expect(profile.letterCount).toBe(0);
  });
  it("enforces Unicode code-point bounds", () => {
    const engine = createWrittenScriptProfileEngine({ maxCodePoints: 1 });
    expect(engine.profile("😀").codePoints).toBe(1);
    expect(() => engine.profile("AB")).toThrow("limit");
  });
  it("rejects sparse and decorated arrays in structured output", () => {
    const guard = createStructuredOutputGuard();
    const sparse = []; sparse[1] = 1;
    expect(() => guard.validate({ data: sparse })).toThrow("array");
    const decorated = [1]; decorated.extra = "unsafe";
    expect(() => guard.validate({ data: decorated })).toThrow("array");
  });
  it("does not allow stale half-open success to close a newer opened circuit", async () => {
    let now = 0, resolveProbe;
    const breaker = createRuntimeCircuitBreaker({
      failureThreshold: 1, resetAfterMs: 10, clock: () => now
    });
    await expect(breaker.execute(async () => { throw Error("offline"); })).rejects.toThrow();
    now = 10;
    const probe = breaker.execute(() => new Promise(resolve => { resolveProbe = resolve; }));
    // While probe is active, no concurrent operation can be admitted.
    await expect(breaker.execute(async () => "not admitted")).rejects.toThrow("unavailable");
    resolveProbe("healthy");
    expect(await probe).toBe("healthy");
    expect(breaker.status().state).toBe("closed");
  });
});
