/** Enforces the D23 file-size caps: hard 500 physical lines, warning at 300. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const HARD_CAP = 500;
export const SOFT_CAP = 300;

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_DIR = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
  'Study-docs',
  'docs',
  'research',
  'upstream',
  'fixtures',
]);
const SKIP_FILE = /(\.generated\.|\.d\.ts$)/;

export interface SizeFinding {
  file: string;
  lines: number;
  level: 'error' | 'warn';
}

export function countLines(text: string): number {
  if (text.length === 0) return 0;
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}

export function classify(file: string, text: string): SizeFinding | null {
  const lines = countLines(text);
  if (lines > HARD_CAP) return { file, lines, level: 'error' };
  if (lines > SOFT_CAP) return { file, lines, level: 'warn' };
  return null;
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIR.has(name)) walk(full, out);
    } else if (CODE_EXT.test(name) && !SKIP_FILE.test(name)) {
      out.push(full);
    }
  }
}

export function checkTree(root: string): SizeFinding[] {
  const files: string[] = [];
  walk(root, files);
  const findings: SizeFinding[] = [];
  for (const f of files) {
    const finding = classify(relative(root, f), readFileSync(f, 'utf8'));
    if (finding) findings.push(finding);
  }
  return findings;
}

if (process.argv[1]?.endsWith('checkSize.ts')) {
  const findings = checkTree(process.cwd());
  for (const f of findings) console.log(`${f.level.toUpperCase()}: ${f.file} has ${f.lines} lines`);
  const errors = findings.filter((f) => f.level === 'error').length;
  console.log(`size check: ${errors} error(s), ${findings.length - errors} warning(s)`);
  process.exit(errors > 0 ? 1 : 0);
}
