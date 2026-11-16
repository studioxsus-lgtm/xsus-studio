/** Deterministic read-only knowledge-graph node change sets. */
export const GRAPH_CHANGE_SET_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function snapshot(nodes, limit) {
  if (!Array.isArray(nodes) || nodes.length > limit) throw new TypeError("Invalid graph snapshot.");
  const map = new Map();
  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || !ID.test(node.id) ||
        typeof node.revision !== "number" || !Number.isSafeInteger(node.revision) ||
        node.revision < 0 || map.has(node.id)) throw new TypeError("Invalid graph node.");
    map.set(node.id, node.revision);
  }
  return map;
}
export function createGraphChangeSetEngine({ maxNodes = 10000 } = {}) {
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 100000)
    throw new TypeError("Invalid graph change-set configuration.");
  function compare(before, after) {
    const old = snapshot(before, maxNodes), next = snapshot(after, maxNodes);
    const added = [], removed = [], revised = [], unchanged = [];
    for (const [id, revision] of next) {
      if (!old.has(id)) added.push(id);
      else if (old.get(id) !== revision) revised.push(id);
      else unchanged.push(id);
    }
    for (const id of old.keys()) if (!next.has(id)) removed.push(id);
    const sorted = values => Object.freeze(values.sort());
    return Object.freeze({ version: GRAPH_CHANGE_SET_VERSION,
      added: sorted(added), removed: sorted(removed), revised: sorted(revised),
      unchanged: sorted(unchanged), readOnly: true });
  }
  return Object.freeze({ version: GRAPH_CHANGE_SET_VERSION, compare });
}
