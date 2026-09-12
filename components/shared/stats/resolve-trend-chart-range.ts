import dayjs from 'dayjs';
import type { StandardResolvedDateRange } from '@/lib/date-range-presets';

/**
 * Khoảng ngày để vẽ biểu đồ xu hướng.
 *
 * Preset «Tất cả» trả `start`/`end` **rỗng** (`resolveStandardDateRange`). Đưa thẳng
 * chuỗi rỗng vào vòng lặp `dayjs` là treo trình duyệt: `dayjs('')` là Invalid Date và
 * `Invalid.isAfter(Invalid)` luôn `false`, nên điều kiện dừng không bao giờ đúng.
 * Đây chính là lỗi làm tab Thống kê Chương trình BTT không mở được.
 *
 * Quy đổi: lấy min–max ngày thực tế trên tập đã lọc; không có dòng nào thì trả một
 * khoảng 1 ngày (hôm nay) để builder vẫn chạy và biểu đồ rỗng một cách an toàn.
 */
export function resolveStatsTrendChartRange<T>(
  range: StandardResolvedDateRange,
  rows: readonly T[],
  getDate: (row: T) => string,
): StandardResolvedDateRange {
  if (!range.allTime && range.start && range.end) {
    return { start: range.start, end: range.end };
  }

  let min = '';
  let max = '';
  for (const row of rows) {
    const raw = getDate(row);
    if (!raw) continue;
    const day = raw.slice(0, 10);
    if (!min || day < min) min = day;
    if (!max || day > max) max = day;
  }

  if (!min || !max) {
    const today = dayjs().format('YYYY-MM-DD');
    return { start: today, end: today };
  }
  return { start: min, end: max };
}
