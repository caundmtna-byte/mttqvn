import type { MttqLopTapHuanCt } from './core/types';
import type { MttqTapHuanCap } from './core/constants';

/** Hàng cha mock (không nhúng con — service gắn từ MOCK_CHILDREN). */
export interface MttqLopTapHuanMockParent {
  id: string;
  ten_lop_tap_huan: string;
  nam_tap_huan: number;
  cap_tap_huan: MttqTapHuanCap;
  don_vi_id?: string | null;
  ten_don_vi?: string | null;
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao: string | null;
  ten_tai_khoan_nguoi_tao: string | null;
  id_phong_ban_nguoi_tao: string | null;
}

export const MTTQ_LOP_TAP_HUAN_MOCK_PARENTS: MttqLopTapHuanMockParent[] = [
  {
    id: '95001',
    ten_lop_tap_huan: 'Lớp bồi dưỡng kỹ năng giám sát',
    nam_tap_huan: 2026,
    cap_tap_huan: 'Cấp tỉnh',
    ghi_chu: 'Tập huấn đợt 1 đầu năm.',
    id_nguoi_tao: '1',
    tg_tao: new Date().toISOString(),
    tg_cap_nhat: new Date().toISOString(),
    ho_va_ten_nguoi_tao: 'Quản trị',
    ten_tai_khoan_nguoi_tao: 'admin',
    id_phong_ban_nguoi_tao: null,
    don_vi_id: null,
    ten_don_vi: null,
  },
  {
    id: '95002',
    ten_lop_tap_huan: 'Lớp nghiệp vụ công tác Mặt trận',
    nam_tap_huan: 2026,
    cap_tap_huan: 'Cấp xã',
    don_vi_id: '1',
    ten_don_vi: 'Phường mẫu (mock)',
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: new Date().toISOString(),
    tg_cap_nhat: new Date().toISOString(),
    ho_va_ten_nguoi_tao: 'Quản trị',
    ten_tai_khoan_nguoi_tao: 'admin',
    id_phong_ban_nguoi_tao: null,
  },
];

/** id_lop_tap_huan khớp id cha mock; chỉ FK + thuộc diện (chức vụ / tổ chức lấy từ mock cán bộ khi đọc). */
export type MttqLopTapHuanMockChildStored = Pick<
  MttqLopTapHuanCt,
  'id' | 'id_lop_tap_huan' | 'can_bo_id' | 'thuoc_dien'
>;

export const MTTQ_LOP_TAP_HUAN_MOCK_CHILDREN: MttqLopTapHuanMockChildStored[] = [
  {
    id: '950101',
    id_lop_tap_huan: '95001',
    can_bo_id: '90001',
    thuoc_dien: 'Biên chế',
  },
  {
    id: '950102',
    id_lop_tap_huan: '95001',
    can_bo_id: '90002',
    thuoc_dien: 'Ngoài biên chế',
  },
  {
    id: '950201',
    id_lop_tap_huan: '95002',
    can_bo_id: '90001',
    thuoc_dien: 'Biên chế',
  },
];
