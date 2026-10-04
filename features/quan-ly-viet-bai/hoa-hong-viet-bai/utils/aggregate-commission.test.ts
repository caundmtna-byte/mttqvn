import { describe, it, expect } from 'vitest';
import { aggregateCommission, donViKeyOf, DON_VI_CHUA_GAN } from './aggregate-commission';
import type { BaiVietThongKeNhom } from '../../bai-viet/utils/thong-ke-nhom';

/** Mỗi nhóm mặc định là một bài; `id` chỉ để test nhận diện nhóm. */
type Nhom = BaiVietThongKeNhom & { id: string };
const baseRow: Nhom = {
  id: '1',
  ky: '2026-03',
  id_the_loai: '10',
  ten_the_loai: 'Tin',
  id_nguon_dang: '1',
  ten_nguon_dang: null,
  id_trang_dang: '1',
  ten_trang_dang: null,
  id_nguoi_tao: '100',
  ho_va_ten_nguoi_tao: 'Nguyen A',
  ten_tai_khoan_nguoi_tao: null,
  id_don_vi_nguoi_tao: '5',
  so_bai: 1,
  so_tien: 100_000,
};

const row = (over: Partial<Nhom> & { don_gia?: number }): Nhom => {
  const { don_gia, ...rest } = over;
  return { ...baseRow, ...rest, ...(don_gia != null ? { so_tien: don_gia } : {}) };
};
const ids = (rs: BaiVietThongKeNhom[]) => rs.map((x) => (x as Nhom).id);

const noFilters = { theLoaiIds: [], authorIds: [], donViIds: [] };

describe('donViKeyOf', () => {
  it('tra ve id don vi khi co', () => {
    expect(donViKeyOf(row({ id_don_vi_nguoi_tao: '7' }))).toBe('7');
  });

  it('gom nhan vien chua gan don vi vao mot nhom rieng', () => {
    expect(donViKeyOf(row({ id_don_vi_nguoi_tao: null }))).toBe(DON_VI_CHUA_GAN);
    expect(donViKeyOf(row({ id_don_vi_nguoi_tao: '  ' }))).toBe(DON_VI_CHUA_GAN);
  });
});

describe('aggregateCommission — loc theo don vi', () => {
  const rows = [
    row({ id: '1', id_don_vi_nguoi_tao: '5', don_gia: 100_000 }),
    row({ id: '2', id_don_vi_nguoi_tao: '6', don_gia: 200_000, id_nguoi_tao: '200' }),
    row({ id: '3', id_don_vi_nguoi_tao: null, don_gia: 300_000, id_nguoi_tao: '300' }),
  ];

  it('khong chon don vi thi giu nguyen toan bo — khong cat sot dong nao', () => {
    const r = aggregateCommission(rows, 'all', '', noFilters);
    expect(r.filteredRows).toHaveLength(3);
    expect(r.totalCommission).toBe(600_000);
  });

  it('chon mot don vi thi chi con bai cua don vi do', () => {
    const r = aggregateCommission(rows, 'all', '', { ...noFilters, donViIds: ['5'] });
    expect(ids(r.filteredRows)).toEqual(['1']);
    expect(r.totalCommission).toBe(100_000);
  });

  it('chon nhieu don vi thi cong don', () => {
    const r = aggregateCommission(rows, 'all', '', { ...noFilters, donViIds: ['5', '6'] });
    expect(r.totalCommission).toBe(300_000);
  });

  it('chon "chua gan don vi" van loc ra duoc bai cua nguoi chua co don vi', () => {
    const r = aggregateCommission(rows, 'all', '', { ...noFilters, donViIds: [DON_VI_CHUA_GAN] });
    expect(ids(r.filteredRows)).toEqual(['3']);
  });

  it('tab "Cua toi" bo qua loc don vi', () => {
    const r = aggregateCommission(rows, 'mine', '200', { ...noFilters, donViIds: ['5'] });
    expect(ids(r.filteredRows)).toEqual(['2']);
  });
});

describe('aggregateCommission — cong theo nhom', () => {
  it('so bai va tien la tong cua nhom, chuoi thang gop theo ky', () => {
    const r = aggregateCommission(
      [
        row({ id: '1', ky: '2026-03', so_bai: 3, so_tien: 300_000 }),
        row({ id: '2', ky: '2026-04', so_bai: 1, so_tien: 50_000, id_nguoi_tao: '200' }),
        row({ id: '3', ky: '2026-03', so_bai: 2, so_tien: 20_000 }),
      ],
      'all',
      '',
      noFilters,
    );
    expect(r.articleCount).toBe(6);
    expect(r.totalCommission).toBe(370_000);
    expect(r.avgCommission).toBeCloseTo(370_000 / 6);
    expect(r.seriesByMonth.map((p) => [p.key, p.count, p.total])).toEqual([
      ['2026-03', 5, 320_000],
      ['2026-04', 1, 50_000],
    ]);
    expect(r.seriesByAuthor.map((p) => [p.key, p.count])).toEqual([
      ['100', 5],
      ['200', 1],
    ]);
  });
});
