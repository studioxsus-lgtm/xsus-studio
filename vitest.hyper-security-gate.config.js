import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/platform/xsus-app/hyper-evidence-runtime-integration.test.js",
      "src/platform/xsus-app/hyper-evidence-owner-authorizer.test.js",
      "src/platform/xsus-app/hyper-evidence-hmac-integration.test.js",
      "src/platform/xsus-app/hyper-v8235-node-runtime-route.test.js",
      "src/platform/xsus-app/hyper-readiness-diagnostic.test.js",
      "tests/integration/hyper-real-server-failclosed.test.js"
    ],
    clearMocks: true
  }
});
