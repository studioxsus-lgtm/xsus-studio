/**
 * Hyper XSUS Core — Knowledge Propagation Coordinator v0.1.0
 * Explicit, in-process reconciliation; no durable transaction guarantee.
 * Both engines remain independently owned.
 */
export const KNOWLEDGE_PROPAGATION_VERSION = "0.1.0";

export function createKnowledgePropagationCoordinator({ links, graph }) {
  if (!links || typeof links.find !== "function" ||
      !graph || typeof graph.getGraph !== "function" ||
      typeof graph.addLinks !== "function" ||
      typeof graph.verifyIntegrity !== "function") {
    throw new TypeError("Knowledge Link and Graph APIs are required.");
  }

  let closed = false;
  let running = false;
  let sequence = 0;
  const journal = [];

  function assertOpen() {
    if (closed) throw new Error("Propagation coordinator is closed.");
  }

  function status() {
    assertOpen();
    return Object.freeze({
      version: KNOWLEDGE_PROPAGATION_VERSION,
      running,
      operations: journal.map((item) => Object.freeze({ ...item })),
    });
  }

  function reconcile() {
    assertOpen();
    if (running) throw new Error("Propagation already running.");
    running = true;
    const id = ++sequence;
    const entry = { id, state: "running", attempted: 0, added: 0 };
    journal.push(entry);
    try {
      const source = links.find().links;
      const existing = new Set(graph.getGraph().links.map((link) => link.id));
      const pending = source.filter((link) => !existing.has(link.id));
      entry.attempted = pending.length;
      if (pending.length) {
        // Graph's public batch API validates before committing a snapshot.
        graph.addLinks(pending);
        entry.added = pending.length;
      }
      const integrity = graph.verifyIntegrity();
      if (integrity.valid !== true) {
        throw new Error("Knowledge Graph integrity verification failed.");
      }
      entry.state = "completed";
      return Object.freeze({ ...entry });
    } catch (error) {
      entry.state = "failed";
      entry.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      running = false;
    }
  }

  function close() {
    closed = true;
  }

  return Object.freeze({ version: KNOWLEDGE_PROPAGATION_VERSION, reconcile, status, close });
}
