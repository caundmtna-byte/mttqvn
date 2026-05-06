import type { BaiVietDanhSach } from './core/types';

const ts = () => new Date().toISOString();

export const MOCK_BAI_VIET_DANH_SACH: BaiVietDanhSach[] = [
  {
    id: 'bv-1',
    ten_bai: 'Bài viết mock: hoạt động đoàn kết',
    id_the_loai: 'tl-1',
    ten_the_loai: 'Tin hoạt động',
    don_gia: 150000,
    ngay_dang: '2026-01-10',
    id_nguon_dang: 'kh-3',
    ten_nguon_dang: 'Phóng viên nội bộ',
    id_trang_dang: 'kh-1',
    ten_trang_dang: 'Fanpage chính',
    link: 'https://example.org/bai-mock-1',
    id_nguoi_tao: '1',
    ho_va_ten_nguoi_tao: 'Người tạo mẫu',
    ten_tai_khoan_nguoi_tao: 'admin',
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
  {
    id: 'bv-2',
    ten_bai: 'Bài viết mock: phân tích chính sách',
    id_the_loai: 'tl-2',
    ten_the_loai: 'Bài phân tích',
    don_gia: 300000,
    ngay_dang: '2026-01-05',
    id_nguon_dang: 'kh-4',
    ten_nguon_dang: 'Cộng tác viên',
    id_trang_dang: 'kh-2',
    ten_trang_dang: 'Website MTTQ',
    link: 'https://example.org/bai-mock-2',
    id_nguoi_tao: '2',
    ho_va_ten_nguoi_tao: 'Biên tập viên',
    ten_tai_khoan_nguoi_tao: 'editor',
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
];
