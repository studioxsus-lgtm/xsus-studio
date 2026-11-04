
import { describe, it, expect } from "vitest";

import {
  createKnowledgeGraphAPI
} from "../../index.js";

import {
  createKnowledgeLinkAPI
} from "../../../knowledge-linking/index.js";

import {
  createXsusAIKnowledgeAdapter
} from "../../../knowledge-linking/integrations/xsus-ai.adapter.js";

describe("KnowledgeGraph — Real Integration", () => {
  it("integrohet me KnowledgeLink përmes XSUS AI Adapter", () => {
    const knowledgeLinkAPI = createKnowledgeLinkAPI();

    const adapter = createXsusAIKnowledgeAdapter(
      knowledgeLinkAPI
    );

    const graphAPI = createKnowledgeGraphAPI({
      id: "real-integration-graph"
    });

    graphAPI.addNode({
      id: "AI",
      type: "concept",
      label: "Artificial Intelligence"
    });

    graphAPI.addNode({
      id: "ML",
      type: "concept",
      label: "Machine Learning"
    });

    const knowledgeLink = adapter.createLink({
      id: "AI-ML",
      sourceId: "AI",
      targetId: "ML",
      relationType: "contains",
      confidence: 0.98,
      metadata: {
        source: "XSUS AI",
        integration: true
      }
    });

    expect(knowledgeLink.id).toBe("AI-ML");

    const retrievedLink = adapter.getLink("AI-ML");

    expect(retrievedLink.id).toBe("AI-ML");
    expect(retrievedLink.sourceId).toBe("AI");
    expect(retrievedLink.targetId).toBe("ML");

    const graphLink = graphAPI.addLink(retrievedLink);

    expect(graphLink.id).toBe("AI-ML");
    expect(graphAPI.getGraph().links).toHaveLength(1);

    const integrity = graphAPI.verifyIntegrity();

    expect(integrity.valid).toBe(true);
    expect(integrity.errors).toEqual([]);
    expect(integrity.nodeCount).toBe(2);
    expect(integrity.linkCount).toBe(1);

    graphAPI.close();
    adapter.close();
    knowledgeLinkAPI.close();
  });

  it("ruan ndarjen e përgjegjësive mes adapter-it dhe API-ve", () => {
    const knowledgeLinkAPI = createKnowledgeLinkAPI();

    const adapter = createXsusAIKnowledgeAdapter(
      knowledgeLinkAPI
    );

    const graphAPI = createKnowledgeGraphAPI({
      id: "responsibility-integration"
    });

    graphAPI.addNode({ id: "A" });
    graphAPI.addNode({ id: "B" });

    adapter.createLink({
      id: "A-B",
      sourceId: "A",
      targetId: "B",
      relationType: "supports"
    });

    expect(adapter.getLink("A-B")).toBeTruthy();

    // Adapter-i nuk e ndryshon automatikisht KnowledgeGraph.
    expect(graphAPI.getGraph().links).toHaveLength(0);

    const link = adapter.getLink("A-B");

    graphAPI.addLink(link);

    expect(graphAPI.getGraph().links).toHaveLength(1);

    graphAPI.close();
    adapter.close();
    knowledgeLinkAPI.close();
  });

  it("ruan funksionimin e KnowledgeLink API pas mbylljes së adapter-it", () => {
    const knowledgeLinkAPI = createKnowledgeLinkAPI();

    const adapter = createXsusAIKnowledgeAdapter(
      knowledgeLinkAPI
    );

    adapter.createLink({
      id: "independent-link",
      sourceId: "SOURCE",
      targetId: "TARGET",
      relationType: "related_to"
    });

    adapter.close();

    expect(() => adapter.getLink("independent-link"))
      .toThrow("XSUS AI KnowledgeLink adapter is closed.");

    // Mbyllja e adapter-it nuk duhet të mbyllë API-në bazë.
    expect(
      knowledgeLinkAPI.getById("independent-link").id
    ).toBe("independent-link");

    knowledgeLinkAPI.close();
  });
});
