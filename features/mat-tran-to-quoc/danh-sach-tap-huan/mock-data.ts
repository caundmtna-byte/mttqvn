import type { MttqLopTapHuanCt } from './core/types';

/** Hàng cha mock (không nhúng con — service gắn từ MOCK_CHILDREN). */
export interface MttqLopTapHuanMockParent {
  id: string;
  ten_lop_tap_huan: string;
  nam_tap_huan: number;
  cap_tap_huan: 'Cấp tỉnh' | 'Cấp xã';
  ghi_chu: string | null;
  id_nguoi_tao: string;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_nguoi_tao: string | null;
  ten_tai_khoan_nguoi_tao: string | null;
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
  },
  {
    id: '95002',
    ten_lop_tap_huan: 'Lớp nghiệp vụ công tác Mặt trận',
    nam_tap_huan: 2026,
    cap_tap_huan: 'Cấp xã',
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: new Date().toISOString(),
    tg_cap_nhat: new Date().toISOString(),
    ho_va_ten_nguoi_tao: 'Quản trị',
    ten_tai_khoan_nguoi_tao: 'admin',
  },
];

/** id_lop_tap_huan khớp id cha mock. can_bo_id giả định tồn tại khi có Supabase + seed cán bộ. */
export const MTTQ_LOP_TAP_HUAN_MOCK_CHILDREN: Omit<MttqLopTapHuanCt, 'ten_can_bo' | 'ten_cap_quan_ly'>[] = [
  {
    id: '950101',
    id_lop_tap_huan: '95001',
    can_bo_id: '90001',
    chuc_vu: 'Ủy viên TT',
    don_vi_cong_tac: 'Ủy ban MTTQ thị xã (mẫu)',
    thuoc_dien: 'Biên chế',
  },
  {
    id: '950102',
    id_lop_tap_huan: '95001',
    can_bo_id: '90002',
    chuc_vu: 'Trưởng ban CTMT',
    don_vi_cong_tac: 'Xóm 8 (mẫu)',
    thuoc_dien: 'Ngoài biên chế',
  },
  {
    id: '950201',
    id_lop_tap_huan: '95002',
    can_bo_id: '90001',
    chuc_vu: 'Ủy viên TT',
    don_vi_cong_tac: 'Ủy ban MTTQ thị xã (mẫu)',
    thuoc_dien: 'Biên chế',
  },
];
