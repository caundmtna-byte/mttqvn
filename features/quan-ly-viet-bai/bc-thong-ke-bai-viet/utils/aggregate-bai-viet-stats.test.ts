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
  aggregateByNguoiTao,
  aggregateDonViTheLoaiMatrix,
  ARTICLE_STATS_DON_VI_UNKNOWN,
} from './aggregate-bai-viet-stats';

const noDims = {
  idTheLoai: [] as string[],
  idNguonDang: [] as string[],
  idTrangDang: [] as string[],
  idNguoiTao: [] as string[],
  idDonVi: [] as string[],
};

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
    const allInMay = filterArticlesForStats(items, range, noDims);
    expect(allInMay).toHaveLength(2);

    const byTheLoai = filterArticlesForStats(items, range, { ...noDims, idTheLoai: ['2'] });
    expect(byTheLoai.map((r) => r.id)).toEqual(['3']);
  });

  it('filterArticlesForStats lọc theo đơn vị của người tạo', () => {
    const items = [
      base({ id: '1', id_don_vi_nguoi_tao: '7' }),
      base({ id: '2', id_don_vi_nguoi_tao: '8' }),
      base({ id: '3', id_don_vi_nguoi_tao: null }),
    ];
    const range = { start: '', end: '', allTime: true };
    expect(filterArticlesForStats(items, range, { ...noDims, idDonVi: ['7'] }).map((r) => r.id)).toEqual(['1']);
    // Nhóm "chưa xác định" cũng phải chọn được, nếu không thì bài của tài khoản
    // chưa gắn đơn vị biến mất khỏi báo cáo mà không ai biết.
    expect(
      filterArticlesForStats(items, range, { ...noDims, idDonVi: [ARTICLE_STATS_DON_VI_UNKNOWN] }).map((r) => r.id),
    ).toEqual(['3']);
  });

  it('computeArticleStatsKpis đếm bài, thể loại và người tạo', () => {
    const items = [
      base({ id: '1' }),
      base({ id: '2', id_the_loai: '99', id_nguoi_tao: '88' }),
    ];
    const k = computeArticleStatsKpis(items);
    expect(k.totalCount).toBe(2);
    expect(k.distinctTheLoai).toBe(2);
    expect(k.distinctNguoiTao).toBe(2);
    // Không còn chỉ tiêu tiền nào trên trang báo cáo.
    expect(k).not.toHaveProperty('totalDonGia');
    expect(k).not.toHaveProperty('avgDonGia');
  });

  it('computeArticleStatsKpis: trung bình bài/đơn vị loại nhóm chưa xác định khỏi mẫu số', () => {
    const items = [
      base({ id: '1', id_don_vi_nguoi_tao: '1' }),
      base({ id: '2', id_don_vi_nguoi_tao: '1' }),
      base({ id: '3', id_don_vi_nguoi_tao: '2' }),
      base({ id: '4', id_don_vi_nguoi_tao: null }),
      base({ id: '5', id_don_vi_nguoi_tao: '   ' }),
    ];
    const k = computeArticleStatsKpis(items);
    expect(k.totalCount).toBe(5);
    expect(k.distinctDonVi).toBe(2);
    expect(k.soBaiCoDonVi).toBe(3);
    expect(k.avgBaiMoiDonVi).toBe(1.5);
  });

  it('computeArticleStatsKpis: không đơn vị nào thì trung bình là 0, không chia cho 0', () => {
    const k = computeArticleStatsKpis([base({ id: '1', id_don_vi_nguoi_tao: null })]);
    expect(k.distinctDonVi).toBe(0);
    expect(k.avgBaiMoiDonVi).toBe(0);
  });

  it('buildTrendSeries fills buckets by tg_tao with counts', () => {
    const items = [
      base({ id: '1', tg_tao: '2026-05-01T12:00:00.000Z' }),
      base({ id: '2', tg_tao: '2026-05-01T13:00:00.000Z' }),
      base({ id: '3', tg_tao: '2026-05-02T10:00:00.000Z' }),
    ];
    const range = { start: '2026-05-01', end: '2026-05-02' };
    const series = buildTrendSeries(items, range, 'day');
    expect(series).toHaveLength(2);
    expect(series[0].count).toBe(2);
    expect(series[1].count).toBe(1);
    expect(series[0]).not.toHaveProperty('totalDonGia');
  });

  describe('aggregateByDonVi', () => {
    const tenXa = new Map([
      ['1', 'Xã A'],
      ['2', 'Xã B'],
    ]);

    it('gộp số bài theo xã của người tạo, không còn cột tiền', () => {
      const rows = aggregateByDonVi(
        [
          base({ id: '1', id_don_vi_nguoi_tao: '1' }),
          base({ id: '2', id_don_vi_nguoi_tao: '1' }),
          base({ id: '3', id_don_vi_nguoi_tao: '2' }),
        ],
        tenXa,
        'Chưa xác định',
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ id: '1', label: 'Xã A', soBai: 2 });
      expect(rows[1]).toMatchObject({ id: '2', label: 'Xã B', soBai: 1 });
      expect(rows[0]).not.toHaveProperty('tongDonGia');
      expect(rows[0]).not.toHaveProperty('avgDonGia');
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

  describe('aggregateDonViTheLoaiMatrix', () => {
    const tenXa = new Map([
      ['1', 'Xã A'],
      ['2', 'Xã B'],
    ]);
    const rows = [
      base({ id: '1', id_don_vi_nguoi_tao: '1', id_the_loai: 'a', ten_the_loai: 'Tin' }),
      base({ id: '2', id_don_vi_nguoi_tao: '1', id_the_loai: 'a', ten_the_loai: 'Tin' }),
      base({ id: '3', id_don_vi_nguoi_tao: '1', id_the_loai: 'b', ten_the_loai: 'Bài' }),
      base({ id: '4', id_don_vi_nguoi_tao: '2', id_the_loai: 'b', ten_the_loai: 'Bài' }),
      base({ id: '5', id_don_vi_nguoi_tao: null, id_the_loai: 'a', ten_the_loai: 'Tin' }),
    ];

    it('tổng dòng, tổng cột và tổng chung đều bằng số bài đã lọc', () => {
      const m = aggregateDonViTheLoaiMatrix(rows, tenXa, 'Chưa xác định');
      expect(m.totals.soBai).toBe(5);
      expect(m.rows.reduce((s, r) => s + r.soBai, 0)).toBe(5);
      expect(Object.values(m.totals.theoTheLoai).reduce((s, v) => s + v, 0)).toBe(5);
      for (const r of m.rows) {
        expect(Object.values(r.theoTheLoai).reduce((s, v) => s + v, 0)).toBe(r.soBai);
      }
    });

    it('cột thể loại sắp giảm dần theo tổng số bài, nhóm chưa xác định xếp cuối', () => {
      const m = aggregateDonViTheLoaiMatrix(rows, tenXa, 'Chưa xác định');
      expect(m.theLoaiCols.map((c) => c.label)).toEqual(['Tin', 'Bài']);
      expect(m.rows.map((r) => r.label)).toEqual(['Xã A', 'Xã B', 'Chưa xác định']);
      expect(m.rows[0].theoTheLoai).toEqual({ a: 2, b: 1 });
      // Thể loại không có bài ở đơn vị này thì khuyết — lớp xuất file điền 0.
      expect(m.rows[1].theoTheLoai).toEqual({ b: 1 });
    });

    it('không có bài nào → không cột, không dòng', () => {
      const m = aggregateDonViTheLoaiMatrix([], tenXa, 'Chưa xác định');
      expect(m.theLoaiCols).toEqual([]);
      expect(m.rows).toEqual([]);
      expect(m.totals.soBai).toBe(0);
    });
  });

  describe('aggregateByNguoiTao', () => {
    it('gộp theo người tạo kèm tên đơn vị, sắp giảm dần theo số bài', () => {
      const rows = aggregateByNguoiTao(
        [
          base({ id: '1', id_nguoi_tao: '10', ho_va_ten_nguoi_tao: 'An', id_don_vi_nguoi_tao: '1' }),
          base({ id: '2', id_nguoi_tao: '10', ho_va_ten_nguoi_tao: 'An', id_don_vi_nguoi_tao: '1' }),
          base({ id: '3', id_nguoi_tao: '11', ho_va_ten_nguoi_tao: 'Bình', id_don_vi_nguoi_tao: null }),
        ],
        new Map([['1', 'Xã A']]),
        'Chưa xác định',
      );
      expect(rows).toEqual([
        { id: '10', label: 'An', tenDonVi: 'Xã A', soBai: 2, soTien: 200_000 },
        { id: '11', label: 'Bình', tenDonVi: 'Chưa xác định', soBai: 1, soTien: 100_000 },
      ]);
    });
  });
});
