import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const NODE_MODULES_BANNED = [
  'node:*', 'fs', 'path', 'os', 'child_process', 'crypto', 'http', 'https', 'net', 'stream', 'url', 'util', 'buffer',
];
const UI_BANNED = ['react', 'react-dom', 'react-native', 'expo', 'expo-*'];

const coreBans = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: NODE_MODULES_BANNED, message: 'core must not use Node APIs (SSD principle 1, RB R6).' },
        { group: UI_BANNED, message: 'core must not use UI frameworks.' },
        { group: ['@trading/app', '@trading/app/*', '@trading/data-service', '@trading/data-service/*', '@trading/workers', '@trading/workers/*'], message: 'core must not depend on shells or I/O packages.' },
      ],
    },
  ],
  'no-restricted-globals': [
    'error',
    ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'process', 'Buffer', 'BigInt', 'Intl', 'setTimeout', 'setInterval']
      .map((name) => ({ name, message: `'${name}' is not allowed in core (determinism / Android-readiness).` })),
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use the seeded PRNG (RB R8).' },
    { object: 'Date', property: 'now', message: 'Use the injected Clock (RB R6).' },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'new Date() with no argument reads the wall clock; use the injected Clock.' },
    { selector: "CallExpression[callee.property.name=/^toLocale/]", message: 'Locale-dependent formatting is not allowed in core.' },
  ],
};

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'Study-docs/**', 'docs/**', 'research/**', '**/upstream/**', 'fixtures/**', '**/*.generated.ts', '.dependency-cruiser.cjs', 'tools/**', 'packages/app/metro.config.js', 'packages/app/src/trading/useMarkets.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 10],
      'no-restricted-imports': ['error', { patterns: [{ group: ['../*/src/*', '../../*/src/*'], message: 'Import other packages by package name only.' }] }],
    },
  },
  { files: ['packages/core/src/**/*.ts', 'packages/astro-engine/src/**/*.ts'], rules: coreBans },
  {
    // Tests may use BigInt as an independent reference oracle; the core-code bans stay for src files.
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off', 'no-restricted-globals': 'off' },
  },
);
