import type { DateRangeValue } from '@/components/ui/DateRangePicker';

/**
 * Bộ lọc trang Thống kê ⇄ query string — trang in danh sách đọc lại đúng tập
 * đang lọc, tải lại (F5) vẫn ra cùng kết quả.
 *
 * Mỗi chiều lọc một khoá, nhiều giá trị thì lặp khoá (`?trang_thai=A&trang_thai=B`).
 * Khoảng thời gian: `tg` (preset), `tu`, `den` (chỉ khi preset tự chọn).
 */

const KHOA_PRESET = 'tg';
const KHOA_TU = 'tu';
const KHOA_DEN = 'den';

/** `interface` không có index signature ⇒ ràng buộc theo từng khoá thay cho `Record`. */
type DimFilters<D> = { [K in keyof D]: string[] };

export function encodeStatsFilters<D extends DimFilters<D>>(
  dims: D,
  dateRange: DateRangeValue,
): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, vals] of Object.entries(dims) as [string, string[]][]) {
    for (const v of vals) p.append(key, v);
  }
  if (dateRange.preset) p.set(KHOA_PRESET, dateRange.preset);
  if (dateRange.customStart) p.set(KHOA_TU, dateRange.customStart);
  if (dateRange.customEnd) p.set(KHOA_DEN, dateRange.customEnd);
  return p;
}

/** Chỉ nhận các khoá có trong `initialDims` — khoá lạ trên URL bị bỏ qua. */
export function decodeStatsFilters<D extends DimFilters<D>>(
  params: URLSearchParams,
  initialDims: D,
  initialDateRange: DateRangeValue,
): { dims: D; dateRange: DateRangeValue } {
  const dims = { ...initialDims };
  for (const key of Object.keys(initialDims) as (keyof D & string)[]) {
    const vals = params.getAll(key).filter((v) => v !== '');
    dims[key] = (vals.length > 0 ? vals : initialDims[key]) as D[typeof key];
  }
  return {
    dims,
    dateRange: {
      preset: params.get(KHOA_PRESET) || initialDateRange.preset,
      customStart: params.get(KHOA_TU) ?? initialDateRange.customStart,
      customEnd: params.get(KHOA_DEN) ?? initialDateRange.customEnd,
    },
  };
}
