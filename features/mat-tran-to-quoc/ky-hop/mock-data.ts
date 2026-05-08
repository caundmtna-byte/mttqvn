import type { MttqKyHop } from './core/types';

const now = new Date().toISOString();

export const MTTQ_KY_HOP_MOCK: MttqKyHop[] = [
  {
    id: '1',
    nhiem_ky_id: '1',
    ten_nhiem_ky: 'Khóa XV (2024-2029)',
    don_vi_id: null,
    ten_don_vi: null,
    ky_thu: 'Lần thứ 1',
    ngay_hop: '2024-07-31',
    noi_dung_ky_hop: 'Phiên họp thứ nhất',
    tai_lieu_hop: null,
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: now,
    tg_cap_nhat: now,
    ho_va_ten_nguoi_tao: 'Mock',
    ten_tai_khoan_nguoi_tao: 'mock',
    diem_danh_co_mat: 0,
    diem_danh_vang_mat: 0,
    diem_danh_chua: 0,
  },
];
