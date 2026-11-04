import { describe, it, expect, vi } from "vitest";

import {
  APP_FRONTEND_BUILDER_VERSION,
  APP_FRONTEND_CAPABILITIES,
  APP_FRONTEND_FRAMEWORKS,
  createFrontendBuilder
} from "../../apps/app/frontend/frontend-builder.js";

describe("XSUS App Frontend Builder", () => {
  const validRequest = {
    prompt: "Create a responsive website"
  };

  const createProvider = (artifacts = []) => ({
    generate: vi.fn().mockResolvedValue({ artifacts })
  });

  describe("Version and capabilities", () => {
    it("duhet të ketë versionin 1.0.0", () => {
      expect(APP_FRONTEND_BUILDER_VERSION).toBe("1.0.0");
    });

    it("duhet të ketë capabilities të ngrira", () => {
      expect(Object.isFrozen(APP_FRONTEND_CAPABILITIES)).toBe(true);
    });

    it("duhet të përmbajë frontend-architecture", () => {
      expect(APP_FRONTEND_CAPABILITIES).toContain("frontend-architecture");
    });

    it("duhet të përmbajë page-structure", () => {
      expect(APP_FRONTEND_CAPABILITIES).toContain("page-structure");
    });

    it("duhet të përmbajë component-planning", () => {
      expect(APP_FRONTEND_CAPABILITIES).toContain("component-planning");
    });

    it("duhet të përmbajë responsive-design", () => {
      expect(APP_FRONTEND_CAPABILITIES).toContain("responsive-design");
    });

    it("duhet të përmbajë frontend-code-generation", () => {
      expect(APP_FRONTEND_CAPABILITIES).toContain(
        "frontend-code-generation"
      );
    });

    it("duhet të ketë framework-et e pritshme", () => {
      expect(APP_FRONTEND_FRAMEWORKS).toEqual([
        "html",
        "react",
        "next",
        "vue",
        "angular",
        "svelte"
      ]);
    });

    it("lista e framework-eve duhet të jetë e ngrirë", () => {
      expect(Object.isFrozen(APP_FRONTEND_FRAMEWORKS)).toBe(true);
    });
  });

  describe("Builder initialization", () => {
    it("duhet të krijojë builder-in", () => {
      expect(createFrontendBuilder()).toBeDefined();
    });

    it("duhet të ketë emrin e saktë", () => {
      expect(createFrontendBuilder().name).toBe(
        "XSUS App Frontend Builder"
      );
    });

    it("duhet të ekspozojë versionin", () => {
      expect(createFrontendBuilder().version).toBe("1.0.0");
    });

    it("duhet të ekspozojë capabilities", () => {
      const builder = createFrontendBuilder();

      expect(builder.capabilities).toBe(APP_FRONTEND_CAPABILITIES);
    });

    it("duhet të ketë funksionin build", () => {
      expect(typeof createFrontendBuilder().build).toBe("function");
    });

    it("objekti builder duhet të jetë i ngrirë", () => {
      expect(Object.isFrozen(createFrontendBuilder())).toBe(true);
    });
  });

  describe("Request validation", () => {
    const builder = createFrontendBuilder();

    it("duhet të refuzojë null", async () => {
      const result = await builder.build(null);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë undefined", async () => {
      const result = await builder.build(undefined);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë string si kërkesë", async () => {
      const result = await builder.build("Create a website");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë array si kërkesë", async () => {
      const result = await builder.build([]);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë objekt bosh", async () => {
      const result = await builder.build({});

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë prompt bosh", async () => {
      const result = await builder.build({ prompt: "" });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë prompt vetëm me hapësira", async () => {
      const result = await builder.build({ prompt: "   " });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të normalizojë prompt-in me trim", async () => {
      const provider = createProvider();
      const instance = createFrontendBuilder({ provider });

      await instance.build({
        prompt: "  Create a dashboard  "
      });

      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Create a dashboard"
        })
      );
    });

    it("duhet të përdorë React si framework parazgjedhje", async () => {
      const provider = createProvider();
      const instance = createFrontendBuilder({ provider });

      const result = await instance.build(validRequest);

      expect(result.success).toBe(true);
      expect(result.data.framework).toBe("react");
    });

    it("duhet të përdorë CSS si styling parazgjedhje", async () => {
      const provider = createProvider();
      const instance = createFrontendBuilder({ provider });

      const result = await instance.build(validRequest);

      expect(result.data.styling).toBe("css");
    });

    it("duhet të aktivizojë responsive si parazgjedhje", async () => {
      const provider = createProvider();
      const instance = createFrontendBuilder({ provider });

      const result = await instance.build(validRequest);

      expect(result.data.responsive).toBe(true);
    });

    it("duhet të çaktivizojë responsive kur kërkohet false", async () => {
      const provider = createProvider();
      const instance = createFrontendBuilder({ provider });

      const result = await instance.build({
        ...validRequest,
        responsive: false
      });

      expect(result.data.responsive).toBe(false);
    });

    it("duhet të refuzojë framework të pambështetur", async () => {
      const result = await builder.build({
        ...validRequest,
        framework: "unsupported"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("UNSUPPORTED_FRAMEWORK");
    });

    it.each(["html", "react", "next", "vue", "angular", "svelte"])(
      "duhet të pranojë framework-un %s",
      async (framework) => {
        const provider = createProvider();
        const instance = createFrontendBuilder({ provider });

        const result = await instance.build({
          ...validRequest,
          framework
        });

        expect(result.success).toBe(true);
        expect(result.data.framework).toBe(framework);
      }
    );

    it("duhet të refuzojë prompt që tejkalon kufirin", async () => {
      const instance = createFrontendBuilder({
        config: { maxPromptLength: 5 },
        provider: createProvider()
      });

      const result = await instance.build({
        prompt: "123456"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("PROMPT_TOO_LONG");
    });

    it("duhet të pranojë prompt në kufirin maksimal", async () => {
      const instance = createFrontendBuilder({
        config: { maxPromptLength: 5 },
        provider: createProvider()
      });

      const result = await instance.build({
        prompt: "12345"
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Provider integration", () => {
    it("duhet të raportojë mungesën e provider-it", async () => {
      const builder = createFrontendBuilder();

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("FRONTEND_PROVIDER_UNAVAILABLE");
    });

    it("duhet të refuzojë provider pa generate", async () => {
      const builder = createFrontendBuilder({
        provider: {}
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("FRONTEND_PROVIDER_UNAVAILABLE");
    });

    it("duhet të thërrasë provider.generate", async () => {
      const provider = createProvider();
      const builder = createFrontendBuilder({ provider });

      await builder.build(validRequest);

      expect(provider.generate).toHaveBeenCalledTimes(1);
    });

    it("duhet t'i dërgojë parametrat e normalizuar provider-it", async () => {
      const provider = createProvider();
      const builder = createFrontendBuilder({ provider });

      await builder.build({
        prompt: "  Create a dashboard ",
        framework: "next",
        styling: "tailwind",
        responsive: false,
        requirements: ["Authentication", "Navigation"]
      });

      expect(provider.generate).toHaveBeenCalledWith({
        prompt: "Create a dashboard",
        framework: "next",
        styling: "tailwind",
        responsive: false,
        requirements: ["Authentication", "Navigation"]
      });
    });

    it("duhet të kopjojë requirements", async () => {
      const requirements = ["Authentication"];
      const provider = createProvider();
      const builder = createFrontendBuilder({ provider });

      await builder.build({
        ...validRequest,
        requirements
      });

      const received = provider.generate.mock.calls[0][0].requirements;

      expect(received).toEqual(requirements);
      expect(received).not.toBe(requirements);
    });

    it("duhet të përdorë listë bosh për requirements jo-array", async () => {
      const provider = createProvider();
      const builder = createFrontendBuilder({ provider });

      await builder.build({
        ...validRequest,
        requirements: "invalid"
      });

      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: []
        })
      );
    });

    it("duhet të trajtojë gabimin e provider-it", async () => {
      const builder = createFrontendBuilder({
        provider: {
          generate: vi.fn().mockRejectedValue(new Error("Provider failure"))
        }
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("FRONTEND_BUILD_FAILED");
    });
  });

  describe("Provider response validation", () => {
    it("duhet të refuzojë përgjigjen null", async () => {
      const builder = createFrontendBuilder({
        provider: {
          generate: vi.fn().mockResolvedValue(null)
        }
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
    });

    it("duhet të refuzojë përgjigjen jo-objekt", async () => {
      const builder = createFrontendBuilder({
        provider: {
          generate: vi.fn().mockResolvedValue("invalid")
        }
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
    });

    it("duhet të refuzojë artifacts që nuk janë array", async () => {
      const builder = createFrontendBuilder({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: {}
          })
        }
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACTS");
    });

    it("duhet të refuzojë artifacts që mungojnë", async () => {
      const builder = createFrontendBuilder({
        provider: {
          generate: vi.fn().mockResolvedValue({})
        }
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACTS");
    });

    it("duhet të pranojë artifacts bosh", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(true);
      expect(result.data.artifacts).toEqual([]);
    });

    it("duhet të refuzojë tejkalimin e numrit maksimal të skedarëve", async () => {
      const builder = createFrontendBuilder({
        config: { maxFiles: 1 },
        provider: createProvider([
          { fileName: "index.html", content: "one" },
          { fileName: "style.css", content: "two" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("FILE_LIMIT_EXCEEDED");
    });

    it("duhet të pranojë numrin maksimal të skedarëve", async () => {
      const builder = createFrontendBuilder({
        config: { maxFiles: 2 },
        provider: createProvider([
          { fileName: "index.html", content: "one" },
          { fileName: "style.css", content: "two" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(true);
      expect(result.data.artifacts).toHaveLength(2);
    });
  });

  describe("Artifact validation", () => {
    it("duhet të refuzojë artifact null", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([null])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACT");
    });

    it("duhet të refuzojë artifact pa fileName", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { content: "<h1>Hello</h1>" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACT");
    });

    it("duhet të refuzojë fileName bosh", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "  ", content: "content" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACT");
    });

    it("duhet të refuzojë fileName jo-string", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: 123, content: "content" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACT");
    });

    it("duhet të refuzojë content jo-string", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "index.html", content: 123 }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACT");
    });

    it("duhet të refuzojë path absolut", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "/etc/config", content: "content" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_FILE_PATH");
    });

    it("duhet të refuzojë backslash në path", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "src\\app.js", content: "content" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_FILE_PATH");
    });

    it("duhet të refuzojë segmentin parent traversal", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "../secret.txt", content: "content" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_FILE_PATH");
    });

    it("duhet të refuzojë parent traversal në nënfolder", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "src/../../secret.txt", content: "content" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_FILE_PATH");
    });

    it("duhet të pranojë path relativ brenda projektit", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "src/components/Header.jsx", content: "export default 1;" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(true);
      expect(result.data.artifacts[0].fileName).toBe(
        "src/components/Header.jsx"
      );
    });

    it("duhet të heqë hapësirat rreth fileName", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "  index.html  ", content: "<h1>Hello</h1>" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(true);
      expect(result.data.artifacts[0].fileName).toBe("index.html");
    });

    it("duhet të refuzojë fileName të dyfishtë", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "index.html", content: "one" },
          { fileName: "index.html", content: "two" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("DUPLICATE_FILE");
    });

    it("duhet të ruajë fileName të ndryshëm në foldera të ndryshëm", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "src/index.js", content: "one" },
          { fileName: "tests/index.js", content: "two" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(true);
      expect(result.data.artifacts).toHaveLength(2);
    });

    it("duhet të krijojë artifact me type frontend", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "index.html", content: "<h1>Hello</h1>" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.data.artifacts[0].type).toBe("frontend");
    });

    it("duhet të ngrijë çdo artifact", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "index.html", content: "<h1>Hello</h1>" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(Object.isFrozen(result.data.artifacts[0])).toBe(true);
    });

    it("duhet të ngrijë array-n e artifacts", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "index.html", content: "<h1>Hello</h1>" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(Object.isFrozen(result.data.artifacts)).toBe(true);
    });
  });

  describe("Result structure and immutability", () => {
    it("duhet të kthejë strukturën e saktë të suksesit", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "index.html", content: "<h1>Hello</h1>" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("duhet të raportojë framework-un e përdorur", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider()
      });

      const result = await builder.build({
        ...validRequest,
        framework: "vue"
      });

      expect(result.data.framework).toBe("vue");
    });

    it("duhet të raportojë styling-un e përdorur", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider()
      });

      const result = await builder.build({
        ...validRequest,
        styling: "tailwind"
      });

      expect(result.data.styling).toBe("tailwind");
    });

    it("duhet të raportojë responsive status", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider()
      });

      const result = await builder.build({
        ...validRequest,
        responsive: false
      });

      expect(result.data.responsive).toBe(false);
    });

    it("duhet të raportojë versionin e builder-it", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider()
      });

      const result = await builder.build(validRequest);

      expect(result.metadata.builderVersion).toBe("1.0.0");
    });

    it("duhet të raportojë numrin e artifacts", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider([
          { fileName: "index.html", content: "one" },
          { fileName: "style.css", content: "two" }
        ])
      });

      const result = await builder.build(validRequest);

      expect(result.metadata.artifactCount).toBe(2);
    });

    it("metadata duhet të jetë e ngrirë", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider()
      });

      const result = await builder.build(validRequest);

      expect(Object.isFrozen(result.metadata)).toBe(true);
    });

    it("data duhet të jetë e ngrirë", async () => {
      const builder = createFrontendBuilder({
        provider: createProvider()
      });

      const result = await builder.build(validRequest);

      expect(Object.isFrozen(result.data)).toBe(true);
    });
  });
});
