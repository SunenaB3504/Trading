import * as Font from 'expo-font';
import type { Fonts } from '../ui/typography';
import devanagariBold from '../../assets/fonts/NotoSansDevanagari-Bold.ttf';
import devanagariRegular from '../../assets/fonts/NotoSansDevanagari-Regular.ttf';
import latinBold from '../../assets/fonts/NotoSans-Bold.ttf';
import latinRegular from '../../assets/fonts/NotoSans-Regular.ttf';
import malayalamBold from '../../assets/fonts/NotoSansMalayalam-Bold.ttf';
import malayalamRegular from '../../assets/fonts/NotoSansMalayalam-Regular.ttf';
import type { Lang } from './i18n';

/**
 * The Profile tab is set in Google Noto Sans (T24): Noto Sans for Latin text and Noto Sans Malayalam for
 * Malayalam. The files are subsets of the official fonts (SIL Open Font License; the licence files sit
 * beside them), shipped inside the app and never fetched from a font server. This module lives in the gated
 * folder, so a locked device never loads it, and the Malayalam and Devanagari files load only when that language is chosen.
 */
const LATIN = { 'NotoSans-Regular': latinRegular, 'NotoSans-Bold': latinBold };
const MALAYALAM = {
  'NotoSansMalayalam-Regular': malayalamRegular,
  'NotoSansMalayalam-Bold': malayalamBold,
};

const DEVANAGARI = {
  'NotoSansDevanagari-Regular': devanagariRegular,
  'NotoSansDevanagari-Bold': devanagariBold,
};

/** The font families to use for a language: its own script first, Noto Sans after it for Latin letters and digits. */
export function familiesFor(lang: Lang): Fonts {
  if (lang === 'ml')
    return {
      regular: 'NotoSansMalayalam-Regular, NotoSans-Regular',
      bold: 'NotoSansMalayalam-Bold, NotoSans-Bold',
    };
  if (lang === 'hi')
    return {
      regular: 'NotoSansDevanagari-Regular, NotoSans-Regular',
      bold: 'NotoSansDevanagari-Bold, NotoSans-Bold',
    };
  return { regular: 'NotoSans-Regular', bold: 'NotoSans-Bold' };
}

/** Loads what a language needs; asking again for fonts already loaded does nothing. */
export async function loadFonts(lang: Lang): Promise<void> {
  const own = lang === 'ml' ? MALAYALAM : lang === 'hi' ? DEVANAGARI : {};
  await Font.loadAsync({ ...LATIN, ...own });
}
