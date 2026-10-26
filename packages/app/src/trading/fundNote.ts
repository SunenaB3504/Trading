import type { FundTxn } from '@trading/core';
import { formatPaise } from '../format/rupees';
import { navText, unitsText } from './fundSession';

/** The lines of a fund contract note: what was bought or sold, at which NAV, and every charge. */
export function fundNoteLines(t: FundTxn, name: string): Array<[string, string]> {
  if (t.status !== 'done') return [['Fund', name], ['Status', t.status]];
  const head: Array<[string, string]> = [
    ['Fund', name],
    ['NAV date', t.navDate ?? ''],
    ['NAV per unit', navText(t.navE4 ?? 0)],
    [t.action === 'purchase' ? 'Units allotted' : 'Units sold', unitsText(t.unitsMilli)],
  ];
  if (t.action === 'purchase')
    return [
      ...head,
      ['Amount paid', formatPaise(t.amountPaise)],
      ['of which stamp duty', formatPaise(t.stampPaise)],
      ['Invested', formatPaise(t.amountPaise - t.stampPaise)],
    ];
  return [
    ...head,
    ['Value of units', formatPaise(t.amountPaise)],
    ['Exit load', formatPaise(t.exitLoadPaise)],
    ['STT', formatPaise(t.sttPaise)],
    ['Cash received', formatPaise(t.cashPaise)],
    ['Gain before charges', formatPaise(t.gainPaise)],
  ];
}
