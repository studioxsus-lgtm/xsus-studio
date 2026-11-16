/**
 * Hyper XSUS Core — Language Capability Registry v1.0.0
 * Explicit capability declarations, no implied language support.
 * Immutable, bounded, deterministic, independent of application adapters.
 */
export const LANGUAGE_CAPABILITY_REGISTRY_VERSION = "1.0.0";
const LANGUAGE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
const ENGINE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CAPABILITY = /^(grammar|morphology|syntax|tokenization|normalization|evaluation|knowledge)$/;
export function createLanguageCapabilityRegistry({ registrations = [], maxRegistrations = 256 } = {}) {
  if (!Number.isSafeInteger(maxRegistrations) || maxRegistrations < 1 || maxRegistrations > 10000 ||
      !Array.isArray(registrations) || registrations.length > maxRegistrations)
    throw new TypeError("Invalid language capability registry configuration.");
  const unique = new Set();
  const entries = registrations.map(entry => {
    if (!entry || typeof entry.language !== "string" || !LANGUAGE.test(entry.language) ||
        typeof entry.engine !== "string" || !ENGINE.test(entry.engine) ||
        !Array.isArray(entry.capabilities) || entry.capabilities.length === 0 ||
        entry.capabilities.length > 7 || entry.capabilities.some(c => typeof c !== "string" || !CAPABILITY.test(c)) ||
        new Set(entry.capabilities).size !== entry.capabilities.length)
      throw new TypeError("Invalid language capability registration.");
    const key = entry.language + "\u0000" + entry.engine;
    if (unique.has(key)) throw new TypeError("Duplicate language engine registration.");
    unique.add(key);
    return Object.freeze({ language: entry.language, engine: entry.engine,
      capabilities: Object.freeze([...entry.capabilities].sort()) });
  }).sort((a, b) => a.language.localeCompare(b.language) || a.engine.localeCompare(b.engine));
  const frozen = Object.freeze(entries);
  function resolve({ language, capability } = {}) {
    if (typeof language !== "string" || !LANGUAGE.test(language) ||
        typeof capability !== "string" || !CAPABILITY.test(capability))
      throw new TypeError("Invalid language capability query.");
    return Object.freeze(frozen.filter(entry =>
      entry.language === language && entry.capabilities.includes(capability)).map(entry => entry.engine));
  }
  function supports(query) { return resolve(query).length > 0; }
  function list({ language } = {}) {
    if (language !== undefined && (typeof language !== "string" || !LANGUAGE.test(language)))
      throw new TypeError("Invalid language filter.");
    return Object.freeze(frozen.filter(entry => language === undefined || entry.language === language));
  }
  return Object.freeze({ version: LANGUAGE_CAPABILITY_REGISTRY_VERSION, resolve, supports, list });
}
