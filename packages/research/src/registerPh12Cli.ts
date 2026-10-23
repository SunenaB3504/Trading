import { NodeOtsAnchor } from './nodeAnchor';
import { PH12_PATHS, listingFileHash, prepareMembers } from './ph12Run';
import { registerPh12 } from './registerPh12';

/**
 * Registers and freezes PH-12 with a live OpenTimestamps stamp (only a 32-byte digest is sent to the public calendars).
 *
 * Usage:  pnpm register:ph12
 */
const prepared = await prepareMembers();
const reg = await registerPh12({
  registryFile: PH12_PATHS.registry,
  anchorer: NodeOtsAnchor(),
  now: () => Date.now(),
  listingFileHash: listingFileHash(),
  companies: prepared.listing.length,
  excludedInstruments: prepared.excluded,
});
const entry = reg.registrations[reg.registrations.length - 1];
console.log(
  JSON.stringify({
    id: entry?.spec.id,
    specHash: entry?.specHash,
    registeredAt: entry?.registeredAt,
    frozenAt: entry?.frozen?.at,
    receiptProvider: entry?.frozen?.receipt.provider,
    companies: prepared.listing.length,
    excluded: entry?.spec.excludedInstruments.length,
    events: reg.events.length,
  }),
);
