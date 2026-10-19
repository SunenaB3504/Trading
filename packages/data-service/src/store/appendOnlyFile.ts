import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { verifyRegistry } from '@trading/core';
import type { Registry } from '@trading/core';

/**
 * Plain files for the research records that must survive a restart (WP-4.5, WP-5.1): the signal log, the day
 * locks and their receipts, and the experiment registry. The files only keep the records; whether they are
 * intact is decided by the hash chains inside them, which the caller re-checks on load.
 */

export class StoreError extends Error {}

/** One JSON record per line, only ever appended. A line that cannot be read stops the load: nothing is skipped. */
export class AppendOnlyFile<T> {
  constructor(private readonly path: string) {}

  /** Adds one record and forces it to disk before returning, so a crash cannot leave a half-acknowledged write. */
  append(item: T): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const fd = openSync(this.path, 'a');
    try {
      writeSync(fd, `${JSON.stringify(item)}\n`);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }

  readAll(): T[] {
    if (!existsSync(this.path)) return [];
    const lines = readFileSync(this.path, 'utf8').split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines.map((line, i) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        throw new StoreError(`${this.path}: line ${String(i + 1)} is not valid JSON`);
      }
    });
  }
}

/** Writes a whole file so a reader sees the old content or the new, never half: temp file, flush, rename. */
export function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, JSON.stringify(value));
  const fd = openSync(temp, 'r+');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, path);
}

/** The saved registry, checked end to end; null if none was saved. A registry that fails its checks is refused. */
export function loadRegistry(path: string): Registry | null {
  if (!existsSync(path)) return null;
  const reg = JSON.parse(readFileSync(path, 'utf8')) as Registry;
  const check = verifyRegistry(reg);
  if (!check.ok)
    throw new StoreError(`${path}: the saved registry fails its checks (${check.reason})`);
  return reg;
}

/** Saves a registry, but only one that passes its own checks; the previous file is kept as `.history` first. */
export function saveRegistry(path: string, reg: Registry): void {
  const check = verifyRegistry(reg);
  if (!check.ok)
    throw new StoreError(`refusing to save a registry that fails its checks (${check.reason})`);
  if (existsSync(path)) appendFileSync(`${path}.history`, `${readFileSync(path, 'utf8')}\n`);
  writeJsonAtomic(path, reg);
}
