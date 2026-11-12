import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatInr } from './format-money';

describe('formatInr', () => {
  it('formats a whole amount with Indian digit grouping and two decimals', () => {
    expect(formatInr('1250000')).toBe('₹12,50,000.00');
  });

  it('keeps the paise exactly as given', () => {
    expect(formatInr('1250000.5')).toBe('₹12,50,000.50');
    expect(formatInr('99.05')).toBe('₹99.05');
  });

  it('does not group amounts below one thousand', () => {
    expect(formatInr('0')).toBe('₹0.00');
    expect(formatInr('999')).toBe('₹999.00');
  });

  it('groups thousands, lakhs and crores', () => {
    expect(formatInr('1000')).toBe('₹1,000.00');
    expect(formatInr('100000')).toBe('₹1,00,000.00');
    expect(formatInr('10000000')).toBe('₹1,00,00,000.00');
  });

  it('puts the minus sign before the rupee symbol', () => {
    expect(formatInr('-1500.25')).toBe('-₹1,500.25');
  });

  it('keeps every digit of amounts too large for a JavaScript number', () => {
    expect(formatInr('123456789012345678.99')).toBe('₹1,23,45,67,89,01,23,45,678.99');
  });

  it('strips leading zeros', () => {
    expect(formatInr('0001000')).toBe('₹1,000.00');
  });

  it('drops the sign of negative zero', () => {
    expect(formatInr('-0')).toBe('₹0.00');
    expect(formatInr('-0.00')).toBe('₹0.00');
  });

  describe('with a value it cannot format', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it.each(['', 'abc', '1,000', '1250.125', '1e+21', ' 100', '.5', '5.', '--1'])(
      'shows a dash for %j instead of throwing or guessing',
      (input) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(formatInr(input)).toBe('—');
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid amount'));
      },
    );
  });
});
