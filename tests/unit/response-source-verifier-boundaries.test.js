import { describe, expect, test } from "vitest";

import {
  verifyResponseSource,
  verifyResponseSources,
  SOURCE_VERIFICATION_STATUSES,
  SOURCE_VERIFICATION_ERRORS
} from "../../src/core/response-source-verifier.js";

describe("XSUS AI Core — Source Verifier Boundaries", () => {
  test("refuzon URL që përmban kredenciale", () => {
    const result = verifyResponseSource({
      title: "Example",
      content: "Source content",
      url: "https://user:password@example.com/article"
    });

    expect(result.valid).toBe(false);
    expect(result.url.valid).toBe(false);
    expect(result.errors).toContain(
      SOURCE_VERIFICATION_ERRORS.INVALID_URL
    );
    expect(result.verified).toBe(false);
    expect(result.trustEstablished).toBe(false);
  });

  test("refuzon protokollet që nuk janë HTTP ose HTTPS", () => {
    const result = verifyResponseSource({
      title: "Example",
      content: "Source content",
      url: "javascript:alert(1)"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      SOURCE_VERIFICATION_ERRORS.UNSUPPORTED_URL_PROTOCOL
    );
  });

  test("refuzon përmbajtjen që tejkalon 50000 karaktere", () => {
    const result = verifyResponseSource({
      title: "Example",
      content: "A".repeat(50001),
      url: "https://example.com/article"
    });

    expect(result.valid).toBe(false);
    expect(result.structurallyValid).toBe(false);
    expect(result.errors).toContain(
      SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE
    );
  });

  test("dallon vlefshmërinë strukturore nga verifikimi faktik", () => {
    const result = verifyResponseSource({
      title: "Example",
      content: "Source content",
      url: "https://example.com/article"
    });

    expect(result.status).toBe(
      SOURCE_VERIFICATION_STATUSES.STRUCTURALLY_VALID
    );
    expect(result.valid).toBe(true);
    expect(result.structurallyValid).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.trustEstablished).toBe(false);
  });

  test("raporton numrat e saktë për një koleksion burimesh", () => {
    const result = verifyResponseSources([
      {
        title: "Valid source",
        content: "Content",
        url: "https://example.com/article"
      },
      {
        title: "",
        content: "Content",
        url: "https://example.com/article"
      },
      null
    ]);

    expect(result.total).toBe(3);
    expect(result.validCount).toBe(1);
    expect(result.structurallyValidCount).toBe(1);
    expect(result.invalidCount).toBe(2);
    expect(result.unverifiedCount).toBe(1);
    expect(result.verifiedCount).toBe(0);
    expect(result.trustEstablishedCount).toBe(0);
  });

  test("refuzon koleksionet që nuk janë array", () => {
    expect(() => verifyResponseSources(null)).toThrow(TypeError);
    expect(() => verifyResponseSources({})).toThrow(TypeError);
  });
});
