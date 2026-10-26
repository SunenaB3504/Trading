/**
 * packages/simulator/src/core/ai/glossaryMapping.ts
 * Bilingual (English/Malayalam/Sanskrit) Astro-Financial Glossary Mapping.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

export interface GlossaryTerm {
  term: string;
  sanskrit: string;
  malayalam: string;
  category: 'chronometry' | 'chakra' | 'financial' | 'risk';
  definitionEnglish: string;
  definitionMalayalam: string;
}

export const ASTRO_FINANCIAL_GLOSSARY: readonly GlossaryTerm[] = [
  {
    term: 'Mahadasha',
    sanskrit: 'महादशा',
    malayalam: 'മഹാദശ',
    category: 'chronometry',
    definitionEnglish: 'Primary planetary major cycle (6 to 20 years) establishing macroeconomic regime.',
    definitionMalayalam: 'മാക്രോ ഇക്കണോമിക് സാഹചര്യം നിശ്ചയിക്കുന്ന പ്രധാന ഗ്രഹ ദശാകാലം.',
  },
  {
    term: 'Antardasha',
    sanskrit: 'अन्तर्दशा',
    malayalam: 'അപഹാരം / അന്തർദശ',
    category: 'chronometry',
    definitionEnglish: 'Secondary planetary cycle governing multi-quarter operational business trends.',
    definitionMalayalam: 'ത്രൈമാസ ബിസിനസ്സ് പ്രവണതകളെ നിർണ്ണയിക്കുന്ന ഉപ-ദശാകാലം.',
  },
  {
    term: 'Pratyantardasha',
    sanskrit: 'प्रत्यन्तर्दशा',
    malayalam: 'പ്രത്യന്തർദശ',
    category: 'chronometry',
    definitionEnglish: 'Tertiary cycle defining tactical multi-week timing execution windows.',
    definitionMalayalam: 'ആഴ്ചകളിലെ കൃത്യമായ ട്രേഡിംഗ് വിൻഡോ നിശ്ചയിക്കുന്ന മൂന്നാം നിര ദശ.',
  },
  {
    term: 'Trikona',
    sanskrit: 'त्रिकोण',
    malayalam: 'ത്രികോണം (1, 5, 9 ഭാവങ്ങൾ)',
    category: 'chronometry',
    definitionEnglish: 'Auspicious Lakshmi houses (1st, 5th, 9th) representing capital expansion.',
    definitionMalayalam: 'ധനലാഭവും മൂലധന വളർച്ചയും നൽകുന്ന ശുഭ ഭാവങ്ങൾ (1, 5, 9).',
  },
  {
    term: 'Dusthana',
    sanskrit: 'दुस्थान',
    malayalam: 'ദുരിത ഭാവങ്ങൾ (6, 8, 12)',
    category: 'risk',
    definitionEnglish: 'Adverse risk houses (6th debt/litigation, 8th catastrophe, 12th capital depletion).',
    definitionMalayalam: 'കടം, നഷ്ടം, അപ്രതീക്ഷിത തിരിച്ചടികൾ എന്നിവ സൂചിപ്പിക്കുന്ന ഭാവങ്ങൾ (6, 8, 12).',
  },
  {
    term: 'Viparita Raja Yoga',
    sanskrit: 'विपरीत राजयोग',
    malayalam: 'വിപരീത രാജയോഗം',
    category: 'chronometry',
    definitionEnglish: 'Turnaround scenario where Dusthana lords occupy Dusthana, catalyzing crisis rebounds.',
    definitionMalayalam: 'പ്രതിസന്ധികളിൽ നിന്ന് വൻ ലാഭം നേടുന്ന വിപരീത രാജയോഗ സാഹചര്യം.',
  },
  {
    term: 'Kota Stambha',
    sanskrit: 'कोटा स्तम्भ',
    malayalam: 'കോട്ട സ്തംഭം (പ്രധാന പ്രതിരോധം)',
    category: 'chakra',
    definitionEnglish: 'The central citadel pillar of Kota Chakra; malefic breach triggers emergency exit.',
    definitionMalayalam: 'കോട്ടയുടെ കേന്ദ്ര ഭാഗം; പാപഗ്രഹങ്ങൾ പ്രവേശിച്ചാൽ ഉടൻ എക്സിറ്റ് ചെയ്യണം.',
  },
  {
    term: 'Chandrashtama',
    sanskrit: 'चन्द्राष्टम',
    malayalam: 'ചന്ദ്രാഷ്ടമം (മാനസിക സമ്മർദ്ദം/നഷ്ട സാധ്യത)',
    category: 'risk',
    definitionEnglish: 'Moon transiting 8th from natal Moon; mandatory zero-allocation hard trade stop.',
    definitionMalayalam: 'ജന്മ ചന്ദ്രനിൽ നിന്ന് 8-ാം ഭാവത്തിൽ ചന്ദ്രൻ സഞ്ചരിക്കുന്ന സമയം; ട്രേഡിംഗ് പൂർണ്ണമായി ഒഴിവാക്കുക.',
  },
  {
    term: 'Sarvatobhadra Vedha',
    sanskrit: 'सर्वतोभद्र वेध',
    malayalam: 'സർവ്വതോഭദ്ര വേധം',
    category: 'chakra',
    definitionEnglish: '81-square grid cross-ray aspects impacting ticker consonants and sensitive points.',
    definitionMalayalam: 'കമ്പനിയുടെ പേരിനെയും നക്ഷത്രത്തെയും സ്വാധീനിക്കുന്ന ക്രോസ്-റേ വേധങ്ങൾ.',
  },
] as const;

export function lookupGlossaryTerm(term: string): GlossaryTerm | undefined {
  const norm = term.toLowerCase().replace(/[\s_-]/g, '');
  return ASTRO_FINANCIAL_GLOSSARY.find((g) => g.term.toLowerCase().replace(/[\s_-]/g, '') === norm);
}

export function buildGlossarySystemPromptExcerpt(): string {
  return ASTRO_FINANCIAL_GLOSSARY.map(
    (g) => `- **${g.term}** (${g.sanskrit} / ${g.malayalam}): ${g.definitionEnglish}`
  ).join('\n');
}
