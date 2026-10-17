/**
 * Rupees from integer paise with Indian digit grouping (12,34,567.89). Integer arithmetic only: no
 * Intl and no floating point, so the text is the same on every engine.
 */
export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise)) throw new RangeError('paise must be a safe integer');
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}₹${groupIndian(String(whole))}.${fraction}`;
}

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  const parts: string[] = [];
  for (let end = head.length; end > 0; end -= 2)
    parts.unshift(head.slice(Math.max(0, end - 2), end));
  return `${parts.join(',')},${tail}`;
}

/** A ratio as a percentage with one decimal place, or an en dash when it is not defined. */
export function formatPercent(ratio: number | null): string {
  if (ratio === null) return '–';
  const tenths = Math.round(ratio * 1000);
  const sign = tenths < 0 ? '-' : '';
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10}%`;
}
