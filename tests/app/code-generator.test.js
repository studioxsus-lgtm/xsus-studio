import { describe, it, expect, vi } from "vitest";

import {
  APP_CODE_GENERATOR_VERSION,
  APP_CODE_GENERATOR_CAPABILITIES,
  APP_CODE_LANGUAGES,
  createCodeGenerator
} from "../../apps/app/code-generator/code-generator.js";

describe("XSUS App Code Generator", () => {
  describe("Version and capabilities", () => {
    it("duhet të ketë versionin 1.0.0", () => {
      expect(APP_CODE_GENERATOR_VERSION).toBe("1.0.0");
    });

    it("duhet të ketë capabilities të ngrira", () => {
      expect(Object.isFrozen(APP_CODE_GENERATOR_CAPABILITIES)).toBe(true);
    });

    it("duhet të përmbajë code-generation", () => {
      expect(APP_CODE_GENERATOR_CAPABILITIES).toContain("code-generation");
    });

    it("duhet të përmbajë multi-language-generation", () => {
      expect(APP_CODE_GENERATOR_CAPABILITIES).toContain(
        "multi-language-generation"
      );
    });

    it("duhet të përmbajë project-scaffolding", () => {
      expect(APP_CODE_GENERATOR_CAPABILITIES).toContain(
        "project-scaffolding"
      );
    });

    it("duhet të përmbajë code-validation", () => {
      expect(APP_CODE_GENERATOR_CAPABILITIES).toContain("code-validation");
    });

    it("duhet të përmbajë artifact-generation", () => {
      expect(APP_CODE_GENERATOR_CAPABILITIES).toContain("artifact-generation");
    });

    it("duhet të ketë gjuhët e programuara të mbështetura", () => {
      expect(APP_CODE_LANGUAGES).toEqual([
        "javascript",
        "typescript",
        "python",
        "java",
        "csharp",
        "go",
        "rust",
        "php",
        "html",
        "css",
        "sql"
      ]);
    });

    it("lista e gjuhëve duhet të jetë e ngrirë", () => {
      expect(Object.isFrozen(APP_CODE_LANGUAGES)).toBe(true);
    });
  });

  describe("Generator initialization", () => {
    it("duhet të krijojë generator-in", () => {
      const generator = createCodeGenerator();

      expect(generator).toBeDefined();
    });

    it("duhet të ketë emrin e saktë", () => {
      const generator = createCodeGenerator();

      expect(generator.name).toBe("XSUS App Code Generator");
    });

    it("duhet të ekspozojë versionin", () => {
      const generator = createCodeGenerator();

      expect(generator.version).toBe("1.0.0");
    });

    it("duhet të ekspozojë capabilities", () => {
      const generator = createCodeGenerator();

      expect(generator.capabilities).toBe(APP_CODE_GENERATOR_CAPABILITIES);
    });

    it("duhet të ketë funksionin generate", () => {
      const generator = createCodeGenerator();

      expect(typeof generator.generate).toBe("function");
    });

    it("objekti generator duhet të jetë i ngrirë", () => {
      const generator = createCodeGenerator();

      expect(Object.isFrozen(generator)).toBe(true);
    });
  });

  describe("Request validation", () => {
    const generator = createCodeGenerator();

    it("duhet të refuzojë kërkesën null", async () => {
      const result = await generator.generate(null);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë undefined", async () => {
      const result = await generator.generate(undefined);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë string si kërkesë", async () => {
      const result = await generator.generate("Create an application");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë array si kërkesë", async () => {
      const result = await generator.generate([]);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë objekt bosh", async () => {
      const result = await generator.generate({});

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë prompt bosh", async () => {
      const result = await generator.generate({ prompt: "" });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të refuzojë prompt vetëm me hapësira", async () => {
      const result = await generator.generate({ prompt: "   " });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("duhet të normalizojë prompt-in me trim", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const instance = createCodeGenerator({ provider });

      await instance.generate({
        prompt: "  Create a website  "
      });

      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Create a website"
        })
      );
    });

    it("duhet të përdorë TypeScript si gjuhë parazgjedhje", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const instance = createCodeGenerator({ provider });

      const result = await instance.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(true);
      expect(result.data.language).toBe("typescript");
    });

    it("duhet të përdorë application si projectType parazgjedhje", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const instance = createCodeGenerator({ provider });

      const result = await instance.generate({
        prompt: "Create an application"
      });

      expect(result.data.projectType).toBe("application");
    });

    it("duhet të refuzojë gjuhën e pambështetur", async () => {
      const result = await generator.generate({
        prompt: "Create an application",
        language: "unsupported-language"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("UNSUPPORTED_LANGUAGE");
    });

    it("duhet të pranojë JavaScript", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const instance = createCodeGenerator({ provider });

      const result = await instance.generate({
        prompt: "Create a script",
        language: "javascript"
      });

      expect(result.success).toBe(true);
    });

    it("duhet të pranojë Python", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const instance = createCodeGenerator({ provider });

      const result = await instance.generate({
        prompt: "Create a script",
        language: "python"
      });

      expect(result.success).toBe(true);
    });

    it("duhet të refuzojë prompt që tejkalon kufirin", async () => {
      const instance = createCodeGenerator({
        config: { maxPromptLength: 5 },
        provider: {
          generate: vi.fn()
        }
      });

      const result = await instance.generate({
        prompt: "123456"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("PROMPT_TOO_LONG");
    });

    it("duhet të pranojë prompt në kufirin maksimal", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const instance = createCodeGenerator({
        config: { maxPromptLength: 5 },
        provider
      });

      const result = await instance.generate({
        prompt: "12345"
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Provider integration", () => {
    it("duhet të raportojë mungesën e provider-it", async () => {
      const generator = createCodeGenerator();

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("GENERATOR_PROVIDER_UNAVAILABLE");
    });

    it("duhet të raportojë provider pa funksion generate", async () => {
      const generator = createCodeGenerator({
        provider: {}
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("GENERATOR_PROVIDER_UNAVAILABLE");
    });

    it("duhet të thërrasë provider.generate", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const generator = createCodeGenerator({ provider });

      await generator.generate({
        prompt: "Create an application"
      });

      expect(provider.generate).toHaveBeenCalledTimes(1);
    });

    it("duhet t'i dërgojë provider-it parametrat e normalizuar", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const generator = createCodeGenerator({ provider });

      await generator.generate({
        prompt: "  Create dashboard  ",
        language: "javascript",
        framework: "React",
        projectType: "dashboard",
        requirements: ["Authentication", "Responsive design"]
      });

      expect(provider.generate).toHaveBeenCalledWith({
        prompt: "Create dashboard",
        language: "javascript",
        framework: "React",
        projectType: "dashboard",
        requirements: ["Authentication", "Responsive design"]
      });
    });

    it("duhet të përdorë null për framework që mungon", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const generator = createCodeGenerator({ provider });

      await generator.generate({
        prompt: "Create an application"
      });

      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: null
        })
      );
    });

    it("duhet të përdorë listë bosh për requirements që mungojnë", async () => {
      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const generator = createCodeGenerator({ provider });

      await generator.generate({
        prompt: "Create an application"
      });

      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: []
        })
      );
    });

    it("duhet të kopjojë requirements dhe jo të përdorë array-n origjinale", async () => {
      const requirements = ["Authentication"];

      const provider = {
        generate: vi.fn().mockResolvedValue({ artifacts: [] })
      };

      const generator = createCodeGenerator({ provider });

      await generator.generate({
        prompt: "Create an application",
        requirements
      });

      const received = provider.generate.mock.calls[0][0].requirements;

      expect(received).toEqual(requirements);
      expect(received).not.toBe(requirements);
    });

    it("duhet të trajtojë gabimin e provider-it", async () => {
      const provider = {
        generate: vi.fn().mockRejectedValue(new Error("Provider failure"))
      };

      const generator = createCodeGenerator({ provider });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("CODE_GENERATION_FAILED");
    });
  });

  describe("Provider response validation", () => {
    it("duhet të refuzojë përgjigjen null", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue(null)
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
    });

    it("duhet të refuzojë përgjigjen jo-objekt", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue("invalid")
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
    });

    it("duhet të refuzojë përgjigjen pa artifacts", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({})
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACTS");
    });

    it("duhet të refuzojë artifacts që nuk janë array", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: {}
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_ARTIFACTS");
    });

    it("duhet të pranojë listë bosh artifacts", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: []
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(true);
      expect(result.data.artifacts).toEqual([]);
    });

    it("duhet të refuzojë numrin e skedarëve mbi kufi", async () => {
      const generator = createCodeGenerator({
        config: { maxFiles: 1 },
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              { fileName: "one.js", content: "one" },
              { fileName: "two.js", content: "two" }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("FILE_LIMIT_EXCEEDED");
    });

    it("duhet të pranojë numrin maksimal të skedarëve", async () => {
      const generator = createCodeGenerator({
        config: { maxFiles: 2 },
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              { fileName: "one.js", content: "one" },
              { fileName: "two.js", content: "two" }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(true);
      expect(result.data.artifacts).toHaveLength(2);
    });

    it("duhet të refuzojë artifact null", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [null]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("CODE_GENERATION_FAILED");
    });

    it("duhet të refuzojë artifact pa fileName", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [{ content: "console.log('test')" }]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("CODE_GENERATION_FAILED");
    });

    it("duhet të refuzojë fileName që nuk është string", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              { fileName: 123, content: "console.log('test')" }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("CODE_GENERATION_FAILED");
    });

    it("duhet të refuzojë content që nuk është string", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              { fileName: "app.js", content: 123 }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("CODE_GENERATION_FAILED");
    });
  });

  describe("Artifact generation", () => {
    it("duhet të krijojë artifact me strukturën e saktë", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              {
                fileName: "index.js",
                content: "console.log('Hello');"
              }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create a JavaScript application",
        language: "javascript"
      });

      expect(result.success).toBe(true);
      expect(result.data.artifacts[0]).toEqual({
        fileName: "index.js",
        language: "javascript",
        content: "console.log('Hello');",
        type: "source"
      });
    });

    it("duhet të përdorë gjuhën e kërkesës kur artifact nuk ka language", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              {
                fileName: "app.py",
                content: "print('Hello')"
              }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create Python application",
        language: "python"
      });

      expect(result.data.artifacts[0].language).toBe("python");
    });

    it("duhet të ruajë gjuhën e dhënë nga artifact", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              {
                fileName: "index.html",
                language: "html",
                content: "<h1>Hello</h1>"
              }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create a web page",
        language: "javascript"
      });

      expect(result.data.artifacts[0].language).toBe("html");
    });

    it("artifact duhet të jetë i ngrirë", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              {
                fileName: "index.js",
                content: "console.log('test');"
              }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(Object.isFrozen(result.data.artifacts[0])).toBe(true);
    });

    it("duhet të gjenerojë disa artifacts", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              { fileName: "index.html", content: "<h1>Hello</h1>" },
              { fileName: "style.css", content: "body {}" },
              { fileName: "script.js", content: "console.log('Hello')" }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create a website"
      });

      expect(result.success).toBe(true);
      expect(result.data.artifacts).toHaveLength(3);
    });
  });

  describe("Result structure and immutability", () => {
    it("duhet të kthejë strukturën e saktë të suksesit", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: []
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("metadata");
    });

    it("duhet të raportojë versionin e generator-it", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: []
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.metadata.generatorVersion).toBe("1.0.0");
    });

    it("duhet të raportojë numrin e artifacts", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: [
              { fileName: "one.js", content: "one" },
              { fileName: "two.js", content: "two" }
            ]
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(result.metadata.artifactCount).toBe(2);
    });

    it("metadata duhet të jetë e ngrirë", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: []
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(Object.isFrozen(result.metadata)).toBe(true);
    });

    it("data duhet të jetë e ngrirë", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: []
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(Object.isFrozen(result.data)).toBe(true);
    });

    it("artifacts array duhet të jetë e ngrirë", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: []
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create an application"
      });

      expect(Object.isFrozen(result.data.artifacts)).toBe(true);
    });

    it("duhet të ruajë projectType të kërkesës", async () => {
      const generator = createCodeGenerator({
        provider: {
          generate: vi.fn().mockResolvedValue({
            artifacts: []
          })
        }
      });

      const result = await generator.generate({
        prompt: "Create a dashboard",
        projectType: "dashboard"
      });

      expect(result.data.projectType).toBe("dashboard");
    });
  });
});
