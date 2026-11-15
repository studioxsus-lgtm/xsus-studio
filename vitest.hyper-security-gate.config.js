import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/platform/xsus-app/hyper-evidence-runtime-integration.test.js",
      "src/platform/xsus-app/hyper-evidence-hmac-integration.test.js",
      "src/platform/xsus-app/hyper-v8235-node-runtime-route.test.js"
    ],
    clearMocks: true
  }
});
