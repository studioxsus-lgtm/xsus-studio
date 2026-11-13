/**
 * Hyper XSUS Core — Graph Snapshot Persistence v0.1.0
 * Single-writer, local-filesystem snapshot storage.
 * Atomic rename protects against partially replaced files; it does not
 * guarantee power-loss durability or atomicity with the transaction journal.
 */
import { readFile } from "node:fs/promises";
import { writeAtomicJson } from "./atomic-json-writer.js";

export const GRAPH_SNAPSHOT_VERSION = "0.1.0";

function validate(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
      !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.links)) {
    throw new TypeError("Invalid Knowledge Graph snapshot.");
  }
  const nodes = new Set();
  for (const node of snapshot.nodes) {
    if (!node || typeof node.id !== "string" || !node.id.trim() || nodes.has(node.id)) {
      throw new TypeError("Invalid or duplicate graph node.");
    }
    nodes.add(node.id);
  }
  const links = new Set();
  for (const link of snapshot.links) {
    if (!link || typeof link.id !== "string" || !link.id.trim() ||
        links.has(link.id) || !nodes.has(link.sourceId) ||
        !nodes.has(link.targetId) || link.sourceId === link.targetId) {
      throw new TypeError("Invalid graph link or missing endpoint.");
    }
    links.add(link.id);
  }
  return structuredClone(snapshot);
}

export function createGraphSnapshotStore({ filePath } = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new TypeError("filePath must be a non-empty string.");
  }
  let queue = Promise.resolve();
  let closed = false;
  function assertOpen() {
    if (closed) throw new Error("Graph snapshot store is closed.");
  }

  function save(snapshot) {
    assertOpen();
    const copy = validate(snapshot);
    const operation = queue.catch(() => {}).then(async () => {
      await writeAtomicJson(filePath, { version: GRAPH_SNAPSHOT_VERSION, snapshot: copy });
    });
    queue = operation;
    return operation;
  }

  async function load() {
    assertOpen();
    await queue;
    let raw;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    const payload = JSON.parse(raw);
    if (!payload || payload.version !== GRAPH_SNAPSHOT_VERSION) {
      throw new TypeError("Unsupported graph snapshot version.");
    }
    return validate(payload.snapshot);
  }

  async function restoreInto(graph) {
    assertOpen();
    if (!graph || typeof graph.getStatus !== "function" ||
        typeof graph.addNodes !== "function" || typeof graph.addLinks !== "function" ||
        typeof graph.verifyIntegrity !== "function") {
      throw new TypeError("Knowledge Graph API is required.");
    }
    const snapshot = await load();
    if (!snapshot) return false;
    const state = graph.getStatus();
    if (state.nodeCount !== 0 || state.linkCount !== 0) {
      throw new Error("Restore requires an empty Knowledge Graph.");
    }
    // Validate the entire snapshot before mutating the target.
    graph.addNodes(snapshot.nodes);
    if (snapshot.links.length) graph.addLinks(snapshot.links);
    if (graph.verifyIntegrity().valid !== true) {
      throw new Error("Restored Knowledge Graph failed integrity verification.");
    }
    return true;
  }

  async function close() {
    if (closed) return;
    await queue;
    closed = true;
  }

  return Object.freeze({ version: GRAPH_SNAPSHOT_VERSION,
    save, load, restoreInto, close });
}
