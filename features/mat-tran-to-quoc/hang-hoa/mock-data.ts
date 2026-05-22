import type { KhoDanhMucHangHoaListRow, KhoDanhSachHangHoaListRow } from './core/types';

const now = new Date().toISOString();

export const KHO_DANH_MUC_HANG_HOA_MOCK: KhoDanhMucHangHoaListRow[] = [
  {
    id: '1',
    ten_danh_muc: 'Thực phẩm',
    mo_ta: 'Lương thực, nước uống',
    thu_tu: 1,
    trang_thai: 'Đang hoạt động',
    tg_tao: now,
    tg_cap_nhat: now,
  },
];

export const KHO_DANH_SACH_HANG_HOA_MOCK: KhoDanhSachHangHoaListRow[] = [
  {
    id: '1',
    id_danh_muc: '1',
    ten_danh_muc_nhom: 'Thực phẩm',
    ten_hang_hoa: 'Gạo',
    don_vi_tinh: 'kg',
    mo_ta: null,
    quy_cach: null,
    thu_tu: 1,
    trang_thai: 'Đang hoạt động',
    tg_tao: now,
    tg_cap_nhat: now,
  },
];
