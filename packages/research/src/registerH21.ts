import { EMPTY_REGISTRY, freeze, preRegister } from '@trading/core';
import type { Registry, TimeAnchorer } from '@trading/core';
import { APPROVED_NAMA_TABLE_V1, H21_ID, H21_OWNER_CLAIM, h21Spec } from '@trading/astro-engine';
import { loadRegistry, saveRegistry } from '@trading/data-service';

/**
 * Registers and freezes hypothesis H-21 (D21, D38): the owner's approved syllable table and the owner's claim,
 * recorded in the hash-chained experiment registry with an outside time stamp, before any result is looked at.
 * The pilot stocks are left out of the confirmatory test. Registering twice is refused (a change is a new id).
 */
export interface RegisterDeps {
  registryFile: string;
  anchorer: TimeAnchorer;
  now(): number;
  /** Symbols used in the exploratory pilot. */
  pilotSymbols: readonly string[];
}

export async function registerH21(deps: RegisterDeps): Promise<Registry> {
  const existing = loadRegistry(deps.registryFile) ?? EMPTY_REGISTRY;
  if (existing.registrations.some((r) => r.spec.id === H21_ID))
    throw new Error(`${H21_ID} is already registered in ${deps.registryFile}`);
  const spec = h21Spec(APPROVED_NAMA_TABLE_V1, {
    ...H21_OWNER_CLAIM,
    excludedInstruments: [...deps.pilotSymbols].sort(),
  });
  const registered = preRegister(existing, spec, deps.now());
  const frozen = await freeze(registered, H21_ID, deps.now(), deps.anchorer);
  const entry = frozen.registrations.find((r) => r.spec.id === H21_ID);
  if (entry?.frozen == null)
    throw new Error(
      `H-21 was not frozen: ${entry?.freezeNote ?? 'unknown reason'}; nothing was saved`,
    );
  saveRegistry(deps.registryFile, frozen);
  return frozen;
}
