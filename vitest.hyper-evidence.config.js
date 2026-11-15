import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/platform/xsus-app/hyper-owned-evidence-writer.test.js",
      "src/platform/xsus-app/hyper-owned-evidence-service.test.js"
    ],
    environment: "node"
  }
});
