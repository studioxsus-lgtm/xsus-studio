import { describe, it, expect } from "vitest";

import {
  detectResponseQualityRegressions,
  RESPONSE_QUALITY_REGRESSION_DETECTOR_VERSION,
} from "../../src/core/response-quality-regression-detector.js";

function createResult(id, passed) {
  return { id, passed };
}

function createEvaluation(results = []) {
  return { results };
}

describe("XSUS AI Core — Response Quality Regression Detector", () => {
  describe("Version and public contract", () => {
    it("exposes version 1.0.0", () => {
      expect(
        RESPONSE_QUALITY_REGRESSION_DETECTOR_VERSION
      ).toBe("1.0.0");
    });

    it("exports the detector as the default function", async () => {
      const module = await import(
        "../../src/core/response-quality-regression-detector.js"
      );

      expect(module.default).toBe(
        detectResponseQualityRegressions
      );
    });

    it("returns the complete result structure for empty evaluations", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation(),
        createEvaluation()
      );

      expect(result).toEqual({
        version: "1.0.0",
        baseline: {
          scenarioCount: 0,
          passRate: null,
        },
        current: {
          scenarioCount: 0,
          passRate: null,
        },
        passRateDelta: null,
        hasRegressions: false,
        regressions: [],
        recovered: [],
        added: [],
        removed: [],
        unchanged: [],
        unassessed: [],
      });
    });
  });

  describe("Input validation", () => {
    it.each([
      null,
      undefined,
      [],
      "invalid",
      123,
      true,
    ])("rejects invalid baseline evaluations", (baseline) => {
      expect(() =>
        detectResponseQualityRegressions(
          baseline,
          createEvaluation()
        )
      ).toThrow(TypeError);
    });

    it.each([
      null,
      undefined,
      [],
      "invalid",
      123,
      true,
    ])("rejects invalid current evaluations", (current) => {
      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation(),
          current
        )
      ).toThrow(TypeError);
    });

    it("rejects evaluations with a custom prototype", () => {
      const evaluation = Object.create({
        inherited: true,
      });

      evaluation.results = [];

      expect(() =>
        detectResponseQualityRegressions(
          evaluation,
          createEvaluation()
        )
      ).toThrow(TypeError);
    });

    it("rejects evaluations without a results array", () => {
      expect(() =>
        detectResponseQualityRegressions(
          {},
          createEvaluation()
        )
      ).toThrow(
        "baseline.results duhet të jetë array."
      );

      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation(),
          {}
        )
      ).toThrow(
        "current.results duhet të jetë array."
      );
    });

    it("rejects non-object results", () => {
      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation([null]),
          createEvaluation()
        )
      ).toThrow(
        "baseline përmban një rezultat të pavlefshëm."
      );
    });

    it("rejects results with custom prototypes", () => {
      const result = Object.create({
        inherited: true,
      });

      result.id = "custom-result";
      result.passed = true;

      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation([result]),
          createEvaluation()
        )
      ).toThrow(TypeError);
    });

    it.each([
      undefined,
      null,
      123,
      true,
      {},
      [],
      "",
      "   ",
    ])("rejects invalid result IDs", (id) => {
      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation([createResult(id, true)]),
          createEvaluation()
        )
      ).toThrow(
        "baseline përmban një rezultat pa ID të vlefshme."
      );
    });

    it("rejects duplicate IDs in baseline", () => {
      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation([
            createResult("same-id", true),
            createResult("same-id", false),
          ]),
          createEvaluation()
        )
      ).toThrow(
        "baseline përmban ID të përsëritur: same-id."
      );
    });

    it("rejects duplicate IDs in current evaluation", () => {
      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation(),
          createEvaluation([
            createResult("same-id", true),
            createResult("same-id", false),
          ])
        )
      ).toThrow(
        "current përmban ID të përsëritur: same-id."
      );
    });

    it.each([
      undefined,
      "true",
      1,
      0,
      {},
      [],
    ])("rejects invalid passed statuses", (passed) => {
      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation([
            createResult("invalid-status", passed),
          ]),
          createEvaluation()
        )
      ).toThrow(
        'baseline përmban status të pavlefshëm për "invalid-status".'
      );
    });

    it("accepts true, false and null statuses", () => {
      expect(() =>
        detectResponseQualityRegressions(
          createEvaluation([
            createResult("passed", true),
            createResult("failed", false),
            createResult("unassessed", null),
          ]),
          createEvaluation()
        )
      ).not.toThrow();
    });
  });

  describe("Regression detection", () => {
    it("detects a regression from passed to failed", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("scenario-a", true),
        ]),
        createEvaluation([
          createResult("scenario-a", false),
        ])
      );

      expect(result.regressions).toEqual(["scenario-a"]);
      expect(result.hasRegressions).toBe(true);
    });

    it("detects recovery from failed to passed", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("scenario-a", false),
        ]),
        createEvaluation([
          createResult("scenario-a", true),
        ])
      );

      expect(result.recovered).toEqual(["scenario-a"]);
      expect(result.hasRegressions).toBe(false);
    });

    it("detects added scenarios", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation(),
        createEvaluation([
          createResult("new-scenario", true),
        ])
      );

      expect(result.added).toEqual(["new-scenario"]);
    });

    it("detects removed scenarios", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("removed-scenario", true),
        ]),
        createEvaluation()
      );

      expect(result.removed).toEqual([
        "removed-scenario",
      ]);
    });

    it("detects unchanged passed scenarios", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("scenario-a", true),
        ]),
        createEvaluation([
          createResult("scenario-a", true),
        ])
      );

      expect(result.unchanged).toEqual(["scenario-a"]);
    });

    it("detects unchanged failed scenarios", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("scenario-a", false),
        ]),
        createEvaluation([
          createResult("scenario-a", false),
        ])
      );

      expect(result.unchanged).toEqual(["scenario-a"]);
    });

    it("detects unassessed scenarios when baseline is null", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("scenario-a", null),
        ]),
        createEvaluation([
          createResult("scenario-a", true),
        ])
      );

      expect(result.unassessed).toEqual(["scenario-a"]);
    });

    it("detects unassessed scenarios when current is null", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("scenario-a", true),
        ]),
        createEvaluation([
          createResult("scenario-a", null),
        ])
      );

      expect(result.unassessed).toEqual(["scenario-a"]);
    });

    it("detects unassessed scenarios when both statuses are null", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("scenario-a", null),
        ]),
        createEvaluation([
          createResult("scenario-a", null),
        ])
      );

      expect(result.unassessed).toEqual(["scenario-a"]);
    });

    it("classifies multiple scenario changes independently", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("regression", true),
          createResult("recovery", false),
          createResult("unchanged", true),
          createResult("unassessed", null),
          createResult("removed", true),
        ]),
        createEvaluation([
          createResult("regression", false),
          createResult("recovery", true),
          createResult("unchanged", true),
          createResult("unassessed", null),
          createResult("added", true),
        ])
      );

      expect(result.regressions).toEqual(["regression"]);
      expect(result.recovered).toEqual(["recovery"]);
      expect(result.unchanged).toEqual(["unchanged"]);
      expect(result.unassessed).toEqual(["unassessed"]);
      expect(result.added).toEqual(["added"]);
      expect(result.removed).toEqual(["removed"]);
      expect(result.hasRegressions).toBe(true);
    });
  });

  describe("Pass-rate calculations", () => {
    it("calculates a 100 percent pass rate", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", true),
          createResult("b", true),
        ]),
        createEvaluation([
          createResult("a", true),
          createResult("b", true),
        ])
      );

      expect(result.baseline.passRate).toBe(100);
      expect(result.current.passRate).toBe(100);
      expect(result.passRateDelta).toBe(0);
    });

    it("calculates a zero percent pass rate", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", false),
          createResult("b", false),
        ]),
        createEvaluation([
          createResult("a", false),
          createResult("b", false),
        ])
      );

      expect(result.baseline.passRate).toBe(0);
      expect(result.current.passRate).toBe(0);
      expect(result.passRateDelta).toBe(0);
    });

    it("calculates positive pass-rate delta after recovery", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", false),
          createResult("b", false),
        ]),
        createEvaluation([
          createResult("a", true),
          createResult("b", false),
        ])
      );

      expect(result.baseline.passRate).toBe(0);
      expect(result.current.passRate).toBe(50);
      expect(result.passRateDelta).toBe(50);
    });

    it("calculates negative pass-rate delta after regression", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", true),
          createResult("b", true),
        ]),
        createEvaluation([
          createResult("a", false),
          createResult("b", true),
        ])
      );

      expect(result.baseline.passRate).toBe(100);
      expect(result.current.passRate).toBe(50);
      expect(result.passRateDelta).toBe(-50);
    });

    it("ignores unassessed scenarios in pass-rate calculations", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", true),
          createResult("b", null),
          createResult("c", false),
        ]),
        createEvaluation([
          createResult("a", true),
          createResult("b", null),
          createResult("c", false),
        ])
      );

      expect(result.baseline.passRate).toBe(50);
      expect(result.current.passRate).toBe(50);
      expect(result.passRateDelta).toBe(0);
    });

    it("returns null rates when there are no assessed results", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", null),
        ]),
        createEvaluation([
          createResult("a", null),
        ])
      );

      expect(result.baseline.passRate).toBeNull();
      expect(result.current.passRate).toBeNull();
      expect(result.passRateDelta).toBeNull();
    });

    it("returns null delta when only baseline rate is unavailable", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", null),
        ]),
        createEvaluation([
          createResult("a", true),
        ])
      );

      expect(result.baseline.passRate).toBeNull();
      expect(result.current.passRate).toBe(100);
      expect(result.passRateDelta).toBeNull();
    });

    it("returns null delta when only current rate is unavailable", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", true),
        ]),
        createEvaluation([
          createResult("a", null),
        ])
      );

      expect(result.baseline.passRate).toBe(100);
      expect(result.current.passRate).toBeNull();
      expect(result.passRateDelta).toBeNull();
    });

    it("rounds pass-rate values to two decimal places", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", true),
          createResult("b", false),
          createResult("c", false),
        ]),
        createEvaluation([
          createResult("a", true),
          createResult("b", false),
          createResult("c", false),
        ])
      );

      expect(result.baseline.passRate).toBe(33.33);
      expect(result.current.passRate).toBe(33.33);
      expect(result.passRateDelta).toBe(0);
    });
  });

  describe("Immutability", () => {
    it("freezes the complete detector result", () => {
      const result = detectResponseQualityRegressions(
        createEvaluation([
          createResult("a", true),
        ]),
        createEvaluation([
          createResult("a", false),
        ])
      );

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.baseline)).toBe(true);
      expect(Object.isFrozen(result.current)).toBe(true);
      expect(Object.isFrozen(result.regressions)).toBe(true);
      expect(Object.isFrozen(result.recovered)).toBe(true);
      expect(Object.isFrozen(result.added)).toBe(true);
      expect(Object.isFrozen(result.removed)).toBe(true);
      expect(Object.isFrozen(result.unchanged)).toBe(true);
      expect(Object.isFrozen(result.unassessed)).toBe(true);
    });

    it("does not freeze or modify the original evaluations", () => {
      const baseline = createEvaluation([
        createResult("a", true),
      ]);

      const current = createEvaluation([
        createResult("a", false),
      ]);

      const baselineSnapshot = structuredClone(baseline);
      const currentSnapshot = structuredClone(current);

      detectResponseQualityRegressions(
        baseline,
        current
      );

      expect(baseline).toEqual(baselineSnapshot);
      expect(current).toEqual(currentSnapshot);
      expect(Object.isFrozen(baseline)).toBe(false);
      expect(Object.isFrozen(current)).toBe(false);
      expect(Object.isFrozen(baseline.results)).toBe(false);
      expect(Object.isFrozen(current.results)).toBe(false);
    });
  });
});
