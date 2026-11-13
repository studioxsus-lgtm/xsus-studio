/**
 * Hyper XSUS Core — Unified Crash Recovery v0.1.0
 *
 * Recovery order: restore graph snapshot, mark unfinished journal operations,
 * reconcile from the authoritative Knowledge Link source, persist graph snapshot.
 * This is single-process orchestration, NOT a cross-file atomic transaction.
 * Knowledge Link must itself be restored before invoking recover().
 */
export const UNIFIED_RECOVERY_VERSION = "0.1.0";

export function createUnifiedCrashRecovery({
  graph, links, snapshotStore, journalStore, coordinator,
} = {}) {
  if (!graph || typeof graph.getGraph !== "function" ||
      typeof graph.getStatus !== "function" ||
      typeof graph.verifyIntegrity !== "function" ||
      !links || typeof links.find !== "function" ||
      !snapshotStore || typeof snapshotStore.restoreInto !== "function" ||
      typeof snapshotStore.save !== "function" ||
      !journalStore || typeof journalStore.recoverInterrupted !== "function" ||
      !coordinator || typeof coordinator.recoverDurable !== "function" ||
      typeof coordinator.reconcileDurable !== "function") {
    throw new TypeError("Unified recovery requires graph, links, stores and coordinator.");
  }

  let active = false;
  let recovered = false;

  async function recover() {
    if (active) throw new Error("Recovery is already running.");
    if (recovered) throw new Error("Recovery has already completed for this instance.");
    const state = graph.getStatus();
    if (state.nodeCount !== 0 || state.linkCount !== 0) {
      throw new Error("Recovery requires a fresh empty Knowledge Graph.");
    }
    active = true;
    try {
      const restored = await snapshotStore.restoreInto(graph);
      const previous = await coordinator.recoverDurable();
      const interrupted = previous.filter((item) => item.state === "interrupted").length;
      const operation = await coordinator.reconcileDurable();
      if (graph.verifyIntegrity().valid !== true) {
        throw new Error("Graph integrity failed during unified recovery.");
      }
      await snapshotStore.save(graph.getGraph());
      recovered = true;
      return Object.freeze({
        version: UNIFIED_RECOVERY_VERSION,
        snapshotRestored: restored,
        interruptedOperations: interrupted,
        linksAdded: operation.added,
        graphIntegrity: true,
      });
    } finally {
      active = false;
    }
  }

  return Object.freeze({ version: UNIFIED_RECOVERY_VERSION, recover });
}
