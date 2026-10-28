import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'tools/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    testTimeout: 30_000,
    // The Robo and replay tests use a core for many seconds; with every core busy a worker misses its heartbeat to the runner.
    maxWorkers: '50%',
    coverage: {
      provider: 'v8',
      // NFR-8: 90% target for ledger, fills and metrics.
      include: [
        'packages/core/src/ledger/**',
        'packages/core/src/fills/**',
        'packages/core/src/analytics/**',
      ],
      exclude: ['**/*.test.ts', '**/*.data.ts'],
      reporter: ['text'],
    },
  },
});
