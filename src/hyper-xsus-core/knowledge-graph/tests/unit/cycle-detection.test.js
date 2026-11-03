
import { describe, it, expect } from "vitest";

import {
  CYCLE_DETECTION_VERSION,
  detectCycles,
  getCycleNodes,
  hasCycles,
  isAcyclicGraph,
  getCycleDetectionReport
} from "../../algorithms/cycle-detection.js";

function createGraph() {
  return {
    nodes: [
      { id: "A" },
      { id: "B" },
      { id: "C" },
      { id: "D" },
      { id: "E" }
    ],
    links: [
      { sourceId: "A", targetId: "B" },
      { sourceId: "B", targetId: "C" },
      { sourceId: "C", targetId: "D" },
      { sourceId: "D", targetId: "E" }
    ]
  };
}

describe("Cycle Detection", () => {
  it("ka version 1.0.0", () => {
    expect(CYCLE_DETECTION_VERSION).toBe("1.0.0");
  });

  it("nuk zbulon cikle në Graph acyclic", () => {
    const graph = createGraph();

    expect(detectCycles(graph)).toEqual([]);
    expect(hasCycles(graph)).toBe(false);
    expect(isAcyclicGraph(graph)).toBe(true);
  });

  it("zbulon një cikël të thjeshtë", () => {
    const graph = createGraph();

    graph.links.push({
      sourceId: "D",
      targetId: "B"
    });

    expect(detectCycles(graph)).toContainEqual([
      "B", "C", "D", "B"
    ]);
    expect(hasCycles(graph)).toBe(true);
  });

  it("identifikon nodes që marrin pjesë në cikël", () => {
    const graph = createGraph();

    graph.links.push({
      sourceId: "D",
      targetId: "B"
    });

    expect(getCycleNodes(graph)).toEqual(
      expect.arrayContaining(["B", "C", "D"])
    );
  });

  it("zbulon self-links", () => {
    const graph = createGraph();

    graph.links.push({
      sourceId: "C",
      targetId: "C"
    });

    const report = getCycleDetectionReport(graph);

    expect(report.selfLinks).toContain("C");
    expect(report.cycleNodes).toContain("C");
    expect(report.hasCycles).toBe(true);
  });

  it("raporton ciklet dhe self-links veçmas", () => {
    const graph = createGraph();

    graph.links.push(
      { sourceId: "B", targetId: "C" },
      { sourceId: "D", targetId: "B" },
      { sourceId: "E", targetId: "E" }
    );

    const report = getCycleDetectionReport(graph);

    expect(report.cycles.length).toBeGreaterThan(0);
    expect(report.selfLinks).toContain("E");
    expect(report.hasCycles).toBe(true);
  });

  it("trajton Graph bosh", () => {
    const graph = {
      nodes: [],
      links: []
    };

    expect(detectCycles(graph)).toEqual([]);
    expect(isAcyclicGraph(graph)).toBe(true);
  });

  it("trajton node të izoluar", () => {
    const graph = {
      nodes: [{ id: "A" }],
      links: []
    };

    expect(detectCycles(graph)).toEqual([]);
    expect(getCycleNodes(graph)).toEqual([]);
  });

  it("refuzon Graph të pavlefshëm", () => {
    expect(() => detectCycles(null)).toThrow(TypeError);
    expect(() => hasCycles({})).toThrow(TypeError);
  });

  it("refuzon nodes me ID të dyfishta", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "A" }],
      links: []
    };

    expect(() => detectCycles(graph)).toThrow(TypeError);
  });

  it("refuzon links që referojnë nodes që mungojnë", () => {
    const graph = createGraph();

    graph.links.push({
      sourceId: "A",
      targetId: "X"
    });

    expect(() => detectCycles(graph)).toThrow(TypeError);
  });

  it("nuk ndryshon Graph-in origjinal", () => {
    const graph = createGraph();

    graph.links.push({
      sourceId: "D",
      targetId: "B"
    });

    const original = JSON.stringify(graph);

    getCycleDetectionReport(graph);

    expect(JSON.stringify(graph)).toBe(original);
  });

  it("kthen raport me strukturën e pritshme", () => {
    const report = getCycleDetectionReport(createGraph());

    expect(report).toEqual({
      cycles: [],
      cycleNodes: [],
      selfLinks: [],
      hasCycles: false
    });
  });
});
