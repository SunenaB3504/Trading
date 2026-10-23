import { EMPTY_REGISTRY, freeze, preRegister } from '@trading/core';
import type { Registry, TimeAnchorer } from '@trading/core';
import { PH12_ID, ph12Spec } from '@trading/astro-engine';
import { loadRegistry, saveRegistry } from '@trading/data-service';

/**
 * Registers and freezes hypothesis PH-12 (Tara Bala from the owner's star to the stock's first-trade star), in the
 * hash-chained experiment registry with an outside time stamp, before any result is looked at. Registering twice is
 * refused (a change is a new id). Companies without an official BSE listing date, and the pilot stocks, are left out.
 */
export interface RegisterPh12Deps {
  registryFile: string;
  anchorer: TimeAnchorer;
  now(): number;
  /** Hash of the listing file the stars come from. */
  listingFileHash: string;
  companies: number;
  /** Universe members left out of the test (no official listing date). */
  excludedInstruments: readonly string[];
}

export async function registerPh12(deps: RegisterPh12Deps): Promise<Registry> {
  const existing = loadRegistry(deps.registryFile) ?? EMPTY_REGISTRY;
  if (existing.registrations.some((r) => r.spec.id === PH12_ID))
    throw new Error(`${PH12_ID} is already registered in ${deps.registryFile}`);
  const spec = ph12Spec({
    listingFileHash: deps.listingFileHash,
    companies: deps.companies,
    excludedInstruments: [...deps.excludedInstruments].sort(),
  });
  const registered = preRegister(existing, spec, deps.now());
  const frozen = await freeze(registered, PH12_ID, deps.now(), deps.anchorer);
  const entry = frozen.registrations.find((r) => r.spec.id === PH12_ID);
  if (entry?.frozen == null)
    throw new Error(
      `PH-12 was not frozen: ${entry?.freezeNote ?? 'unknown reason'}; nothing was saved`,
    );
  saveRegistry(deps.registryFile, frozen);
  return frozen;
}
