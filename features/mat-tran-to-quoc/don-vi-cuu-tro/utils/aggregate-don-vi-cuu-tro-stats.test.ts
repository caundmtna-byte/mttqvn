import { describe, expect, it } from 'vitest';
import type { KhoDonViCuuTroListRow } from '../core/types';
import { KHO_DON_VI_CUU_TRO_LOAI } from '../core/loai';
import {
  DON_VI_CUU_TRO_THONG_KE_INITIAL_DIMS,
  aggregateDonViCuuTroByGioiThieu,
  aggregateDonViCuuTroByLoai,
  computeDonViCuuTroKpis,
  filterDonViCuuTroForThongKe,
  mergeDonViCuuTroUngHo,
  topDonViCuuTroByTien,
} from './aggregate-don-vi-cuu-tro-stats';

let seq = 0;
function dv(over: Partial<KhoDonViCuuTroListRow> = {}): KhoDonViCuuTroListRow {
  seq += 1;
  return {
    id: String(seq),
    tt: seq,
    loai: 'doanh_nghiep',
    loai_label: 'Doanh nghiệp',
    ten: `Đơn vị ${seq}`,
    so_nguoi: null,
    nguoi_dai_dien: null,
    chuc_vu: null,
    dia_chi: null,
    dien_thoai: null,
    don_vi_gioi_thieu_loai: 'tinh',
    don_vi_gioi_thieu_id: null,
    ten_don_vi_gioi_thieu: null,
    don_vi_gioi_thieu_label: 'MTTQ tỉnh',
    email: null,
    ghi_chu: null,
    tg_tao: '',
    tg_cap_nhat: '',
    ket_qua_ung_ho: 999,
    ...over,
  };
}

const ungHo = (entries: [string, number, number, number][]) =>
  new Map(entries.map(([id, tienKho, tienChuongTrinh, soLuot]) => [id, { tienKho, tienChuongTrinh, soLuot }]));

describe('mergeDonViCuuTroUngHo', () => {
  it('đơn vị không phát sinh trong kỳ = 0, không lấy số luỹ kế ket_qua_ung_ho', () => {
    const a = dv();
    const b = dv();
    const out = mergeDonViCuuTroUngHo([a, b], ungHo([[a.id, 100, 50, 2]]));
    expect(out.map((r) => r.tong)).toEqual([150, 0]);
    expect(out[1]).toMatchObject({ tienKho: 0, tienChuongTrinh: 0, soLuot: 0 });
  });
});

describe('computeDonViCuuTroKpis', () => {
  it('không có đơn vị nào thì tỷ lệ và bình quân = 0, không chia cho 0', () => {
    expect(computeDonViCuuTroKpis([])).toMatchObject({ tongDonVi: 0, tyLeCoUngHo: 0, binhQuan: 0 });
  });

  it('bình quân chia cho số đơn vị CÓ ủng hộ, không chia cho tổng số đơn vị', () => {
    const a = dv();
    const b = dv();
    const c = dv();
    const k = computeDonViCuuTroKpis(
      mergeDonViCuuTroUngHo([a, b, c], ungHo([[a.id, 300, 0, 1], [b.id, 0, 100, 3]])),
    );
    expect(k).toMatchObject({
      tongDonVi: 3,
      donViCoUngHo: 2,
      tyLeCoUngHo: 67,
      tongUngHo: 400,
      tongTienKho: 300,
      tongTienChuongTrinh: 100,
      soLuot: 4,
      binhQuan: 200,
    });
  });
});

describe('filterDonViCuuTroForThongKe', () => {
  it('loại × đơn vị giới thiệu là AND; không chọn gì thì giữ nguyên', () => {
    const rows = [
      dv({ loai: 'ca_nhan', don_vi_gioi_thieu_label: 'Xã A' }),
      dv({ loai: 'ca_nhan', don_vi_gioi_thieu_label: 'MTTQ tỉnh' }),
      dv({ loai: 'doanh_nghiep', don_vi_gioi_thieu_label: 'Xã A' }),
    ];
    expect(filterDonViCuuTroForThongKe(rows, DON_VI_CUU_TRO_THONG_KE_INITIAL_DIMS)).toHaveLength(3);
    const out = filterDonViCuuTroForThongKe(rows, { loai: ['ca_nhan'], don_vi_gioi_thieu: ['Xã A'] });
    expect(out.map((r) => r.id)).toEqual([rows[0].id]);
  });
});

describe('gom nhóm và top', () => {
  const a = dv({ loai: 'ca_nhan', ten: 'Bình', don_vi_gioi_thieu_label: 'Xã A' });
  const b = dv({ loai: 'ca_nhan', ten: 'An', don_vi_gioi_thieu_label: 'Xã A' });
  const c = dv({ loai: 'cau_lac_bo', ten: 'CLB', don_vi_gioi_thieu_label: 'MTTQ tỉnh' });
  const d = dv({ loai: 'cau_lac_bo', ten: 'Chưa góp' });
  const rows = mergeDonViCuuTroUngHo(
    [a, b, c, d],
    ungHo([[a.id, 50, 0, 1], [b.id, 50, 0, 1], [c.id, 500, 0, 2]]),
  );

  it('theo loại trả đủ mọi loại theo thứ tự nghiệp vụ, loại trống = 0', () => {
    const out = aggregateDonViCuuTroByLoai(rows);
    expect(out.map((r) => r.key)).toEqual([...KHO_DON_VI_CUU_TRO_LOAI]);
    expect(out.find((r) => r.key === 'ca_nhan')).toMatchObject({ soDonVi: 2, donViCoUngHo: 2, tong: 100 });
    expect(out.find((r) => r.key === 'cau_lac_bo')).toMatchObject({ soDonVi: 2, donViCoUngHo: 1, tong: 500 });
    expect(out.find((r) => r.key === 'cq_cap_xa')).toMatchObject({ soDonVi: 0, tong: 0 });
  });

  it('theo đơn vị giới thiệu sắp số tiền giảm dần', () => {
    expect(aggregateDonViCuuTroByGioiThieu(rows).map((r) => [r.key, r.tong])).toEqual([
      ['MTTQ tỉnh', 500],
      ['Xã A', 100],
    ]);
  });

  it('top bỏ đơn vị chưa góp, bằng tiền thì theo tên', () => {
    expect(topDonViCuuTroByTien(rows, 10).map((r) => r.row.ten)).toEqual(['CLB', 'An', 'Bình']);
    expect(topDonViCuuTroByTien(rows, 1)).toHaveLength(1);
  });
});
