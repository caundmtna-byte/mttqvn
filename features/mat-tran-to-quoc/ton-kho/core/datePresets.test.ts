import { describe, expect, it } from 'vitest';
import {
  getDateRangeFromPreset,
  getPresetFromDates,
  NXT_ALL_RANGE_START,
} from './datePresets';

describe('getDateRangeFromPreset', () => {
  it('all → 1970-01-01 .. today', () => {
    const r = getDateRangeFromPreset('all');
    expect(r.dateFrom).toBe(NXT_ALL_RANGE_START);
    expect(r.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.dateFrom <= r.dateTo).toBe(true);
  });

  it('thisMonth starts on first day of current month', () => {
    const r = getDateRangeFromPreset('thisMonth');
    expect(r.dateFrom).toMatch(/^\d{4}-\d{2}-01$/);
    expect(r.dateFrom <= r.dateTo).toBe(true);
  });
});

describe('getPresetFromDates', () => {
  it('recognizes all range', () => {
    const all = getDateRangeFromPreset('all');
    expect(getPresetFromDates(all.dateFrom, all.dateTo)).toBe('all');
  });

  it('recognizes thisMonth', () => {
    const r = getDateRangeFromPreset('thisMonth');
    expect(getPresetFromDates(r.dateFrom, r.dateTo)).toBe('thisMonth');
  });

  it('unknown range → custom', () => {
    expect(getPresetFromDates('2020-01-01', '2020-01-31')).toBe('custom');
  });

  it('empty dates → custom', () => {
    expect(getPresetFromDates('', '')).toBe('custom');
  });
});
