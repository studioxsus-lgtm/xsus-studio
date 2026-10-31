import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    include: [
      'tests/**/*.test.js'
    ],

    exclude: [
      'services/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],

    clearMocks: true,

    coverage: {
      provider: 'v8',

      include: [
        'src/**/*.js'
      ],

      exclude: [
        'services/**',
        'tests/**',
        '**/*.test.js',
        '**/*.spec.js',
        '**/node_modules/**'
      ],

      reporter: ['text', 'html']
    }
  }
});
