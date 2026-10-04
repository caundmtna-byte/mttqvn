import { describe, expect, it } from 'vitest';
import type { TiepNhan } from '../core/types';
import { TN_HINH_THUC_VALUES, TN_TRANG_THAI_VALUES } from '../core/constants';
import {
  TN_KHONG_CO_TIEN,
  TN_THONG_KE_INITIAL_DIMS,
  aggregateTnByChuongTrinh,
  aggregateTnByDonVi,
  buildTnBarData,
  buildTnTrendSeries,
  computeTnKpis,
  filterTnForThongKe,
} from './aggregate-tn-stats';

function tn(p: Partial<TiepNhan>): TiepNhan {
  return {
    id: '1',
    so_phieu: 'TN-1',
    ngay_tiep_nhan: '2026-10-04',
    nha_tai_tro_id: '10',
    ten_nha_tai_tro: 'A',
    loai_nha_tai_tro: null,
    chuong_trinh_id: '100',
    ten_chuong_trinh: 'CT',
    don_vi_chu_tri_loai: 'tinh',
    don_vi_chu_tri_id: null,
    ten_don_vi_tiep_nhan: 'MTTQ tỉnh',
    hinh_thuc: 'Chuyển khoản',
    so_tien: 0,
    giay_to_co_gia_gia_tri: null,
    hien_vat_khac_gia_tri: null,
    gia_tri_phieu_kho: 0,
    so_phieu_kho: 0,
    tong_gia_tri: 0,
    trang_thai: 'Đăng ký',
    ngay_cap_nhat_trang_thai: '',
    ghi_chu: null,
    ho_va_ten_nguoi_tao: null,
    ten_tai_khoan_nguoi_tao: null,
    ho_va_ten_nguoi_cap_nhat: null,
    ten_tai_khoan_nguoi_cap_nhat: null,
    tg_tao: '',
    tg_cap_nhat: '',
    ...p,
  };
}

const ALL = { start: '', end: '', allTime: true };

const rows = [
  tn({ id: '1', ngay_tiep_nhan: '2026-01-15', so_tien: 20_000_000, tong_gia_tri: 20_000_000 }),
  tn({ id: '2', ngay_tiep_nhan: '2026-03-02', hinh_thuc: 'Tiền mặt', so_tien: 5_000_000, tong_gia_tri: 5_000_000, trang_thai: 'Đã bàn giao' }),
  tn({
    id: '3',
    ngay_tiep_nhan: '2026-03-20',
    nha_tai_tro_id: '11',
    ten_nha_tai_tro: 'B',
    chuong_trinh_id: '200',
    ten_chuong_trinh: 'CT xã',
    don_vi_chu_tri_loai: 'xa_phuong',
    don_vi_chu_tri_id: '7',
    ten_don_vi_tiep_nhan: 'Xã X',
    hinh_thuc: null,
    giay_to_co_gia_gia_tri: 1_000_000,
    hien_vat_khac_gia_tri: null,
    gia_tri_phieu_kho: 3_000_000,
    tong_gia_tri: 4_000_000,
  }),
];

describe('filterTnForThongKe', () => {
  it('«Tất cả» không lọc ngày', () => {
    expect(filterTnForThongKe(rows, TN_THONG_KE_INITIAL_DIMS, ALL)).toHaveLength(3);
  });

  it('lọc theo ngày tiếp nhận, gồm cả hai đầu kỳ', () => {
    const r = filterTnForThongKe(rows, TN_THONG_KE_INITIAL_DIMS, { start: '2026-03-02', end: '2026-03-20' });
    expect(r.map((x) => x.id)).toEqual(['2', '3']);
  });

  it('lọc hình thức «không có tiền» và đơn vị tiếp nhận', () => {
    expect(
      filterTnForThongKe(rows, { ...TN_THONG_KE_INITIAL_DIMS, hinh_thuc: [TN_KHONG_CO_TIEN] }, ALL).map((x) => x.id),
    ).toEqual(['3']);
    expect(
      filterTnForThongKe(rows, { ...TN_THONG_KE_INITIAL_DIMS, don_vi_tiep_nhan: ['tinh:'] }, ALL).map((x) => x.id),
    ).toEqual(['1', '2']);
  });
});

describe('computeTnKpis', () => {
  it('cộng tiền theo hình thức, hiện vật gồm giấy tờ + hàng qua kho, đếm nhà tài trợ khác nhau', () => {
    expect(computeTnKpis(rows)).toEqual({
      soKhoan: 3,
      tongGiaTri: 29_000_000,
      tongTien: 25_000_000,
      chuyenKhoan: 20_000_000,
      tienMat: 5_000_000,
      hienVatGiayTo: 4_000_000,
      soNhaTaiTro: 2,
      daBanGiao: 1,
      tyLeBanGiao: 33,
    });
  });

  it('không có khoản nào ⇒ tỷ lệ 0, không NaN', () => {
    expect(computeTnKpis([]).tyLeBanGiao).toBe(0);
  });
});

describe('buildTnTrendSeries', () => {
  it('«Tất cả» quy về min–max thực tế, kỳ dài gom theo tháng', () => {
    const s = buildTnTrendSeries(rows, ALL);
    expect(s.map((p) => p.label)).toEqual(['01/2026', '02/2026', '03/2026']);
    expect(s[2]).toMatchObject({ soKhoan: 2, tongGiaTri: 9_000_000 });
  });

  it('kỳ ngắn gom theo ngày; tập rỗng + «Tất cả» không treo', () => {
    expect(buildTnTrendSeries(rows, { start: '2026-03-01', end: '2026-03-03' })).toHaveLength(3);
    expect(buildTnTrendSeries([], ALL)).toHaveLength(1);
  });
});

describe('gom nhóm', () => {
  it('theo chương trình — sắp giảm theo tổng giá trị', () => {
    const g = aggregateTnByChuongTrinh(rows);
    expect(g.map((x) => [x.id, x.soKhoan, x.tongGiaTri])).toEqual([
      ['100', 2, 25_000_000],
      ['200', 1, 4_000_000],
    ]);
  });

  it('theo đơn vị — tỉnh và xã tách riêng', () => {
    expect(aggregateTnByDonVi(rows).map((x) => x.label)).toEqual(['MTTQ tỉnh', 'Xã X']);
  });

  it('cột hình thức giữ đủ danh mục, thêm cột «không có tiền» khi có', () => {
    const b = buildTnBarData(rows, 'hinh_thuc', TN_HINH_THUC_VALUES, 'Không có tiền');
    expect(b.map((x) => [x.label, x.soKhoan])).toEqual([
      ['Chuyển khoản', 1],
      ['Tiền mặt', 1],
      ['Không có tiền', 1],
    ]);
    expect(buildTnBarData([], 'trang_thai', TN_TRANG_THAI_VALUES).map((x) => x.soKhoan)).toEqual([0, 0]);
  });
});
