
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "services/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],

    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: [
        "services/**",
        "src/**/__tests__/**",
        "src/**/*.test.js",
        "src/**/*.spec.js",
        "node_modules/**",
        "tests/**",
      ],
      reporter: ["text", "html"],
    },
  },
});
