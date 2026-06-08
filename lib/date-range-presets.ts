import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { DateRangePreset, DateRangeValue } from '@/components/ui/DateRangePicker';
import { txt } from '@/lib/text';

dayjs.extend(isoWeek);

/** Preset khoảng thời gian chuẩn — dùng chung listview / thống kê / báo cáo. */
export const STANDARD_DATE_RANGE_PRESET_IDS = [
  'all',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
  'lastQuarter',
  'thisYear',
  'lastYear',
  'custom',
] as const;

export type StandardDateRangePresetId = (typeof STANDARD_DATE_RANGE_PRESET_IDS)[number];

export interface StandardResolvedDateRange {
  start: string;
  end: string;
  /** Preset «Tất cả» — không lọc theo ngày (client-side). */
  allTime?: boolean;
}

export function resolveStandardDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): StandardResolvedDateRange {
  const d = dayjs(now);
  const end = d.format('YYYY-MM-DD');

  switch (preset) {
    case 'all':
      return { start: '', end: '', allTime: true };
    case 'thisWeek':
      return { start: d.startOf('isoWeek').format('YYYY-MM-DD'), end };
    case 'lastWeek': {
      const lw = d.subtract(1, 'week');
      return {
        start: lw.startOf('isoWeek').format('YYYY-MM-DD'),
        end: lw.endOf('isoWeek').format('YYYY-MM-DD'),
      };
    }
    case 'thisMonth':
      return { start: d.startOf('month').format('YYYY-MM-DD'), end };
    case 'lastMonth': {
      const lm = d.subtract(1, 'month');
      return {
        start: lm.startOf('month').format('YYYY-MM-DD'),
        end: lm.endOf('month').format('YYYY-MM-DD'),
      };
    }
    case 'thisQuarter': {
      const qStartMonth = Math.floor(d.month() / 3) * 3;
      return { start: d.month(qStartMonth).startOf('month').format('YYYY-MM-DD'), end };
    }
    case 'lastQuarter': {
      const qStartMonth = Math.floor(d.month() / 3) * 3;
      const thisQStart = d.month(qStartMonth).startOf('month');
      const lastQStart = thisQStart.subtract(3, 'month');
      const lastQEnd = lastQStart.add(2, 'month').endOf('month');
      return {
        start: lastQStart.format('YYYY-MM-DD'),
        end: lastQEnd.format('YYYY-MM-DD'),
      };
    }
    case 'thisYear':
      return { start: d.startOf('year').format('YYYY-MM-DD'), end };
    case 'lastYear': {
      const ly = d.subtract(1, 'year');
      return {
        start: ly.startOf('year').format('YYYY-MM-DD'),
        end: ly.endOf('year').format('YYYY-MM-DD'),
      };
    }
    case 'custom': {
      const s = (customStart || end).slice(0, 10);
      const e = (customEnd || end).slice(0, 10);
      if (s <= e) return { start: s, end: e };
      return { start: e, end: s };
    }
    default: {
      return { start: d.startOf('month').format('YYYY-MM-DD'), end };
    }
  }
}

export function buildStandardDateRangePresets(options?: {
  /** Mặc định true — ẩn «Tất cả» khi false. */
  includeAll?: boolean;
}): DateRangePreset[] {
  const includeAll = options?.includeAll !== false;
  const ids = includeAll
    ? STANDARD_DATE_RANGE_PRESET_IDS
    : STANDARD_DATE_RANGE_PRESET_IDS.filter((id) => id !== 'all');

  return ids.map((id) => ({
    id,
    label: txt(`common.dateRangePreset.${id}`),
  }));
}

export function isStandardDateRangeNonDefault(
  value: DateRangeValue,
  defaultPreset: StandardDateRangePresetId = 'thisMonth',
): boolean {
  if (value.preset === 'custom') {
    return Boolean(value.customStart && value.customEnd);
  }
  return value.preset !== defaultPreset;
}

export function isDateInStandardRange(
  dateStr: string,
  range: StandardResolvedDateRange,
): boolean {
  if (range.allTime) return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= range.start.slice(0, 10) && d <= range.end.slice(0, 10);
}
