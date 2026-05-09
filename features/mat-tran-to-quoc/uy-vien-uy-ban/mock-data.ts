import type { MttqUyVienUyBan } from './core/types';

const now = new Date().toISOString();

/** can_bo_id khớp mock Danh sách cán bộ (90001). */
export const MTTQ_UY_VIEN_UY_BAN_MOCK: MttqUyVienUyBan[] = [
  {
    id: '1',
    can_bo_id: '90001',
    ma_uv: 'UB1',
    nhiem_ky_id: '1',
    ten_nhiem_ky: 'Khóa XV (2024-2029)',
    don_vi_id: null,
    ten_don_vi: null,
    ho_va_ten: 'Nguyễn Văn A',
    chuc_vu_don_vi: null,
    ngay_sinh: '1985-03-15',
    gioi_tinh: 'Nam',
    trang_thai_tham_gia: 'Đang tham gia',
    ten_trang_thai_can_bo: null,
    ngay_nhap_trang_thai: '2024-07-31',
    van_hoa: '12/12',
    trinh_do_cm: null,
    trinh_do_llct: null,
    dan_toc: null,
    ton_giao: null,
    dang_vien: true,
    ngay_vao_dang: null,
    que_quan: null,
    noi_o_hien_nay: null,
    so_dien_thoai: '0912345678',
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: now,
    tg_cap_nhat: now,
    ho_va_ten_nguoi_tao: 'Mock',
    ten_tai_khoan_nguoi_tao: 'mock',
    id_phong_ban_nguoi_tao: null,
    ten_to_chuc: null,
    ten_phong_ban_hien_thi: null,
    ten_don_vi_can_bo: null,
    dia_chi_can_bo: 'Thành phố Vinh',
  },
];
