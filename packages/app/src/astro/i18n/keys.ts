/**
 * Every piece of text the Profile tab shows, in English. This table is the single source of truth: another
 * language must supply every key (the compiler enforces it) and keep the same {placeholders} (a test
 * enforces it). Sentences are whole strings, never joined from fragments, because word order differs
 * between languages. Tags such as "[H] PH-11" and dates, times and numbers are not translated.
 */
export const EN = {
  'lang.label': 'Language',
  'draft.note': 'This translation is a draft and has not been reviewed yet.',

  'protection.title': 'Protection',
  'protection.notice':
    "Your birth details are encrypted on this device, but on the web the key is kept in this browser, so anyone who can use this browser profile may be able to read them. The Android app keeps the key in the phone's secure storage, which is stronger.",

  'screen.loading': 'Loading...',
  'screen.locked': 'This optional layer is not unlocked on this device.',

  'form.title': 'Your birth details',
  'form.name': 'Name',
  'form.date': 'Birth date (YYYY-MM-DD)',
  'form.time': 'Birth time, local clock (HH:MM, 24-hour)',
  'form.save': 'Save details',
  'form.needPlace': 'Search for your birth place and pick it from the list.',
  'form.placeMissing': 'That place is not in the offline list. Search again.',
  'form.error': 'Something went wrong.',
  'form.badFormat': 'Enter the date as YYYY-MM-DD and the time as HH:MM.',
  'form.notReal': 'Not a real date and time: {date} {time}',

  'place.label': 'Birth place (search, for example Mumbai or Hyderabad, IN)',
  'place.credit':
    'Place names are from GeoNames (geonames.org), licensed CC BY 4.0, and work offline.',

  'gender.label': 'Gender (optional)',
  'gender.female': 'Female',
  'gender.male': 'Male',
  'gender.other': 'Other',
  'gender.none': 'Prefer not to say',
  'gender.note': 'Stored encrypted with the rest. No calculation uses it yet.',

  'star.label': 'Your birth star, if you know it (Nakshatram, optional)',
  'star.note':
    'If you give it, we check it against the star worked out from your birth details; a difference usually means the birth time or place is off.',

  'facts.title': 'Your chart facts',
  'facts.note':
    'Calculated on this device from your saved birth details. Nothing was sent anywhere.',

  'row.lagna': 'Rising sign (Lagna)',
  'row.moon': 'Moon sign (Rashi)',
  'row.star': 'Birth star (Nakshatra)',
  'row.typedStar': 'Typed-in birth star',
  'row.dasha': 'Running period (Dasha)',
  'row.bhukti': 'Sub-period (Bhukti)',
  'row.noPeriod': 'Running period',
  'row.indu': 'Indu Lagna',
  'row.place': 'Birth place used',
  'row.clock': 'Clock time used',

  'val.starPada': '{name}, pada {pada}',
  'val.noPeriod': 'none on this date (before birth or past the 120-year cycle)',
  'val.period': '{lord}, {start} to {end}',
  'val.indu': 'pending verification',
  'val.place': '{name}, {country} ({lat}°, {lon}°)',
  'val.clock': '{utc} UTC, from {zone} at {offset}',
  'val.typedMatches': '{name} (matches)',
  'val.typedDiffers': '{name} (differs)',
  'val.typedUnknown': '{name} (not recognised)',

  'warn.twice':
    'The clocks showed this time twice that day. The first one was used; check your birth time.',
  'warn.skipped': 'The clocks skipped this time that day. Check your birth time.',
  'warn.fragile':
    'The ascendant or Moon is very close to a sign boundary, so a small error in the birth time could change the sign.',
  'warn.starDiffers':
    'You gave {typed} as your birth star, but these birth details give {computed}. The birth time or place may be off; check them.',
  'warn.starUnknown':
    'We could not recognise "{typed}" as a birth star, so it was not compared. Pick a name from the suggestions.',

  'delete.title': 'Delete',
  'delete.button': 'Delete my birth details',
  'delete.confirm': 'Press again to delete your birth details for good',
  'delete.note': 'Deleting also destroys the key, so the saved copy cannot be read again.',

  'bad.title': 'Saved details cannot be read',
  'bad.note':
    'The saved details cannot be read on this device (the key is missing or the data was changed). Delete them and enter them again.',
  'bad.button': 'Delete the unreadable details',

  'cs.title': 'Chandrashtama',
  'cs.running': 'Chandrashtama is running now',
  'cs.notRunning': 'Chandrashtama is not running now',
  'cs.started': 'Started',
  'cs.ends': 'Ends',
  'cs.nextStarts': 'Next window starts',
  'cs.nextEnds': 'Next window ends',
  'cs.foot':
    'The Moon is in the 8th sign from your birth Moon sign. This is information only, not advice.',

  'tara.title': 'Tara Bala for a stock',
  'tara.intro':
    "Enter the stock's first-trade date and time from the exchange record. The count runs from your birth star to the stock's.",
  'tara.date': 'First-trade date (YYYY-MM-DD)',
  'tara.time': 'First-trade time, IST (HH:MM)',
  'tara.assumed': 'The exchange gave no time, so this time is assumed',
  'tara.run': 'Check Tara',
  'tara.badFormat': 'Enter the date as YYYY-MM-DD and the time as HH:MM (IST).',
  'tara.notReal': 'That is not a real date and time.',
  'tara.headline': '{name} ({group})',
  'tara.group.good': 'good group',
  'tara.group.bad': 'bad group',
  'tara.group.mixed': 'mixed group',
  'tara.star': "Stock's birth star",
  'tara.count': 'Count from your star',
  'tara.countValue': '{count} (class {number} of 9)',
  'tara.warn':
    "The exchange gave no first-trade time, so the stock's star rests on an assumed time and may be wrong.",
  'tara.foot':
    'A classical rule, not yet checked against the source text. A category name only, with no score and no advice.',
} as const;

export type TextKey = keyof typeof EN;
