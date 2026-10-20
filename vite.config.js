
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    include: [
      'services/**/*.test.js',
      'tests/**/*.test.js'
    ],

    clearMocks: true,

    coverage: {
      provider: 'v8',
      include: [
        'services/**/*.js',
        'src/**/*.js'
      ],
      exclude: [
        '**/*.test.js',
        '**/node_modules/**'
      ],
      reporter: ['text', 'html']
    }
  }
});
