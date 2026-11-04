
import { describe, it, expect } from "vitest";

import {
  createXsusAIKnowledgeAdapter,
  XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
} from "../../../src/hyper-xsus-core/knowledge-linking/adapters/xsus-ai-knowledge.adapter.js";

describe("XSUS AI Knowledge Adapter v1.1.0", () => {
  it("exposes the expected version", () => {
    expect(XSUS_AI_KNOWLEDGE_ADAPTER_VERSION).toBe("1.1.0");
  });

  it("initializes KnowledgeLink and KnowledgeGraph", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    expect(adapter.version).toBe("1.1.0");
    expect(adapter.link).toBeDefined();
    expect(adapter.graph).toBeDefined();
    expect(adapter.retrieve).toBeTypeOf("function");

    const status = adapter.getStatus();

    expect(status.connected).toBe(true);
    expect(status.knowledgeLink).toBeDefined();
    expect(status.knowledgeGraph).toBeDefined();

    adapter.close();
  });

  it("retrieves a matching knowledge node", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    adapter.graph.addNode({
      id: "python_variables",
      type: "concept",
      label: "Python Variables",
      metadata: {
        content: {
          en: "Variables in Python store values.",
          sq: "Variablat në Python ruajnë vlera.",
        },
        domain: "programming",
        keywords: [
          "python",
          "variables",
          "variabla",
        ],
        source: "XSUS Knowledge Base",
        version: "1.0.0",
      },
    });

    const result = adapter.retrieve(
      "python variables",
      { language: "en" }
    );

    expect(result.count).toBe(1);
    expect(result.results[0].id).toBe("python_variables");
    expect(result.results[0].content)
      .toBe("Variables in Python store values.");
    expect(result.results[0].matchedDirectly).toBe(true);

    adapter.close();
  });

  it("uses the requested language when content exists", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    adapter.graph.addNode({
      id: "python_variables",
      type: "concept",
      label: "Python Variables",
      metadata: {
        content: {
          sq: "Variablat në Python ruajnë vlera.",
          en: "Variables in Python store values.",
        },
        keywords: ["python", "variables"],
      },
    });

    const result = adapter.retrieve(
      "python variables",
      { language: "sq" }
    );

    expect(result.results[0].content)
      .toBe("Variablat në Python ruajnë vlera.");

    adapter.close();
  });

  it("respects the result limit", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    adapter.graph.addNodes([
      {
        id: "python_variables",
        type: "concept",
        label: "Python Variables",
        metadata: {
          content: {
            en: "Python variables store values.",
          },
          keywords: ["python", "variables"],
        },
      },
      {
        id: "python_variable_types",
        type: "concept",
        label: "Python Variable Types",
        metadata: {
          content: {
            en: "Python variable types include integers and strings.",
          },
          keywords: ["python", "variables"],
        },
      },
    ]);

    const result = adapter.retrieve(
      "python variables",
      {
        language: "en",
        limit: 1,
      }
    );

    expect(result.count).toBe(1);

    adapter.close();
  });

  it("returns an empty result for unmatched queries", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    adapter.graph.addNode({
      id: "python_variables",
      type: "concept",
      label: "Python Variables",
      metadata: {
        content: {
          en: "Variables store values.",
        },
        keywords: ["python"],
      },
    });

    const result = adapter.retrieve(
      "quantum astronomy",
      { language: "en" }
    );

    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);

    adapter.close();
  });

  it("rejects invalid queries", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    expect(() => adapter.retrieve("")).toThrow(TypeError);
    expect(() => adapter.retrieve(null)).toThrow(TypeError);

    adapter.close();
  });

  it("rejects invalid retrieval options", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    expect(() =>
      adapter.retrieve("python", {
        limit: 0,
      })
    ).toThrow(TypeError);

    expect(() =>
      adapter.retrieve("python", {
        minimumScore: 2,
      })
    ).toThrow(TypeError);

    adapter.close();
  });

  it("rejects operations after close", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    adapter.close();

    expect(() => adapter.retrieve("python"))
      .toThrow("XSUS AI Knowledge Adapter is closed.");

    expect(() => adapter.getStatus())
      .toThrow("XSUS AI Knowledge Adapter is closed.");
  });

  it("allows close to be called more than once", () => {
    const adapter = createXsusAIKnowledgeAdapter();

    expect(() => adapter.close()).not.toThrow();
    expect(() => adapter.close()).not.toThrow();
  });
});
