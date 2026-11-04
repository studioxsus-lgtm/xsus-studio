
import { describe, it, expect } from "vitest";

import * as KnowledgeGraph from "../../index.js";

describe("KnowledgeGraph — Public Entry Point", () => {
  it("ekspozon versionin e Contract", () => {
    expect(KnowledgeGraph.KNOWLEDGE_GRAPH_VERSION).toBe("1.0.0");
    expect(typeof KnowledgeGraph.getKnowledgeGraphContract).toBe("function");
  });

  it("ekspozon Interface dhe Schema", () => {
    expect(KnowledgeGraph.KNOWLEDGE_GRAPH_INTERFACE_VERSION).toBe("1.0.0");
    expect(typeof KnowledgeGraph.getKnowledgeGraphSchema).toBe("function");
  });

  it("ekspozon Model dhe Validator", () => {
    expect(KnowledgeGraph.KNOWLEDGE_GRAPH_MODEL_VERSION).toBe("1.0.0");
    expect(typeof KnowledgeGraph.createKnowledgeGraph).toBe("function");
    expect(typeof KnowledgeGraph.validateKnowledgeGraph).toBe("function");
  });

  it("ekspozon algoritmet e grafit", () => {
    expect(typeof KnowledgeGraph.breadthFirstSearch).toBe("function");
    expect(typeof KnowledgeGraph.depthFirstSearch).toBe("function");
    expect(typeof KnowledgeGraph.detectCycles).toBe("function");
    expect(typeof KnowledgeGraph.findShortestPath).toBe("function");
    expect(typeof KnowledgeGraph.findConnectedComponents).toBe("function");
  });

  it("ekspozon Engine", () => {
    expect(KnowledgeGraph.KNOWLEDGE_GRAPH_ENGINE_VERSION).toBe("1.0.0");
    expect(typeof KnowledgeGraph.createKnowledgeGraphEngine).toBe("function");
  });

  it("ekspozon Public API", () => {
    expect(KnowledgeGraph.KNOWLEDGE_GRAPH_API_VERSION).toBe("1.0.0");
    expect(typeof KnowledgeGraph.createKnowledgeGraphAPI).toBe("function");
  });
});
