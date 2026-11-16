import { resolveXsusAppEngineCapability } from "./xsus-engine-policy.js";

/**
 * XSUS App Hyper-only capability gateway.
 * Explicit injection prevents unverified endpoints or fallback to XSUS AI Core.
 * The existing evidence client is the only approved transport at this stage.
 */
export function createXsusAppHyperGateway({ verifyEvidence } = {}) {
  if (typeof verifyEvidence !== "function")
    throw new TypeError("A Hyper evidence verification adapter is required.");

  async function execute(capability, payload = {}) {
    const route = resolveXsusAppEngineCapability(capability);
    if (route.engine !== "hyper-xsus-core" || !route.available)
      throw new Error(route.reason ?? "Unsupported XSUS App capability.");

    if (capability === "evidence.verify") {
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        throw new TypeError("Invalid Hyper verification payload.");
      return verifyEvidence(payload);
    }

    throw new Error("Unsupported XSUS App capability.");
  }

  return Object.freeze({ execute });
}
