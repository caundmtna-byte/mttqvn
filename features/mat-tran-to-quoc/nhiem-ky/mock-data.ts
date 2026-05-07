import type { MttqNhiemKy } from './core/types';

const now = new Date().toISOString();

export const MTTQ_NHIEM_KY_MOCK: MttqNhiemKy[] = [
  {
    id: '1',
    ten_nhiem_ky: 'Khóa XV (2024-2029)',
    tu_nam: 2024,
    den_nam: 2029,
    thong_tin: 'Thông tin nhiệm kỳ Khóa XV',
    sl_dau_nhiem_ky: 114,
    sl_dang_tham_gia: 114,
    sl_thoi_tham_gia: 1,
    sl_can_bo_sung: 0,
    sl_thieu: -1,
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: now,
    tg_cap_nhat: now,
    ho_va_ten_nguoi_tao: 'Mock',
    ten_tai_khoan_nguoi_tao: 'mock',
  },
];
