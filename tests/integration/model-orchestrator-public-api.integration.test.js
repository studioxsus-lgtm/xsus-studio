import { describe, it, expect, vi, afterEach } from "vitest";

import {
  XSUSAI,
  configureAICoreModelOrchestrator,
} from "../../src/index.js";

afterEach(() => {
  configureAICoreModelOrchestrator(null);
});

describe("XSUS AI Core — Model Orchestrator Public API", () => {
  it("ekspozon konfigurimin e orchestrator përmes API-së publike", () => {
    expect(typeof configureAICoreModelOrchestrator).toBe("function");
    expect(typeof XSUSAI.configureAICoreModelOrchestrator).toBe(
      "function",
    );
  });

  it("pranon një orchestrator me metodën generate", () => {
    const orchestrator = {
      generate: vi.fn(),
    };

    expect(() => {
      XSUSAI.configureAICoreModelOrchestrator(orchestrator);
    }).not.toThrow();
  });

  it("lejon çaktivizimin e orchestrator", () => {
    const orchestrator = {
      generate: vi.fn(),
    };

    configureAICoreModelOrchestrator(orchestrator);

    expect(() => {
      configureAICoreModelOrchestrator(null);
    }).not.toThrow();
  });

  it("refuzon konfigurime që nuk ofrojnë generate", () => {
    expect(() => {
      configureAICoreModelOrchestrator({});
    }).toThrow(TypeError);
  });
});
