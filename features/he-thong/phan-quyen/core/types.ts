import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';

export type ActionType = 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'import' | 'admin' | 'all';

export interface ModulePermission {
  module_id: string;
  module_name: string;
  actions: ActionType[];
}

export interface PositionPermission {
  id: string;
  id_chuc_vu: string;
  ten_chuc_vu: string;
  ma_chuc_vu: string;
  ten_phong_ban: string;
  thu_tu_phong_ban?: number;
  thu_tu_chuc_vu?: number;
  mo_ta: string | null;
  so_nhan_vien: number;
  quyen_han: ModulePermission[];
  trang_thai: TrangThaiHoatDong;
  tg_cap_nhat: string;
}

export interface RoleFilters {
  trang_thai: 'All' | 'Active' | 'Inactive';
  id_phong_ban: string;
}
