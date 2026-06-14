import { resolveStandardDateRange } from '@/lib/date-range-presets';

/** Ngày bắt đầu preset «Tất cả» — đủ sớm để gom mọi phiếu NXT. */
export const NXT_ALL_RANGE_START = '1970-01-01';

function todayIso(): string {
  return resolveStandardDateRange('thisMonth', '', '').end;
}

/** Preset kỳ báo cáo NXT — YYYY-MM-DD */
export function getDateRangeFromPreset(presetId: string): { dateFrom: string; dateTo: string } {
  const today = todayIso();

  if (presetId === 'all') {
    return { dateFrom: NXT_ALL_RANGE_START, dateTo: today };
  }

  if (presetId === 'custom') {
    return { dateFrom: '', dateTo: '' };
  }

  const resolved = resolveStandardDateRange(presetId, '', '');
  if (resolved.allTime) {
    return { dateFrom: NXT_ALL_RANGE_START, dateTo: today };
  }

  return { dateFrom: resolved.start, dateTo: resolved.end };
}

export function getPresetFromDates(dateFrom: string, dateTo: string): string {
  if (!dateFrom || !dateTo) return 'custom';
  const allRange = getDateRangeFromPreset('all');
  if (allRange.dateFrom === dateFrom && allRange.dateTo === dateTo) return 'all';
  const ranges = ['thisMonth', 'lastMonth', 'thisQuarter', 'thisYear'] as const;
  for (const id of ranges) {
    const r = getDateRangeFromPreset(id);
    if (r.dateFrom === dateFrom && r.dateTo === dateTo) return id;
  }
  return 'custom';
}
