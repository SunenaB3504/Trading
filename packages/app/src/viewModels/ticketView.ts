import type { Ticket } from '@trading/core';
import { formatPaise } from '../format/rupees';
import type { LedgerRow } from './ledgerView';

/** The read-only experimental arm ticket (SSD §5.9), already formatted. No buy or sell wording, no advice. */
export interface TicketView {
  label: string;
  headline: string;
  rows: LedgerRow[];
  footnote: string;
}

const money = (p: number | null): string => (p === null ? 'none' : formatPaise(p));
const percent = (bps: number | null): string =>
  bps === null ? 'none' : `${String(bps / 100)}% of the book`;
const ratio = (milli: number | null): string =>
  milli === null ? 'none' : `${(milli / 1000).toFixed(1)} : 1`;

export function toTicketView(t: Ticket): TicketView {
  const placesOrder = t.action === 'ENTER' || t.action === 'ENTER-LIMIT';
  const rows: LedgerRow[] = [
    { label: 'Reason code', value: t.reasonCode },
    ...(t.stateCode === null ? [] : [{ label: 'State', value: t.stateCode }]),
    { label: 'Registered holding horizon', value: `${String(t.horizonSessions)} sessions` },
  ];
  if (placesOrder) {
    rows.push(
      {
        label: t.limitPaise === null ? 'Reference price' : 'Limit price',
        value: money(t.entryPaise),
      },
      { label: 'Target 1', value: money(t.target1Paise) },
      { label: 'Target 2', value: money(t.target2Paise) },
      { label: 'Initial stop', value: money(t.stopPaise) },
      { label: 'Reward to risk on target 1', value: ratio(t.rewardToRiskMilli) },
      {
        label: 'Time stop',
        value: `${String(t.timeStopSessions ?? 0)} sessions without reaching target 1`,
      },
      { label: 'Size', value: percent(t.sizeBps) },
    );
  }
  return {
    label: t.label,
    headline: `${t.action} · ${t.instrumentId} · ${t.date}`,
    rows,
    footnote:
      'Read-only output of a frozen experiment, shown with its hypothesis ID. Not advice, not a forecast; the numbers are the arm’s registered rules.',
  };
}
