import { readFileSync } from 'node:fs';
import { EMPTY_REGISTRY, freeze, preRegister, sha256Hex } from '@trading/core';
import type { Registry, TimeAnchorer } from '@trading/core';
import { DC_P1_ID, DC_P2_ID, dcSpec } from '@trading/astro-engine';
import type { DcFrozen } from '@trading/astro-engine';
import { loadRegistry, saveRegistry } from '@trading/data-service';

/**
 * Registers and freezes PH-13 and PH-14 (daśā and collapse, docs/DASHA_COLLAPSE_STUDY_PLAN.md) in the hash-chained
 * registry with an outside time stamp, before any daśā is computed for any stock in the list. Both are registered and
 * frozen, or neither is saved. Registering twice is refused (a change is a new id).
 */
export const DC_PATHS = {
  list: 'data/frozen/dasha_collapse_verified_v1.csv',
  manifest: 'data/frozen/dasha_collapse_v1.json',
  registry: 'data/registry/experiments.json',
} as const;

const fileHash = (path: string): string =>
  sha256Hex(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));

/** The frozen facts both specs carry: the list hash, the manifest hash and how many stocks are in the list. */
export function dcFrozen(paths = DC_PATHS): DcFrozen {
  const rows = readFileSync(paths.list, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
  return {
    listFileHash: fileHash(paths.list),
    manifestHash: fileHash(paths.manifest),
    stocks: rows.length - 1,
  };
}

export interface RegisterDcDeps {
  registryFile: string;
  anchorer: TimeAnchorer;
  now(): number;
  frozen: DcFrozen;
}

export async function registerDashaCollapse(deps: RegisterDcDeps): Promise<Registry> {
  const existing = loadRegistry(deps.registryFile) ?? EMPTY_REGISTRY;
  for (const id of [DC_P1_ID, DC_P2_ID])
    if (existing.registrations.some((r) => r.spec.id === id))
      throw new Error(`${id} is already registered in ${deps.registryFile}`);
  let reg = preRegister(existing, dcSpec('P1', deps.frozen), deps.now());
  reg = preRegister(reg, dcSpec('P2', deps.frozen), deps.now());
  for (const id of [DC_P1_ID, DC_P2_ID]) {
    reg = await freeze(reg, id, deps.now(), deps.anchorer);
    const entry = reg.registrations.find((r) => r.spec.id === id);
    if (entry?.frozen == null)
      throw new Error(
        `${id} was not frozen: ${entry?.freezeNote ?? 'unknown reason'}; nothing was saved`,
      );
  }
  saveRegistry(deps.registryFile, reg);
  return reg;
}
