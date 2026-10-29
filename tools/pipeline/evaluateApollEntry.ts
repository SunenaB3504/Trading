/**
 * tools/pipeline/evaluateApollEntry.ts
 * Evaluates the daily astrological muhurtha, Tara Bala, and entry windows
 * for APL APOLLO TUBES (Janma Nakshatra: Pushya / പൂയം).
 */

import { calculateTransitPositions, calculateTransitSigns } from '../../packages/simulator/src/core/astro/ephemeris';
import { calculateTaraBala } from '../../packages/simulator/src/core/astro/taraBala';
import { NAKSHATRAS, SIGN_NAMES, MALAYALAM_SIGN_NAMES } from '../../packages/simulator/src/core/astro/constants';

const JANMA_NAK_INDEX = 7; // Pushya / പൂയം (Cancer / കർക്കടകം)
const NATAL_MOON_SIGN = 3; // Cancer / കർക്കടകം

const TARA_NAMES_ML: Record<number, string> = {
  1: 'ജന്മ താര (Janma - മിശ്രം / ശ്രദ്ധിക്കുക)',
  2: 'സമ്പത്ത് താര (Sampat - അതിശ്രേഷ്ഠം / ധനലാഭം)',
  3: 'വിപത്ത് താര (Vipat - ഒഴിവാക്കുക)',
  4: 'ക്ഷേമ താര (Kshema - അതിശ്രേഷ്ഠം / സുരക്ഷിതം)',
  5: 'പ്രത്യക്ക് താര (Pratyak - തടസ്സങ്ങൾ)',
  6: 'സാധന താര (Sadhana - ലക്ഷ്യപ്രാപ്തി / വിജയം)',
  7: 'നൈധന താര (Naidhana/Vadha - പൂർണ്ണമായും ഒഴിവാക്കുക)',
  8: 'മിത്ര താര (Mitra - അനുകൂലം / സൗഹൃദം)',
  9: 'പരമ മിത്ര താര (Param Mitra - പരമശ്രേഷ്ഠം)',
};

const DAY_NAMES: readonly string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_ML: readonly string[] = ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'];

function main() {
  const dates = [
    '2026-10-29', // Thursday (Today)
    '2026-10-30', // Friday
    '2026-11-02', // Monday
    '2026-11-03', // Tuesday
    '2026-11-04', // Wednesday
    '2026-11-05', // Thursday
    '2026-11-06', // Friday
    '2026-11-09', // Monday
    '2026-11-10', // Tuesday
    '2026-11-11', // Wednesday
  ];

  console.log('=== APL APOLLO ENTRY CALENDAR (Pushya / പൂയം) ===\n');

  dates.forEach((d) => {
    const dt = new Date(`${d}T12:00:00+05:30`);
    const dayOfWeek = dt.getDay();
    const dayName = DAY_NAMES[dayOfWeek];
    const dayNameMl = DAY_NAMES_ML[dayOfWeek];

    const pos = calculateTransitPositions(d);
    const signs = calculateTransitSigns(d);

    const transitNakIdx = pos.moon.nakshatraIndex;
    const transitNakName = NAKSHATRAS[transitNakIdx] ?? 'Unknown';
    const moonSignIdx = signs.moon;
    const moonSignName = SIGN_NAMES[moonSignIdx];
    const moonSignMl = MALAYALAM_SIGN_NAMES[moonSignIdx];

    const tara = calculateTaraBala(JANMA_NAK_INDEX, transitNakIdx);
    const taraNumber = tara.taraNumber;
    const taraDescMl = TARA_NAMES_ML[taraNumber] ?? tara.taraName;

    // Chandrashtama is when Moon transits 8th house from Cancer (Aquarius / കുംഭം, index 10)
    const isChandrashtama = moonSignIdx === 10;

    let verdict = 'NEUTRAL';
    let verdictMl = 'സാധാരണം';
    let stars = '⭐';

    if (isChandrashtama || taraNumber === 7 || taraNumber === 3 || taraNumber === 5) {
      verdict = 'AVOID';
      verdictMl = 'ഒഴിവാക്കുക';
      stars = '❌';
    } else if (taraNumber === 2 || taraNumber === 9) {
      verdict = 'EXCELLENT';
      verdictMl = 'അത്യുത്തമം';
      stars = '⭐⭐⭐⭐⭐';
    } else if (taraNumber === 4 || taraNumber === 6 || taraNumber === 8) {
      verdict = 'GOOD';
      verdictMl = 'അനുകൂലം';
      stars = '⭐⭐⭐⭐';
    }

    console.log(
      `${d} (${dayName.slice(0, 3)} / ${dayNameMl})`.padEnd(20),
      `| ചന്ദ്രൻ: ${transitNakName} (${moonSignMl})`.padEnd(35),
      `| ${taraDescMl}`.padEnd(50),
      `| ${stars} ${verdictMl}`
    );
  });
}

main();
