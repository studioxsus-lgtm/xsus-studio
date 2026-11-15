import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/platform/xsus-app/hyper-owned-evidence-writer.test.js",
      "src/platform/xsus-app/hyper-owned-evidence-service.test.js",
      "src/platform/xsus-app/hyper-owned-evidence-authenticated-service.test.js",
      "src/platform/xsus-app/hyper-readiness-diagnostic.test.js"
    ],
    environment: "node"
  }
});
