import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';

export interface Position {
  id: string;
  ten_chuc_vu: string;
  cap_bac?: string | null;
  phong_ban_id?: string | null;
  ten_cap_bac?: string;
  ten_phong_ban?: string;
  mo_ta: string | null;
  thu_tu: number;
  trang_thai: TrangThaiHoatDong;
  tg_tao: string;
  tg_cap_nhat: string;
}

/** Bộ lọc list Chức vụ — đồng bộ pattern module Nhân viên (chip + header cột). */
export interface PositionFilters {
  status: string[];
  phong_ban_id: string[];
  columnSearch: Record<string, string>;
}

export interface PositionFormState {
  ten_chuc_vu: string;
  cap_bac?: string;
  phong_ban_id?: string;
  mo_ta: string | null;
  thu_tu: number;
  trang_thai: TrangThaiHoatDong;
}
