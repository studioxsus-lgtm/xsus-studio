
import { describe, it, expect } from "vitest";

import {
  SECURITY_RESOURCE_ADAPTER_VERSION,
  SECURITY_RESOURCE_PREFIX,
  SECURITY_RESOURCE_ERRORS,
  encodeSecurityResource,
  decodeSecurityResource,
} from "../../../apps/app/security/integration/adapters/resource-adapter.js";

describe("Security Resource Adapter", () => {
  describe("version and constants", () => {
    it("exposes version 1.0.0", () => {
      expect(SECURITY_RESOURCE_ADAPTER_VERSION).toBe("1.0.0");
    });

    it("exposes the versioned resource prefix", () => {
      expect(SECURITY_RESOURCE_PREFIX).toBe("xsus-resource:v1:");
    });

    it("exposes stable error codes", () => {
      expect(SECURITY_RESOURCE_ERRORS.INVALID_RESOURCE)
        .toBe("INVALID_RESOURCE");

      expect(SECURITY_RESOURCE_ERRORS.INVALID_SERIALIZED_RESOURCE)
        .toBe("INVALID_SERIALIZED_RESOURCE");
    });
  });

  describe("encodeSecurityResource", () => {
    it("serializes a valid resource", () => {
      const result = encodeSecurityResource({
        id: "document-456",
        type: "file",
      });

      expect(result).toBe(
        'xsus-resource:v1:{"id":"document-456","type":"file"}',
      );
    });

    it("preserves special characters in the resource id", () => {
      const resource = {
        id: "folder:a/b?c=d|e",
        type: "file",
      };

      const encoded = encodeSecurityResource(resource);

      expect(decodeSecurityResource(encoded)).toEqual(resource);
    });

    it("does not mutate the original resource", () => {
      const resource = {
        id: "document-456",
        type: "file",
      };

      encodeSecurityResource(resource);

      expect(resource).toEqual({
        id: "document-456",
        type: "file",
      });
    });

    it.each([
      null,
      undefined,
      [],
      "document-456",
      123,
    ])("rejects invalid resource values", (resource) => {
      expect(() => encodeSecurityResource(resource)).toThrow(
        /INVALID_RESOURCE/,
      );
    });

    it.each([
      {},
      { id: "", type: "file" },
      { id: "document-456", type: "" },
      { id: 123, type: "file" },
      { id: "document-456", type: 123 },
      { id: "   ", type: "file" },
      { id: "document-456", type: "   " },
    ])("rejects resources with invalid fields", (resource) => {
      expect(() => encodeSecurityResource(resource)).toThrow(
        /INVALID_RESOURCE/,
      );
    });
  });

  describe("decodeSecurityResource", () => {
    it("restores the original resource", () => {
      const resource = {
        id: "document-456",
        type: "file",
      };

      const encoded = encodeSecurityResource(resource);

      expect(decodeSecurityResource(encoded)).toEqual(resource);
    });

    it("returns a frozen resource object", () => {
      const encoded = encodeSecurityResource({
        id: "document-456",
        type: "file",
      });

      const decoded = decodeSecurityResource(encoded);

      expect(Object.isFrozen(decoded)).toBe(true);
    });

    it("rejects unsupported prefixes", () => {
      expect(() =>
        decodeSecurityResource(
          'xsus-resource:v2:{"id":"document-456","type":"file"}',
        ),
      ).toThrow(/INVALID_SERIALIZED_RESOURCE/);
    });

    it("rejects invalid JSON", () => {
      expect(() =>
        decodeSecurityResource(
          "xsus-resource:v1:{invalid-json}",
        ),
      ).toThrow(/INVALID_SERIALIZED_RESOURCE/);
    });

    it.each([
      "xsus-resource:v1:{}",
      'xsus-resource:v1:{"id":"","type":"file"}',
      'xsus-resource:v1:{"id":"document-456","type":""}',
      'xsus-resource:v1:{"id":123,"type":"file"}',
      'xsus-resource:v1:{"id":"document-456","type":123}',
      'xsus-resource:v1:{"id":"document-456","type":"file","extra":true}',
    ])("rejects invalid or non-canonical payloads", (value) => {
      expect(() => decodeSecurityResource(value)).toThrow(
        /INVALID_SERIALIZED_RESOURCE/,
      );
    });

    it("rejects non-string input", () => {
      expect(() => decodeSecurityResource(null)).toThrow(
        /INVALID_SERIALIZED_RESOURCE/,
      );
    });
  });

  describe("round-trip integrity", () => {
    it.each([
      { id: "user-1", type: "user" },
      { id: "database/table/record-9", type: "database" },
      { id: "file:with:multiple:separators", type: "file" },
      { id: "document with spaces", type: "file" },
      { id: "ëç漢字", type: "custom" },
    ])("preserves resource data through encode/decode", (resource) => {
      expect(
        decodeSecurityResource(
          encodeSecurityResource(resource),
        ),
      ).toEqual(resource);
    });
  });
});
