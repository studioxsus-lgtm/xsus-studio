
import { describe, expect, test } from "vitest";

import {
  createRequestContext,
  isValidRequestContext,
  REQUEST_CONTEXT_VERSION,
} from "../../src/core/request-context.js";

describe("XSUS Request Context", () => {
  const validInput = {
    id: "request-123",
    query: "Çfarë është programimi?",
    language: "sq",
    moduleName: "xsus-ai",
    metadata: {
      conversationId: "conversation-123",
      retry: 1,
      debug: false,
    },
  };

  test("krijon kontekst të vlefshëm", () => {
    const context = createRequestContext(validInput);

    expect(isValidRequestContext(context)).toBe(true);
    expect(context.requestId).toBe("request-123");
    expect(context.query).toBe("Çfarë është programimi?");
    expect(context.language).toBe("sq");
  });

  test("normalizon kodin e gjuhës", () => {
    const context = createRequestContext({
      ...validInput,
      language: "en-US",
    });

    expect(context.language).toBe("en");
    expect(isValidRequestContext(context)).toBe(true);
  });

  test("refuzon pyetjen bosh", () => {
    const context = createRequestContext({
      ...validInput,
      query: "   ",
    });

    expect(isValidRequestContext(context)).toBe(false);
  });

  test("refuzon gjuhën e pambështetur", () => {
    const context = createRequestContext({
      ...validInput,
      language: "xx",
    });

    expect(isValidRequestContext(context)).toBe(false);
  });

  test("refuzon identifikuesin bosh", () => {
    const context = createRequestContext({
      ...validInput,
      id: "   ",
    });

    expect(isValidRequestContext(context)).toBe(false);
  });

  test("kufizon gjatësinë e pyetjes", () => {
    const context = createRequestContext({
      ...validInput,
      query: "A".repeat(9000),
    });

    expect(context.query.length).toBeLessThanOrEqual(8000);
    expect(isValidRequestContext(context)).toBe(true);
  });

  test("konteksti është i pandryshueshëm", () => {
    const context = createRequestContext(validInput);

    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.metadata)).toBe(true);
  });

  test("përfshin versionin e modulit", () => {
    const context = createRequestContext(validInput);

    expect(context.version).toBe(REQUEST_CONTEXT_VERSION);
    expect(context.version).toBe("1.3.0");
  });

  test("nuk pranon një objekt bosh si kontekst të vlefshëm", () => {
    expect(isValidRequestContext({})).toBe(false);
  });
});
