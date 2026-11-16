/** Unicode-safe input boundary for written-language processing. */
export const TEXT_BOUNDARY_VERSION = "1.0.0";
export function createTextBoundaryEngine({ maxCodePoints = 4096 } = {}) {
  if (!Number.isSafeInteger(maxCodePoints) || maxCodePoints < 1 || maxCodePoints > 100000)
    throw new TypeError("Invalid text boundary configuration.");
  function normalize(value) {
    if (typeof value !== "string") throw new TypeError("Text must be a string.");
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
      throw new TypeError("Text contains prohibited control characters.");
    const text = value.normalize("NFC").replace(/\r\n?/g, "\n");
    const points = Array.from(text);
    if (points.length > maxCodePoints) throw new RangeError("Text limit exceeded.");
    if (points.some(point => /^[\ud800-\udfff]$/u.test(point)))
      throw new TypeError("Text contains unpaired surrogate.");
    return Object.freeze({ text, codePoints: points.length, empty: text.trim().length === 0 });
  }
  return Object.freeze({ version: TEXT_BOUNDARY_VERSION, normalize });
}
