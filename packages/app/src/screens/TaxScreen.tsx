import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TAX_FACTS, TAX_FACTS_AS_OF, taxReport, taxYears } from '@trading/core';
import type { TaxReport, TaxTrade } from '@trading/core';
import { fnoDataOf, listFno } from '../fno/fnoSessions';
import { formatPaise } from '../format/rupees';
import { fnoTaxTrades, shareTaxTrades } from '../tax/taxSources';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section } from '../ui/Section';
import { Choice, Field } from './TradeScreen';

/** Practice-book trades and F&O session fills as tax lines. */
async function loadLines(kv: KeyValueStore, now: () => number, market: Market, real: Market | null): Promise<TaxTrade[]> {
  const session = await PaperSession.open(kv, now, market);
  const lines = shareTaxTrades(session.closedTrades(), market);
  const data = fnoDataOf(real);
  if (data === null) return lines;
  return [...lines, ...(await listFno(kv)).flatMap((s) => fnoTaxTrades(s, data))];
}

const rupeesToPaise = (text: string): number => Math.max(0, Math.round((Number(text) || 0) * 100));

function Gains({ r }: { r: TaxReport }) {
  return (
    <Section title="Capital gains on shares and equity ETFs">
      <View testID="tax-gains">
        <Row label="Short-term gains (held 12 months or less)" value={formatPaise(r.stcgPaise)} />
        <Row label="Long-term gains (held over 12 months)" value={formatPaise(r.ltcgPaise)} />
        <Row label="Short-term after losses are set off" value={formatPaise(r.stcgAfterSetOffPaise)} />
        <Row label="Long-term after losses are set off" value={formatPaise(r.ltcgAfterSetOffPaise)} />
        <Row label="Long-term exempt (first ₹1,25,000)" value={formatPaise(r.ltcgExemptPaise)} />
        <Row label={`Short-term tax at ${String(TAX_FACTS.stcgBps / 100)}%`} value={formatPaise(r.stcgTaxPaise)} />
        <Row label={`Long-term tax at ${String(TAX_FACTS.ltcgBps / 100)}%`} value={formatPaise(r.ltcgTaxPaise)} />
        <Row label={`Cess at ${String(TAX_FACTS.cessBps / 100)}%`} value={formatPaise(r.cessPaise)} />
        <Row label="Capital gains tax (indicative)" value={formatPaise(r.capitalGainsTaxPaise)} />
        <Row label="Losses to carry forward: short-term and long-term" value={`${formatPaise(r.carryShortTermPaise)} and ${formatPaise(r.carryLongTermPaise)}`} />
      </View>
    </Section>
  );
}

function Business({ r }: { r: TaxReport }) {
  return (
    <Section title="Income taxed at your slab rate (not worked out here)">
      <View testID="tax-business">
        <Row label="Same-day share trades (speculative business income)" value={formatPaise(r.speculativePaise)} />
        <Row label="Futures and options (non-speculative business income, after charges)" value={formatPaise(r.businessPaise)} />
        <Row label="Gold and liquid ETFs (taxed at the slab rate)" value={formatPaise(r.slabGainPaise)} />
        <Row label="STT estimated on share trades" value={formatPaise(r.sttPaise)} />
        <Row label="All charges on these trades" value={formatPaise(r.chargesPaise)} />
      </View>
    </Section>
  );
}

/** Practise, Tax (SSD v4.1 §6.5): the practice trades of one financial year, with the capital gains tax worked out. */
export function TaxScreen({ kv, now, market, real }: { kv: KeyValueStore; now: () => number; market: Market; real: Market | null }) {
  const [lines, setLines] = useState<TaxTrade[] | null>(null);
  const [year, setYear] = useState('');
  const [stLoss, setStLoss] = useState('0');
  const [ltLoss, setLtLoss] = useState('0');
  useEffect(() => {
    void loadLines(kv, now, market, real).then(setLines);
  }, [kv, now, market, real]);
  const years = useMemo(() => taxYears(lines ?? []), [lines]);
  const chosen = years.includes(year) ? year : (years[0] ?? '');
  const report = useMemo(
    () => (chosen === '' ? null : taxReport(lines ?? [], chosen, { shortTermPaise: rupeesToPaise(stLoss), longTermPaise: rupeesToPaise(ltLoss) })),
    [lines, chosen, stLoss, ltLoss],
  );
  return (
    <ScrollView contentContainerStyle={styles.page} testID="tax-screen">
      <CoachHint screen="tax" />
      <Note>{`Rates as of ${TAX_FACTS_AS_OF}. This is an indication for learning, not tax advice. Practice trades are not real income.`}</Note>
      {lines === null ? <Note>Loading your trades…</Note> : null}
      {lines !== null && report === null ? <Note>No closed trades yet. Sell something in Trade, or close an F&O position, and the financial year appears here.</Note> : null}
      {report !== null ? (
        <>
          <Choice label="Financial year (April to March)" value={chosen} options={years} onChange={setYear} testID="tax-year" labels={Object.fromEntries(years.map((y) => [y, `FY ${y}`]))} />
          <Note>{`${String(report.trades)} closed trade(s) in FY ${report.year}.`}</Note>
          <Field label="Short-term losses brought forward (₹)" value={stLoss} onChange={setStLoss} testID="tax-bf-st" keyboard="numeric" />
          <Field label="Long-term losses brought forward (₹)" value={ltLoss} onChange={setLtLoss} testID="tax-bf-lt" keyboard="numeric" />
          <Gains r={report} />
          <Business r={report} />
          <Note>A short-term loss sets off short-term and long-term gains. A long-term loss sets off only long-term gains. Unused losses carry forward for 8 years if the return is filed on time. STT is not deducted from capital gains. Mutual fund trades and corporate actions are not included.</Note>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
