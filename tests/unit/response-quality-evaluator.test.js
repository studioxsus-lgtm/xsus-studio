import { describe, it, expect } from "vitest";

import {
  evaluateResponseQuality,
  RESPONSE_QUALITY_EVALUATOR_VERSION,
} from "../../src/core/response-quality-evaluator.js";

import {
  RESPONSE_QUALITY_REPORT_STATUSES as STATUSES,
} from "../../src/core/response-quality-report.js";

function createQualityResult(overrides = {}) {
  return {
    valid: true,
    score: 95,
    dimensions: {
      completeness: 95,
      clarity: 95,
      language: 95,
      sources: 95,
    },
    errors: [],
    sourceCount: 0,
    ...overrides,
  };
}

function createScenario(id, overrides = {}) {
  return {
    id,
    qualityResult: createQualityResult(),
    ...overrides,
  };
}

describe("XSUS AI Core — Response Quality Evaluator", () => {
  describe("Version and public contract", () => {
    it("exposes version 1.0.0", () => {
      expect(RESPONSE_QUALITY_EVALUATOR_VERSION).toBe("1.0.0");
    });

    it("exports the evaluator as the default function", async () => {
      const module = await import(
        "../../src/core/response-quality-evaluator.js"
      );

      expect(module.default).toBe(evaluateResponseQuality);
    });

    it("returns the expected result structure for an empty array", () => {
      expect(evaluateResponseQuality([])).toEqual({
        version: "1.0.0",
        executed: 0,
        assessed: 0,
        passed: 0,
        failed: 0,
        unassessed: 0,
        passRate: null,
        results: [],
      });
    });
  });

  describe("Input validation", () => {
    it.each([null, undefined, {}, "invalid", 123, true])(
      "rejects invalid scenario collections",
      (input) => {
        expect(() => evaluateResponseQuality(input)).toThrow(
          "Skenarët e vlerësimit duhet të jenë një array."
        );
      }
    );

    it.each([null, undefined, [], "invalid", 123, new Date()])(
      "rejects non-plain scenarios",
      (scenario) => {
        expect(() =>
          evaluateResponseQuality([scenario])
        ).toThrow(TypeError);
      }
    );

    it("rejects objects with custom prototypes", () => {
      const scenario = Object.create({ inherited: true });
      scenario.id = "custom-prototype";

      expect(() =>
        evaluateResponseQuality([scenario])
      ).toThrow(TypeError);
    });

    it.each([undefined, null, 123, true, {}, [], "", "   "])(
      "rejects invalid IDs",
      (id) => {
        expect(() =>
          evaluateResponseQuality([createScenario(id)])
        ).toThrow(TypeError);
      }
    );

    it("normalizes IDs by trimming whitespace", () => {
      const result = evaluateResponseQuality([
        createScenario("  scenario-a  "),
      ]);

      expect(result.results[0].id).toBe("scenario-a");
    });

    it("rejects duplicate normalized IDs", () => {
      expect(() =>
        evaluateResponseQuality([
          createScenario("scenario-a"),
          createScenario(" scenario-a "),
        ])
      ).toThrow("ID e përsëritur e skenarit: scenario-a.");
    });

    it("rejects an explicitly null expected status", () => {
      expect(() =>
        evaluateResponseQuality([
          createScenario("null-status", {
            expectedStatus: null,
          }),
        ])
      ).toThrow(TypeError);
    });

    it("rejects an explicitly undefined expected status", () => {
      expect(() =>
        evaluateResponseQuality([
          createScenario("undefined-status", {
            expectedStatus: undefined,
          }),
        ])
      ).toThrow(TypeError);
    });

    it("rejects unknown expected statuses", () => {
      expect(() =>
        evaluateResponseQuality([
          createScenario("invalid-status", {
            expectedStatus: "unknown",
          }),
        ])
      ).toThrow(
        'Statusi i pritur për skenarin "invalid-status" nuk është i vlefshëm.'
      );
    });

    it("accepts all declared report statuses", () => {
      for (const status of Object.values(STATUSES)) {
        expect(() =>
          evaluateResponseQuality([
            createScenario(`scenario-${status}`, {
              expectedStatus: status,
            }),
          ])
        ).not.toThrow();
      }
    });
  });

  describe("Scenario evaluation", () => {
    it("evaluates a scenario without expected status as unassessed", () => {
      const result = evaluateResponseQuality([
        createScenario("unassessed"),
      ]);

      expect(result.executed).toBe(1);
      expect(result.assessed).toBe(0);
      expect(result.unassessed).toBe(1);
      expect(result.passRate).toBeNull();

      expect(result.results[0].passed).toBeNull();
      expect(result.results[0].expectedStatus).toBeNull();
      expect(result.results[0].actualStatus).toBe(STATUSES.COMPLETE);
      expect(result.results[0].report).not.toBeNull();
      expect(result.results[0].error).toBeNull();
    });

    it("marks a scenario as passed when statuses match", () => {
      const result = evaluateResponseQuality([
        createScenario("matching", {
          expectedStatus: STATUSES.COMPLETE,
        }),
      ]);

      expect(result.results[0].passed).toBe(true);
      expect(result.results[0].expectedStatus).toBe(STATUSES.COMPLETE);
      expect(result.results[0].actualStatus).toBe(STATUSES.COMPLETE);
      expect(result.results[0].error).toBeNull();
    });

    it("marks a scenario as failed when statuses differ", () => {
      const result = evaluateResponseQuality([
        createScenario("mismatch", {
          qualityResult: createQualityResult({
            valid: false,
            errors: ["Input error"],
          }),
          expectedStatus: STATUSES.COMPLETE,
        }),
      ]);

      expect(result.results[0].passed).toBe(false);
      expect(result.results[0].expectedStatus).toBe(STATUSES.COMPLETE);
      expect(result.results[0].actualStatus).toBe(
        STATUSES.NEEDS_IMPROVEMENT
      );
    });

    it("passes source verification to the report factory", () => {
      const sourceVerification = {
        results: [
          {
            status: "verified",
            valid: true,
            verified: true,
            trustEstablished: true,
            title: "Test source",
            contentLength: 100,
            errors: [],
          },
        ],
      };

      const result = evaluateResponseQuality([
        createScenario("source-verification", {
          sourceVerification,
        }),
      ]);

      expect(result.results[0].report.sources.available).toBe(true);
      expect(result.results[0].report.sources.verifiedCount).toBe(1);
      expect(result.results[0].report.sources.trustEstablishedCount).toBe(1);
    });

    it("normalizes missing source verification to null", () => {
      const result = evaluateResponseQuality([
        createScenario("missing-source"),
      ]);

      expect(result.results[0].report.sources.available).toBe(false);
      expect(result.results[0].report.sources.verificationResultCount).toBe(0);
    });

    it("preserves an insufficient-data report", () => {
      const result = evaluateResponseQuality([
        createScenario("insufficient", {
          qualityResult: {
            valid: true,
            score: null,
            dimensions: {},
          },
          expectedStatus: STATUSES.INSUFFICIENT_DATA,
        }),
      ]);

      expect(result.results[0].actualStatus).toBe(
        STATUSES.INSUFFICIENT_DATA
      );
      expect(result.results[0].passed).toBe(true);
    });
  });

  describe("Scenario failure isolation", () => {
    it("records a failed scenario without stopping later scenarios", () => {
      const result = evaluateResponseQuality([
        createScenario("valid-before"),
        {
          id: "invalid-quality",
          qualityResult: null,
          expectedStatus: STATUSES.COMPLETE,
        },
        createScenario("valid-after"),
      ]);

      expect(result.executed).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].error).toBeNull();

      expect(result.results[1].passed).toBe(false);
      expect(result.results[1].actualStatus).toBeNull();
      expect(result.results[1].report).toBeNull();
      expect(result.results[1].error).toBe(
        "Rezultati i cilësisë duhet të jetë objekt."
      );

      expect(result.results[2].error).toBeNull();
    });

    it("continues after multiple scenario failures", () => {
      const result = evaluateResponseQuality([
        { id: "failure-a", qualityResult: null },
        createScenario("success-a"),
        { id: "failure-b", qualityResult: undefined },
        createScenario("success-b"),
      ]);

      expect(result.executed).toBe(4);
      expect(result.results[0].error).toBeTruthy();
      expect(result.results[1].error).toBeNull();
      expect(result.results[2].error).toBeTruthy();
      expect(result.results[3].error).toBeNull();
    });

    it("uses the fallback message for non-Error failures", () => {
      const throwingQualityResult = new Proxy(
        {},
        {
          get() {
            throw "unexpected failure";
          },
        }
      );

      const result = evaluateResponseQuality([
        {
          id: "non-error-failure",
          qualityResult: throwingQualityResult,
        },
      ]);

      expect(result.results[0].error).toBe(
        "Ndodhi një gabim i panjohur gjatë vlerësimit."
      );
      expect(result.results[0].report).toBeNull();
    });
  });

  describe("Summary calculations", () => {
    it("calculates passed, failed and unassessed counts", () => {
      const result = evaluateResponseQuality([
        createScenario("passed", {
          expectedStatus: STATUSES.COMPLETE,
        }),
        createScenario("unassessed"),
        {
          id: "failed",
          qualityResult: createQualityResult({
            valid: false,
            errors: ["Invalid input"],
          }),
          expectedStatus: STATUSES.COMPLETE,
        },
      ]);

      expect(result.executed).toBe(3);
      expect(result.assessed).toBe(2);
      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.unassessed).toBe(1);
      expect(result.passRate).toBe(50);
    });

    it("returns 100 percent when all assessed scenarios pass", () => {
      const result = evaluateResponseQuality([
        createScenario("pass-a", {
          expectedStatus: STATUSES.COMPLETE,
        }),
        createScenario("pass-b", {
          expectedStatus: STATUSES.COMPLETE,
        }),
      ]);

      expect(result.passRate).toBe(100);
    });

    it("returns zero percent when all assessed scenarios fail", () => {
      const result = evaluateResponseQuality([
        {
          id: "fail-a",
          qualityResult: createQualityResult({
            valid: false,
            errors: ["Invalid"],
          }),
          expectedStatus: STATUSES.COMPLETE,
        },
      ]);

      expect(result.assessed).toBe(1);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.passRate).toBe(0);
    });

    it("excludes unassessed scenarios from pass rate", () => {
      const result = evaluateResponseQuality([
        createScenario("pass", {
          expectedStatus: STATUSES.COMPLETE,
        }),
        createScenario("unassessed-a"),
        createScenario("unassessed-b"),
      ]);

      expect(result.assessed).toBe(1);
      expect(result.unassessed).toBe(2);
      expect(result.passRate).toBe(100);
    });

    it("returns null pass rate when no scenarios are comparable", () => {
      const result = evaluateResponseQuality([
        createScenario("unassessed-a"),
        createScenario("unassessed-b"),
      ]);

      expect(result.assessed).toBe(0);
      expect(result.passRate).toBeNull();
    });
  });

  describe("Immutability", () => {
    it("freezes the complete evaluation result", () => {
      const result = evaluateResponseQuality([
        createScenario("immutable", {
          expectedStatus: STATUSES.COMPLETE,
        }),
      ]);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.results)).toBe(true);
      expect(Object.isFrozen(result.results[0])).toBe(true);
      expect(Object.isFrozen(result.results[0].report)).toBe(true);
    });

    it("freezes nested report objects and arrays", () => {
      const result = evaluateResponseQuality([
        createScenario("deep-freeze", {
          expectedStatus: STATUSES.COMPLETE,
        }),
      ]);

      const report = result.results[0].report;

      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.dimensions)).toBe(true);
      expect(Object.isFrozen(report.sources)).toBe(true);
      expect(Object.isFrozen(report.errors)).toBe(true);
      expect(Object.isFrozen(report.warnings)).toBe(true);
      expect(Object.isFrozen(report.recommendations)).toBe(true);
    });

    it("does not freeze the original scenario or quality result", () => {
      const scenario = createScenario("original");

      evaluateResponseQuality([scenario]);

      expect(Object.isFrozen(scenario)).toBe(false);
      expect(Object.isFrozen(scenario.qualityResult)).toBe(false);
      expect(Object.isFrozen(scenario.qualityResult.dimensions)).toBe(false);
    });

    it("does not modify the original scenarios array", () => {
      const scenarios = [
        createScenario("first"),
        createScenario("second"),
      ];

      const snapshot = structuredClone(scenarios);

      evaluateResponseQuality(scenarios);

      expect(scenarios).toEqual(snapshot);
      expect(Object.isFrozen(scenarios)).toBe(false);
    });

    it("freezes failure results", () => {
      const result = evaluateResponseQuality([
        {
          id: "failure",
          qualityResult: null,
        },
      ]);

      expect(Object.isFrozen(result.results[0])).toBe(true);
      expect(result.results[0].passed).toBe(false);
      expect(result.results[0].report).toBeNull();
    });
  });
});
