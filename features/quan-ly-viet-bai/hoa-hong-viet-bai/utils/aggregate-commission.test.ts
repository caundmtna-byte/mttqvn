import { describe, it, expect } from 'vitest';
import { aggregateCommission, donViKeyOf, DON_VI_CHUA_GAN } from './aggregate-commission';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';

const baseRow: BaiVietDanhSach = {
  id: '1',
  ten_bai: 'Bai 1',
  id_the_loai: '10',
  ten_the_loai: 'Tin',
  don_gia: 100_000,
  ngay_dang: '2026-03-10',
  id_nguon_dang: '1',
  id_trang_dang: '1',
  link: 'https://x',
  id_nguoi_tao: '100',
  ho_va_ten_nguoi_tao: 'Nguyen A',
  id_don_vi_nguoi_tao: '5',
  ten_don_vi_nguoi_tao: 'Xa A',
  tg_tao: '',
  tg_cap_nhat: '',
};

const row = (over: Partial<BaiVietDanhSach>): BaiVietDanhSach => ({ ...baseRow, ...over });

const noFilters = { dateFrom: null, dateTo: null, theLoaiIds: [], authorIds: [], donViIds: [] };

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
    expect(r.filteredRows.map((x) => x.id)).toEqual(['1']);
    expect(r.totalCommission).toBe(100_000);
  });

  it('chon nhieu don vi thi cong don', () => {
    const r = aggregateCommission(rows, 'all', '', { ...noFilters, donViIds: ['5', '6'] });
    expect(r.totalCommission).toBe(300_000);
  });

  it('chon "chua gan don vi" van loc ra duoc bai cua nguoi chua co don vi', () => {
    const r = aggregateCommission(rows, 'all', '', { ...noFilters, donViIds: [DON_VI_CHUA_GAN] });
    expect(r.filteredRows.map((x) => x.id)).toEqual(['3']);
  });

  it('tab "Cua toi" bo qua loc don vi', () => {
    const r = aggregateCommission(rows, 'mine', '200', { ...noFilters, donViIds: ['5'] });
    expect(r.filteredRows.map((x) => x.id)).toEqual(['2']);
  });
});
