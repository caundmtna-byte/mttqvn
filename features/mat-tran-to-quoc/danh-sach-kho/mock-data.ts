import type { KhoDanhSachKhoListRow } from './core/types';

const now = new Date().toISOString();

/** Dữ liệu mẫu khi chạy không Supabase (`don_vi_id` chỉ mang tính minh họa). */
export const KHO_DANH_SACH_KHO_MOCK: KhoDanhSachKhoListRow[] = [
  {
    id: '1',
    tt: 1,
    ten_kho: 'Kho cứu trợ trung tâm',
    don_vi_id: '1',
    ten_don_vi: 'Phường Mỹ Bình',
    ten_tinh: 'An Giang',
    mo_ta: 'Kho tập kết hàng cứu trợ.',
    tg_tao: now,
    tg_cap_nhat: now,
  },
  {
    id: '2',
    tt: 2,
    ten_kho: 'Kho dự phòng cấp tỉnh (mock)',
    don_vi_id: null,
    ten_don_vi: null,
    ten_tinh: null,
    mo_ta: 'Ví dụ kho không gắn xã/phường.',
    tg_tao: now,
    tg_cap_nhat: now,
  },
];
