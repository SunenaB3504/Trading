import { readFileSync } from 'node:fs';
import { NodeOtsAnchor } from './nodeAnchor';
import { registerH21 } from './registerH21';

/**
 * Registers and freezes H-21 with a live OpenTimestamps stamp (only a 32-byte digest is sent to the public calendars).
 *
 * Usage:  pnpm register:h21 [--registry data/registry/experiments.json] [--pilot data/pilot_symbols.txt]
 */
const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const pilot = readFileSync(opt('--pilot', 'data/pilot_symbols.txt'), 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((s) => s !== '');
const reg = await registerH21({
  registryFile: opt('--registry', 'data/registry/experiments.json'),
  anchorer: NodeOtsAnchor(),
  now: () => Date.now(),
  pilotSymbols: pilot,
});
const entry = reg.registrations[reg.registrations.length - 1];
console.log(
  JSON.stringify({
    id: entry?.spec.id,
    specHash: entry?.specHash,
    registeredAt: entry?.registeredAt,
    frozenAt: entry?.frozen?.at,
    receiptProvider: entry?.frozen?.receipt.provider,
    excluded: entry?.spec.excludedInstruments.length,
    events: reg.events.length,
  }),
);
