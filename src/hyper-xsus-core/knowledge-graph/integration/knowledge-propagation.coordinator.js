/**
 * Hyper XSUS Core — Knowledge Propagation Coordinator v0.1.0
 * Explicit, in-process reconciliation; no durable transaction guarantee.
 * Both engines remain independently owned.
 */
export const KNOWLEDGE_PROPAGATION_VERSION = "0.1.0";

export function createKnowledgePropagationCoordinator({ links, graph, journalStore } = {}) {
  if (!links || typeof links.find !== "function" ||
      !graph || typeof graph.getGraph !== "function" ||
      typeof graph.addLinks !== "function" ||
      typeof graph.verifyIntegrity !== "function") {
    throw new TypeError("Knowledge Link and Graph APIs are required.");
  }

  if (journalStore && (typeof journalStore.save !== "function" || typeof journalStore.recoverInterrupted !== "function")) {
    throw new TypeError("journalStore must support save and recoverInterrupted.");
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

  async function reconcileDurable() {
    assertOpen();
    if (!journalStore) throw new Error("A journalStore is required for durable reconciliation.");
    if (running) throw new Error("Propagation already running.");
    running = true;
    const entry = { id: ++sequence, state: "running", attempted: 0, added: 0 };
    journal.push(entry);
    try {
      const source = links.find().links;
      const existing = new Set(graph.getGraph().links.map((link) => link.id));
      const pending = source.filter((link) => !existing.has(link.id));
      entry.attempted = pending.length;
      await journalStore.save(journal);
      if (pending.length) {
        graph.addLinks(pending);
        entry.added = pending.length;
      }
      if (graph.verifyIntegrity().valid !== true) throw new Error("Knowledge Graph integrity verification failed.");
      entry.state = "completed";
      await journalStore.save(journal);
      return Object.freeze({ ...entry });
    } catch (error) {
      entry.state = "failed";
      entry.error = error instanceof Error ? error.message : String(error);
      try { await journalStore.save(journal); } catch (saveError) {
        throw new AggregateError([error, saveError], "Propagation and journal persistence failed.");
      }
      throw error;
    } finally {
      running = false;
    }
  }

  async function recoverDurable() {
    assertOpen();
    if (!journalStore) throw new Error("A journalStore is required for durable recovery.");
    if (running) throw new Error("Propagation already running.");
    const entries = await journalStore.recoverInterrupted();
    journal.splice(0, journal.length, ...entries);
    sequence = Math.max(sequence, ...entries.map((item) => item.id), 0);
    return entries.map((item) => Object.freeze({ ...item }));
  }

  function close() {
    closed = true;
  }

  return Object.freeze({ version: KNOWLEDGE_PROPAGATION_VERSION, reconcile, reconcileDurable, recoverDurable, status, close });
}
