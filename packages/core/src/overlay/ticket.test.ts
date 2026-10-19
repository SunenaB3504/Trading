import { describe, expect, it } from 'vitest';
import type { Candidate, OverlayResult } from './contract';
import { TICKET_RULES_PROPOSED, buildTicket, ticketRulesHash } from './ticket';
import type { Ticket, TicketInput } from './ticket';

const candidate = (side: 'buy' | 'sell'): Candidate => ({
  instrumentId: 'AAA',
  date: '2026-03-02',
  side,
  quantity: 10,
});
const answer = (over: Partial<OverlayResult> = {}): OverlayResult => ({
  decision: 'allow',
  reasonCode: 'H21-TARA-FAVOURABLE',
  stateCode: 'GREEN',
  featuresHash: 'f'.repeat(64),
  ...over,
});
// Previous close Rs 1,000.00 and ATR14 Rs 20.00, in paise.
const market = { previousClosePaise: 100_000, atr14Paise: 2_000 };
const make = (over: Partial<TicketInput> = {}): Ticket =>
  buildTicket({
    candidate: candidate('buy'),
    answer: answer(),
    market,
    rules: TICKET_RULES_PROPOSED,
    hypothesisId: 'H-21',
    evidenceTag: '[M]',
    ...over,
  });

describe('the experimental arm ticket', () => {
  it('works the registered ATR multiples in integer paise (worked case)', () => {
    const t = make();
    expect(t.action).toBe('ENTER');
    expect(t.entryPaise).toBe(100_000);
    expect(t.target1Paise).toBe(103_000); // + 1.5 x 20.00
    expect(t.target2Paise).toBe(106_000); // + 3.0 x 20.00
    expect(t.stopPaise).toBe(98_000); // - 1.0 x 20.00
    expect(t.rewardToRiskMilli).toBe(1500);
    expect(t.timeStopSessions).toBe(15);
    expect(t.sizeBps).toBe(500);
    expect(t.horizonSessions).toBe(20);
  });

  it('enters at the limit price when the arm uses limit entry (previous close - 0.25 x ATR14)', () => {
    const t = make({ rules: { ...TICKET_RULES_PROPOSED, useLimitEntry: true } });
    expect(t.action).toBe('ENTER-LIMIT');
    expect(t.limitPaise).toBe(99_500);
    expect(t.entryPaise).toBe(99_500);
    expect(t.target1Paise).toBe(102_500);
  });

  it('maps a denial to BLOCK on a candidate entry and HOLD on a candidate exit, with no prices', () => {
    const deny = answer({
      decision: 'deny',
      stateCode: 'RED',
      reasonCode: 'H21-CHANDRASHTAMA-DAY',
    });
    const blocked = make({ answer: deny });
    expect(blocked.action).toBe('BLOCK');
    expect(blocked.entryPaise).toBeNull();
    expect(blocked.sizeBps).toBeNull();
    expect(make({ candidate: candidate('sell'), answer: deny }).action).toBe('HOLD');
    expect(make({ candidate: candidate('sell') }).action).toBe('EXIT');
  });

  it('sizes by state and shrinks a resize by its factor', () => {
    const yellow = make({ answer: answer({ stateCode: 'YELLOW' }) });
    expect(yellow.sizeBps).toBe(250);
    const shrunk = make({
      answer: answer({ decision: 'resize', sizeMultiplier: 0.5, stateCode: 'YELLOW' }),
    });
    expect(shrunk.sizeBps).toBe(125);
  });

  it('carries the hypothesis id and evidence tag in its label, and the hash of the rules it used', () => {
    const t = make();
    expect(t.label).toBe('Experimental arm output · H-21 · [M]');
    expect(t.rulesHash).toBe(ticketRulesHash(TICKET_RULES_PROPOSED));
    expect(ticketRulesHash({ ...TICKET_RULES_PROPOSED, stopMilli: 1100 })).not.toBe(t.rulesHash);
  });

  it('never uses buy, sell or advice wording in any text it produces', () => {
    const banned = /\b(buy|sell|strong|accumulate|recommend\w*|advice|should)\b/i;
    const tickets = [
      make(),
      make({ rules: { ...TICKET_RULES_PROPOSED, useLimitEntry: true } }),
      make({ answer: answer({ decision: 'deny', stateCode: 'RED' }) }),
      make({ candidate: candidate('sell') }),
      make({ candidate: candidate('sell'), answer: answer({ decision: 'deny' }) }),
    ];
    for (const t of tickets) {
      for (const text of [t.action, t.label]) expect(text).not.toMatch(banned);
    }
  });

  it('refuses an ATR of zero or less', () => {
    expect(() => make({ market: { previousClosePaise: 100_000, atr14Paise: 0 } })).toThrow(
      RangeError,
    );
  });
});
