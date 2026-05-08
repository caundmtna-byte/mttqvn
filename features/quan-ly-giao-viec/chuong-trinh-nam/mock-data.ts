import type { ChuongTrinhNam } from './core/types';

/** Dữ liệu mẫu khi chạy mock (không Supabase). */
export const CHUONG_TRINH_NAM_MOCK: ChuongTrinhNam[] = [
  {
    id: '1',
    ten_chuong_trinh: 'Chương trình phối hợp năm 2026',
    mo_ta: 'Hoạt động liên ngành, định kỳ sơ kết quý.',
    ghi_chu: null,
    ngay_bat_dau: '2026-01-01',
    ngay_ket_thuc: '2026-12-31',
    trang_thai: 'Hoạt động',
    id_phong_ban: null,
    id_nguoi_tao: '1',
    tg_tao: new Date().toISOString(),
    tg_cap_nhat: new Date().toISOString(),
    ten_phong_ban: null,
    ho_va_ten_nguoi_tao: 'Người dùng mẫu',
    ten_tai_khoan_nguoi_tao: 'demo',
  },
  {
    id: '2',
    ten_chuong_trinh: 'Chương trình Mặt trận — Quý I',
    mo_ta: null,
    ghi_chu: null,
    ngay_bat_dau: '2026-01-15',
    ngay_ket_thuc: '2026-03-31',
    trang_thai: 'Tạm dừng',
    id_phong_ban: null,
    id_nguoi_tao: '1',
    tg_tao: new Date().toISOString(),
    tg_cap_nhat: new Date().toISOString(),
    ten_phong_ban: null,
    ho_va_ten_nguoi_tao: 'Người dùng mẫu',
    ten_tai_khoan_nguoi_tao: 'demo',
  },
];
