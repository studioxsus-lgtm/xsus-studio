/**
 * Hyper XSUS Core — Written Script Profile Engine v1.0.0.
 * Script distribution only; does NOT infer spoken/written language or identity.
 * Uses Unicode property escapes and operates on Unicode code points.
 */
export const WRITTEN_SCRIPT_PROFILE_VERSION = "1.0.0";
const SCRIPTS = Object.freeze([
  ["Latin", /\p{Script=Latin}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Han", /\p{Script=Han}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Hangul", /\p{Script=Hangul}/u],
  ["Greek", /\p{Script=Greek}/u],
  ["Devanagari", /\p{Script=Devanagari}/u]
]);
export function createWrittenScriptProfileEngine({ maxCodePoints = 4096 } = {}) {
  if (!Number.isSafeInteger(maxCodePoints) || maxCodePoints < 1 || maxCodePoints > 100000)
    throw new TypeError("Invalid script profile configuration.");
  function profile(text) {
    if (typeof text !== "string") throw new TypeError("Script profile text must be a string.");
    const points = Array.from(text.normalize("NFC"));
    if (points.length > maxCodePoints) throw new RangeError("Script profile text limit exceeded.");
    const counts = Object.create(null);
    let letters = 0;
    for (const point of points) {
      if (/^[\uD800-\uDFFF]$/u.test(point))
        throw new TypeError("Invalid script profile surrogate.");
      if (!/\p{Letter}/u.test(point)) continue;
      letters++;
      const match = SCRIPTS.find(([, pattern]) => pattern.test(point));
      const script = match ? match[0] : "Other";
      counts[script] = (counts[script] ?? 0) + 1;
    }
    const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return Object.freeze({
      version: WRITTEN_SCRIPT_PROFILE_VERSION,
      dominantScript: ordered.length ? ordered[0][0] : null,
      letterCount: letters, codePoints: points.length,
      distribution: Object.freeze(ordered.map(([script, count]) => Object.freeze({ script, count }))),
      languageDetected: false
    });
  }
  return Object.freeze({ version: WRITTEN_SCRIPT_PROFILE_VERSION, profile });
}
