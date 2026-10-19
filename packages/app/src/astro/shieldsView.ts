import type { Banner, StockTara } from '@trading/astro-engine';

/** Plain-language wording for the two personal shields (FR-P6, FR-P7). No percentage, score or advice (D29, D30). */
export interface Line {
  label: string;
  value: string;
}

export interface BannerView {
  headline: string;
  lines: Line[];
  /** The hypothesis tag and the plain statement that this is not advice. */
  footnote: string;
}

const IST_OFFSET_MS = 19_800_000;

/** A UTC instant as Indian Standard Time, to the minute. */
export function istText(utcMs: number): string {
  return `${new Date(utcMs + IST_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ')} IST`;
}

export function bannerView(b: Banner): BannerView {
  const lines: Line[] = [];
  if (b.active !== null) {
    lines.push({ label: 'Started', value: istText(b.active.startMs) });
    lines.push({ label: 'Ends', value: istText(b.active.endMs) });
  }
  if (b.next !== null) {
    lines.push({ label: 'Next window starts', value: istText(b.next.startMs) });
    lines.push({ label: 'Next window ends', value: istText(b.next.endMs) });
  }
  return {
    headline:
      b.active !== null ? 'Chandrashtama is running now' : 'Chandrashtama is not running now',
    lines,
    footnote: `${b.tag} The Moon is in the 8th sign from your birth Moon sign. This is information only, not advice.`,
  };
}

export interface TaraView {
  headline: string;
  lines: Line[];
  warning: string | null;
  footnote: string;
}

export function taraView(r: StockTara): TaraView {
  const { tara, stock } = r;
  return {
    headline: `${tara.name} (${tara.group} group)`,
    lines: [
      { label: "Stock's birth star", value: `${stock.nakshatraName}, pada ${stock.pada}` },
      { label: 'Count from your star', value: `${tara.count} (class ${tara.number} of 9)` },
    ],
    warning: r.timeAssumed
      ? "The exchange gave no first-trade time, so the stock's star rests on an assumed time and may be wrong."
      : null,
    footnote: `${r.tag} A classical rule, not yet checked against the source text. A category name only, with no score and no advice.`,
  };
}
