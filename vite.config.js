
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,

  server: {
    host: '0.0.0.0',
    port: 5173
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        home: `${root}index.html`,
        app: `${root}app.html`,
        auth: `${root}auth.html`,
        ai: `${root}ai.html`,
        web: `${root}web.html`,
        game: `${root}game.html`,
        logo: `${root}logo.html`,
        domain: `${root}domain.html`
      }
    }
  },

  test: {
    environment: 'node',

    include: [
      'tests/**/*.test.js',
      'src/hyper-xsus-core/**/*.test.js'
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
        'src/**/__tests__/**',
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'tests/**',
        '**/node_modules/**'
      ],

      reporter: ['text', 'html']
    }
  }
});
