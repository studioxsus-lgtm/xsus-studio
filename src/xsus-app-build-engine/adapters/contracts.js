export const ADAPTER_CONTRACT_VERSION = "1.0.0";
export function assertLanguageAdapter(adapter) {
  if (!adapter || typeof adapter.normalize !== "function") throw new TypeError("Language adapter must implement normalize(input, context)");
  return adapter;
}
export function assertIntelligenceAdapter(adapter) {
  if (!adapter || typeof adapter.analyze !== "function") throw new TypeError("Intelligence adapter must implement analyze(input, context)");
  return adapter;
}
export function assertPlanner(planner) {
  if (typeof planner !== "function") throw new TypeError("Planner must be a function");
  return planner;
}
