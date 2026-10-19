
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['services/**/*.test.js'],
    clearMocks: true
  }
});
