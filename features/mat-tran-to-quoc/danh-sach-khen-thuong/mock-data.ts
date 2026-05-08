import type { MttqKhenThuongCt } from './core/types';

/** Hàng cha mock (không nhúng con — service gắn từ MOCK_CHILDREN). */
export interface MttqKhenThuongMockParent {
  id: string;
  so_qd: string;
  ngay_khen_thuong: string;
  don_vi_de_xuat: string | null;
  ghi_chu: string | null;
  trang_thai: 'Mới' | 'Đang xử lý' | 'Đã ban hành' | 'Hủy';
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao: string | null;
  ten_tai_khoan_nguoi_tao: string | null;
  /** id_phong_ban của người tạo — phục vụ gating phân quyền xem (mock mặc định null). */
  id_phong_ban_nguoi_tao: string | null;
}

export const MTTQ_KHEN_THUONG_MOCK_PARENTS: MttqKhenThuongMockParent[] = [
  {
    id: '88001',
    so_qd: 'QĐ-MTTQ-01/2026',
    ngay_khen_thuong: '2026-01-15',
    don_vi_de_xuat: 'Ủy ban Mặt trận phường A',
    ghi_chu: null,
    trang_thai: 'Đã ban hành',
    id_nguoi_tao: '1',
    tg_tao: new Date().toISOString(),
    tg_cap_nhat: new Date().toISOString(),
    ho_va_ten_nguoi_tao: 'Quản trị',
    ten_tai_khoan_nguoi_tao: 'admin',
    id_phong_ban_nguoi_tao: null,
  },
];

/** id_khen_thuong khớp id cha mock. can_bo_id giả định tồn tại khi có Supabase + seed cán bộ. */
export const MTTQ_KHEN_THUONG_MOCK_CHILDREN: Omit<MttqKhenThuongCt, 'ten_can_bo'>[] = [
  {
    id: '880101',
    id_khen_thuong: '88001',
    can_bo_id: '90001',
    hinh_thuc_khen: 'Thường xuyên',
    danh_hieu: 'Giấy khen',
    noi_dung_khen: 'Hoàn thành xuất sắc nhiệm vụ',
    ho_so_khen: null,
  },
];
