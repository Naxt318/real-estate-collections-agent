// Amounts arrive from the backend as decimal strings (Prisma Decimal). The
// frontend only formats them: it never converts to a JavaScript number and
// never rounds, so no precision is lost (CLAUDE.md §7).
const AMOUNT_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** Groups digits the Indian way: last three, then pairs (12,34,56,789). */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ',');
  return `${rest},${lastThree}`;
}

/** Shown in place of an amount that can't be formatted. */
export const INVALID_AMOUNT = '—';

/**
 * Formats a decimal string as Indian rupees, e.g. "1250000.5" → "₹12,50,000.50".
 *
 * Anything that is not a plain decimal with at most two places is shown as "—"
 * and logged, so one bad value never takes down a whole page. It is never
 * rounded or guessed at.
 */
export function formatInr(amount: string): string {
  const match = AMOUNT_PATTERN.exec(amount);
  if (!match) {
    console.warn(`formatInr: Invalid amount ${JSON.stringify(amount)}`);
    return INVALID_AMOUNT;
  }
  const [, sign = '', whole = '0', fraction = ''] = match;
  const rupees = groupIndian(whole.replace(/^0+(?=\d)/, ''));
  const paise = fraction.padEnd(2, '0');
  const isZero = /^0+$/.test(whole) && /^0*$/.test(fraction);
  return `${isZero ? '' : sign}₹${rupees}.${paise}`;
}
