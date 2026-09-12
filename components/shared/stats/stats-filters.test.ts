import { describe, it, expect } from 'vitest';
import { countActiveStatsFilters } from './use-stats-page-filters';
import { resolveStatsTrendChartRange } from './resolve-trend-chart-range';

describe('countActiveStatsFilters', () => {
  it('đếm mỗi dimension có chọn là 1', () => {
    expect(countActiveStatsFilters({ a: ['x'], b: ['y', 'z'], c: [] }, false)).toBe(2);
  });

  it('khoảng ngày khác mặc định tính thêm 1', () => {
    expect(countActiveStatsFilters({ a: ['x'] }, true)).toBe(2);
  });

  it('không có gì → 0', () => {
    expect(countActiveStatsFilters({ a: [], b: [] }, false)).toBe(0);
  });

  it('bỏ qua giá trị không phải mảng', () => {
    expect(countActiveStatsFilters({ a: ['x'], b: 'khong-phai-mang' as never }, false)).toBe(1);
  });
});

describe('resolveStatsTrendChartRange', () => {
  const rows = [{ d: '2026-05-10' }, { d: '2026-03-02' }, { d: '' }, { d: '2026-07-21' }];
  const get = (r: { d: string }) => r.d;

  it('preset «Tất cả» → min–max của tập đã lọc, bỏ qua dòng thiếu ngày', () => {
    expect(resolveStatsTrendChartRange({ start: '', end: '', allTime: true }, rows, get)).toEqual({
      start: '2026-03-02',
      end: '2026-07-21',
    });
  });

  it('preset «Tất cả» + không có dòng nào → khoảng 1 ngày, KHÔNG rỗng', () => {
    const r = resolveStatsTrendChartRange({ start: '', end: '', allTime: true }, [], get);
    expect(r.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.start).toBe(r.end);
  });

  it('khoảng ngày cụ thể → giữ nguyên', () => {
    expect(
      resolveStatsTrendChartRange({ start: '2026-01-01', end: '2026-01-31' }, rows, get),
    ).toEqual({ start: '2026-01-01', end: '2026-01-31' });
  });

  it('start/end rỗng mà không gắn cờ allTime vẫn được quy đổi', () => {
    expect(resolveStatsTrendChartRange({ start: '', end: '' }, rows, get)).toEqual({
      start: '2026-03-02',
      end: '2026-07-21',
    });
  });

  it('cắt phần giờ khỏi timestamp', () => {
    const ts = [{ d: '2026-05-10T08:30:00Z' }];
    expect(resolveStatsTrendChartRange({ start: '', end: '', allTime: true }, ts, get)).toEqual({
      start: '2026-05-10',
      end: '2026-05-10',
    });
  });
});
