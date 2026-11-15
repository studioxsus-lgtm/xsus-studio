import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/platform/xsus-app/hyper-evidence-runtime-integration.test.js"],
    clearMocks: true
  }
});
