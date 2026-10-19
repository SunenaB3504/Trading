import { TICKET_RULES_PROPOSED, buildTicket } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { toTicketView } from './ticketView';

const base = {
  candidate: { instrumentId: 'AAA', date: '2026-03-02', side: 'buy' as const, quantity: 10 },
  answer: {
    decision: 'allow' as const,
    reasonCode: 'H21-TARA-FAVOURABLE',
    stateCode: 'GREEN' as const,
    featuresHash: 'f'.repeat(64),
  },
  market: { previousClosePaise: 100_000, atr14Paise: 2_000 },
  rules: TICKET_RULES_PROPOSED,
  hypothesisId: 'H-21',
  evidenceTag: '[M]',
};

describe('the ticket view', () => {
  it('shows the label with the hypothesis id and the registered numbers in rupees', () => {
    const v = toTicketView(buildTicket(base));
    expect(v.label).toBe('Experimental arm output · H-21 · [M]');
    expect(v.headline).toBe('ENTER · AAA · 2026-03-02');
    const row = (l: string) => v.rows.find((r) => r.label === l)?.value;
    expect(row('Target 1')).toBe('₹1,030.00');
    expect(row('Initial stop')).toBe('₹980.00');
    expect(row('Reward to risk on target 1')).toBe('1.5 : 1');
    expect(row('Size')).toBe('5% of the book');
  });

  it('shows no prices for a blocked candidate', () => {
    const v = toTicketView(
      buildTicket({ ...base, answer: { ...base.answer, decision: 'deny', stateCode: 'RED' } }),
    );
    expect(v.headline.startsWith('BLOCK')).toBe(true);
    expect(v.rows.some((r) => r.label === 'Target 1')).toBe(false);
  });

  it('uses no buy, sell or advice wording anywhere on the screen text', () => {
    const banned = /\b(buy|sell|strong|accumulate|recommend\w*|should)\b/i;
    for (const t of [base, { ...base, candidate: { ...base.candidate, side: 'sell' as const } }]) {
      const v = toTicketView(buildTicket(t));
      const all = [
        v.label,
        v.headline,
        v.footnote,
        ...v.rows.flatMap((r) => [r.label, r.value]),
      ].join(' ');
      expect(all).not.toMatch(banned);
    }
  });
});
