import { DC_P1_ID, DC_P2_ID, dcSpec } from '@trading/astro-engine';
import { NodeOtsAnchor } from './nodeAnchor';
import { DC_PATHS, dcFrozen, registerDashaCollapse } from './registerDashaCollapse';

/**
 * Registers PH-13 and PH-14 with a live OpenTimestamps stamp (only a 32-byte digest is sent to the public calendars).
 *
 *   pnpm register:dasha             dry run: prints what would be registered and both hashes; writes nothing
 *   pnpm register:dasha --execute   registers and freezes both, once; a repeat is refused
 */
const frozen = dcFrozen();
const specs = [dcSpec('P1', frozen), dcSpec('P2', frozen)];
console.log(
  JSON.stringify({
    step: 'plan',
    stocks: frozen.stocks,
    listFileHash: frozen.listFileHash,
    manifestHash: frozen.manifestHash,
    hypotheses: specs.map((s) => ({ id: s.id, family: s.family, ruleHash: s.ruleHash })),
  }),
);
if (!process.argv.includes('--execute')) {
  console.log(
    'Dry run only. Nothing was registered. Add --execute to register and freeze PH-13 and PH-14.',
  );
  process.exit(0);
}
const reg = await registerDashaCollapse({
  registryFile: DC_PATHS.registry,
  anchorer: NodeOtsAnchor(),
  now: () => Date.now(),
  frozen,
});
for (const id of [DC_P1_ID, DC_P2_ID]) {
  const e = reg.registrations.find((r) => r.spec.id === id);
  console.log(
    JSON.stringify({
      id,
      specHash: e?.specHash,
      registeredAt: e?.registeredAt,
      frozenAt: e?.frozen?.at,
      receipt: e?.frozen?.receipt.provider,
    }),
  );
}
