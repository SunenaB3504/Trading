import { MoneyError } from './errors';
import { assertPaise } from './paise';

const DECIMAL = /^(-?)(\d{1,15})(?:\.(\d+))?$/;

/**
 * Parses a plain decimal rupee string such as `"1234.5"` into integer paise, exactly.
 * More than two decimal places are accepted only when the extra digits are zeros.
 * No locale, no thousands separators, no floats.
 */
export function parsePaise(text: string): number {
  const m = DECIMAL.exec(text.trim());
  if (!m) throw new MoneyError(`not a decimal amount: "${text}"`);
  const [, sign, whole, fraction = ''] = m;
  if (/[1-9]/.test(fraction.slice(2))) {
    throw new MoneyError(`more than two decimal places: "${text}"`);
  }
  const paise = Number(whole) * 100 + Number(fraction.slice(0, 2).padEnd(2, '0'));
  return assertPaise(sign === '-' ? -paise : paise, 'parsed amount');
}

/** Formats integer paise as a plain decimal string with exactly two places, e.g. `-1234.50`. */
export function formatPaise(paise: number): string {
  assertPaise(paise);
  const magnitude = Math.abs(paise);
  const rupees = Math.floor(magnitude / 100);
  const rest = String(magnitude - rupees * 100).padStart(2, '0');
  return `${paise < 0 ? '-' : ''}${String(rupees)}.${rest}`;
}
