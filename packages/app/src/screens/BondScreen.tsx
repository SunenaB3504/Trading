import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { bondProblem, currentYield, macaulay, modified, priceFromYield, shock, yieldFromPrice } from '@trading/core';
import type { Bond } from '@trading/core';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { Choice, Field } from './TradeScreen';

const rupees = (x: number): string => `₹${x.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (x: number, digits = 2): string => `${(x * 100).toFixed(digits)}%`;

export interface BondInputs {
  face: string;
  coupon: string;
  years: string;
  frequency: '1' | '2';
  mode: 'yield' | 'price';
  value: string;
}

export interface BondView {
  problem: string | null;
  price: number;
  ytm: number;
  current: number;
  macaulay: number;
  modified: number;
  up: ReturnType<typeof shock>;
  down: ReturnType<typeof shock>;
}

/** Works the bond out from either its yearly yield or its price; a problem in words when the inputs do not make a bond. */
export function bondView(i: BondInputs): BondView | string {
  const b: Bond = { face: Number(i.face), coupon: Number(i.coupon) / 100, years: Number(i.years), frequency: i.frequency === '2' ? 2 : 1 };
  const problem = bondProblem(b);
  if (problem !== null) return problem;
  const v = Number(i.value);
  if (!(v > 0)) return i.mode === 'yield' ? 'Enter a yearly yield above zero.' : 'Enter a price above zero.';
  const ytm = i.mode === 'yield' ? v / 100 : yieldFromPrice(b, v);
  if (ytm === null) return 'No yield between 0.01% and 100% gives that price.';
  const price = i.mode === 'yield' ? priceFromYield(b, ytm) : v;
  return { problem: null, price, ytm, current: currentYield(b, price), macaulay: macaulay(b, ytm), modified: modified(b, ytm), up: shock(b, ytm, 0.01), down: shock(b, ytm, -0.01) };
}

/** Practise, Bonds (MIP Stage 9): price from yield, yield from price, duration and what a change in yield does. */
export function BondScreen() {
  const [i, setI] = useState<BondInputs>({ face: '100', coupon: '7', years: '10', frequency: '1', mode: 'yield', value: '8' });
  const set = (k: keyof BondInputs) => (v: string) => setI({ ...i, [k]: v });
  const out = bondView(i);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="bond-screen">
      <CoachHint screen="bonds" />
      <Section title="The bond">
        <Field label="Face value (₹)" value={i.face} onChange={set('face')} testID="bond-face" keyboard="decimal-pad" />
        <Field label="Coupon rate (% a year)" value={i.coupon} onChange={set('coupon')} testID="bond-coupon" keyboard="decimal-pad" />
        <Field label="Years left to maturity" value={i.years} onChange={set('years')} testID="bond-years" keyboard="decimal-pad" />
        <Choice label="Coupons a year" value={i.frequency} options={['1', '2'] as const} labels={{ '1': 'Once', '2': 'Twice' }} onChange={(frequency) => setI({ ...i, frequency })} testID="bond-frequency" />
        <Choice label="Work out" value={i.mode} options={['yield', 'price'] as const} labels={{ yield: 'Price from a yield', price: 'Yield from a price' }} onChange={(mode) => setI({ ...i, mode, value: mode === 'yield' ? '8' : '93.29' })} testID="bond-mode" />
        <Field label={i.mode === 'yield' ? 'Yield you want (% a year)' : 'Price you would pay (₹)'} value={i.value} onChange={set('value')} testID="bond-value" keyboard="decimal-pad" />
      </Section>
      {typeof out === 'string' ? <Note>{out}</Note> : (
        <Section title="Result">
          <View testID="bond-result">
            <Row label="Price" value={rupees(out.price)} />
            <Row label="Yield to maturity" value={pct(out.ytm)} />
            <Row label="Current yield (coupon over price)" value={pct(out.current)} />
            <Row label="Duration (average years to the cash)" value={`${out.macaulay.toFixed(2)} years`} />
            <Row label="Modified duration" value={out.modified.toFixed(2)} />
            <Row label="If yields rise 1 point: price" value={`${rupees(out.up.price)} (${pct(out.up.exact)})`} />
            <Row label="If yields fall 1 point: price" value={`${rupees(out.down.price)} (+${pct(out.down.exact)})`} />
            <Row label="Duration alone would say, for a 1 point rise" value={pct(out.up.estimated)} />
          </View>
          <Note>Worked on a coupon date, with no accrued interest, no tax and no dealing costs. Real bond prices on an exchange differ.</Note>
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center', backgroundColor: colors.background },
});
