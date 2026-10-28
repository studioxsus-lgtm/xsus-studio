import { describe, it, expect } from "vitest";

import {
evaluateResponseQualityBenchmarks,
RESPONSE_QUALITY_BENCHMARK_ENGINE_VERSION,
} from "../../src/core/response-quality-benchmark-engine.js";

describe("XSUS Response Quality Benchmark Engine", () => {
it("ka versionin e pritshëm", () => {
expect(
RESPONSE_QUALITY_BENCHMARK_ENGINE_VERSION
).toBe("1.0.0");
});

it("identifikon objektivat e arritura", () => {
const result = evaluateResponseQualityBenchmarks(
[{ id: "passRate", value: 0.98 }],
[{ id: "passRate", target: 0.95, direction: "min" }]
);

expect(result.summary.passedCount).toBe(1);
expect(result.summary.failedCount).toBe(0);
expect(result.results[0].status).toBe("passed");

});

it("identifikon objektivat e paarritura", () => {
const result = evaluateResponseQualityBenchmarks(
[{ id: "passRate", value: 0.8 }],
[{ id: "passRate", target: 0.95, direction: "min" }]
);

expect(result.summary.failedCount).toBe(1);
expect(result.results[0].status).toBe("failed");
expect(result.results[0].gap).toBeCloseTo(-0.15);

});

it("mbështet objektivat max", () => {
const result = evaluateResponseQualityBenchmarks(
[{ id: "latency", value: 120 }],
[{ id: "latency", target: 150, direction: "max" }]
);

expect(result.results[0].passed).toBe(true);
expect(result.results[0].gap).toBe(30);

});

it("identifikon metrikat që mungojnë", () => {
const result = evaluateResponseQualityBenchmarks(
[],
[{ id: "accuracy", target: 0.9, direction: "min" }]
);

expect(result.summary.missingCount).toBe(1);
expect(result.results[0].status).toBe("missing");
expect(result.results[0].actual).toBeNull();

});

it("llogarit normën e objektivave të arritura", () => {
const result = evaluateResponseQualityBenchmarks(
[
{ id: "accuracy", value: 0.95 },
{ id: "reliability", value: 0.8 },
],
[
{ id: "accuracy", target: 0.9, direction: "min" },
{ id: "reliability", target: 0.9, direction: "min" },
]
);

expect(result.summary.passedCount).toBe(1);
expect(result.summary.failedCount).toBe(1);
expect(result.summary.passRate).toBe(0.5);

});

it("trajton listën bosh të objektivave", () => {
const result = evaluateResponseQualityBenchmarks([], []);

expect(result.summary.benchmarkCount).toBe(0);
expect(result.summary.passRate).toBeNull();
expect(result.summary.allPassed).toBe(false);

});

it("raporton allPassed vetëm kur çdo objektiv është arritur", () => {
const result = evaluateResponseQualityBenchmarks(
[
{ id: "a", value: 1 },
{ id: "b", value: 2 },
],
[
{ id: "a", target: 1, direction: "min" },
{ id: "b", target: 2, direction: "max" },
]
);

expect(result.summary.allPassed).toBe(true);

});

it("refuzon currentMetrics që nuk është array", () => {
expect(() =>
evaluateResponseQualityBenchmarks({}, [])
).toThrow("currentMetrics duhet të jetë një array.");
});

it("refuzon benchmarks që nuk është array", () => {
expect(() =>
evaluateResponseQualityBenchmarks([], {})
).toThrow("benchmarks duhet të jetë një array.");
});

it("refuzon metrikë me vlerë jo numerike", () => {
expect(() =>
evaluateResponseQualityBenchmarks(
[{ id: "accuracy", value: "high" }],
[]
)
).toThrow();
});

it("refuzon drejtim të pavlefshëm", () => {
expect(() =>
evaluateResponseQualityBenchmarks(
[{ id: "accuracy", value: 0.9 }],
[{ id: "accuracy", target: 0.8, direction: "equal" }]
)
).toThrow();
});

it("refuzon ID të përsëritura të metrikave", () => {
expect(() =>
evaluateResponseQualityBenchmarks(
[
{ id: "accuracy", value: 0.9 },
{ id: "accuracy", value: 0.8 },
],
[]
)
).toThrow("ID e përsëritur në currentMetrics: accuracy.");
});

it("refuzon ID të përsëritura të objektivave", () => {
expect(() =>
evaluateResponseQualityBenchmarks(
[{ id: "accuracy", value: 0.9 }],
[
{ id: "accuracy", target: 0.8, direction: "min" },
{ id: "accuracy", target: 0.7, direction: "min" },
]
)
).toThrow("ID e përsëritur në benchmarks: accuracy.");
});

it("kthen rezultat të pandryshueshëm", () => {
const result = evaluateResponseQualityBenchmarks(
[{ id: "accuracy", value: 0.95 }],
[{ id: "accuracy", target: 0.9, direction: "min" }]
);

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.summary)).toBe(true);
expect(Object.isFrozen(result.results)).toBe(true);
expect(Object.isFrozen(result.results[0])).toBe(true);

});
});
