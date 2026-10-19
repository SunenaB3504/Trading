import type { Banner, StockTara } from '@trading/astro-engine';
import { ENGLISH, tr } from './i18n';
import type { Pack, TextKey } from './i18n';

/** Wording for the two personal shields (FR-P6, FR-P7) in the chosen language. No percentage, score or advice (D29, D30). */
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

export function bannerView(b: Banner, pack: Pack = ENGLISH): BannerView {
  const lines: Line[] = [];
  const add = (key: TextKey, ms: number): void => {
    lines.push({ label: tr(pack, key), value: istText(ms) });
  };
  if (b.active !== null) {
    add('cs.started', b.active.startMs);
    add('cs.ends', b.active.endMs);
  }
  if (b.next !== null) {
    add('cs.nextStarts', b.next.startMs);
    add('cs.nextEnds', b.next.endMs);
  }
  return {
    headline: tr(pack, b.active !== null ? 'cs.running' : 'cs.notRunning'),
    lines,
    footnote: `${b.tag} ${tr(pack, 'cs.foot')}`,
  };
}

export interface TaraView {
  headline: string;
  lines: Line[];
  warning: string | null;
  footnote: string;
}

export function taraView(r: StockTara, pack: Pack = ENGLISH): TaraView {
  const { tara, stock } = r;
  return {
    headline: tr(pack, 'tara.headline', {
      name: pack.names.tara[tara.number - 1] ?? tara.name,
      group: tr(pack, `tara.group.${tara.group}` as TextKey),
    }),
    lines: [
      {
        label: tr(pack, 'tara.star'),
        value: tr(pack, 'val.starPada', {
          name: pack.names.stars[stock.nakshatra] ?? stock.nakshatraName,
          pada: stock.pada,
        }),
      },
      {
        label: tr(pack, 'tara.count'),
        value: tr(pack, 'tara.countValue', { count: tara.count, number: tara.number }),
      },
    ],
    warning: r.timeAssumed ? tr(pack, 'tara.warn') : null,
    footnote: `${r.tag} ${tr(pack, 'tara.foot')}`,
  };
}
