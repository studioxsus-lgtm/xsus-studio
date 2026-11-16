/**
 * XSUS App integration policy.
 *
 * Hyper XSUS Core is the only execution/logic engine selected for XSUS App.
 * The independent language core will have a separate adapter when available.
 * XSUS AI Core remains intact but is NOT an XSUS App execution dependency.
 *
 * This policy does not claim that unimplemented Hyper endpoints are live.
 */
export const XSUS_APP_ENGINE_POLICY_VERSION = "1.0.0";

export const XSUS_APP_ENGINE_POLICY = Object.freeze({
  executionEngine: "hyper-xsus-core",
  languageEngine: "separate-language-core",
  legacyAiCoreEnabled: false,
  hyperEvidenceVerificationEnabled: true,
  hyperApplicationExecutionEnabled: false,
  languageCoreConnected: false
});

export function resolveXsusAppEngineCapability(capability) {
  switch (capability) {
    case "evidence.verify":
      return Object.freeze({
        engine: "hyper-xsus-core",
        available: true,
        adapter: "xsus-hyper-evidence-client"
      });
    case "application.plan":
    case "application.build":
    case "application.execute":
      return Object.freeze({
        engine: "hyper-xsus-core",
        available: false,
        reason: "Hyper application execution backend contract is not verified."
      });
    case "language.interpret":
    case "language.respond":
      return Object.freeze({
        engine: "separate-language-core",
        available: false,
        reason: "The independent language core is not connected yet."
      });
    default:
      return Object.freeze({
        engine: null,
        available: false,
        reason: "Unsupported XSUS App capability."
      });
  }
}
