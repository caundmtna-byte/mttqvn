import { describe, expect, it } from 'vitest';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import {
  resolveArticleStatsDateRange,
  filterArticlesForStats,
  computeArticleStatsKpis,
  pickTrendBucket,
  buildTrendSeries,
  getArticleStatsDateFromCreatedAt,
  aggregateByDonVi,
  ARTICLE_STATS_DON_VI_UNKNOWN,
} from './aggregate-bai-viet-stats';

const base = (over: Partial<BaiVietDanhSach>): BaiVietDanhSach => ({
  id: '1',
  ten_bai: 'A',
  id_the_loai: '10',
  ten_the_loai: 'TL',
  don_gia: 100_000,
  ngay_dang: '2026-05-01',
  id_nguon_dang: '20',
  ten_nguon_dang: 'N1',
  id_trang_dang: '30',
  ten_trang_dang: 'T1',
  link: 'https://x.test',
  id_nguoi_tao: '40',
  ho_va_ten_nguoi_tao: 'NV',
  ten_tai_khoan_nguoi_tao: null,
  tg_tao: '2026-05-02T08:00:00.000Z',
  tg_cap_nhat: '2026-05-03T10:00:00.000Z',
  ...over,
});

describe('aggregate-bai-viet-stats', () => {
  it('resolveArticleStatsDateRange swaps custom when start > end', () => {
    const r = resolveArticleStatsDateRange('custom', '2026-05-10', '2026-05-01', new Date('2026-05-15'));
    expect(r.start).toBe('2026-05-01');
    expect(r.end).toBe('2026-05-10');
  });

  it('pickTrendBucket uses month when range > 62 days', () => {
    expect(pickTrendBucket('2026-01-01', '2026-02-10')).toBe('day');
    expect(pickTrendBucket('2026-01-01', '2026-05-15')).toBe('month');
  });

  it('getArticleStatsDateFromCreatedAt reads tg_tao as YYYY-MM-DD', () => {
    const row = base({});
    expect(getArticleStatsDateFromCreatedAt(row)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getArticleStatsDateFromCreatedAt(row).slice(0, 10)).toBe('2026-05-02');
  });

  it('filterArticlesForStats filters by created-at range and dims', () => {
    const items = [
      base({ id: '1', tg_tao: '2026-05-05T10:00:00.000Z', id_the_loai: '1' }),
      base({ id: '2', tg_tao: '2026-06-01T10:00:00.000Z', id_the_loai: '2' }),
      base({ id: '3', tg_tao: '2026-05-06T10:00:00.000Z', id_the_loai: '2', ten_bai: 'B' }),
    ];
    const range = { start: '2026-05-01', end: '2026-05-31' };
    const allInMay = filterArticlesForStats(items, range, {
      idTheLoai: [],
      idNguonDang: [],
      idTrangDang: [],
      idNguoiTao: [],
    });
    expect(allInMay).toHaveLength(2);

    const byTheLoai = filterArticlesForStats(items, range, {
      idTheLoai: ['2'],
      idNguonDang: [],
      idTrangDang: [],
      idNguoiTao: [],
    });
    expect(byTheLoai.map((r) => r.id)).toEqual(['3']);
  });

  it('computeArticleStatsKpis sums don_gia and counts', () => {
    const items = [
      base({ id: '1', don_gia: 100 }),
      base({ id: '2', don_gia: 200, id_the_loai: '99', id_nguoi_tao: '88' }),
    ];
    const k = computeArticleStatsKpis(items);
    expect(k.totalCount).toBe(2);
    expect(k.totalDonGia).toBe(300);
    expect(k.avgDonGia).toBe(150);
    expect(k.distinctTheLoai).toBe(2);
    expect(k.distinctNguoiTao).toBe(2);
  });

  it('buildTrendSeries fills buckets by tg_tao with counts', () => {
    const items = [
      base({ id: '1', tg_tao: '2026-05-01T12:00:00.000Z', don_gia: 50 }),
      base({ id: '2', tg_tao: '2026-05-01T13:00:00.000Z', don_gia: 50 }),
      base({ id: '3', tg_tao: '2026-05-02T10:00:00.000Z', don_gia: 100 }),
    ];
    const range = { start: '2026-05-01', end: '2026-05-02' };
    const series = buildTrendSeries(items, range, 'day');
    expect(series).toHaveLength(2);
    expect(series[0].count).toBe(2);
    expect(series[0].totalDonGia).toBe(100);
    expect(series[1].count).toBe(1);
    expect(series[1].totalDonGia).toBe(100);
  });

  describe('aggregateByDonVi', () => {
    const tenXa = new Map([
      ['1', 'Xã A'],
      ['2', 'Xã B'],
    ]);

    it('gộp số bài và tổng đơn giá theo xã của người tạo', () => {
      const rows = aggregateByDonVi(
        [
          base({ id: '1', id_don_vi_nguoi_tao: '1', don_gia: 100 }),
          base({ id: '2', id_don_vi_nguoi_tao: '1', don_gia: 300 }),
          base({ id: '3', id_don_vi_nguoi_tao: '2', don_gia: 500 }),
        ],
        tenXa,
        'Chưa xác định',
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ id: '1', label: 'Xã A', soBai: 2, tongDonGia: 400, avgDonGia: 200 });
      expect(rows[1]).toMatchObject({ id: '2', label: 'Xã B', soBai: 1, tongDonGia: 500, avgDonGia: 500 });
    });

    it('tỷ trọng tính trên tổng số bài đã lọc', () => {
      const rows = aggregateByDonVi(
        [
          base({ id: '1', id_don_vi_nguoi_tao: '1' }),
          base({ id: '2', id_don_vi_nguoi_tao: '1' }),
          base({ id: '3', id_don_vi_nguoi_tao: '1' }),
          base({ id: '4', id_don_vi_nguoi_tao: '2' }),
        ],
        tenXa,
        'Chưa xác định',
      );
      expect(rows[0].tyTrongSoBai).toBe(75);
      expect(rows[1].tyTrongSoBai).toBe(25);
      expect(rows.reduce((s, r) => s + r.soBai, 0)).toBe(4);
    });

    it('người tạo chưa gắn đơn vị gom về nhóm riêng và luôn xếp cuối', () => {
      const rows = aggregateByDonVi(
        [
          base({ id: '1', id_don_vi_nguoi_tao: null }),
          base({ id: '2', id_don_vi_nguoi_tao: '  ' }),
          base({ id: '3', id_don_vi_nguoi_tao: undefined }),
          base({ id: '4', id_don_vi_nguoi_tao: '2' }),
        ],
        tenXa,
        'Chưa xác định',
      );
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe('2');
      expect(rows[1]).toMatchObject({
        id: ARTICLE_STATS_DON_VI_UNKNOWN,
        label: 'Chưa xác định',
        soBai: 3,
      });
    });

    it('xã không tra được tên vẫn giữ nhóm riêng, nhãn là id', () => {
      const rows = aggregateByDonVi([base({ id: '1', id_don_vi_nguoi_tao: '99' })], tenXa, 'Chưa xác định');
      expect(rows[0]).toMatchObject({ id: '99', label: '99', soBai: 1 });
    });

    it('không có bài nào → mảng rỗng', () => {
      expect(aggregateByDonVi([], tenXa, 'Chưa xác định')).toEqual([]);
    });
  });
});
