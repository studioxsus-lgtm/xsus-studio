import { describe, it, expect } from "vitest";

import {
  APP_ARCHITECT_VERSION,
  APP_ARCHITECT_TYPES,
  APP_ARCHITECT_PLATFORMS,
  APP_ARCHITECT_LAYERS,
  createAppArchitecture,
  getAppArchitectCapabilities,
} from "../../apps/app/architect/app-architect.js";

describe("XSUS App Architect", () => {
  describe("Architect definitions", () => {
    it("exposes the correct version", () => {
      expect(APP_ARCHITECT_VERSION).toBe("1.1.0");
    });

    it("defines supported architecture types", () => {
      expect(APP_ARCHITECT_TYPES).toEqual([
        "web",
        "mobile",
        "desktop",
        "fullstack",
      ]);
    });

    it("defines supported execution platforms", () => {
      expect(APP_ARCHITECT_PLATFORMS).toEqual([
        "web",
        "android",
        "ios",
        "desktop",
      ]);
    });

    it("defines all architecture layers", () => {
      expect(APP_ARCHITECT_LAYERS).toEqual([
        "frontend",
        "backend",
        "database",
        "api",
        "authentication",
        "security",
        "testing",
        "deployment",
      ]);
    });

    it("exposes immutable definitions", () => {
      expect(Object.isFrozen(APP_ARCHITECT_TYPES)).toBe(true);
      expect(Object.isFrozen(APP_ARCHITECT_PLATFORMS)).toBe(true);
      expect(Object.isFrozen(APP_ARCHITECT_LAYERS)).toBe(true);
    });
  });

  describe("Web architecture", () => {
    it("creates a valid web architecture", () => {
      const result = createAppArchitecture({
        prompt: "Create a web application",
        platform: "web",
      });

      expect(result.architecture.type).toBe("web");
      expect(result.project.platform).toBe("web");
      expect(result.architecture.layers).toHaveLength(8);
    });

    it("uses the expected web technology stack", () => {
      const result = createAppArchitecture({
        prompt: "Create a website",
        platform: "web",
      });

      expect(result.architecture.stack.frontend).toEqual([
        "HTML",
        "CSS",
        "JavaScript",
        "TypeScript",
      ]);

      expect(result.architecture.stack.backend).toEqual([
        "Node.js",
      ]);

      expect(result.architecture.stack.database).toEqual([
        "PostgreSQL",
      ]);
    });
  });

  describe("Mobile architecture", () => {
    it("resolves Android to mobile architecture", () => {
      const result = createAppArchitecture({
        prompt: "Create an Android application",
        platform: "android",
      });

      expect(result.project.platform).toBe("android");
      expect(result.architecture.type).toBe("mobile");
    });

    it("resolves iOS to mobile architecture", () => {
      const result = createAppArchitecture({
        prompt: "Create an iOS application",
        platform: "ios",
      });

      expect(result.project.platform).toBe("ios");
      expect(result.architecture.type).toBe("mobile");
    });

    it("uses the expected mobile technology stack", () => {
      const result = createAppArchitecture({
        prompt: "Create a mobile application",
        platform: "android",
      });

      expect(result.architecture.stack.frontend).toEqual([
        "React Native",
        "TypeScript",
      ]);

      expect(result.architecture.stack.database).toEqual([
        "PostgreSQL",
      ]);
    });
  });

  describe("Desktop architecture", () => {
    it("creates a valid desktop architecture", () => {
      const result = createAppArchitecture({
        prompt: "Create a desktop application",
        platform: "desktop",
      });

      expect(result.project.platform).toBe("desktop");
      expect(result.architecture.type).toBe("desktop");
    });

    it("uses the expected desktop technology stack", () => {
      const result = createAppArchitecture({
        prompt: "Create a desktop application",
        platform: "desktop",
      });

      expect(result.architecture.stack.frontend).toEqual([
        "Electron",
        "TypeScript",
      ]);

      expect(result.architecture.stack.database).toEqual([
        "SQLite",
      ]);
    });
  });

  describe("Fullstack architecture", () => {
    it("supports explicit fullstack architecture", () => {
      const result = createAppArchitecture({
        prompt: "Create a fullstack application",
        platform: "web",
        architectureType: "fullstack",
      });

      expect(result.architecture.type).toBe("fullstack");
      expect(result.architecture.stack.frontend).toEqual([
        "React",
        "TypeScript",
      ]);
    });

    it("keeps the requested platform with fullstack architecture", () => {
      const result = createAppArchitecture({
        prompt: "Create a fullstack application",
        platform: "web",
        architectureType: "fullstack",
      });

      expect(result.project.platform).toBe("web");
      expect(result.architecture.type).toBe("fullstack");
    });
  });

  describe("Requirements", () => {
    it("preserves valid requirements", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
        requirements: [
          "Authentication",
          "Database",
          "API",
        ],
      });

      expect(result.requirements).toEqual([
        "Authentication",
        "Database",
        "API",
      ]);
    });

    it("removes invalid requirement values", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
        requirements: [
          "Authentication",
          123,
          null,
          "Database",
          {},
        ],
      });

      expect(result.requirements).toEqual([
        "Authentication",
        "Database",
      ]);
    });

    it("trims requirement whitespace", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
        requirements: [
          "  Authentication  ",
          " Database ",
        ],
      });

      expect(result.requirements).toEqual([
        "Authentication",
        "Database",
      ]);
    });

    it("removes empty requirements", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
        requirements: [
          "",
          "   ",
          "Authentication",
        ],
      });

      expect(result.requirements).toEqual([
        "Authentication",
      ]);
    });

    it("supports an empty requirements list", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
      });

      expect(result.requirements).toEqual([]);
    });
  });

  describe("Input validation", () => {
    it("rejects an empty prompt", () => {
      expect(() =>
        createAppArchitecture({
          prompt: "",
        })
      ).toThrow();
    });

    it("rejects a whitespace-only prompt", () => {
      expect(() =>
        createAppArchitecture({
          prompt: "   ",
        })
      ).toThrow();
    });

    it("rejects a non-string prompt", () => {
      expect(() =>
        createAppArchitecture({
          prompt: 123,
        })
      ).toThrow();
    });

    it("rejects an unsupported platform", () => {
      expect(() =>
        createAppArchitecture({
          prompt: "Create an application",
          platform: "unsupported",
        })
      ).toThrow();
    });

    it("rejects an unsupported architecture type", () => {
      expect(() =>
        createAppArchitecture({
          prompt: "Create an application",
          architectureType: "unsupported",
        })
      ).toThrow();
    });

    it("rejects an empty language", () => {
      expect(() =>
        createAppArchitecture({
          prompt: "Create an application",
          language: "",
        })
      ).toThrow();
    });

    it("rejects a non-string language", () => {
      expect(() =>
        createAppArchitecture({
          prompt: "Create an application",
          language: 123,
        })
      ).toThrow();
    });

    it("rejects non-array requirements", () => {
      expect(() =>
        createAppArchitecture({
          prompt: "Create an application",
          requirements: "invalid",
        })
      ).toThrow();
    });
  });

  describe("Architecture structure", () => {
    it("creates all expected layers", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
      });

      expect(
        result.architecture.layers.map(layer => layer.name)
      ).toEqual(APP_ARCHITECT_LAYERS);
    });

    it("marks all layers as planned", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
      });

      for (const layer of result.architecture.layers) {
        expect(layer.status).toBe("planned");
      }
    });

    it("provides technology arrays for every layer", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
      });

      for (const layer of result.architecture.layers) {
        expect(Array.isArray(layer.technologies)).toBe(true);
      }
    });

    it("provides the expected metadata", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
      });

      expect(result.metadata).toEqual({
        generatedBy: "XSUS App Architect",
        status: "architecture-draft",
        requiresValidation: true,
      });
    });

    it("trims the project description", () => {
      const result = createAppArchitecture({
        prompt: "  Create an application  ",
      });

      expect(result.project.description).toBe(
        "Create an application"
      );
    });

    it("uses the default language", () => {
      const result = createAppArchitecture({
        prompt: "Create an application",
      });

      expect(result.project.language).toBe("auto");
    });
  });

  describe("Architect capabilities", () => {
    it("returns architect capabilities", () => {
      const capabilities = getAppArchitectCapabilities();

      expect(capabilities.version).toBe("1.1.0");
      expect(capabilities.types).toBe(APP_ARCHITECT_TYPES);
      expect(capabilities.platforms).toBe(APP_ARCHITECT_PLATFORMS);
      expect(capabilities.layers).toBe(APP_ARCHITECT_LAYERS);
    });

    it("returns immutable capabilities", () => {
      const capabilities = getAppArchitectCapabilities();

      expect(Object.isFrozen(capabilities)).toBe(true);
    });
  });
});
