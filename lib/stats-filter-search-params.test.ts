import { describe, expect, it } from 'vitest';
import { decodeStatsFilters, encodeStatsFilters } from './stats-filter-search-params';

const INIT = { trang_thai: [] as string[], xa_phuong: [] as string[] };
const ALL = { preset: 'all', customStart: '', customEnd: '' };

describe('stats-filter-search-params', () => {
  it('khứ hồi giữ nguyên nhiều giá trị, sentinel và khoảng ngày tự chọn', () => {
    const dims = { trang_thai: ['Đang khảo sát', 'Đã bàn giao'], xa_phuong: ['__none__', '12'] };
    const range = { preset: 'custom', customStart: '2026-01-01', customEnd: '2026-03-31' };
    const qs = encodeStatsFilters(dims, range).toString();
    expect(decodeStatsFilters(new URLSearchParams(qs), INIT, ALL)).toEqual({ dims, dateRange: range });
  });

  it('URL trống ⇒ giá trị mặc định; khoá lạ bị bỏ', () => {
    const out = decodeStatsFilters(new URLSearchParams('la=1&trang_thai='), INIT, ALL);
    expect(out).toEqual({ dims: INIT, dateRange: ALL });
    expect(out.dims).not.toHaveProperty('la');
  });
});
