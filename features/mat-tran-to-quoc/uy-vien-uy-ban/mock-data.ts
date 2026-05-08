import type { MttqUyVienUyBan } from './core/types';

const now = new Date().toISOString();

export const MTTQ_UY_VIEN_UY_BAN_MOCK: MttqUyVienUyBan[] = [
  {
    id: '1',
    ma_uv: 'UB1',
    nhiem_ky_id: '1',
    ten_nhiem_ky: 'Khóa XV (2024-2029)',
    don_vi_id: null,
    ten_don_vi: null,
    ho_va_ten: 'Nguyễn Văn A',
    chuc_vu_don_vi: 'Ủy viên',
    ngay_sinh: '1970-05-01',
    gioi_tinh: 'Nam',
    trang_thai_tham_gia: 'Đang tham gia',
    ngay_nhap_trang_thai: '2024-07-31',
    van_hoa: '12/12',
    trinh_do_cm: 'Đại học',
    trinh_do_llct: 'Trung cấp',
    dan_toc: 'Kinh',
    ton_giao: 'Không',
    dang_vien: true,
    ngay_vao_dang: null,
    que_quan: null,
    noi_o_hien_nay: null,
    so_dien_thoai: null,
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: now,
    tg_cap_nhat: now,
    ho_va_ten_nguoi_tao: 'Mock',
    ten_tai_khoan_nguoi_tao: 'mock',
    id_phong_ban_nguoi_tao: null,
  },
];
