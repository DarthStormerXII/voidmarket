import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['src/tests/**/*.test.ts'],

    // Environment
    environment: 'node',

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/**/*.d.ts'],
    },

    // Timeouts
    testTimeout: 30000,
    hookTimeout: 30000,

    // Parallelization
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Run tests serially to avoid resource contention
      },
    },

    // Setup files
    setupFiles: ['./src/tests/setup.ts'],

    // Globals (describe, it, expect without imports)
    globals: true,

    // Reporter
    reporters: ['verbose'],

    // Dependencies
    deps: {
      interopDefault: true,
    },
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
