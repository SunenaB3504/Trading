import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The draft company-name table of universe-v2 (data/names): complete, ordered and honest about what is unknown. */
interface Row {
  id: string;
  name: string;
  from: string;
  to: string;
  confidence: string;
}

function rows(): Row[] {
  const lines = readFileSync('data/names/universe_v2_names.csv', 'utf8')
    .trim()
    .split('\n')
    .slice(1);
  return lines.map((l) => {
    const cells = [...l.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].map((m) =>
      (m[1] ?? '').replace(/^"|"$/g, '').replaceAll('""', '"'),
    );
    return {
      id: cells[0] ?? '',
      name: cells[1] ?? '',
      from: cells[2] ?? '',
      to: cells[3] ?? '',
      confidence: cells[4] ?? '',
    };
  });
}

/** Left out of the name table by the owner (2026-10-23, proof of concept). They stay in the frozen universe with no name, so H-21 gives them no signal. */
const LEFT_OUT = ['AIFL', 'MEGH', 'IBREALEST', 'KPIT', 'TINPLATE'];

describe('company names of the frozen universe', () => {
  const frozen = JSON.parse(readFileSync('data/frozen/universe_v2.json', 'utf8')) as {
    members: Array<{ instrumentId: string }>;
  };
  const all = rows();

  it('has at least one row for every member except the ones left out, and none for a company outside the universe', () => {
    const ids = new Set(frozen.members.map((m) => m.instrumentId));
    const left = new Set([...ids].filter((id) => LEFT_OUT.includes(id.split(':')[0] ?? '')));
    expect(left.size).toBe(LEFT_OUT.length);
    expect(new Set([...all.map((r) => r.id), ...left])).toEqual(ids);
    for (const id of left) expect(all.some((r) => r.id === id)).toBe(false);
  });

  it('names every company it is sure of, and leaves the unknown ones empty so no star is guessed', () => {
    for (const r of all) {
      if (r.confidence === 'unknown') expect(r.name, r.id).toBe('');
      else expect(r.name, r.id).not.toBe('');
    }
  });

  it("keeps a company's rows in order without overlap (the earlier one ends before the next begins)", () => {
    const byId = new Map<string, Row[]>();
    for (const r of all) byId.set(r.id, [...(byId.get(r.id) ?? []), r]);
    for (const [id, list] of byId) {
      list.slice(1).forEach((r, i) => {
        const prev = list[i] as Row;
        expect(prev.to !== '' && r.from !== '' && prev.to < r.from, id).toBe(true);
      });
    }
  });
});
