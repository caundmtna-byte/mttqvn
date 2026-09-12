import { useCallback, useMemo, useState } from 'react';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import {
  buildStandardDateRangePresets,
  isStandardDateRangeNonDefault,
  type StandardDateRangePresetId,
} from '@/lib/date-range-presets';

/**
 * Bộ lọc dimension của trang thống kê — mỗi khoá là một chip đa chọn.
 *
 * Chỉ dùng làm kiểu tham chiếu/tài liệu. Hook nhận `D extends object` chứ KHÔNG
 * ràng buộc vào kiểu này: interface cụ thể của từng module (vd.
 * `ArticleStatsDimensionFilters`) không có index signature nên sẽ không gán được.
 */
export type StatsDimensionFilters = Record<string, string[]>;

export const STATS_INITIAL_DATE_RANGE: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

export interface UseStatsPageFiltersResult<D extends object> {
  dateRange: DateRangeValue;
  setDateRange: React.Dispatch<React.SetStateAction<DateRangeValue>>;
  dims: D;
  setDims: React.Dispatch<React.SetStateAction<D>>;
  presets: ReturnType<typeof buildStandardDateRangePresets>;
  /** Khoảng ngày khác preset mặc định — tính vào `activeFilterCount`. */
  isNonDefaultDateRange: boolean;
  /** Số bộ lọc đang bật = khoảng ngày (nếu khác mặc định) + mỗi dimension có chọn. */
  activeFilterCount: number;
  clearFilters: () => void;
}

/**
 * State bộ lọc dùng chung cho mọi trang Thống kê / Báo cáo.
 *
 * 8 trang thống kê trước đây chép lại y hệt khối này (khoảng ngày + chip dimension
 * + đếm bộ lọc + xoá bộ lọc), chỉ khác hình dạng `dims`. Gom về một chỗ để thêm
 * dimension mới không phải sửa logic đếm, và để `activeFilterCount` không lệch
 * nhau giữa các trang.
 *
 * `initialDims` phải là hằng số ở cấp module (không tạo mới mỗi lần render),
 * nếu không `clearFilters` sẽ đổi định danh liên tục.
 */
export function useStatsPageFilters<D extends object>(
  initialDims: D,
  options?: {
    /** Preset coi là "mặc định" khi đếm bộ lọc. Mặc định `'all'`. */
    defaultPreset?: StandardDateRangePresetId;
    initialDateRange?: DateRangeValue;
  },
): UseStatsPageFiltersResult<D> {
  const defaultPreset = options?.defaultPreset ?? 'all';
  const initialDateRange = options?.initialDateRange ?? STATS_INITIAL_DATE_RANGE;

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<D>(initialDims);

  const presets = useMemo(() => buildStandardDateRangePresets(), []);

  const isNonDefaultDateRange = useMemo(
    () => isStandardDateRangeNonDefault(dateRange, defaultPreset),
    [dateRange, defaultPreset],
  );

  const activeFilterCount = useMemo(
    () => countActiveStatsFilters(dims, isNonDefaultDateRange),
    [dims, isNonDefaultDateRange],
  );

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, [initialDims, initialDateRange]);

  return {
    dateRange,
    setDateRange,
    dims,
    setDims,
    presets,
    isNonDefaultDateRange,
    activeFilterCount,
    clearFilters,
  };
}

/** Tách riêng để unit-test được mà không cần dựng React. */
export function countActiveStatsFilters(
  dims: object,
  isNonDefaultDateRange: boolean,
): number {
  let n = isNonDefaultDateRange ? 1 : 0;
  for (const value of Object.values(dims as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0) n += 1;
  }
  return n;
}
