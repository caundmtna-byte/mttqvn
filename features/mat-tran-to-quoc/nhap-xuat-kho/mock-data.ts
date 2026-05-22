import type { NhapXuatKhoCtRow, NhapXuatKhoListRow } from './core/types';

const now = new Date().toISOString();

export interface NhapXuatKhoMockMaster extends NhapXuatKhoListRow {
  ghi_chu: string | null;
}

export const NHAP_XUAT_KHO_MOCK_MASTER: NhapXuatKhoMockMaster[] = [
  {
    id: '1',
    tt: 1,
    so_phieu: 'PN-2026-0001',
    loai_phieu: 'nhap_ngoai',
    ngay_phieu: '2026-05-03',
    kho_xuat_id: null,
    ten_kho_xuat: null,
    kho_nhap_id: '1',
    ten_kho_nhap: 'Kho A (mock)',
    don_vi_cuu_tro_id: '1',
    ten_don_vi_cuu_tro: 'Đơn vị cứu trợ A (mock)',
    dot_cuu_tro_id: null,
    ten_dot_cuu_tro: null,
    so_dong: 2,
    ghi_chu: 'Phiếu nhập từ đơn vị cứu trợ (mock).',
    tg_tao: now,
    tg_cap_nhat: now,
  },
];

export const NHAP_XUAT_KHO_MOCK_LINES: NhapXuatKhoCtRow[] = [
  {
    id: '101',
    phieu_id: '1',
    hang_hoa_id: '1',
    ten_hang_hoa: 'Gạo (mock)',
    don_vi_tinh: 'kg',
    so_luong: 100,
    don_gia: 25000,
    thanh_tien: 2_500_000,
    ghi_chu: null,
    thu_tu: 1,
  },
  {
    id: '102',
    phieu_id: '1',
    hang_hoa_id: '2',
    ten_hang_hoa: 'Mì gói (mock)',
    don_vi_tinh: 'thùng',
    so_luong: 50,
    don_gia: 100000,
    thanh_tien: 5_000_000,
    ghi_chu: null,
    thu_tu: 2,
  },
];
