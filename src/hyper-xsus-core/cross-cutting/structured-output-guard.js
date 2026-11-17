/** Bounded structured engine output validation; rejects unsafe prototypes and cycles. */
export const STRUCTURED_OUTPUT_GUARD_VERSION = "1.0.0";
export function createStructuredOutputGuard({ maxDepth = 8, maxNodes = 2048 } = {}) {
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 1 || maxDepth > 32 ||
      !Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 100000)
    throw new TypeError("Invalid structured output guard configuration.");
  function validate(value) {
    const ancestors = new Set();
    let visited = 0;
    function walk(node, depth) {
      if (++visited > maxNodes || depth > maxDepth)
        throw new RangeError("Structured output limit exceeded.");
      if (node === null || typeof node === "string" || typeof node === "boolean" ||
          (typeof node === "number" && Number.isFinite(node))) return node;
      if (!node || typeof node !== "object" ||
          (!Array.isArray(node) && Object.getPrototypeOf(node) !== Object.prototype &&
           Object.getPrototypeOf(node) !== null) || ancestors.has(node))
        throw new TypeError("Invalid structured output.");
      ancestors.add(node);
      let result;
      if (Array.isArray(node)) {
        if (Object.keys(node).length !== node.length ||
            Object.keys(node).some(key => !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= node.length))
          throw new TypeError("Invalid structured output array.");
        result = Array.from({ length: node.length }, (_, index) => {
          const descriptor = Object.getOwnPropertyDescriptor(node, String(index));
          if (!descriptor || !Object.hasOwn(descriptor, "value"))
            throw new TypeError("Invalid structured output accessor.");
          return walk(descriptor.value, depth + 1);
        });
      } else {
        result = Object.create(null);
        for (const key of Object.keys(node)) {
          if (key === "__proto__" || key === "constructor" || key === "prototype")
            throw new TypeError("Unsafe structured output key.");
          const descriptor = Object.getOwnPropertyDescriptor(node, key);
          if (!descriptor || !Object.hasOwn(descriptor, "value"))
            throw new TypeError("Invalid structured output accessor.");
          result[key] = walk(descriptor.value, depth + 1);
        }
      }
      ancestors.delete(node);
      return Object.freeze(result);
    }
    return walk(value, 0);
  }
  return Object.freeze({ version: STRUCTURED_OUTPUT_GUARD_VERSION, validate });
}
