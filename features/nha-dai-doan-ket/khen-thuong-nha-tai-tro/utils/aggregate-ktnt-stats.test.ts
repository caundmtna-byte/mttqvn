import { describe, it, expect } from 'vitest';
import type { KhenThuongNhaTaiTro } from '../core/types';
import {
  KTNT_THONG_KE_INITIAL_DIMS,
  aggregateKtntByXaPhuong,
  buildKtntBarData,
  buildKtntNamSeries,
  computeKtntKpis,
  filterRowsForKtntThongKe,
  topKtntNhaTaiTro,
} from './aggregate-ktnt-stats';
import { KTNT_CAP_KHEN_VALUES } from '../core/constants';

let seq = 0;
function row(over: Partial<KhenThuongNhaTaiTro> = {}): KhenThuongNhaTaiTro {
  seq += 1;
  return {
    id: String(seq),
    noi_dung_khen: 'Khen',
    ngay_khen: '2026-01-15',
    so_quyet_dinh: null,
    cap_khen: 'Cấp tỉnh',
    don_vi_khen: null,
    xa_phuong_id: null,
    ten_xa_phuong: null,
    nha_tai_tro_id: '1',
    ten_nha_tai_tro: 'DN A',
    loai_nha_tai_tro: 'doanh_nghiep',
    nam_thanh_tich_tu: null,
    nam_thanh_tich_den: null,
    gia_tri_dong_gop_khac: null,
    so_khoan_ho_tro: 0,
    so_nguoi_duoc_ho_tro: 0,
    tong_tien_ho_tro: 0,
    tong_gia_tri: 100,
    trang_thai: 'Đã duyệt',
    ngay_cap_nhat_trang_thai: '',
    nguoi_duyet_id: null,
    ho_va_ten_nguoi_duyet: null,
    tg_duyet: null,
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: '',
    tg_cap_nhat: '',
    ...over,
  };
}

describe('computeKtntKpis', () => {
  it('chỉ cộng giá trị và đếm nhà tài trợ trên quyết định ĐÃ DUYỆT', () => {
    const k = computeKtntKpis([
      row({ nha_tai_tro_id: '1', tong_gia_tri: 100 }),
      row({ nha_tai_tro_id: '1', tong_gia_tri: 50 }),
      row({ nha_tai_tro_id: '2', trang_thai: 'Chờ duyệt', tong_gia_tri: 999 }),
      row({ nha_tai_tro_id: '3', trang_thai: 'Không duyệt', tong_gia_tri: 999 }),
      row({ nha_tai_tro_id: '4', trang_thai: 'Hủy', tong_gia_tri: 999 }),
    ]);
    expect(k).toEqual({
      tongQuyetDinh: 5,
      soNhaTaiTro: 1,
      daDuyet: 2,
      choDuyet: 1,
      // 2 duyệt / (2 duyệt + 1 không duyệt); chờ và huỷ không vào mẫu số.
      tyLeDuyet: 67,
      tongGiaTri: 150,
    });
  });

  it('rỗng ⇒ 0, không chia cho 0', () => {
    expect(computeKtntKpis([]).tyLeDuyet).toBe(0);
  });
});

describe('lọc và gom', () => {
  it('lọc theo năm lấy từ ngày khen', () => {
    const rows = [row({ ngay_khen: '2025-12-31' }), row({ ngay_khen: '2026-01-01' })];
    expect(filterRowsForKtntThongKe(rows, { ...KTNT_THONG_KE_INITIAL_DIMS, nam: ['2026'] })).toHaveLength(1);
  });

  it('chuỗi năm tăng dần, đếm riêng đã duyệt', () => {
    expect(
      buildKtntNamSeries([row({ ngay_khen: '2026-02-01' }), row({ ngay_khen: '2024-02-01', trang_thai: 'Chờ duyệt' })]),
    ).toEqual([
      { nam: 2024, soQuyetDinh: 1, daDuyet: 0 },
      { nam: 2026, soQuyetDinh: 1, daDuyet: 1 },
    ]);
  });

  it('bar đủ mọi cấp khen, nhóm rỗng = 0', () => {
    const out = buildKtntBarData([row({ cap_khen: 'Cấp xã' })], 'cap_khen', KTNT_CAP_KHEN_VALUES);
    expect(out).toEqual([
      { label: 'Trung ương', soQuyetDinh: 0 },
      { label: 'Cấp tỉnh', soQuyetDinh: 0 },
      { label: 'Cấp xã', soQuyetDinh: 1 },
    ]);
  });

  it('top nhà tài trợ bỏ quyết định chưa duyệt, sắp theo giá trị', () => {
    const out = topKtntNhaTaiTro([
      row({ nha_tai_tro_id: '1', ten_nha_tai_tro: 'A', tong_gia_tri: 10 }),
      row({ nha_tai_tro_id: '2', ten_nha_tai_tro: 'B', tong_gia_tri: 30 }),
      row({ nha_tai_tro_id: '1', ten_nha_tai_tro: 'A', tong_gia_tri: 5, trang_thai: 'Chờ duyệt' }),
    ]);
    expect(out.map((r) => [r.id, r.giaTri])).toEqual([
      ['2', 30],
      ['1', 10],
    ]);
  });

  it('bảng theo xã chỉ gồm quyết định có xã (cấp xã)', () => {
    const out = aggregateKtntByXaPhuong([
      row({ cap_khen: 'Cấp xã', xa_phuong_id: '7', ten_xa_phuong: 'Xã A' }),
      row({ cap_khen: 'Cấp tỉnh' }),
    ]);
    expect(out).toEqual([{ id: '7', label: 'Xã A', soQuyetDinh: 1, giaTri: 100 }]);
  });
});
