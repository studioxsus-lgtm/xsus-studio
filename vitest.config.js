
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.js",
        "src/**/*.spec.js",
        "services/**",
        "node_modules/**",
        "tests/**",
      ],
      reporter: ["text", "html"],
    },
  },
});
