import type { MttqCanBoFilters } from '../core/types';

/** Đảm bảo mọi mảng chip và columnSearch luôn có giá trị (tránh `.length` trên undefined). */
export function normalizeMttqCanBoFilters(f: MttqCanBoFilters): MttqCanBoFilters {
  return {
    columnSearch: f.columnSearch ?? {},
    trang_thai_id: f.trang_thai_id ?? [],
    gioi_tinh: f.gioi_tinh ?? [],
    to_chuc_id: f.to_chuc_id ?? [],
    phong_ban_id: f.phong_ban_id ?? [],
    chuc_vu_id: f.chuc_vu_id ?? [],
    chuc_vu_cap_quan_ly: f.chuc_vu_cap_quan_ly ?? [],
    don_vi_id: f.don_vi_id ?? [],
    dan_toc_id: f.dan_toc_id ?? [],
    dang_vien: f.dang_vien ?? [],
    trinh_do_id: f.trinh_do_id ?? [],
    ly_luan_chinh_tri_id: f.ly_luan_chinh_tri_id ?? [],
  };
}
