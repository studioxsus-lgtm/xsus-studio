
import { describe, it, expect, vi } from "vitest";

import {
  APP_BACKEND_BUILDER_VERSION,
  APP_BACKEND_CAPABILITIES,
  APP_BACKEND_FRAMEWORKS,
  createBackendBuilder
} from "../../apps/app/backend/backend-builder.js";

describe("XSUS App Backend Builder", () => {
  it("has the expected version", () => {
    expect(APP_BACKEND_BUILDER_VERSION).toBe("1.0.0");
  });

  it("exposes immutable capabilities", () => {
    expect(Object.isFrozen(APP_BACKEND_CAPABILITIES)).toBe(true);
    expect(APP_BACKEND_CAPABILITIES).toContain("backend-architecture");
    expect(APP_BACKEND_CAPABILITIES).toContain("backend-code-generation");
  });

  it("exposes supported frameworks", () => {
    expect(Object.isFrozen(APP_BACKEND_FRAMEWORKS)).toBe(true);
    expect(APP_BACKEND_FRAMEWORKS).toContain("express");
    expect(APP_BACKEND_FRAMEWORKS).toContain("django");
    expect(APP_BACKEND_FRAMEWORKS).toContain("spring");
  });

  it("creates a builder", () => {
    const builder = createBackendBuilder();

    expect(builder.name).toBe("XSUS App Backend Builder");
    expect(builder.version).toBe("1.0.0");
    expect(typeof builder.build).toBe("function");
    expect(Object.isFrozen(builder)).toBe(true);
  });

  it("returns an error for an invalid request", async () => {
    const builder = createBackendBuilder({
      provider: { generate: vi.fn() }
    });

    const result = await builder.build(null);

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects an empty prompt", async () => {
    const builder = createBackendBuilder({
      provider: { generate: vi.fn() }
    });

    const result = await builder.build({ prompt: "   " });

    expect(result.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects a non-string prompt", async () => {
    const builder = createBackendBuilder({
      provider: { generate: vi.fn() }
    });

    const result = await builder.build({ prompt: 123 });

    expect(result.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects array requests", async () => {
    const builder = createBackendBuilder();

    const result = await builder.build([]);

    expect(result.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects prompts exceeding the configured limit", async () => {
    const builder = createBackendBuilder({
      config: { maxPromptLength: 5 },
      provider: { generate: vi.fn() }
    });

    const result = await builder.build({
      prompt: "123456"
    });

    expect(result.error.code).toBe("PROMPT_TOO_LONG");
  });

  it("rejects unsupported frameworks", async () => {
    const builder = createBackendBuilder({
      provider: { generate: vi.fn() }
    });

    const result = await builder.build({
      prompt: "Create an API",
      framework: "unknown"
    });

    expect(result.error.code).toBe("UNSUPPORTED_FRAMEWORK");
  });

  it("uses Express as the default framework", async () => {
    const generate = vi.fn().mockResolvedValue({
      artifacts: []
    });

    const builder = createBackendBuilder({
      provider: { generate }
    });

    const result = await builder.build({
      prompt: "Create a REST API"
    });

    expect(result.success).toBe(true);
    expect(result.data.framework).toBe("express");
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        framework: "express"
      })
    );
  });

  it("returns an error when the provider is unavailable", async () => {
    const builder = createBackendBuilder();

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKEND_PROVIDER_UNAVAILABLE");
  });

  it("returns an error when generate is not a function", async () => {
    const builder = createBackendBuilder({
      provider: {}
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("BACKEND_PROVIDER_UNAVAILABLE");
  });

  it("passes normalized options to the provider", async () => {
    const generate = vi.fn().mockResolvedValue({
      artifacts: []
    });

    const builder = createBackendBuilder({
      provider: { generate }
    });

    await builder.build({
      prompt: "  Create an API  ",
      framework: "fastify",
      database: "postgresql",
      authentication: false,
      requirements: ["REST", "Validation"]
    });

    expect(generate).toHaveBeenCalledWith({
      prompt: "Create an API",
      framework: "fastify",
      database: "postgresql",
      authentication: false,
      requirements: ["REST", "Validation"]
    });
  });

  it("rejects null provider responses", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue(null)
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
  });

  it("rejects responses without an artifacts array", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({})
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("INVALID_ARTIFACTS");
  });

  it("rejects artifacts exceeding the file limit", async () => {
    const builder = createBackendBuilder({
      config: { maxFiles: 1 },
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            { fileName: "a.js", content: "a" },
            { fileName: "b.js", content: "b" }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("FILE_LIMIT_EXCEEDED");
  });

  it("rejects artifacts with invalid fields", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [{ fileName: "server.js" }]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("INVALID_ARTIFACT");
  });

  it("rejects empty artifact names", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [{ fileName: " ", content: "" }]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("INVALID_ARTIFACT");
  });

  it("rejects absolute artifact paths", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            { fileName: "/etc/server.js", content: "code" }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("INVALID_FILE_PATH");
  });

  it("rejects backslash paths", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            { fileName: "server\\config.js", content: "code" }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("INVALID_FILE_PATH");
  });

  it("rejects parent directory traversal", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            { fileName: "../server.js", content: "code" }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("INVALID_FILE_PATH");
  });

  it("rejects duplicate artifact names", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            { fileName: "server.js", content: "one" },
            { fileName: "server.js", content: "two" }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create a backend"
    });

    expect(result.error.code).toBe("DUPLICATE_FILE");
  });

  it("returns valid backend artifacts", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            {
              fileName: "src/server.js",
              content: "export default {};",
              type: "custom"
            }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create an API"
    });

    expect(result.success).toBe(true);
    expect(result.data.artifacts).toHaveLength(1);
    expect(result.data.artifacts[0]).toEqual({
      fileName: "src/server.js",
      content: "export default {};",
      type: "backend"
    });
  });

  it("returns immutable successful responses", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            { fileName: "server.js", content: "code" }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create an API"
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.data)).toBe(true);
    expect(Object.isFrozen(result.metadata)).toBe(true);
    expect(Object.isFrozen(result.data.artifacts)).toBe(true);
    expect(Object.isFrozen(result.data.artifacts[0])).toBe(true);
  });

  it("includes builder metadata", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockResolvedValue({
          artifacts: [
            { fileName: "server.js", content: "code" }
          ]
        })
      }
    });

    const result = await builder.build({
      prompt: "Create an API"
    });

    expect(result.metadata).toEqual({
      builderVersion: "1.0.0",
      artifactCount: 1
    });
  });

  it("handles provider exceptions", async () => {
    const builder = createBackendBuilder({
      provider: {
        generate: vi.fn().mockRejectedValue(
          new Error("Provider failure")
        )
      }
    });

    const result = await builder.build({
      prompt: "Create an API"
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKEND_BUILD_FAILED");
  });
});
