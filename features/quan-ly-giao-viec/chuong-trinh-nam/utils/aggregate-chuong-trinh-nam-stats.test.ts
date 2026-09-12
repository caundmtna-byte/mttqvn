import { describe, it, expect } from 'vitest';
import type { ChuongTrinhNamListRow } from '../core/types';
import {
  resolveChuongTrinhNamStatsDateRange,
  resolveChuongTrinhNamStatsTrendChartRange,
  pickChuongTrinhTrendBucket,
  buildChuongTrinhTrendSeries,
  type ResolvedDateRange,
} from './aggregate-chuong-trinh-nam-stats';

function row(id: string, tgTao: string): ChuongTrinhNamListRow {
  return {
    id,
    ten_chuong_trinh: `CT ${id}`,
    ngay_bat_dau: tgTao,
    ngay_ket_thuc: tgTao,
    trang_thai: 'Hoạt động',
    id_phong_ban: null,
    id_nguoi_tao: '1',
    tg_tao: tgTao,
    tg_cap_nhat: tgTao,
  };
}

const ALL: ResolvedDateRange = resolveChuongTrinhNamStatsDateRange('all', '', '');

describe('preset «Tất cả» — chống vòng lặp vô tận', () => {
  it('resolveStandardDateRange trả start/end rỗng (tiền đề của lỗi)', () => {
    expect(ALL.start).toBe('');
    expect(ALL.end).toBe('');
    expect(ALL.allTime).toBe(true);
  });

  it('buildChuongTrinhTrendSeries trả rỗng thay vì lặp mãi khi range không hợp lệ', () => {
    expect(buildChuongTrinhTrendSeries([], ALL, 'day')).toEqual([]);
    expect(buildChuongTrinhTrendSeries([row('1', '2026-05-10')], ALL, 'day')).toEqual([]);
  });

  it('pickChuongTrinhTrendBucket không trả bucket "day" khi range không hợp lệ', () => {
    expect(pickChuongTrinhTrendBucket('', '')).toBe('month');
  });
});

describe('resolveChuongTrinhNamStatsTrendChartRange', () => {
  it('preset «Tất cả» → quy đổi thành min–max tg_tao của tập đã lọc', () => {
    const rows = [row('1', '2026-05-10'), row('2', '2026-03-02'), row('3', '2026-07-21')];
    expect(resolveChuongTrinhNamStatsTrendChartRange(ALL, rows)).toEqual({
      start: '2026-03-02',
      end: '2026-07-21',
    });
  });

  it('preset «Tất cả» + không có dòng nào → range 1 ngày (hôm nay), không rỗng', () => {
    const r = resolveChuongTrinhNamStatsTrendChartRange(ALL, []);
    expect(r.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.start).toBe(r.end);
  });

  it('preset có ngày cụ thể → giữ nguyên', () => {
    const range: ResolvedDateRange = { start: '2026-01-01', end: '2026-01-31' };
    expect(resolveChuongTrinhNamStatsTrendChartRange(range, [])).toEqual({
      start: '2026-01-01',
      end: '2026-01-31',
    });
  });

  it('range sau khi quy đổi luôn dựng được chuỗi — tab Thống kê mở được với preset mặc định', () => {
    const rows = [row('1', '2026-05-10'), row('2', '2026-05-12')];
    const trendRange = resolveChuongTrinhNamStatsTrendChartRange(ALL, rows);
    const bucket = pickChuongTrinhTrendBucket(trendRange.start, trendRange.end);
    const series = buildChuongTrinhTrendSeries(rows, trendRange, bucket);
    expect(series).toHaveLength(3); // 10, 11, 12/05
    expect(series.map((p) => p.count)).toEqual([1, 0, 1]);
  });
});

describe('bucket theo độ dài khoảng', () => {
  it('> 62 ngày → gom theo tháng', () => {
    expect(pickChuongTrinhTrendBucket('2026-01-01', '2026-06-30')).toBe('month');
  });

  it('<= 62 ngày → gom theo ngày', () => {
    expect(pickChuongTrinhTrendBucket('2026-01-01', '2026-02-01')).toBe('day');
  });
});
