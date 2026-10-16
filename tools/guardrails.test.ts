/** WP-0.1 acceptance: the architecture and size guardrails actually fail when broken. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ESLint } from 'eslint';
import { cruise } from 'dependency-cruiser';
import { describe, expect, it } from 'vitest';
import { classify, HARD_CAP, SOFT_CAP } from './checkSize';

const root = process.cwd();
const eslint = new ESLint({ cwd: root });

async function lintRules(file: string, code: string): Promise<string[]> {
  const [res] = await eslint.lintText(code, { filePath: join(root, file) });
  return (res?.messages ?? []).map((m) => m.ruleId ?? 'parse-error');
}

describe('core import and API boundaries (ESLint)', () => {
  const core = 'packages/core/src/probe.ts';
  it('rejects Node built-ins', async () => {
    expect(await lintRules(core, "import fs from 'node:fs';\nexport const a = fs;\n")).toContain(
      'no-restricted-imports',
    );
  });
  it('rejects UI frameworks', async () => {
    expect(
      await lintRules(core, "import React from 'react';\nexport const a = React;\n"),
    ).toContain('no-restricted-imports');
  });
  it('rejects Math.random, Date.now, new Date(), BigInt, Intl', async () => {
    const code = 'export const a = [Math.random(), Date.now(), new Date(), BigInt(1), Intl];\n';
    const rules = await lintRules(core, code);
    expect(rules).toContain('no-restricted-properties');
    expect(rules).toContain('no-restricted-syntax');
    expect(rules).toContain('no-restricted-globals');
  });
  it('allows clean core code', async () => {
    expect(await lintRules(core, 'export const a = 1;\n')).toEqual([]);
  });
});

describe('size caps (D23)', () => {
  const lines = (n: number) => 'x\n'.repeat(n);
  it('fails a 501-line file', () => {
    expect(classify('big.ts', lines(HARD_CAP + 1))?.level).toBe('error');
  });
  it('passes exactly 500 lines with a warning', () => {
    expect(classify('ok.ts', lines(HARD_CAP))?.level).toBe('warn');
  });
  it('warns above 300 and is silent at 300', () => {
    expect(classify('w.ts', lines(SOFT_CAP + 1))?.level).toBe('warn');
    expect(classify('s.ts', lines(SOFT_CAP))).toBeNull();
  });
});

describe('dependency rules (dependency-cruiser)', () => {
  const ruleSet = createRequire(import.meta.url)('../.dependency-cruiser.cjs') as object;

  async function violations(files: Record<string, string>): Promise<string[]> {
    const dir = mkdtempSync(join(tmpdir(), 'depcruise-'));
    try {
      for (const [rel, body] of Object.entries(files)) {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, body);
      }
      const result = await cruise(['packages'], {
        baseDir: dir,
        ruleSet: ruleSet as never,
        validate: true,
      });
      const out = result.output as { summary: { violations: { rule: { name: string } }[] } };
      return out.summary.violations.map((v) => v.rule.name);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it('flags core importing the app package', async () => {
    const v = await violations({
      'packages/core/src/index.ts': "import '../../app/src/index';\nexport {};\n",
      'packages/app/src/index.ts': 'export {};\n',
    });
    expect(v).toContain('core-isolated');
  });
  it('flags import cycles', async () => {
    const v = await violations({
      'packages/core/src/a.ts': "import './b';\nexport const a = 1;\n",
      'packages/core/src/b.ts': "import './a';\nexport const b = 1;\n",
    });
    expect(v).toContain('no-circular');
  });
  it('accepts a clean tree', async () => {
    const v = await violations({ 'packages/core/src/index.ts': 'export {};\n' });
    expect(v).toEqual([]);
  });
});
