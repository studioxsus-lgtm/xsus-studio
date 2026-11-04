
/**
 * XSUS Hyper Core — XSUS AI Knowledge Adapter
 * Version: 1.0.0
 *
 * Integrimi zyrtar ndërmjet:
 * - XSUS AI Core
 * - KnowledgeLink
 * - KnowledgeGraph
 *
 * Përgjegjësitë:
 * - Inicializimi i API-ve publike.
 * - Ekspozimi i një ndërfaqeje të përbashkët.
 * - Izolimi i XSUS AI Core nga implementimi i Hyper Core.
 * - Menaxhimi i ciklit të jetës së integrimit.
 *
 * Nuk implementon logjikë të brendshme të KnowledgeLink
 * ose KnowledgeGraph.
 */

import {
  createKnowledgeLinkAPI,
} from "../public/knowledge-link.api.js";

import {
  createKnowledgeGraphAPI,
} from "../../knowledge-graph/public/knowledge-graph.api.js";

export const XSUS_AI_KNOWLEDGE_ADAPTER_VERSION = "1.0.0";

export function createXsusAIKnowledgeAdapter(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      "Adapter options must be a plain object."
    );
  }

  const {
    knowledgeLink: knowledgeLinkOptions = {},
    knowledgeGraph: knowledgeGraphOptions = {},
  } = options;

  const knowledgeLink = createKnowledgeLinkAPI(
    knowledgeLinkOptions
  );

  let knowledgeGraph;

  try {
    knowledgeGraph = createKnowledgeGraphAPI(
      knowledgeGraphOptions
    );
  } catch (error) {
    knowledgeLink.close();
    throw error;
  }

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error(
        "XSUS AI Knowledge Adapter is closed."
      );
    }
  }

  const link = Object.freeze({
    create(input) {
      assertOpen();
      return knowledgeLink.create(input);
    },

    add(input) {
      assertOpen();
      return knowledgeLink.add(input);
    },

    addMany(inputs) {
      assertOpen();
      return knowledgeLink.addMany(inputs);
    },

    getById(id) {
      assertOpen();
      return knowledgeLink.getById(id);
    },

    find(filters = {}) {
      assertOpen();
      return knowledgeLink.find(filters);
    },

    findByEntity(entityId) {
      assertOpen();
      return knowledgeLink.findByEntity(entityId);
    },

    findByStrategy(strategy) {
      assertOpen();
      return knowledgeLink.findByStrategy(strategy);
    },

    remove(id) {
      assertOpen();
      return knowledgeLink.remove(id);
    },

    getStatus() {
      assertOpen();
      return knowledgeLink.getStatus();
    },
  });

  const graph = Object.freeze({
    getGraph() {
      assertOpen();
      return knowledgeGraph.getGraph();
    },

    addNode(input) {
      assertOpen();
      return knowledgeGraph.addNode(input);
    },

    addNodes(inputs) {
      assertOpen();
      return knowledgeGraph.addNodes(inputs);
    },

    getNode(id) {
      assertOpen();
      return knowledgeGraph.getNode(id);
    },

    findNodes(filters = {}) {
      assertOpen();
      return knowledgeGraph.findNodes(filters);
    },

    findLinks(filters = {}) {
      assertOpen();
      return knowledgeGraph.findLinks(filters);
    },

    traverse(startNodeId, options = {}) {
      assertOpen();
      return knowledgeGraph.traverse(
        startNodeId,
        options
      );
    },

    getReachable(startNodeId, options = {}) {
      assertOpen();
      return knowledgeGraph.getReachable(
        startNodeId,
        options
      );
    },

    findShortestPath(sourceId, targetId, options = {}) {
      assertOpen();
      return knowledgeGraph.findShortestPath(
        sourceId,
        targetId,
        options
      );
    },

    findAllPaths(sourceId, targetId, options = {}) {
      assertOpen();
      return knowledgeGraph.findAllPaths(
        sourceId,
        targetId,
        options
      );
    },

    hasPath(sourceId, targetId, options = {}) {
      assertOpen();
      return knowledgeGraph.hasPath(
        sourceId,
        targetId,
        options
      );
    },

    detectCycles() {
      assertOpen();
      return knowledgeGraph.detectCycles();
    },

    getStatus() {
      assertOpen();
      return knowledgeGraph.getStatus();
    },
  });

  function getStatus() {
    assertOpen();

    return Object.freeze({
      version: XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
      connected: true,
      knowledgeLink: knowledgeLink.getStatus(),
      knowledgeGraph: knowledgeGraph.getStatus(),
    });
  }

  function close() {
    if (closed) {
      return;
    }

    closed = true;

    let firstError = null;

    try {
      knowledgeGraph.close();
    } catch (error) {
      firstError = error;
    }

    try {
      knowledgeLink.close();
    } catch (error) {
      if (!firstError) {
        firstError = error;
      }
    }

    if (firstError) {
      throw firstError;
    }
  }

  return Object.freeze({
    version: XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,

    link,
    graph,

    getStatus,
    close,
  });
}
