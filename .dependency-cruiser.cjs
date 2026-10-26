/** Architecture guardrails (SSD §7.3/§7.4). Run with: pnpm cycles */
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', comment: 'No import cycles.', from: {}, to: { circular: true } },
    {
      name: 'core-isolated',
      severity: 'error',
      comment: 'core imports nothing from other workspace packages.',
      from: { path: '^packages/core/src' },
      to: { path: '^packages/(app|astro-engine|data-service|workers)/' },
    },
    {
      name: 'astro-engine-isolated',
      severity: 'error',
      comment: 'astro-engine may use core only.',
      from: { path: '^packages/astro-engine/src' },
      to: { path: '^packages/(app|data-service|workers)/' },
    },
    {
      name: 'data-service-no-ui',
      severity: 'error',
      comment: 'data-service must not import the app shell.',
      from: { path: '^packages/data-service/src' },
      to: { path: '^packages/app/' },
    },
    {
      name: 'app-no-data-service-internals',
      severity: 'error',
      comment: 'app talks to data-service over HTTP, not by import.',
      from: { path: '^packages/app/src' },
      to: { path: '^packages/(data-service|workers)/' },
    },
    {
      name: 'app-no-astro',
      severity: 'error',
      comment: 'D42: the learning app holds no astro layer; the astro engine stays in research.',
      from: { path: '^packages/app/src' },
      to: { path: '^packages/astro-engine/' },
    },
    {
      name: 'app-no-simulator',
      severity: 'error',
      comment: 'The learning app does not use the astro trade simulator (owner, 2026-10-26).',
      from: { path: '^packages/app/src' },
      to: { path: '^packages/simulator/' },
    },
    {
      name: 'public-api-only',
      severity: 'error',
      comment: 'Cross-package imports go through the package entry point.',
      from: { path: '^packages/([^/]+)/src' },
      to: { path: '^packages/(?!$1/)[^/]+/src/(?!index\\.ts$)', pathNot: '\\.test\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.test\\.ts$' },
  },
};
