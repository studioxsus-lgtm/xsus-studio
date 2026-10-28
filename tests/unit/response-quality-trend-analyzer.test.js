import { describe, it, expect } from "vitest";

import {
analyzeResponseQualityTrend,
RESPONSE_QUALITY_TREND_ANALYZER_VERSION,
} from "../../src/core/response-quality-trend-analyzer.js";

describe("XSUS Response Quality Trend Analyzer", () => {
it("ka versionin e pritshëm", () => {
expect(
RESPONSE_QUALITY_TREND_ANALYZER_VERSION
).toBe("1.0.0");
});

it("identifikon përmirësimin", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.7 },
{ id: "run-2", passRate: 0.8 },
{ id: "run-3", passRate: 0.9 },
]);

expect(result.summary.direction).toBe("improving");
expect(result.summary.change).toBeCloseTo(0.2);
expect(result.summary.latestPassRate).toBe(0.9);

});

it("identifikon regresionin", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.95 },
{ id: "run-2", passRate: 0.85 },
{ id: "run-3", passRate: 0.7 },
]);

expect(result.summary.direction).toBe("regressing");
expect(result.summary.change).toBeCloseTo(-0.25);
expect(result.summary.negativeTransitions).toBe(2);

});

it("identifikon stabilitetin", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.9 },
{ id: "run-2", passRate: 0.92 },
{ id: "run-3", passRate: 0.91 },
]);

expect(result.summary.direction).toBe("stable");

});

it("përdor pragun e personalizuar", () => {
const reports = [
{ id: "run-1", passRate: 0.8 },
{ id: "run-2", passRate: 0.83 },
];

const result = analyzeResponseQualityTrend(reports, {
  threshold: 0.02,
});

expect(result.summary.direction).toBe("improving");
expect(result.summary.threshold).toBe(0.02);

});

it("raporton të dhëna të pamjaftueshme për një raport", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.9 },
]);

expect(result.summary.direction).toBe("insufficient_data");
expect(result.summary.change).toBeNull();
expect(result.summary.reportCount).toBe(1);

});

it("trajton një listë bosh", () => {
const result = analyzeResponseQualityTrend([]);

expect(result.summary.direction).toBe("insufficient_data");
expect(result.summary.reportCount).toBe(0);
expect(result.summary.averagePassRate).toBeNull();

});

it("llogarit mesataren e normave të suksesit", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.6 },
{ id: "run-2", passRate: 0.8 },
{ id: "run-3", passRate: 1 },
]);

expect(result.summary.averagePassRate).toBe(0.8);

});

it("llogarit ndryshimin në pikë përqindjeje", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.75 },
{ id: "run-2", passRate: 0.9 },
]);

expect(result.summary.changePercentagePoints).toBe(15);

});

it("refuzon input që nuk është array", () => {
expect(() => analyzeResponseQualityTrend({})).toThrow(
"Raportet duhet të jenë një array."
);
});

it("refuzon normë suksesi jashtë intervalit", () => {
expect(() =>
analyzeResponseQualityTrend([
{ id: "run-1", passRate: 1.2 },
])
).toThrow();
});

it("refuzon ID të përsëritura", () => {
expect(() =>
analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.8 },
{ id: "run-1", passRate: 0.9 },
])
).toThrow("ID e përsëritur: run-1.");
});

it("refuzon prag të pavlefshëm", () => {
expect(() =>
analyzeResponseQualityTrend(
[{ id: "run-1", passRate: 0.8 }],
{ threshold: -0.1 }
)
).toThrow();
});

it("nuk ndryshon raportet hyrëse", () => {
const reports = [
{ id: "run-1", passRate: 0.8 },
{ id: "run-2", passRate: 0.9 },
];

const original = structuredClone(reports);

analyzeResponseQualityTrend(reports);

expect(reports).toEqual(original);

});

it("kthen rezultat të pandryshueshëm", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.8 },
{ id: "run-2", passRate: 0.9 },
]);

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.summary)).toBe(true);
expect(Object.isFrozen(result.reports)).toBe(true);
expect(Object.isFrozen(result.recommendations)).toBe(true);

});

it("llogarit zero ndryshim për rezultate identike", () => {
const result = analyzeResponseQualityTrend([
{ id: "run-1", passRate: 0.9 },
{ id: "run-2", passRate: 0.9 },
]);

expect(result.summary.direction).toBe("stable");
expect(result.summary.change).toBe(0);
expect(result.summary.standardDeviation).toBe(0);

});
});
